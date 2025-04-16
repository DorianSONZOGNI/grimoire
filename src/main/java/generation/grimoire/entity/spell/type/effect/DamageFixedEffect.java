package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("FIXED_DAMAGE")
public class DamageFixedEffect extends DamageEffect {

    private int damage;

    @Override
    public void apply(Personnage caster, Personnage target) {
        double baseDamage = this.damage;
        double finalDamage = baseDamage * (1 - getDamageTakenMultiplier(target)) * getAmplificationMultiplier();
        target.takeDamage((int) finalDamage, this.getDamageType());
    }
}
