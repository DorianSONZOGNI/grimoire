package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;

/**
 * Effet spécifique à la Voie de la Création.
 * Génère des bourgeons (stacks) sur le lanceur pendant le combat.
 * Le passif de Création consomme ces bourgeons pour s'activer.
 * Cap : 5 bourgeons maximum.
 */
@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@Entity
@DiscriminatorValue("BUD")
public class BudEffect extends SpellEffect {

    private static final int MAX_BUDS = 5;

    private int amount;

    @Override
    public void apply(Personnage caster, Personnage target) {
        // Les bourgeons s'appliquent toujours sur le caster
        int currentBuds = caster.getPassiveState("creation_buds", 0);
        currentBuds += amount;
        if (currentBuds > MAX_BUDS) {
            currentBuds = MAX_BUDS;
        }
        System.out.println("🌱 [Création] " + caster.getName() + " génère " + amount + " bourgeon(s) (" + currentBuds + "/" + MAX_BUDS + ").");
        caster.setPassiveState("creation_buds", currentBuds);
    }
}
