package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
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
@DiscriminatorValue("PERCENTAGE_HEAL")
public class HealPercentageEffect extends SpellEffect {

    // Pourcentage exprimé en décimal, par exemple 0.15 pour 15%
    private double percentage;
    @Enumerated(EnumType.STRING)
    private Source healSource;

    /**
     * Calcule le soin en fonction d'une valeur source (ex: mana max, puissance, etc.)
     * @param sourceValue la valeur sur laquelle se base le calcul
     * @return le montant de soin calculé
     */
    public double calculateHeal(double sourceValue) {
        return sourceValue * percentage;
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        double sourceValue = getSourceValue(healSource, caster, target);
        double healAmount = calculateHeal(sourceValue);
        target.heal((int) healAmount);
    }

}