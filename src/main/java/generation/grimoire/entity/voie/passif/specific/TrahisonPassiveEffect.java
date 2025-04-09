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
@DiscriminatorValue("TRAHISON_PASSIVE")
public class TrahisonPassiveEffect extends VoiePassiveEffect {

    private boolean usedThisTurn = false; // Limité à 1 utilisation par tour

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Ici, l'effet n'est pas déclenché par un sort, donc on ne fait rien.
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Réinitialiser l'utilisation par tour
        usedThisTurn = false;
    }

    // Méthode spécifique à un coup physique
    public void onPhysicalHit(Personnage attacker, Personnage target, double baseDamage) {
        if (!usedThisTurn) {
            double extraDamage = baseDamage * 0.10;
            System.out.println(attacker.getName() + " inflige " + extraDamage + " dégâts supplémentaires (Trahison).");
            target.takeDamage((int) extraDamage, null); // le type de dégâts peut être précisé si besoin
            attacker.heal((int) extraDamage);
            usedThisTurn = true;
        }
    }
}