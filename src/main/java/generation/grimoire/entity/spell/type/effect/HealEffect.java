package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.MappedSuperclass;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@MappedSuperclass
public abstract class HealEffect extends SpellEffect {

    /**
     * Multiplicateur d'amplification des soins.
     * 1.0 signifie pas de modification.
     */
    @jakarta.persistence.Transient
    private double amplificationMultiplier = 1.0;

    @Override
    public void applyModifierFromBuff(BuffDebuffEffect buff, Personnage caster, Personnage target) {
        this.amplificationMultiplier *= buff.getModifier();
    }

    @Override
    public void resetModifiers() {
        this.amplificationMultiplier = 1.0;
    }
}