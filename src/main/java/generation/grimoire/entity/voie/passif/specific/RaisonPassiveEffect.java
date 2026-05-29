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
@DiscriminatorValue("RAISON_PASSIVE")
public class RaisonPassiveEffect extends VoiePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        if (spell.getVoie() != null && "Voie de la Raison".equals(spell.getVoie().getNom())) {
            personnage.setPassiveState("raison_cast_this_turn", 1);
            System.out.println(personnage.getName() + " lance un sort de la Raison (gain de vitesse prévu au prochain tour).");
        }
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        int castLastTurn = personnage.getPassiveState("raison_cast_this_turn", 0);
        int currentSpeedStacks = personnage.getPassiveState("raison_speed_stacks", 0);
        
        if (castLastTurn == 1) {
            // A lancé un sort au tour précédent : gagne +1 de vitesse (cumulable)
            currentSpeedStacks = Math.min(currentSpeedStacks + 1, 10);
            System.out.println(personnage.getName() + " gagne +1 de Vitesse grâce à la Raison (Total: +" + currentSpeedStacks + ").");
        } else {
            // Aucun sort lancé au tour précédent : perd tous ses cumuls
            if (currentSpeedStacks > 0) {
                System.out.println(personnage.getName() + " perd ses cumuls de Vitesse (Raison) car aucun sort n'a été lancé.");
            }
            currentSpeedStacks = 0;
        }
        
        personnage.setPassiveState("raison_speed_stacks", currentSpeedStacks);
        personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.SPEED.name(), currentSpeedStacks);
        
        personnage.setPassiveState("raison_cast_this_turn", 0);
    }

    @Override
    public int adjustFlatBonus(Personnage personnage, generation.grimoire.enumeration.StatType statType, int currentBonus) {
        if (statType == generation.grimoire.enumeration.StatType.CRIT) {
            int effectiveSpeed = personnage.getSpeed() + personnage.getStatFlatBonus(generation.grimoire.enumeration.StatType.SPEED);
            return currentBonus + effectiveSpeed * 2;
        }
        return currentBonus;
    }
}