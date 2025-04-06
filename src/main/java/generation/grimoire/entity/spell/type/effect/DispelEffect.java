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
@DiscriminatorValue("DISPEL")
public class DispelEffect extends SpellEffect {

    @Override
    public void apply(Personnage caster, Personnage target) {
        target.clearBuffs();
        System.out.println(target.getName() + " a été purifié de tous les buffs/débuffs.");
    }
}