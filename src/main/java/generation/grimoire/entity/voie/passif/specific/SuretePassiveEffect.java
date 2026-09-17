package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("SURETE_PASSIVE")
public class SuretePassiveEffect extends VoiePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Logic moved to onSpellCostPaid to use actual mana paid (supports % costs)
    }

    @Override
    public void onSpellCostPaid(Personnage personnage, Spell spell, int manaPaid) {
        int storedPoints = personnage.getPassiveState("surete_points", 0);
        int pointsGained = (int) Math.round(manaPaid * 0.35);
        storedPoints += pointsGained;
        System.out.println(personnage.getName() + " stocke " + pointsGained + " points de sûreté (35% de " + manaPaid
                + " mana). Total: " + storedPoints + "/100");
        if (storedPoints >= 100) {
            System.out.println(personnage.getName() + " obtient +15% de critique et +25% de soins prodigués pour le prochain tour (Sûreté).");

            generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buffCrit = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
            buffCrit.setStatAffected(generation.grimoire.enumeration.StatType.CRIT);
            buffCrit.setFlatValue(15);
            buffCrit.setDuration(2); // Active during next turn (decays from 2 to 1 at start of next turn)
            personnage.getActiveBuffs().add(buffCrit);
            
            generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buffHeal = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
            buffHeal.setStatAffected(generation.grimoire.enumeration.StatType.HEAL_GIVEN);
            buffHeal.setModifier(0.25);
            buffHeal.setDuration(3);
            personnage.getActiveBuffs().add(buffHeal);

            storedPoints -= 100;
        }
        personnage.setPassiveState("surete_points", storedPoints);
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        int storedPoints = personnage.getPassiveState("surete_points", 0);
        storedPoints += 10;
        System.out.println(
                personnage.getName() + " gagne passivement 10 points de sûreté (Total: " + storedPoints + "/100).");

        if (storedPoints >= 100) {
            // Déclenché passivement en début de tour : bonus supérieur (+25%) et regen mana
            System.out.println(personnage.getName() + " obtient +25% de critique et restaure 25% de son mana manquant pour ce tour (Sûreté passive).");

            generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
            buff.setStatAffected(generation.grimoire.enumeration.StatType.CRIT);
            buff.setFlatValue(25);
            buff.setDuration(1); // Active during the current turn (since turn start updates have already processed)
            personnage.getActiveBuffs().add(buff);

            int missingMana = personnage.getTotalManaMax() - personnage.getManaCurrent();
            if (missingMana > 0) {
                int manaToRestore = (int) Math.round(missingMana * 0.25);
                personnage.restoreMana(manaToRestore);
            }

            storedPoints -= 100;
        }
        personnage.setPassiveState("surete_points", storedPoints);
    }
}