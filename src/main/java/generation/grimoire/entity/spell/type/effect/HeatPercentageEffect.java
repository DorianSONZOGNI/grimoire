package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("HEAT_PERCENTAGE")
public class HeatPercentageEffect extends SpellEffect {

    private double percentage;

    @Enumerated(jakarta.persistence.EnumType.STRING)
    private Source source = Source.TARGET_HEALTH_MAX;

    @Override
    public void apply(Personnage caster, Personnage target) {
        double sourceValue = generation.grimoire.utils.StatCalculator.getSourceValue(source, caster, target);
        int amount = (int) (sourceValue * percentage);
        
        int currentHeat = target.getPassiveState("destruction_heat", 0);
        currentHeat += amount;
        System.out.println("🔥 [Destruction] " + target.getName() + " accumule de la chaleur (+" + amount + " -> " + currentHeat + "/100).");
        if (currentHeat >= 100) {
            target.triggerFreeSpell();
            currentHeat = 0;
            System.out.println("🔥 [Destruction] " + target.getName() + " consomme sa chaleur et lance un sort gratuit !");
        }
        target.setPassiveState("destruction_heat", currentHeat);
    }
}
