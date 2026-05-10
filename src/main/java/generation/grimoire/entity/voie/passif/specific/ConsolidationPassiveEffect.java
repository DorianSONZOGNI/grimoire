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
@DiscriminatorValue("CONSOLIDATION_PASSIVE")
public class ConsolidationPassiveEffect extends VoiePassiveEffect {

    // Nombre de niveaux investis dans la consolidation
    private int bonusLevel;

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Aucun effet particulier lors du cast
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Appliquer un bonus de protection de 5% par niveau investi
        int protectionBonus = (int)(personnage.getArmor() * (0.05 * bonusLevel));
        
        // Supprimer l'ancien buff s'il existe (au cas où l'armure de base a changé)
        personnage.getActiveBuffs().removeIf(b -> "CONSOLIDATION".equals(b.getSourceName()));
        
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        buff.setStatAffected(generation.grimoire.enumeration.StatType.ARMURE);
        buff.setFlatValue(protectionBonus);
        buff.setDuration(9999); // Permanent until dispelled
        buff.setSourceName("CONSOLIDATION");
        
        personnage.getActiveBuffs().add(buff);
        System.out.println(personnage.getName() + " bénéficie d'un bonus permanent de protection de " + protectionBonus + " (Consolidation).");
    }
}