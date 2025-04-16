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
@DiscriminatorValue("HEAL_OVER_TIME")
public class HealOverTimeEffect extends HealEffect {

    /**
     * Montant fixe de soin à appliquer chaque tour.
     * Si 0, aucun soin fixe n'est appliqué.
     */
    private int fixedHealPerTick;

    /**
     * Pourcentage (exprimé en décimal, par exemple 0.10 pour 10%)
     * du soin qui est calculé sur une base déterminée (par exemple, la vie max du personnage).
     */
    private double percentageHealPerTick;

    /**
     * Durée en nombre de tours pendant lesquels cet effet est actif.
     */
    private int duration;

    /**
     * Méthode qui applique le soin chaque tour.
     * Cette méthode sera appelée par le Personnage (via sa méthode d'update des effets) à chaque début ou fin de tour.
     */
    public void tick(Personnage target) {
        if (duration > 0) {
            int totalHeal = fixedHealPerTick;
            if (percentageHealPerTick > 0) {
                totalHeal += (int)(target.getHealthMax() * percentageHealPerTick);
            }
            totalHeal = (int) (totalHeal * getAmplificationMultiplier());
            target.heal(totalHeal);
            duration--;
            System.out.println(target.getName() + " est soigné de " + totalHeal + " PV par heal over time, durée restante : " + duration);
        }
    }

    /**
     * Lors de l'application initiale du soin sur la durée,
     * on ajoute cet effet à la liste des effets de soins en cours sur la cible.
     */
    @Override
    public void apply(Personnage caster, Personnage target) {
        target.addHealOverTimeEffect(this);
        System.out.println("Heal over time appliqué sur " + target.getName() + " pour " + duration + " tours.");
    }
}