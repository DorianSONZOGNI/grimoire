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
        if (currentHeat > 100) {
            currentHeat = 100;
        }
        System.out.println("🔥 [Destruction] " + target.getName() + " accumule de la chaleur (+" + amount + " -> " + currentHeat + "/100).");
        if (currentHeat >= 100) {
            target.triggerFreeSpell();
            System.out.println("🔥 [Destruction] " + target.getName() + " a atteint 100 de chaleur ! Le prochain sort sera gratuit.");
        }
        target.setPassiveState("destruction_heat", currentHeat);

        // Enregistrer la chaleur générée durant ce lancer
        int gen = target.getPassiveState("destruction_heat_generated_this_cast", 0);
        target.setPassiveState("destruction_heat_generated_this_cast", gen + amount);
    }
}
