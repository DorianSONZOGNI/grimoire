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

    private int consecutiveSuccessfulSpells = 0; // maximum 10

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Supposons que cet appel n'est effectué qu'en cas de succès
        consecutiveSuccessfulSpells = Math.min(consecutiveSuccessfulSpells + 1, 10);
        double bonusCritFromSpells = consecutiveSuccessfulSpells * 0.02;
        double bonusCritFromSpeed = personnage.getSpeed() * 0.02;
        double totalBonusCrit = bonusCritFromSpells + bonusCritFromSpeed;
        System.out.println(personnage.getName() + " gagne un bonus de critique de " + (totalBonusCrit * 100) + "% (Raison).");
        personnage.setCrit(personnage.getCrit() + (int)(totalBonusCrit * 100));
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Si aucun sort réussi n'est lancé dans le tour, le cumul peut être réinitialisé
        consecutiveSuccessfulSpells = 0;
        personnage.setCrit(personnage.getCrit());
    }
}