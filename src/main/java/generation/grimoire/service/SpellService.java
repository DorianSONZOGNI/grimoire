package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.event.*;
import generation.grimoire.repository.SpellRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Iterator;
import java.util.List;

@Service
public class SpellService {

    private final SpellRepository spellRepository;
    private final PersonnageService personnageService;
    private final PassiveDispatcher passiveDispatcher;

    public SpellService(SpellRepository spellRepository, PersonnageService personnageService, PassiveDispatcher passiveDispatcher) {
        this.spellRepository = spellRepository;
        this.personnageService = personnageService;
        this.passiveDispatcher = passiveDispatcher;
    }

    public void castSpellInvoq(@org.springframework.lang.NonNull Long spellId,
            @org.springframework.lang.NonNull Long casterId,
            @org.springframework.lang.NonNull Long targetId,
            Integer choiceKey) {
        Spell baseSpell = spellRepository.findById(spellId)
                .orElseThrow(() -> new EntityNotFoundException("Sort non trouvé : " + spellId));
        Personnage caster = personnageService.findByIdOrThrow(casterId);
        Personnage target = personnageService.findByIdOrThrow(targetId);

        this.castSpell(baseSpell, caster, target, choiceKey);
    }

    /**
     * Lance un sort en déduisant les coûts en mana et en heal,
     * en appliquant ses effets, puis en déclenchant les passifs via le dispatcher unifié.
     *
     * @param spell  le sort à lancer
     * @param caster le personnage qui lance le sort
     * @param target la cible du sort
     */
    public void castSpell(Spell spell, Personnage caster, Personnage target, Integer choiceKey) {

        // Dans le cas d'un variant, on détermine lequel est sélectioné
        Spell toCast = selectVariant(spell, caster, target, choiceKey);

        // 0) Vérifier les prérequis de voie/spiritualité et niveaux du personnage
        String castError = caster.canCast(toCast);
        if (castError != null) {
            System.out.println("🚫 " + castError);
            return;
        }

        // 1) Enforce category casting limits
        SpellCastingType cType = toCast.getCastingType();
        if (cType == null) {
            cType = SpellCastingType.BANAL;
        }

        // Dispatch : ajustement du type de casting par les passifs
        CastingTypeAdjustEvent castingEvent = new CastingTypeAdjustEvent(caster, target, toCast, cType);
        passiveDispatcher.dispatch(caster, toCast, castingEvent);
        cType = castingEvent.getCurrentType();

        // Rule A: If currently channeling
        if (caster.getRemainingChannelingTurns() > 0) {
            if (cType != SpellCastingType.INSTANTANE) {
                System.out.println(caster.getName() + " ne peut pas lancer de sort banal ou canalisé pendant sa canalisation.");
                return;
            }
            if (!caster.isAllowInstantDuringCurrentChanneling()) {
                System.out.println(caster.getName() + " ne peut pas lancer de sort instantané pendant cette canalisation.");
                return;
            }
        }

        // Rule B: If already cast a Banal or Channeled spell this turn
        if (caster.isBanalSpellCastThisTurn()) {
            System.out.println(caster.getName() + " a déjà lancé un sort banal ce tour-ci (sa dernière action magique est consommée).");
            return;
        }

        // Rule C: If already cast an Instant spell this turn
        if (cType == SpellCastingType.INSTANTANE && caster.isInstantSpellCastThisTurn()) {
            System.out.println(caster.getName() + " a déjà lancé un sort instantané ce tour-ci.");
            return;
        }

        // Dispatch : validation des prérequis des passifs (Spiritualités, etc.)
        CanCastCheckEvent canCastEvent = new CanCastCheckEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, canCastEvent);
        if (!canCastEvent.isAllowed()) {
            return;
        }

        // Calcul du coût en mana fixe + pourcentage dynamique
        int actualManaCost = toCast.getManaCost();
        if (toCast.getPercentManaCost() > 0) {
            double manaBase = generation.grimoire.utils.StatCalculator.getSourceValue(toCast.getPercentManaCostSource() != null ? toCast.getPercentManaCostSource() : generation.grimoire.enumeration.Source.CASTER_MANA_MAX, caster, target);
            actualManaCost += (int) (manaBase * toCast.getPercentManaCost() / 100);
        }

        // Calcul du coût en heal fixe + pourcentage dynamique
        int actualHealCost = toCast.getHealCost();
        if (toCast.getPercentHealCost() > 0) {
            double healBase = generation.grimoire.utils.StatCalculator.getSourceValue(toCast.getPercentHealCostSource() != null ? toCast.getPercentHealCostSource() : generation.grimoire.enumeration.Source.CASTER_HEALTH_MAX, caster, target);
            actualHealCost += (int) (healBase * toCast.getPercentHealCost() / 100);
        }

        // Calcul du coût en chaleur fixe + pourcentage dynamique (basé sur 100 max)
        int actualHeatCost = toCast.getHeatCost();
        if (toCast.getPercentHeatCost() > 0) {
            actualHeatCost += (int) (100.0 * toCast.getPercentHeatCost() / 100.0);
        }

        // Dispatch : ajustement des coûts par les passifs
        int[] costs = { actualManaCost, actualHealCost, actualHeatCost };
        SpellCostAdjustEvent costEvent = new SpellCostAdjustEvent(caster, target, toCast, costs);
        passiveDispatcher.dispatch(caster, toCast, costEvent);
        actualManaCost = costs[0];
        actualHealCost = costs[1];
        actualHeatCost = costs.length > 2 ? costs[2] : actualHeatCost;

        // Vérifier que le caster dispose des ressources nécessaires
        if (caster.getManaCurrent() < actualManaCost) {
            System.out.println("Mana insuffisant pour lancer le sort " + toCast.getNom());
            return;
        }
        if (caster.getHealthCurrent() < actualHealCost) {
            System.out.println("PV insuffisants pour lancer le sort " + toCast.getNom());
            return;
        }
        int currentHeat = caster.getPassiveState("destruction_heat", 0);
        if (currentHeat < actualHeatCost) {
            System.out.println("Chaleur insuffisante pour lancer le sort " + toCast.getNom());
            return;
        }

        // Déduire les coûts
        caster.setManaCurrent(caster.getManaCurrent() - actualManaCost);
        caster.setHealthCurrent(caster.getHealthCurrent() - actualHealCost);
        
        // Malédiction: Hémorragie magique (Perte d'HP en % du mana consommé)
        if (actualManaCost > 0) {
            int hpLossPct = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_HP_LOSS_ON_MANA);
            if (hpLossPct != 0) {
                int hpLoss = (int) (actualManaCost * Math.abs(hpLossPct) / 100.0);
                if (hpLoss > 0) {
                    caster.takeDamage(hpLoss, generation.grimoire.enumeration.DamageType.BRUT, caster);
                    System.out.println(caster.getName() + " subit " + hpLoss + " dégâts de malédiction (Hémorragie magique) !");
                }
            }
        }
        caster.setPassiveState("destruction_heat", currentHeat - actualHeatCost);
        
        String costMsg = "";
        if (actualManaCost > 0) costMsg += actualManaCost + " mana, ";
        if (actualHealCost > 0) costMsg += actualHealCost + " PV, ";
        if (actualHeatCost > 0) costMsg += actualHeatCost + " chaleur, ";
        
        if (!costMsg.isEmpty()) {
            costMsg = costMsg.substring(0, costMsg.length() - 2);
            int lastComma = costMsg.lastIndexOf(", ");
            if (lastComma != -1) costMsg = costMsg.substring(0, lastComma) + " et " + costMsg.substring(lastComma + 2);
            System.out.println(caster.getName() + " dépense " + costMsg + " pour lancer " + toCast.getNom());
        }

        // Dispatch : hook post-paiement de coût
        SpellCostPaidEvent costPaidEvent = new SpellCostPaidEvent(caster, target, toCast, actualManaCost, actualHealCost, actualHeatCost);
        passiveDispatcher.dispatch(caster, toCast, costPaidEvent);

        // Mettre à jour l'état de lancement du caster
        if (cType == SpellCastingType.INSTANTANE) {
            caster.setInstantSpellCastThisTurn(true);
        } else if (cType == SpellCastingType.BANAL) {
            caster.setBanalSpellCastThisTurn(true);
        } else if (cType == SpellCastingType.CANALISE) {
            caster.setBanalSpellCastThisTurn(true);
            caster.setRemainingChannelingTurns(toCast.getChannelingDuration());
            caster.setAllowInstantDuringCurrentChanneling(toCast.isAllowInstantDuringChanneling());
            caster.setChanneledSpell(toCast);
            caster.setChannelingTarget(target);
            caster.setChannelingChoiceKey(choiceKey);
            System.out.println(caster.getName() + " commence à canaliser " + toCast.getNom() + " pour " + toCast.getChannelingDuration() + " tours.");
        }

        // Appliquer les buffs consommables de manière générique
        applyConsumableBuffs(toCast, caster, target);

        // Appliquer chacun des effets du sort en résolvant dynamiquement les destinataires de la règle textuelle
        for (SpellEffect effect : toCast.getEffects()) {
            if (effect.getRequiredChoiceKey() != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
                continue; // L'effet ne s'active que si la clé de choix correspond
            }
            if (toCast.getCastingType() == SpellCastingType.CANALISE) {
                if (effect.getChannelingTurns() != null && !effect.getChannelingTurns().isEmpty()) {
                    if (!effect.getChannelingTurns().contains(1)) {
                        continue; // L'effet ne s'active pas au Tour 1
                    }
                }
            }

            // Vérification de la condition d'Âme Détachée
            if (effect.getDetachedSoulRequirement() != null && effect.getDetachedSoulRequirement() != generation.grimoire.enumeration.DetachedSoulRequirement.NOT_AFFECTED) {
                boolean hasAmeDetachee = caster.getActiveBuffs().stream()
                        .anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.AME_DETACHEE);
                
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.REQUIRED && !hasAmeDetachee) {
                    continue; // Skip because Âme Détachée is required but not present
                }
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.FORBIDDEN && hasAmeDetachee) {
                    continue; // Skip because Âme Détachée is forbidden but present
                }
            }

            java.util.List<Personnage> recipients = resolveRecipients(effect.getEffectTarget(), caster, target);

            // Application concrète de l'effet sur chaque destinataire résolu
            for (Personnage recipient : recipients) {
                if (recipients.size() > 1) {
                    System.out.println("  ↳ Application sur : " + recipient.getName());
                }
                effect.apply(caster, recipient);
            }
        }

        // Dispatch : notification post-cast à tous les passifs (Voie + Spiritualité)
        SpellCastEvent spellCastEvent = new SpellCastEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, spellCastEvent);
    }

    /**
     * Version "groupe" de castSpell qui résout les destinataires en utilisant de vraies listes
     * d'alliés et d'ennemis (pour le bac à sable).
     */
    public void castSpellGroup(Spell spell, Personnage caster, Personnage target,
                               Personnage ally, java.util.List<Personnage> allAllies,
                               java.util.List<Personnage> allEnemies, Integer choiceKey) {

        Spell toCast = selectVariant(spell, caster, target, choiceKey);

        String castError = caster.canCast(toCast);
        if (castError != null) {
            System.out.println("🚫 " + castError);
            return;
        }

        SpellCastingType cType = toCast.getCastingType();
        if (cType == null) cType = SpellCastingType.BANAL;

        CastingTypeAdjustEvent castingEvent = new CastingTypeAdjustEvent(caster, target, toCast, cType);
        passiveDispatcher.dispatch(caster, toCast, castingEvent);
        cType = castingEvent.getCurrentType();

        if (caster.getRemainingChannelingTurns() > 0) {
            if (cType != SpellCastingType.INSTANTANE) {
                System.out.println(caster.getName() + " ne peut pas lancer de sort banal ou canalisé pendant sa canalisation.");
                return;
            }
            if (!caster.isAllowInstantDuringCurrentChanneling()) {
                System.out.println(caster.getName() + " ne peut pas lancer de sort instantané pendant cette canalisation.");
                return;
            }
        }

        if (caster.isBanalSpellCastThisTurn()) {
            System.out.println(caster.getName() + " a déjà lancé un sort banal ce tour-ci.");
            return;
        }

        if (cType == SpellCastingType.INSTANTANE && caster.isInstantSpellCastThisTurn()) {
            System.out.println(caster.getName() + " a déjà lancé un sort instantané ce tour-ci.");
            return;
        }

        CanCastCheckEvent canCastEvent = new CanCastCheckEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, canCastEvent);
        if (!canCastEvent.isAllowed()) return;

        // Calcul des coûts
        int actualManaCost = toCast.getManaCost();
        if (toCast.getPercentManaCost() > 0) {
            double manaBase = generation.grimoire.utils.StatCalculator.getSourceValue(
                    toCast.getPercentManaCostSource() != null ? toCast.getPercentManaCostSource() : generation.grimoire.enumeration.Source.CASTER_MANA_MAX, caster, target);
            actualManaCost += (int) (manaBase * toCast.getPercentManaCost() / 100);
        }
        int actualHealCost = toCast.getHealCost();
        if (toCast.getPercentHealCost() > 0) {
            double healBase = generation.grimoire.utils.StatCalculator.getSourceValue(
                    toCast.getPercentHealCostSource() != null ? toCast.getPercentHealCostSource() : generation.grimoire.enumeration.Source.CASTER_HEALTH_MAX, caster, target);
            actualHealCost += (int) (healBase * toCast.getPercentHealCost() / 100);
        }
        int actualHeatCost = toCast.getHeatCost();
        if (toCast.getPercentHeatCost() > 0) {
            actualHeatCost += (int) (100.0 * toCast.getPercentHeatCost() / 100.0);
        }

        int[] costs = { actualManaCost, actualHealCost, actualHeatCost };
        SpellCostAdjustEvent costEvent = new SpellCostAdjustEvent(caster, target, toCast, costs);
        passiveDispatcher.dispatch(caster, toCast, costEvent);
        actualManaCost = costs[0];
        actualHealCost = costs[1];
        actualHeatCost = costs.length > 2 ? costs[2] : actualHeatCost;

        int requiredHeatFromEffects = 0;
        if (toCast.getEffects() != null) {
            for (generation.grimoire.entity.SpellEffect effect : toCast.getEffects()) {
                if (effect.getRequiredChoiceKey() != null && choiceKey != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
                    continue;
                }
                if (effect instanceof generation.grimoire.entity.spell.type.effect.HeatFixedEffect hfe) {
                    if (hfe.getAmount() < 0) {
                        requiredHeatFromEffects += -hfe.getAmount();
                    }
                }
            }
        }

        if (caster.getManaCurrent() < actualManaCost) {
            System.out.println("Mana insuffisant pour lancer le sort " + toCast.getNom());
            return;
        }
        if (caster.getHealthCurrent() < actualHealCost) {
            System.out.println("PV insuffisants pour lancer le sort " + toCast.getNom());
            return;
        }
        int currentHeat = caster.getPassiveState("destruction_heat", 0);
        if (currentHeat < actualHeatCost + requiredHeatFromEffects) {
            System.out.println("Chaleur insuffisante pour lancer le sort " + toCast.getNom());
            return;
        }

        caster.setManaCurrent(caster.getManaCurrent() - actualManaCost);
        caster.setHealthCurrent(caster.getHealthCurrent() - actualHealCost);
        
        // Malédiction: Hémorragie magique (Perte d'HP en % du mana consommé)
        if (actualManaCost > 0) {
            int hpLossPct = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_HP_LOSS_ON_MANA);
            if (hpLossPct != 0) {
                int hpLoss = (int) (actualManaCost * Math.abs(hpLossPct) / 100.0);
                if (hpLoss > 0) {
                    caster.takeDamage(hpLoss, generation.grimoire.enumeration.DamageType.BRUT, caster);
                    System.out.println(caster.getName() + " subit " + hpLoss + " dégâts de malédiction (Hémorragie magique) !");
                }
            }
        }
        caster.setPassiveState("destruction_heat", currentHeat - actualHeatCost);
        
        String costMsg2 = "";
        if (actualManaCost > 0) costMsg2 += actualManaCost + " mana, ";
        if (actualHealCost > 0) costMsg2 += actualHealCost + " PV, ";
        if (actualHeatCost > 0) costMsg2 += actualHeatCost + " chaleur, ";
        
        if (!costMsg2.isEmpty()) {
            costMsg2 = costMsg2.substring(0, costMsg2.length() - 2);
            int lastComma = costMsg2.lastIndexOf(", ");
            if (lastComma != -1) costMsg2 = costMsg2.substring(0, lastComma) + " et " + costMsg2.substring(lastComma + 2);
            System.out.println(caster.getName() + " dépense " + costMsg2 + " pour lancer " + toCast.getNom());
        }

        SpellCostPaidEvent costPaidEvent = new SpellCostPaidEvent(caster, target, toCast, actualManaCost, actualHealCost, actualHeatCost);
        passiveDispatcher.dispatch(caster, toCast, costPaidEvent);

        if (cType == SpellCastingType.INSTANTANE) {
            caster.setInstantSpellCastThisTurn(true);
        } else if (cType == SpellCastingType.BANAL) {
            caster.setBanalSpellCastThisTurn(true);
        } else if (cType == SpellCastingType.CANALISE) {
            caster.setBanalSpellCastThisTurn(true);
            caster.setRemainingChannelingTurns(toCast.getChannelingDuration());
            caster.setAllowInstantDuringCurrentChanneling(toCast.isAllowInstantDuringChanneling());
            caster.setChanneledSpell(toCast);
            caster.setChannelingTarget(target);
            caster.setChannelingChoiceKey(choiceKey);
            System.out.println(caster.getName() + " commence à canaliser " + toCast.getNom() + " pour " + toCast.getChannelingDuration() + " tours.");
        }

        applyConsumableBuffs(toCast, caster, target);

        // Appliquer les effets avec résolution de groupe
        for (SpellEffect effect : toCast.getEffects()) {
            if (effect.getRequiredChoiceKey() != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
                continue;
            }
            if (toCast.getCastingType() == SpellCastingType.CANALISE) {
                if (effect.getChannelingTurns() != null && !effect.getChannelingTurns().isEmpty()) {
                    if (!effect.getChannelingTurns().contains(1)) {
                        continue;
                    }
                }
            }

            // Vérification de la condition d'Âme Détachée
            if (effect.getDetachedSoulRequirement() != null && effect.getDetachedSoulRequirement() != generation.grimoire.enumeration.DetachedSoulRequirement.NOT_AFFECTED) {
                boolean hasAmeDetachee = caster.getActiveBuffs().stream()
                        .anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.AME_DETACHEE);
                
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.REQUIRED && !hasAmeDetachee) {
                    continue;
                }
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.FORBIDDEN && hasAmeDetachee) {
                    continue;
                }
            }

            java.util.List<Personnage> recipients = resolveRecipientsGroup(
                    effect.getEffectTarget(), caster, target, ally, allAllies, allEnemies);

            // Correctif: Les effets de chaleur doivent TOUJOURS s'appliquer au lanceur,
            // même si le sort cible un allié (pour éviter que l'allié reçoive la chaleur en multi).
            if (effect instanceof generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect
                    || effect instanceof generation.grimoire.entity.spell.type.effect.HeatFixedEffect
                    || effect instanceof generation.grimoire.entity.spell.type.effect.HeatPercentageEffect) {
                recipients = java.util.Collections.singletonList(caster);
            }

            for (Personnage recipient : recipients) {
                if (recipients.size() > 1) {
                    System.out.println("  ↳ Application sur : " + recipient.getName());
                }
                effect.apply(caster, recipient);
            }
        }

        SpellCastEvent spellCastEvent = new SpellCastEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, spellCastEvent);
    }

    /**
     * Résout les destinataires d'un effet en utilisant de vraies listes de personnages
     * au lieu de créer des simulés.
     */
    public static java.util.List<Personnage> resolveRecipientsGroup(
            generation.grimoire.enumeration.EffectTarget targetType,
            Personnage caster, Personnage target, Personnage ally,
            java.util.List<Personnage> allAllies, java.util.List<Personnage> allEnemies) {

        java.util.List<Personnage> recipients = new java.util.ArrayList<>();
        if (targetType == null) {
            if (target != null) recipients.add(target);
            return recipients;
        }
        switch (targetType) {
            case CASTER -> {
                if (caster != null) recipients.add(caster);
            }
            case TARGET -> {
                if (target != null) recipients.add(target);
            }
            case ALLY -> {
                if (ally != null && ally != caster) recipients.add(ally);
            }
            case ALL_ALLIES -> {
                if (allAllies != null) {
                    recipients.addAll(allAllies);
                }
            }
            case ALL_ENEMIES -> {
                if (allEnemies != null) {
                    recipients.addAll(allEnemies);
                    if (allEnemies.size() > 1) {
                        System.out.println("💥 [Zone d'Effet] Le sort se propage à l'ensemble des ennemis !");
                    }
                }
            }
            case ALL_COMBATANTS -> {
                if (allAllies != null) recipients.addAll(allAllies);
                if (allEnemies != null) recipients.addAll(allEnemies);
            }
        }
        return recipients.stream().distinct().toList();
    }

    /**
     * Sélectionne une variante du sort de base donné en fonction de conditions
     * spécifiques, de paramètres d'incantation
     * et de ciblage, ou d'une clé de variante choisie manuellement. La méthode
     * tente d'abord de sélectionner une
     * variante à l'aide d'une clé de choix fournie, puis évalue les conditions de
     * sélection automatique si aucune
     * correspondance n'est trouvée, et revient finalement à une sélection par
     * défaut si nécessaire.
     *
     * @param baseSpell the base spell being cast
     * @param caster    the character casting the spell
     * @param target    the target of the spell
     * @param choiceKey an optional key for explicitly selecting a spell variant
     * @return la variante de sort sélectionnée, ou le sort de base si aucune
     *         variante applicable n'est trouvée
     */
    private Spell selectVariant(Spell baseSpell,
            Personnage caster,
            Personnage target,
            Integer choiceKey) {

        // 1) Variante forcée par choiceKey si présent
        if (choiceKey != null && baseSpell.getVariantId() != null) {
            for (Spell v : spellRepository.findByVariantId(baseSpell.getVariantId())) {
                if (choiceKey.equals(v.getChoiceKey())) {
                    return v;
                }
            }
        }

        // 2) Sélection automatique par conditionType
        Integer vid = baseSpell.getVariantId();
        if (vid == null) {
            return baseSpell;
        }

        for (Spell variant : spellRepository.findByVariantId(vid)) {
            SpellCondition cond = variant.getConditionType();
            if (cond == null)
                continue;

            switch (cond) {
                case IS_ALLY:
                    if (caster.isAlly(target))
                        return variant;
                    break;
                case IS_ENNEMY:
                    if (!caster.isAlly(target))
                        return variant;
                    break;
                case IS_SPELLCASTER:
                    if (target.equals(caster))
                        return variant;
                    break;
                case IS_NOT_SPELLCASTER:
                    if (!target.equals(caster))
                        return variant;
                    break;
                case LOW_LIFE:
                    if (target.getHealthCurrent() < target.getTotalHealthMax() * 0.35)
                        return variant;
                    break;
                case HIGH_LIFE:
                    if (target.getHealthCurrent() > target.getTotalHealthMax() * 0.65)
                        return variant;
                    break;
                case HIGHER_RESISTANCE:
                    if (target.getResistance() > target.getArmor())
                        return variant;
                    break;
                case HIGHER_ARMURE:
                    if (target.getArmor() >= target.getResistance())
                        return variant;
                    break;
            }
        }

        // fallback sur la première
        List<Spell> all = spellRepository.findByVariantId(vid);
        return all.isEmpty() ? baseSpell : all.getFirst();
    }

    /**
     * Parcourt la liste des buffs consommables du caster, applique chacun d'eux sur
     * le sort,
     * et consomme ceux qui ont épuisé leur nombre d'applications.
     */
    private void applyConsumableBuffs(Spell spell, Personnage caster, Personnage target) {
        if (caster.getConsumableSpellBuffs() != null && !caster.getConsumableSpellBuffs().isEmpty()) {
            Iterator<ConsumableSpellBuffDebuffEffect> iterator = caster.getConsumableSpellBuffs().iterator();
            while (iterator.hasNext()) {
                ConsumableSpellBuffDebuffEffect buff = iterator.next();
                if (buff.isActive()) {
                    buff.applyToSpell(spell, caster, target);
                    if (!buff.isActive()) { // Consommé
                        iterator.remove();
                        System.out.println(caster.getName() + " a consommé un buff consumable.");
                    }
                }
            }
        }
    }

    public void tickChanneling(Personnage caster, Personnage target, Integer choiceKey) {
        Spell channeledSpell = caster.getChanneledSpell();
        if (channeledSpell == null) return;

        int duration = channeledSpell.getChannelingDuration();
        int remaining = caster.getRemainingChannelingTurns();
        int currentTurn = duration - remaining + 1;

        // Decrement remaining turns
        int newRemaining = remaining - 1;
        caster.setRemainingChannelingTurns(Math.max(0, newRemaining));
        if (newRemaining <= 0) {
            caster.setChanneledSpell(null);
            caster.setChannelingTarget(null);
            caster.setChannelingChoiceKey(null);
        }

        // Le T1 est déjà résolu au moment du cast (dans castSpell).
        // À la fin du tour de lancement, currentTurn vaut 1, on ne doit donc rien faire de plus.
        if (currentTurn == 1) {
            return;
        }

        System.out.println("🌀 [Canalisation] Résolution des effets pour le Tour " + currentTurn + " de " + channeledSpell.getNom());

        for (SpellEffect effect : channeledSpell.getEffects()) {
            if (effect.getRequiredChoiceKey() != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
                continue;
            }
            if (effect.getChannelingTurns() != null && !effect.getChannelingTurns().isEmpty()) {
                if (!effect.getChannelingTurns().contains(currentTurn)) {
                    continue;
                }
            }

            // Vérification de la condition d'Âme Détachée
            if (effect.getDetachedSoulRequirement() != null && effect.getDetachedSoulRequirement() != generation.grimoire.enumeration.DetachedSoulRequirement.NOT_AFFECTED) {
                boolean hasAmeDetachee = caster.getActiveBuffs().stream()
                        .anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.AME_DETACHEE);
                
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.REQUIRED && !hasAmeDetachee) {
                    continue;
                }
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.FORBIDDEN && hasAmeDetachee) {
                    continue;
                }
            }

            java.util.List<Personnage> recipients = resolveRecipients(effect.getEffectTarget(), caster, target);

            for (Personnage recipient : recipients) {
                effect.apply(caster, recipient);
            }
        }
    }

    public void tickChanneling(Personnage caster, Personnage target, Integer choiceKey, Personnage ally, java.util.List<Personnage> allAllies, java.util.List<Personnage> allEnemies) {
        Spell channeledSpell = caster.getChanneledSpell();
        if (channeledSpell == null) return;

        int duration = channeledSpell.getChannelingDuration();
        int remaining = caster.getRemainingChannelingTurns();
        int currentTurn = duration - remaining + 1;

        // Decrement remaining turns
        int newRemaining = remaining - 1;
        caster.setRemainingChannelingTurns(Math.max(0, newRemaining));
        if (newRemaining <= 0) {
            caster.setChanneledSpell(null);
            caster.setChannelingTarget(null);
            caster.setChannelingChoiceKey(null);
        }

        // Le T1 est déjà résolu au moment du cast (dans castSpellGroup).
        // À la fin du tour de lancement, currentTurn vaut 1, on ne doit donc rien faire de plus.
        if (currentTurn == 1) {
            return;
        }

        System.out.println("🌀 [Canalisation] Résolution des effets pour le Tour " + currentTurn + " de " + channeledSpell.getNom());

        for (SpellEffect effect : channeledSpell.getEffects()) {
            if (effect.getRequiredChoiceKey() != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
                continue;
            }
            if (effect.getChannelingTurns() != null && !effect.getChannelingTurns().isEmpty()) {
                if (!effect.getChannelingTurns().contains(currentTurn)) {
                    continue;
                }
            }

            // Vérification de la condition d'Âme Détachée
            if (effect.getDetachedSoulRequirement() != null && effect.getDetachedSoulRequirement() != generation.grimoire.enumeration.DetachedSoulRequirement.NOT_AFFECTED) {
                boolean hasAmeDetachee = caster.getActiveBuffs().stream()
                        .anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.AME_DETACHEE);
                
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.REQUIRED && !hasAmeDetachee) {
                    continue;
                }
                if (effect.getDetachedSoulRequirement() == generation.grimoire.enumeration.DetachedSoulRequirement.FORBIDDEN && hasAmeDetachee) {
                    continue;
                }
            }

            java.util.List<Personnage> recipients = resolveRecipientsGroup(effect.getEffectTarget(), caster, target, ally, allAllies, allEnemies);

            for (Personnage recipient : recipients) {
                effect.apply(caster, recipient);
            }
        }
    }

    /**
     * Enregistre un sort en base de données.
     *
     * @param spell le sort à enregistrer
     */
    public void saveSpell(@org.springframework.lang.NonNull Spell spell) {
        spellRepository.save(spell);
    }

    public static java.util.List<Personnage> resolveRecipients(generation.grimoire.enumeration.EffectTarget targetType, Personnage caster, Personnage target) {
        java.util.List<Personnage> recipients = new java.util.ArrayList<>();
        if (targetType == null) {
            if (target != null) recipients.add(target);
            return recipients;
        }
        switch (targetType) {
            case CASTER -> {
                if (caster != null) recipients.add(caster);
            }
            case TARGET -> {
                if (target != null) recipients.add(target);
            }
            case ALLY -> {
                if (caster != null) {
                    Personnage simulatedAlly = new Personnage();
                    simulatedAlly.setName("Compagnon Allié");
                    simulatedAlly.setHealthMax(caster.getTotalHealthMax());
                    simulatedAlly.setHealthCurrent(caster.getHealthCurrent());
                    simulatedAlly.setTeamId(caster.getTeamId());
                    recipients.add(simulatedAlly);
                }
            }
            case ALL_ALLIES -> {
                if (caster != null) {
                    recipients.add(caster);
                    Personnage simulatedAlly = new Personnage();
                    simulatedAlly.setName("Compagnon Allié");
                    simulatedAlly.setHealthMax(caster.getTotalHealthMax());
                    simulatedAlly.setHealthCurrent(caster.getHealthCurrent());
                    simulatedAlly.setTeamId(caster.getTeamId());
                    recipients.add(simulatedAlly);
                }
            }
            case ALL_ENEMIES -> {
                if (target != null) {
                    recipients.add(target);
                    System.out.println("💥 [Zone d'Effet] Le sort se propage à l'ensemble des ennemis proches !");
                }
            }
            case ALL_COMBATANTS -> {
                if (caster != null) {
                    recipients.add(caster);
                    Personnage simulatedAlly = new Personnage();
                    simulatedAlly.setName("Compagnon Allié");
                    simulatedAlly.setHealthMax(caster.getTotalHealthMax());
                    simulatedAlly.setHealthCurrent(caster.getHealthCurrent());
                    simulatedAlly.setTeamId(caster.getTeamId());
                    recipients.add(simulatedAlly);
                }
                if (target != null) {
                    recipients.add(target);
                }
            }
        }
        return recipients.stream().distinct().toList();
    }

    public void startTurn(Personnage personnage) {
        personnage.startTurn();
        personnage.setBanalSpellCastThisTurn(false);
        personnage.updateHealOverTimeEffects();
        personnage.updateManaOverTimeEffects();
        personnage.updateDamageOverTimeEffects();
        personnage.updateHeatOverTimeEffects();
        personnage.updateBuffs();
        passiveDispatcher.dispatch(personnage, null, new TurnStartEvent(personnage));
    }

}
