package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("MANA_OVER_TIME")
public class ManaOverTimeEffect extends ManaEffect {

    /**
     * Montant fixe de mana à régénérer chaque tour.
     */
    private int fixedManaPerTick;

    /**
     * Pourcentage (exprimé en décimal, par exemple 0.10 pour 10%)
     * calculé sur le mana max de la cible.
     */
    private double percentageManaPerTick;

    /**
     * Durée en nombre de tours pendant lesquels cet effet est actif.
     */
    private int duration;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private generation.grimoire.enumeration.Source manaSource = generation.grimoire.enumeration.Source.TARGET_MANA_MAX;

    @jakarta.persistence.Transient
    private Personnage caster;

    public void tick(Personnage target) {
        if (duration > 0) {
            int totalMana = fixedManaPerTick;
            if (percentageManaPerTick > 0) {
                double sourceValue = generation.grimoire.utils.StatCalculator.getSourceValue(manaSource, caster, target);
                totalMana += (int)(sourceValue * percentageManaPerTick);
            }
            totalMana = (int) (totalMana * getAmplificationMultiplier());
            target.restoreMana(totalMana);
            duration--;
            System.out.println(target.getName() + " régénère " + totalMana + " mana par mana over time, durée restante : " + duration);
        }
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        this.caster = caster;
        target.addManaOverTimeEffect(this);
        System.out.println("Mana over time appliqué sur " + target.getName() + " pour " + duration + " tours.");
    }
}
