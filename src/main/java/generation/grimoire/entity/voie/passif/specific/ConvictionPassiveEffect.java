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
@DiscriminatorValue("CONVICTION_PASSIVE")
public class ConvictionPassiveEffect extends VoiePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, SpellCategory spellCategory) {
        // Aucun effet immédiat lors du cast
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        int newMana = Math.min(personnage.getManaCurrent() + 25, personnage.getManaMax());
        personnage.setManaCurrent(newMana);
        System.out.println(personnage.getName() + " régénère 25 mana (Conviction). Nouveau mana: " + newMana);
    }
}