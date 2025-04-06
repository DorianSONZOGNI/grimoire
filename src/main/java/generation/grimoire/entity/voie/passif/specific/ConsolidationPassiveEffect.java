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
@DiscriminatorValue("CONSOLIDATION_PASSIVE")
public class ConsolidationPassiveEffect extends VoiePassiveEffect {

    // Nombre de niveaux investis dans la consolidation
    private int bonusLevel;

    @Override
    public void onSpellCast(Personnage personnage, SpellCategory spellCategory) {
        // Aucun effet particulier lors du cast
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Appliquer un bonus de protection de 5% par niveau investi
        int protectionBonus = (int)(personnage.getArmor() * (0.05 * bonusLevel));
        personnage.setArmor(personnage.getArmor() + protectionBonus);
        System.out.println(personnage.getName() + " bénéficie d'un bonus de protection de " + protectionBonus + " (Consolidation).");
    }
}