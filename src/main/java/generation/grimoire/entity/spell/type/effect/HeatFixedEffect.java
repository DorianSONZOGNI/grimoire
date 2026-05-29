package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("HEAT_FIXED")
public class HeatFixedEffect extends SpellEffect {

    private int amount;

    @Override
    public void apply(Personnage caster, Personnage target) {
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
