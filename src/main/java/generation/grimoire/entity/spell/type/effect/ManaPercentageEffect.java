package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;

import static generation.grimoire.utils.StatCalculator.getSourceValue;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("PERCENTAGE_MANA")
public class ManaPercentageEffect extends ManaEffect {

    // Pourcentage exprimé en décimal, par exemple 0.15 pour 15%
    private double percentage;
    
    @Enumerated(EnumType.STRING)
    private Source manaSource;

    public double calculateMana(double sourceValue) {
        return sourceValue * percentage;
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        double sourceValue = getSourceValue(manaSource != null ? manaSource : Source.TARGET_MANA_MAX, caster, target);
        double manaAmount = calculateMana(sourceValue) * getAmplificationMultiplier();
        if (checkCriticalHit(caster)) {
            manaAmount *= 1.5;
        }
        target.restoreMana((int) manaAmount);
        System.out.println(target.getName() + " régénère " + (int) manaAmount +
                " mana via ManaPercentageEffect (source : " + manaSource + ", x" + getAmplificationMultiplier() + ")");
    }
}
