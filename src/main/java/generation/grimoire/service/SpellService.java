package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.repository.SpellRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Iterator;
import java.util.List;

@Service
public class SpellService {

    private final SpellRepository spellRepository;
    private final PersonnageService personnageService;

    public SpellService(SpellRepository spellRepository, PersonnageService personnageService) {
        this.spellRepository = spellRepository;
        this.personnageService = personnageService;
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
     * en appliquant ses effets, puis en déclenchant les passifs de la voie du
     * caster.
     *
     * @param spell  le sort à lancer
     * @param caster le personnage qui lance le sort
     * @param target la cible du sort
     */
    public void castSpell(Spell spell, Personnage caster, Personnage target, Integer choiceKey) {

        // Dans le cas d'un variant, on détermine lequel est sélectioné
        Spell toCast = selectVariant(spell, caster, target, choiceKey);

        // 1) Enforce category casting limits
        generation.grimoire.enumeration.SpellCastingType cType = toCast.getCastingType();
        if (cType == null) {
            cType = generation.grimoire.enumeration.SpellCastingType.BANAL;
        }

        // Rule A: If currently channeling
        if (caster.getRemainingChannelingTurns() > 0) {
            if (cType != generation.grimoire.enumeration.SpellCastingType.INSTANTANE) {
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
        if (cType == generation.grimoire.enumeration.SpellCastingType.INSTANTANE && caster.isInstantSpellCastThisTurn()) {
            System.out.println(caster.getName() + " a déjà lancé un sort instantané ce tour-ci.");
            return;
        }

        // Validation des prérequis de la spiritualité associée au sort
        if (toCast.getSpiritualite() != null && toCast.getSpiritualite().getPassiveEffects() != null) {
            for (SpiritualitePassiveEffect passif : toCast.getSpiritualite().getPassiveEffects()) {
                if (!passif.canCastSpell(caster, toCast)) {
                    return; // Interrompt le lancement si le prérequis n'est pas satisfait
                }
            }
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

        // Vérifier que le caster dispose des ressources nécessaires
        if (caster.getManaCurrent() < actualManaCost) {
            System.out.println("Mana insuffisant pour lancer le sort " + toCast.getNom());
            return;
        }
        if (caster.getHealthCurrent() < actualHealCost) {
            System.out.println("PV insuffisants pour lancer le sort " + toCast.getNom());
            return;
        }

        // Déduire les coûts
        caster.setManaCurrent(caster.getManaCurrent() - actualManaCost);
        caster.setHealthCurrent(caster.getHealthCurrent() - actualHealCost);
        System.out.println(caster.getName() + " dépense " + actualManaCost + " mana et " + actualHealCost
                + " PV pour lancer " + toCast.getNom());

        // Mettre à jour l'état de lancement du caster
        if (cType == generation.grimoire.enumeration.SpellCastingType.INSTANTANE) {
            caster.setInstantSpellCastThisTurn(true);
        } else if (cType == generation.grimoire.enumeration.SpellCastingType.BANAL) {
            caster.setBanalSpellCastThisTurn(true);
        } else if (cType == generation.grimoire.enumeration.SpellCastingType.CANALISE) {
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
            if (toCast.getCastingType() == generation.grimoire.enumeration.SpellCastingType.CANALISE) {
                if (effect.getChannelingTurns() != null && !effect.getChannelingTurns().isEmpty()) {
                    if (!effect.getChannelingTurns().contains(1)) {
                        continue; // L'effet ne s'active pas au Tour 1
                    }
                }
            }
            java.util.List<Personnage> recipients = new java.util.ArrayList<>();
            String expr = effect.getTargetExpression();

            if (expr == null || expr.trim().isEmpty()) {
                // Règle par défaut issue de l'énumération basique
                recipients.add((effect.getEffectTarget() != null && effect.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.CASTER) ? caster : target);
            } else {
                System.out.println("⚡ [Ciblage Avancé] Analyse de l'expression de cible : '" + expr + "'");
                String lower = expr.toLowerCase();
                boolean targetsCaster = lower.contains("lanceur") || lower.contains("soi");
                boolean targetsAlly = lower.contains("allié") || lower.contains("allier");
                boolean targetsEnemy = lower.contains("cible") || lower.contains("ennemi");

                if (targetsCaster) {
                    recipients.add(caster);
                }
                if (targetsAlly) {
                    // Simulation contextuelle d'un compagnon/allié proche impacté
                    Personnage simulatedAlly = new Personnage();
                    simulatedAlly.setName("Compagnon Allié");
                    simulatedAlly.setHealthMax(caster.getHealthMax());
                    simulatedAlly.setHealthCurrent(caster.getHealthCurrent());
                    recipients.add(simulatedAlly);
                }
                if (targetsEnemy || (!targetsCaster && !targetsAlly)) {
                    recipients.add(target);
                    if (lower.contains("tous") || lower.contains("tout")) {
                        System.out.println("💥 [Zone d'Effet] Le sort se propage à l'ensemble des ennemis proches !");
                    }
                }
                // Dédoublonnage pour éviter d'appliquer deux fois à la même instance
                recipients = recipients.stream().distinct().toList();
            }

            // Application concrète de l'effet sur chaque destinataire résolu
            for (Personnage recipient : recipients) {
                if (recipients.size() > 1) {
                    System.out.println("  ↳ Application sur : " + recipient.getName());
                }
                effect.apply(caster, recipient);
            }
        }

        // Déclencher les passifs liés à la voie du caster
        if (caster.getVoie() != null && caster.getVoie().getPassiveEffects() != null) {
            caster.getVoie().getPassiveEffects().forEach(passif -> passif.onSpellCast(caster, spell));
        }

        // Déclencher les passifs liés à la spiritualité du caster
        if (caster.getSpiritualite() != null && caster.getSpiritualite().getPassiveEffects() != null) {
            caster.getSpiritualite().getPassiveEffects().forEach(passif -> passif.onSpellCast(caster, spell));
        }

        // Déclencher les passifs liés à la spiritualité attribuée au sort (si différente de celle du caster)
        if (toCast.getSpiritualite() != null && toCast.getSpiritualite().getPassiveEffects() != null) {
            if (caster.getSpiritualite() == null || !caster.getSpiritualite().equals(toCast.getSpiritualite())) {
                toCast.getSpiritualite().getPassiveEffects().forEach(passif -> passif.onSpellCast(caster, spell));
            }
        }
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
                    if (target.getHealthCurrent() < target.getHealthMax() * 0.35)
                        return variant;
                    break;
                case HIGH_LIFE:
                    if (target.getHealthCurrent() > target.getHealthMax() * 0.65)
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

            java.util.List<Personnage> recipients = new java.util.ArrayList<>();
            String expr = effect.getTargetExpression();

            if (expr == null || expr.trim().isEmpty()) {
                recipients.add((effect.getEffectTarget() != null && effect.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.CASTER) ? caster : target);
            } else {
                String lower = expr.toLowerCase();
                boolean targetsCaster = lower.contains("lanceur") || lower.contains("soi");
                boolean targetsAlly = lower.contains("allié") || lower.contains("allier");
                boolean targetsEnemy = lower.contains("cible") || lower.contains("ennemi");

                if (targetsCaster) {
                    recipients.add(caster);
                }
                if (targetsAlly) {
                    Personnage simulatedAlly = new Personnage();
                    simulatedAlly.setName("Compagnon Allié");
                    simulatedAlly.setHealthMax(caster.getHealthMax());
                    simulatedAlly.setHealthCurrent(caster.getHealthCurrent());
                    recipients.add(simulatedAlly);
                }
                if (targetsEnemy || (!targetsCaster && !targetsAlly)) {
                    recipients.add(target);
                }
                recipients = recipients.stream().distinct().toList();
            }

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

}
