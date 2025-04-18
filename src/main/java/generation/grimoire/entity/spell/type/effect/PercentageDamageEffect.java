package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.DamageEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import generation.grimoire.utils.StatCalculator;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("PERCENTAGE_DAMAGE")
public class PercentageDamageEffect extends DamageEffect {

    private double percentage;
    @Enumerated(EnumType.STRING)
    private Source source;

    /**
     * Calcule les dégâts en fonction de la valeur source passée en paramètre.
     * @param sourceValue la valeur de la statistique (ex: manaMax, healthMax, etc.)
     * @return le montant de dégâts calculé
     */
    public double calculateDamage(double sourceValue) {
        return sourceValue * percentage;
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        double sourceValue = StatCalculator.getSourceValue(source, caster, target);
        double damage = calculateDamage(sourceValue);
        target.takeDamage((int) damage, this.getDamageType());
    }

}
