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

    private double storedPoints = 0.0;

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // On ajoute, par exemple, 20 points par sort (représentant 20% du coût initial)
        storedPoints += 20;
        System.out.println(personnage.getName() + " stocke " + storedPoints + " points de sûreté.");
        if (storedPoints >= 100) {
            System.out.println(personnage.getName() + " obtient +15% de critique pour le prochain tour (Sûreté).");
            storedPoints -= 100;
        }
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Optionnel selon la logique de rétention du bonus.
    }
}