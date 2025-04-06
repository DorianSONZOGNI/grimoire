package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("FIXED_HEAL")
public class FixedHealEffect extends SpellEffect {

    private int healAmount;

    @Override
    public void apply(Personnage caster, Personnage target) {
        target.heal((int) healAmount);
    }
}
