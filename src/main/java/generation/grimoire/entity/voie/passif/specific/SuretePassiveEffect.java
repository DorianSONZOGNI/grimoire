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
        // On ajoute, par exemple, 20 points par sort (représentant 20% du coût initial)
        int storedPoints = personnage.getPassiveState("surete_points", 0);
        storedPoints += 20;
        System.out.println(personnage.getName() + " stocke " + storedPoints + " points de sûreté.");
        if (storedPoints >= 100) {
            System.out.println(personnage.getName() + " obtient +15% de critique pour le prochain tour (Sûreté).");
            
            generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
            buff.setStatAffected(generation.grimoire.enumeration.StatType.CRIT);
            buff.setFlatValue(15);
            buff.setDuration(1); // until next turn
            personnage.getActiveBuffs().add(buff);
            
            storedPoints -= 100;
        }
        personnage.setPassiveState("surete_points", storedPoints);
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        int storedPoints = personnage.getPassiveState("surete_points", 0);
        storedPoints += 10;
        System.out.println(personnage.getName() + " gagne passivement 10 points de sûreté (Total: " + storedPoints + "/100).");
        
        if (storedPoints >= 100) {
            // Déclenché passivement en début de tour : bonus supérieur (+25%)
            System.out.println(personnage.getName() + " obtient +25% de critique pour ce tour (Sûreté passive).");
            
            generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
            buff.setStatAffected(generation.grimoire.enumeration.StatType.CRIT);
            buff.setFlatValue(25);
            buff.setDuration(1);
            personnage.getActiveBuffs().add(buff);
            
            storedPoints -= 100;
        }
        personnage.setPassiveState("surete_points", storedPoints);
    }
}