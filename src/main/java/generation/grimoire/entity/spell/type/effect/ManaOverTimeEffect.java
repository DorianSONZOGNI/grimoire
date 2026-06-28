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
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Personnage caster;

    public void tick(Personnage target) {
        if (duration > 0) {
            int totalMana = fixedManaPerTick;
            if (percentageManaPerTick != 0) {
                double sourceValue = generation.grimoire.utils.StatCalculator.getSourceValue(manaSource, caster,
                        target);
                totalMana += (int) (sourceValue * percentageManaPerTick);
            }
            totalMana = (int) (totalMana * getAmplificationMultiplier());
            target.restoreMana(totalMana);
            duration--;
            System.out.println(target.getName() + " régénère " + totalMana
                    + " mana par mana over time, durée restante : " + duration);
        }
    }

    public ManaOverTimeEffect cloneEffect() {
        ManaOverTimeEffect clone = new ManaOverTimeEffect();
        clone.setId(this.getId());
        clone.setSpell(this.getSpell());
        clone.setEffectTarget(this.getEffectTarget());
        clone.setRequiredChoiceKey(this.getRequiredChoiceKey());
        clone.setChannelingTurns(
                this.getChannelingTurns() != null ? new java.util.ArrayList<>(this.getChannelingTurns()) : null);

        clone.setFixedManaPerTick(this.fixedManaPerTick);
        clone.setPercentageManaPerTick(this.percentageManaPerTick);
        clone.setDuration(this.duration);
        clone.setManaSource(this.manaSource);
        return clone;
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        ManaOverTimeEffect clone = this.cloneEffect();
        clone.caster = caster;
        target.addManaOverTimeEffect(clone);
        System.out.println("Mana over time appliqué sur " + target.getName() + " pour " + duration + " tours.");
    }
}
