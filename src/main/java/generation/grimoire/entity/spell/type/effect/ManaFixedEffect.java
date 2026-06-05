package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("FIXED_MANA")
public class ManaFixedEffect extends ManaEffect {

    private int manaAmount;

    @Override
    public void apply(Personnage caster, Personnage target) {
        int finalMana = (int) (manaAmount * getAmplificationMultiplier());
        if (checkCriticalHit(caster)) {
            finalMana = (int) (finalMana * getCriticalMultiplier(caster));
        }
        target.restoreMana(finalMana);
        System.out.println(target.getName() + " régénère " + finalMana + " points de mana (x" + getAmplificationMultiplier() + ")");
    }
}
