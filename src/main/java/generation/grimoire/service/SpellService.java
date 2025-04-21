package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.enumeration.SpellCategory;
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

    public void castSpellInvoq(Long spellId,
                          Long casterId,
                          Long targetId,
                          Integer choiceKey) {
        Spell baseSpell = spellRepository.findById(spellId)
                .orElseThrow(() -> new EntityNotFoundException("Sort non trouvé : " + spellId));
        Personnage caster = personnageService.findByIdOrThrow(casterId);
        Personnage target = personnageService.findByIdOrThrow(targetId);

        this.castSpell(baseSpell, caster, target, choiceKey);
    }

    /**
     * Lance un sort en déduisant les coûts en mana et en heal,
     * en appliquant ses effets, puis en déclenchant les passifs de la voie du caster.
     *
     * @param spell         le sort à lancer
     * @param caster        le personnage qui lance le sort
     * @param target        la cible du sort
     */
    public void castSpell(Spell spell, Personnage caster, Personnage target, Integer choiceKey) {

        // Dans le cas d'un variant, on détermine lequel est sélectioné
        Spell toCast = selectVariant(spell, caster, target, choiceKey);

        // Calcul du coût en mana fixe + pourcentage
        int actualManaCost = toCast.getManaCost();
        if (toCast.getPercentManaCost() > 0) {
            actualManaCost += caster.getManaMax() * toCast.getPercentManaCost() / 100;
        }

        // Calcul du coût en heal fixe + pourcentage (si applicable)
        int actualHealCost = toCast.getHealCost();
        if (toCast.getPercentHealCost() > 0) {
            actualHealCost += caster.getHealthMax() * toCast.getPercentHealCost() / 100;
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

        // Appliquer les buffs consommables de manière générique
        applyConsumableBuffs(toCast, caster, target);

        // Appliquer chacun des effets du sort
        for (SpellEffect effect : toCast.getEffects()) {
            effect.apply(caster, target);
        }

        // Déclencher les passifs liés à la voie du caster
        if (caster.getVoie() != null && caster.getVoie().getPassiveEffects() != null) {
            caster.getVoie().getPassiveEffects().forEach(passif ->
                    passif.onSpellCast(caster, spell)
            );
        }
    }

    /**
     * Sélectionne une variante du sort de base donné en fonction de conditions spécifiques, de paramètres d'incantation
     * et de ciblage, ou d'une clé de variante choisie manuellement. La méthode tente d'abord de sélectionner une
     * variante à l'aide d'une clé de choix fournie, puis évalue les conditions de sélection automatique si aucune
     * correspondance n'est trouvée, et revient finalement à une sélection par défaut si nécessaire.
     *
     * @param baseSpell the base spell being cast
     * @param caster the character casting the spell
     * @param target the target of the spell
     * @param choiceKey an optional key for explicitly selecting a spell variant
     * @return la variante de sort sélectionnée, ou le sort de base si aucune variante applicable n'est trouvée
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
            if (cond == null) continue;

            switch (cond) {
                case IS_ALLY:
                    if (caster.isAlly(target)) return variant;
                    break;
                case IS_ENNEMY:
                    if (!caster.isAlly(target)) return variant;
                    break;
                case IS_SPELLCASTER:
                    if (target.equals(caster)) return variant;
                    break;
                case IS_NOT_SPELLCASTER:
                    if (!target.equals(caster)) return variant;
                    break;
                case LOW_LIFE:
                    if (target.getHealthCurrent() < target.getHealthMax() * 0.35) return variant;
                    break;
                case HIGH_LIFE:
                    if (target.getHealthCurrent() > target.getHealthMax() * 0.65) return variant;
                    break;
                case HIGHER_RESISTANCE:
                    if (target.getResistance() > target.getArmor()) return variant;
                    break;
                case HIGHER_ARMURE:
                    if (target.getArmor() >= target.getResistance()) return variant;
                    break;
            }
        }

        // fallback sur la première
        List<Spell> all = spellRepository.findByVariantId(vid);
        return all.isEmpty() ? baseSpell : all.getFirst();
    }


    /**
     * Parcourt la liste des buffs consommables du caster, applique chacun d'eux sur le sort,
     * et consomme ceux qui ont épuisé leur nombre d'applications.
     */
    private void applyConsumableBuffs(Spell spell, Personnage caster, Personnage target) {
        if (caster.getConsumableSpellBuffs() != null && !caster.getConsumableSpellBuffs().isEmpty()) {
            Iterator<ConsumableSpellBuffDebuffEffect> iterator = caster.getConsumableSpellBuffs().iterator();
            while (iterator.hasNext()) {
                ConsumableSpellBuffDebuffEffect buff = iterator.next();
                if (buff.isActive()) {
                    buff.applyToSpell(spell, caster, target);
                    if (!buff.isActive()) {  // Consommé
                        iterator.remove();
                        System.out.println(caster.getName() + " a consommé un buff consumable.");
                    }
                }
            }
        }
    }

    /**
     * Enregistre un sort en base de données.
     *
     * @param spell le sort à enregistrer
     */
    public void saveSpell(Spell spell) {
        spellRepository.save(spell);
    }

}
