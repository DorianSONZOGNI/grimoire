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
        System.out.println("🔥 [Destruction] " + target.getName() + " accumule de la chaleur (+" + amount + " -> " + currentHeat + "/100).");
        if (currentHeat >= 100) {
            target.triggerFreeSpell();
            currentHeat = 0;
            System.out.println("🔥 [Destruction] " + target.getName() + " consomme sa chaleur et lance un sort gratuit !");
        }
        target.setPassiveState("destruction_heat", currentHeat);
    }
}
