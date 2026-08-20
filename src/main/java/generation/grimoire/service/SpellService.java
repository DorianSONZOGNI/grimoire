package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.HeatFixedEffect;
import generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HeatPercentageEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.DetachedSoulRequirement;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.enumeration.EquipmentEffectType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.*;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.utils.StatCalculator;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Slf4j
@Service
@Transactional
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
     * Lance un sort sur une cible simple.
     *
     * @param spell  le sort à lancer
     * @param caster le personnage qui lance le sort
     * @param target la cible du sort
     * 
     */
    public void castSpell(Spell spell, Personnage caster, Personnage target, Integer choiceKey) {
        SpellCastingType[] cTypeOut = new SpellCastingType[1];
        Spell toCast = prepareAndPayCosts(spell, caster, target, choiceKey, cTypeOut);
        if (toCast == null) return;
        SpellCastingType cType = cTypeOut[0];

        updateCastingState(caster, target, null, toCast, cType, choiceKey);
        applyConsumableBuffs(toCast, caster, target);

        for (SpellEffect effect : toCast.getEffects()) {
            List<Personnage> recipients = resolveRecipients(effect.getEffectTarget(), caster, target);
            processAndApplyEffect(toCast, effect, choiceKey, 1, caster, recipients);
        }

        SpellCastEvent spellCastEvent = new SpellCastEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, spellCastEvent);
    }

    /**
     * Version "groupe" de castSpell qui résout les destinataires en utilisant de vraies listes
     * d'alliés et d'ennemis (pour le bac à sable).
     */
    public void castSpellGroup(Spell spell, Personnage caster, Personnage target,
                               Personnage ally, List<Personnage> allAllies,
                               List<Personnage> allEnemies, Integer choiceKey) {
        SpellCastingType[] cTypeOut = new SpellCastingType[1];
        Spell toCast = prepareAndPayCosts(spell, caster, target, choiceKey, cTypeOut);
        if (toCast == null) return;
        SpellCastingType cType = cTypeOut[0];

        updateCastingState(caster, target, ally, toCast, cType, choiceKey);
        applyConsumableBuffs(toCast, caster, target);

        for (SpellEffect effect : toCast.getEffects()) {
            List<Personnage> recipients = resolveRecipientsGroup(effect.getEffectTarget(), caster, target, ally, allAllies, allEnemies);
            processAndApplyEffect(toCast, effect, choiceKey, 1, caster, recipients);
        }

        SpellCastEvent spellCastEvent = new SpellCastEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, spellCastEvent);
    }

    private Spell prepareAndPayCosts(Spell spell, Personnage caster, Personnage target, Integer choiceKey, SpellCastingType[] cTypeOut) {
        Spell toCast = selectVariant(spell, caster, target, choiceKey);

        String castError = caster.canCast(toCast);
        if (castError != null) {
            log.warn("🚫 {}", castError);
            return null;
        }

        SpellCastingType cType = toCast.getCastingType();
        if (cType == null) cType = SpellCastingType.BANAL;

        CastingTypeAdjustEvent castingEvent = new CastingTypeAdjustEvent(caster, target, toCast, cType);
        passiveDispatcher.dispatch(caster, toCast, castingEvent);
        cType = castingEvent.getCurrentType();

        if (!canCastInternal(caster, target, toCast, cType)) return null;
        if (!payCosts(caster, target, toCast, choiceKey)) return null;

        cTypeOut[0] = cType;
        return toCast;
    }

    /**
     * Résout les destinataires d'un effet en utilisant de vraies listes de personnages
     * au lieu de créer des simulés.
     */
    public static List<Personnage> resolveRecipientsGroup(
            EffectTarget targetType,
            Personnage caster, Personnage target, Personnage ally,
            List<Personnage> allAllies, List<Personnage> allEnemies) {

        List<Personnage> recipients = new ArrayList<>();
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
                        log.debug("💥 [Zone d'Effet] Le sort se propage à l'ensemble des ennemis !");
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

        // Charger les variantes une seule fois pour éviter des requêtes DB multiples
        List<Spell> variants = baseSpell.getVariantId() != null
                ? spellRepository.findByVariantId(baseSpell.getVariantId())
                : List.of();

        // 1) Variante forcée par choiceKey si présent
        if (choiceKey != null && baseSpell.getVariantId() != null) {
            for (Spell v : variants) {
                if (choiceKey.equals(v.getChoiceKey())) {
                    return v;
                }
            }
        }

        // 2) Sélection automatique par conditionType
        if (baseSpell.getVariantId() == null) {
            return baseSpell;
        }

        for (Spell variant : variants) {
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
        return variants.isEmpty() ? baseSpell : variants.getFirst();
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
                        log.debug("{} a consommé un buff consumable.", caster.getName());
                    }
                }
            }
        }
    }

    public void tickChanneling(Personnage caster, Personnage target, Integer choiceKey) {
        Spell channeledSpell = processChannelingTurn(caster);
        if (channeledSpell == null) return;
        
        int currentTurn = channeledSpell.getChannelingDuration() - caster.getRemainingChannelingTurns();

        for (SpellEffect effect : channeledSpell.getEffects()) {
            List<Personnage> recipients = resolveRecipients(effect.getEffectTarget(), caster, target);
            processAndApplyEffect(channeledSpell, effect, choiceKey, currentTurn, caster, recipients);
        }
    }

    public void tickChanneling(Personnage caster, Personnage target, Integer choiceKey, Personnage ally, List<Personnage> allAllies, List<Personnage> allEnemies) {
        Spell channeledSpell = processChannelingTurn(caster);
        if (channeledSpell == null) return;
        
        int currentTurn = channeledSpell.getChannelingDuration() - caster.getRemainingChannelingTurns();

        for (SpellEffect effect : channeledSpell.getEffects()) {
            List<Personnage> recipients = resolveRecipientsGroup(effect.getEffectTarget(), caster, target, ally, allAllies, allEnemies);
            processAndApplyEffect(channeledSpell, effect, choiceKey, currentTurn, caster, recipients);
        }
    }

    private Spell processChannelingTurn(Personnage caster) {
        Spell channeledSpell = caster.getChanneledSpell();
        if (channeledSpell == null) return null;

        int duration = channeledSpell.getChannelingDuration();
        int remaining = caster.getRemainingChannelingTurns();
        int currentTurn = duration - remaining + 1;

        int newRemaining = remaining - 1;
        caster.setRemainingChannelingTurns(Math.max(0, newRemaining));
        if (newRemaining <= 0) {
            caster.setChanneledSpell(null);
            caster.setChannelingTarget(null);
            caster.setChannelingAlly(null);
            caster.setChannelingChoiceKey(null);
        }

        if (currentTurn == 1) {
            return null;
        }

        log.debug("🌀 [Canalisation] Résolution des effets pour le Tour {} de {}", currentTurn, channeledSpell.getNom());
        return channeledSpell;
    }

    /**
     * Enregistre un sort en base de données.
     *
     * @param spell le sort à enregistrer
     */
    public void saveSpell(@org.springframework.lang.NonNull Spell spell) {
        spellRepository.save(spell);
    }

    public static List<Personnage> resolveRecipients(EffectTarget targetType, Personnage caster, Personnage target) {
        List<Personnage> recipients = new ArrayList<>();
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
                // Fantôme 1v1 : effets perdus, normal en mode test
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
                // Fantôme 1v1 : effets perdus, normal en mode test
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
                    log.debug("💥 [Zone d'Effet] Le sort se propage à l'ensemble des ennemis !");
                }
            }
            case ALL_COMBATANTS -> {
                // Fantôme 1v1 : effets perdus, normal en mode test
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
        
        checkAndCancelDeadChanneling(personnage);
    }

    public void checkAndCancelDeadChanneling(Personnage caster) {
        Spell channeledSpell = caster.getChanneledSpell();
        if (channeledSpell == null || caster.getRemainingChannelingTurns() <= 0) return;

        Personnage target = caster.getChannelingTarget();
        Personnage ally = caster.getChannelingAlly();
        int duration = channeledSpell.getChannelingDuration();
        int remaining = caster.getRemainingChannelingTurns();
        int currentTurn = duration - remaining + 1;

        if (target != null && target.getHealthCurrent() <= 0) {
            boolean targetsSpecificThisTurn = false;
            for (SpellEffect effect : channeledSpell.getEffects()) {
                if (effect.getEffectTarget() == EffectTarget.TARGET) {
                    if (effect.getChannelingTurns() == null || effect.getChannelingTurns().isEmpty() || effect.getChannelingTurns().contains(currentTurn)) {
                        targetsSpecificThisTurn = true;
                        break;
                    }
                }
            }
            if (targetsSpecificThisTurn) {
                log.debug("🌀 {} interrompt sa canalisation au T{} : la cible est morte !", caster.getName(), currentTurn);
                caster.cancelChanneling();
                return;
            }
        }

        if (ally != null && ally.getHealthCurrent() <= 0) {
            boolean targetsAllyThisTurn = false;
            for (SpellEffect effect : channeledSpell.getEffects()) {
                if (effect.getEffectTarget() == EffectTarget.ALLY) {
                    if (effect.getChannelingTurns() == null || effect.getChannelingTurns().isEmpty() || effect.getChannelingTurns().contains(currentTurn)) {
                        targetsAllyThisTurn = true;
                        break;
                    }
                }
            }
            if (targetsAllyThisTurn) {
                log.debug("🌀 {} interrompt sa canalisation au T{} : l'allié ciblé est mort !", caster.getName(), currentTurn);
                caster.cancelChanneling();
                return;
            }
        }
    }



    private boolean canCastInternal(Personnage caster, Personnage target, Spell toCast, SpellCastingType cType) {
        if (caster.getRemainingChannelingTurns() > 0) {
            if (cType != SpellCastingType.INSTANTANE) {
                log.debug("{} ne peut pas lancer de sort banal ou canalisé pendant sa canalisation.", caster.getName());
                return false;
            }
            if (!caster.isAllowInstantDuringCurrentChanneling()) {
                log.debug("{} ne peut pas lancer de sort instantané pendant cette canalisation.", caster.getName());
                return false;
            }
        }

        if (caster.isBanalSpellCastThisTurn() && caster.getRemainingChannelingTurns() == 0) {
            log.debug("{} a déjà lancé un sort banal ce tour-ci.", caster.getName());
            return false;
        }

        if (cType == SpellCastingType.INSTANTANE && caster.isInstantSpellCastThisTurn()) {
            log.debug("{} a déjà lancé un sort instantané ce tour-ci.", caster.getName());
            return false;
        }

        CanCastCheckEvent canCastEvent = new CanCastCheckEvent(caster, target, toCast);
        passiveDispatcher.dispatch(caster, toCast, canCastEvent);
        return canCastEvent.isAllowed();
    }

    private boolean payCosts(Personnage caster, Personnage target, Spell toCast, Integer choiceKey) {
        int actualManaCost = toCast.getManaCost();
        if (toCast.getPercentManaCost() > 0) {
            double manaBase = StatCalculator.getSourceValue(
                    toCast.getPercentManaCostSource() != null ? toCast.getPercentManaCostSource() : Source.CASTER_MANA_MAX, caster, target);
            actualManaCost += (int) (manaBase * toCast.getPercentManaCost() / 100);
        }
        int actualHealCost = toCast.getHealCost();
        if (toCast.getPercentHealCost() > 0) {
            double healBase = StatCalculator.getSourceValue(
                    toCast.getPercentHealCostSource() != null ? toCast.getPercentHealCostSource() : Source.CASTER_HEALTH_MAX, caster, target);
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
        actualHeatCost = costs[2];

        int requiredHeatFromEffects = 0;
        if (toCast.getEffects() != null) {
            for (SpellEffect effect : toCast.getEffects()) {
                if (effect.getRequiredChoiceKey() != null && choiceKey != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
                    continue;
                }
                if (effect instanceof HeatFixedEffect hfe) {
                    if (hfe.getAmount() < 0) {
                        requiredHeatFromEffects += -hfe.getAmount();
                    }
                }
            }
        }

        if (caster.getManaCurrent() < actualManaCost) {
            log.debug("Mana insuffisant pour lancer le sort {}", toCast.getNom());
            return false;
        }
        if (caster.getHealthCurrent() < actualHealCost) {
            log.debug("PV insuffisants pour lancer le sort {}", toCast.getNom());
            return false;
        }
        int currentHeat = caster.getPassiveState("destruction_heat", 0);
        if (currentHeat < actualHeatCost + requiredHeatFromEffects) {
            log.debug("Chaleur insuffisante pour lancer le sort {}", toCast.getNom());
            return false;
        }

        caster.setManaCurrent(caster.getManaCurrent() - actualManaCost);
        caster.setHealthCurrent(caster.getHealthCurrent() - actualHealCost);
        
        if (actualManaCost > 0) {
            int hpLossPct = caster.getSpecialEffectValue(EquipmentEffectType.CURSED_HP_LOSS_ON_MANA);
            if (hpLossPct != 0) {
                int hpLoss = (int) (actualManaCost * Math.abs(hpLossPct) / 100.0);
                if (hpLoss > 0) {
                    caster.takeDamage(hpLoss, DamageType.BRUT, caster);
                    log.debug("{} subit {} dégâts de malédiction (Hémorragie magique) !", caster.getName(), hpLoss);
                }
            }
            
            int vitalArcanePct = caster.getSpecialEffectValue(EquipmentEffectType.VITAL_ARCANE);
            if (vitalArcanePct > 0) {
                int heal = (int) (actualManaCost * vitalArcanePct / 100.0);
                if (heal > 0) {
                    caster.heal(heal);
                    log.debug("✨ Arcane Vitale soigne {} de {} PV.", caster.getName(), heal);
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
            log.debug("{} dépense {} pour lancer {}", caster.getName(), costMsg, toCast.getNom());
        }

        SpellCostPaidEvent costPaidEvent = new SpellCostPaidEvent(caster, target, toCast, actualManaCost, actualHealCost, actualHeatCost);
        passiveDispatcher.dispatch(caster, toCast, costPaidEvent);
        return true;
    }

    private void updateCastingState(Personnage caster, Personnage target, Personnage ally, Spell toCast, SpellCastingType cType, Integer choiceKey) {
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
            caster.setChannelingAlly(ally);
            caster.setChannelingChoiceKey(choiceKey);
            log.debug("{} commence à canaliser {} pour {} tours.", caster.getName(), toCast.getNom(), toCast.getChannelingDuration());
        }
    }

    private void processAndApplyEffect(Spell toCast, SpellEffect effect, Integer choiceKey, int currentTurn, Personnage caster, List<Personnage> recipients) {
        if (effect.getRequiredChoiceKey() != null && !effect.getRequiredChoiceKey().equals(choiceKey)) {
            return;
        }
        if (toCast.getCastingType() == SpellCastingType.CANALISE) {
            if (effect.getChannelingTurns() != null && !effect.getChannelingTurns().isEmpty()) {
                if (!effect.getChannelingTurns().contains(currentTurn)) {
                    return;
                }
            }
        }

        if (effect.getDetachedSoulRequirement() != null && effect.getDetachedSoulRequirement() != DetachedSoulRequirement.NOT_AFFECTED) {
            boolean hasAmeDetachee = caster.getActiveBuffs().stream()
                    .anyMatch(b -> b.getStatAffected() == StatType.AME_DETACHEE);
            
            if (effect.getDetachedSoulRequirement() == DetachedSoulRequirement.REQUIRED && !hasAmeDetachee) {
                return;
            }
            if (effect.getDetachedSoulRequirement() == DetachedSoulRequirement.FORBIDDEN && hasAmeDetachee) {
                return;
            }
        }

        // Correctif unifié: Les effets de chaleur doivent TOUJOURS s'appliquer au lanceur,
        // même si le sort cible un allié.
        List<Personnage> finalRecipients = recipients;
        if (effect instanceof HeatOverTimeEffect || effect instanceof HeatFixedEffect || effect instanceof HeatPercentageEffect) {
            finalRecipients = java.util.Collections.singletonList(caster);
        }

        for (Personnage recipient : finalRecipients) {
            if (finalRecipients.size() > 1) {
                log.debug("  ↳ Application sur : {}", recipient.getName());
            }
            effect.apply(caster, recipient);
        }
        
        effect.resetModifiers();
    }

}
