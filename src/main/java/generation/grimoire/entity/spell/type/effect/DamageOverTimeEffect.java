package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.DamageType;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("DAMAGE_OVER_TIME")
public class DamageOverTimeEffect extends DamageEffect {

    /**
     * Dégâts fixes à infliger à chaque tour.
     * Si 0, aucun dégât fixe n'est appliqué.
     */
    private int fixedDamagePerTick;

    /**
     * Pourcentage exprimé en décimal (par exemple 0.10 pour 10%)
     * qui sera appliqué sur, par exemple, la vie max de la cible.
     */
    private double percentageDamagePerTick;

    /**
     * Durée en nombre de tours pendant lesquels cet effet est actif.
     */
    /**
     * Type de damage infligé
     */
    private int duration;

    /**
     * Type de damage infligé
     */
    private DamageType damageType;

    @Enumerated(jakarta.persistence.EnumType.STRING)
    private generation.grimoire.enumeration.Source damageSource = generation.grimoire.enumeration.Source.TARGET_HEALTH_MAX;

    @jakarta.persistence.Transient
    private Personnage caster;

    /**
     * Méthode qui applique les dégâts de l'effet à la cible.
     * Doit être appelée à chaque tour pour "tick" l'effet.
     *
     * @param target la cible du DamageOverTimeEffect
     */
    public void tick(Personnage target) {
        if (duration > 0) {
            int baseDamage = fixedDamagePerTick;
            if (percentageDamagePerTick > 0) {
                double sourceValue = generation.grimoire.utils.StatCalculator.getSourceValue(damageSource, caster, target);
                baseDamage += (int)(sourceValue * percentageDamagePerTick);
            }

            // Appliquer l'amplification du lanceur
            int totalDamage = (int)(baseDamage * getAmplificationMultiplier());

            // Check crit on each tick? Let's check crit on each tick for fun.
            if (caster != null && checkCriticalHit(caster)) {
                totalDamage = (int) (totalDamage * 1.5);
            }

            target.takeDamage(totalDamage, damageType, caster);
            duration--;

            System.out.println(target.getName() + " subit " + totalDamage
                    + " dégâts (" + damageType + ") de damage over time, durée restante: " + duration);
        }
    }

    /**
     * Lors de l'application initiale de l'effet, on ajoute cet effet à la liste des DamageOverTimeEffect actifs de la cible.
     *
     * @param caster le personnage qui lance le sort
     * @param target la cible du sort
     */
    @Override
    public void apply(Personnage caster, Personnage target) {
        this.caster = caster;
        target.addDamageOverTimeEffect(this);
        System.out.println("Damage over time appliqué sur " + target.getName()
                + " pour " + duration + " tours.");
    }
}