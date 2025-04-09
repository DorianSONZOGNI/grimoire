package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("FIXED_DAMAGE")
public class DamageFixedEffect extends DamageEffect {

    private int damage;

    @Override
    public void apply(Personnage caster, Personnage target) {
        // Appliquer les dégâts fixes sur la cible en tenant compte du type de dégâts si nécessaire
        target.takeDamage(this.damage, this.getDamageType());
    }
}
