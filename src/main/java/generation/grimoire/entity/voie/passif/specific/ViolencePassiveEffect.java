package generation.grimoire.entity.voie.passif.specific;

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

    private int inspirationCount; // Maximum 5
    private int expirationCount;  // Maximum 10

    @Override
    public void onSpellCast(Personnage personnage, SpellCategory spellCategory) {
        if (spellCategory == SpellCategory.INSPIRATION) {
            inspirationCount = Math.min(inspirationCount + 1, 5);
            expirationCount = 0; // Réinitialise l'autre cumul
            // Par exemple, appliquer un bonus mental de +2% par sort d'inspiration
            System.out.println(personnage.getName() + " gagne +2% de mental (inspiration " + inspirationCount + "/5).");
        } else if (spellCategory == SpellCategory.EXPIRATION) {
            expirationCount = Math.min(expirationCount + 1, 10);
            inspirationCount = 0;
            // Par exemple, augmenter la puissance de +2 par sort d'expiration
            System.out.println(personnage.getName() + " gagne +2 de puissance (expiration " + expirationCount + "/10).");
        }
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Optionnel : si aucun sort n'est lancé pendant un tour, vous pourriez réinitialiser les compteurs ici.
    }
}
