package generation.grimoire.entity.spell.type.effect;

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
public class DamagePercentageEffect extends DamageEffect {

    private double percentage;
    @Enumerated(EnumType.STRING)
    private Source damageSource;

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
        // Récupérer la valeur de la source (par exemple, la vie max du caster ou d'un autre attribut)
        double sourceValue = StatCalculator.getSourceValue(damageSource, caster, target);
        double damage = calculateDamage(sourceValue);

        // Appliquer le multiplicateur de vulnérabilité pour prendre en compte les résistances de la cible
        double multiplier = getDamageTakenMultiplier(target); // Utilisation de damageType
        damage *= multiplier;

        // Appliquer les dégâts à la cible
        target.takeDamage((int) damage, this.getDamageType());
    }

}
