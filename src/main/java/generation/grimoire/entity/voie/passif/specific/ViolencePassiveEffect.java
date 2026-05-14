package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCategory;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("VIOLENCE_PASSIVE")
public class ViolencePassiveEffect extends VoiePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        personnage.setPassiveState("violence_cast_this_turn", 1);
        int inspirationCount = personnage.getPassiveState("violence_inspiration", 0);
        int expirationCount = personnage.getPassiveState("violence_expiration", 0);

        if (spell.getCategory() == SpellCategory.INSPIRATION) {
            inspirationCount = Math.min(inspirationCount + 1, 5);
            personnage.setPassiveState("violence_inspiration", inspirationCount);
            personnage.setPassiveState("violence_expiration", 0); // Réinitialise l'autre cumul
            
            // Appliquer un bonus de critique de +2% par stack (remplace l'ancien via stat_flat)
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.CRIT.name(), inspirationCount * 2);
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.POWER.name(), 0);
            
            System.out.println(personnage.getName() + " gagne +" + (inspirationCount * 2) + " de critique (inspiration " + inspirationCount + "/5).");
        } else if (spell.getCategory() == SpellCategory.EXPIRATION) {
            expirationCount = Math.min(expirationCount + 1, 10);
            personnage.setPassiveState("violence_expiration", expirationCount);
            personnage.setPassiveState("violence_inspiration", 0);
            
            // Augmenter la puissance de +2 par sort d'expiration
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.POWER.name(), expirationCount * 2);
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.CRIT.name(), 0);
            
            System.out.println(personnage.getName() + " gagne +" + (expirationCount * 2) + " de puissance (expiration " + expirationCount + "/10).");
        }
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        int castLastTurn = personnage.getPassiveState("violence_cast_this_turn", 0);
        if (castLastTurn == 0) {
            // Aucun sort de la voie n'a été lancé au tour précédent, on perd les stacks
            personnage.setPassiveState("violence_inspiration", 0);
            personnage.setPassiveState("violence_expiration", 0);
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.CRIT.name(), 0);
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.POWER.name(), 0);
            System.out.println(personnage.getName() + " perd ses stacks de Violence (aucun sort lancé au tour précédent).");
        }
        // On réinitialise le flag pour le nouveau tour
        personnage.setPassiveState("violence_cast_this_turn", 0);
    }
}
