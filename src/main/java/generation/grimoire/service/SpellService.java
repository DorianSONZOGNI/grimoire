package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.repository.SpellRepository;
import org.springframework.stereotype.Service;

import java.util.Iterator;

@Service
public class SpellService {

    private final SpellRepository spellRepository;

    public SpellService(SpellRepository spellRepository) {
        this.spellRepository = spellRepository;
    }

    /**
     * Lance un sort en déduisant les coûts en mana et en heal,
     * en appliquant ses effets, puis en déclenchant les passifs de la voie du caster.
     *
     * @param spell         le sort à lancer
     * @param caster        le personnage qui lance le sort
     * @param target        la cible du sort
     */
    public void castSpell(Spell spell, Personnage caster, Personnage target, SpellCategory defaultCategory) {
        // Calcul du coût en mana fixe + pourcentage
        int actualManaCost = spell.getManaCost();
        if (spell.getPercentManaCost() > 0) {
            actualManaCost += caster.getManaMax() * spell.getPercentManaCost() / 100;
        }

        // Calcul du coût en heal fixe + pourcentage (si applicable)
        int actualHealCost = spell.getHealCost();
        if (spell.getPercentHealCost() > 0) {
            actualHealCost += caster.getHealthMax() * spell.getPercentHealCost() / 100;
        }

        // Vérifier que le caster dispose des ressources nécessaires
        if (caster.getManaCurrent() < actualManaCost) {
            System.out.println("Mana insuffisant pour lancer le sort " + spell.getNom());
            return;
        }
        if (caster.getHealthCurrent() < actualHealCost) {
            System.out.println("PV insuffisants pour lancer le sort " + spell.getNom());
            return;
        }

        // Déduire les coûts
        caster.setManaCurrent(caster.getManaCurrent() - actualManaCost);
        caster.setHealthCurrent(caster.getHealthCurrent() - actualHealCost);
        System.out.println(caster.getName() + " dépense " + actualManaCost + " mana et " + actualHealCost
                + " PV pour lancer " + spell.getNom());

        // Appliquer les buffs consommables de manière générique
        applyConsumableBuffs(spell, caster);

        // Appliquer chacun des effets du sort
        for (SpellEffect effect : spell.getEffects()) {
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
     * Parcourt la liste des buffs consommables du caster, applique chacun d'eux sur le sort,
     * et consomme ceux qui ont épuisé leur nombre d'applications.
     */
    private void applyConsumableBuffs(Spell spell, Personnage caster) {
        if (caster.getConsumableSpellBuffs() != null && !caster.getConsumableSpellBuffs().isEmpty()) {
            Iterator<ConsumableSpellBuffDebuffEffect> iterator = caster.getConsumableSpellBuffs().iterator();
            while (iterator.hasNext()) {
                ConsumableSpellBuffDebuffEffect buff = iterator.next();
                if (buff.isActive()) {
                    buff.applyToSpell(spell);
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
        // Vous pouvez ajouter ici de la logique de validation ou de traitement avant l'enregistrement
        spellRepository.save(spell);
    }

}
