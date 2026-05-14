package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("KARMA_PASSIVE")
public class KarmaPassiveEffect extends SpiritualitePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Rien pour l'instant
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Rien pour l'instant
    }

    @Override
    public boolean canCastSpell(Personnage caster, Spell spell) {
        // Aucune restriction pour l'instant
        return true;
    }
}
