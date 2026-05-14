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
@DiscriminatorValue("PURGE")
public class PurgeEffect extends SpellEffect {

    @Override
    public void apply(Personnage caster, Personnage target) {
        System.out.println("Application de PurgeEffect par " + (caster != null ? caster.getName() : "Inconnu") + " sur " + (target != null ? target.getName() : "Inconnu"));
        if (target != null) {
            target.purgeAllBuffsAndDebuffs();
        }
    }
}
