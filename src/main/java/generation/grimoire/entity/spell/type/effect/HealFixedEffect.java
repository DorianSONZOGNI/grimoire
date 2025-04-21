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
public class HealFixedEffect extends HealEffect {

    private int healAmount;

    @Override
    public void apply(Personnage caster, Personnage target) {
        int finalHeal = (int) (healAmount * getAmplificationMultiplier());
        target.heal(finalHeal);
        System.out.println(target.getName() + " est soigné de " + finalHeal + " PV (x" + getAmplificationMultiplier() + ")");
    }
}
