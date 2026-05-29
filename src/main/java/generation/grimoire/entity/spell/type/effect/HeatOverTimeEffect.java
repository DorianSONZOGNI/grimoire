package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("HEAT_OVER_TIME")
public class HeatOverTimeEffect extends SpellEffect {

    private int fixedValue;
    private double percentage;
    private int duration;

    @Enumerated(jakarta.persistence.EnumType.STRING)
    private Source source = Source.TARGET_HEALTH_MAX;

    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @jakarta.persistence.Transient
    private Personnage caster;

    public void tick(Personnage target) {
        if (duration > 0) {
            int amount = fixedValue;
            if (percentage > 0) {
                double sourceValue = generation.grimoire.utils.StatCalculator.getSourceValue(source, caster, target);
                amount += (int) (sourceValue * percentage);
            }

            int currentHeat = target.getPassiveState("destruction_heat", 0);
            currentHeat += amount;
            if (currentHeat > 100) {
                currentHeat = 100;
            }
            System.out.println("🔥 [Destruction-Tick] " + target.getName() + " accumule de la chaleur (+" + amount + " -> " + currentHeat + "/100), tours restants: " + (duration - 1));
            if (currentHeat >= 100) {
                target.triggerFreeSpell();
                System.out.println("🔥 [Destruction] " + target.getName() + " a atteint 100 de chaleur ! Le prochain sort sera gratuit.");
            }
            target.setPassiveState("destruction_heat", currentHeat);
            duration--;
        }
    }

    public HeatOverTimeEffect cloneEffect() {
        HeatOverTimeEffect clone = new HeatOverTimeEffect();
        clone.setId(this.getId());
        clone.setSpell(this.getSpell());
        clone.setEffectTarget(this.getEffectTarget());
        clone.setRequiredChoiceKey(this.getRequiredChoiceKey());
        clone.setChannelingTurns(this.getChannelingTurns() != null ? new java.util.ArrayList<>(this.getChannelingTurns()) : null);

        clone.setFixedValue(this.fixedValue);
        clone.setPercentage(this.percentage);
        clone.setDuration(this.duration);
        clone.setSource(this.source);
        return clone;
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        HeatOverTimeEffect clone = this.cloneEffect();
        clone.caster = caster;
        target.addHeatOverTimeEffect(clone);
        System.out.println("Heat over time (Chaleur continue) appliqué sur " + target.getName() + " pour " + duration + " tours.");
    }
}
