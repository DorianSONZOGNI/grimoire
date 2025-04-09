package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.enumeration.DamageType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.MappedSuperclass;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@MappedSuperclass
public abstract class DamageEffect extends SpellEffect {

    @Enumerated(EnumType.STRING)
    private DamageType damageType;

    /**
     * Multiplicateur d'amplification pour cet effet.
     * Par défaut, 1.0 signifie qu'aucun buff n'est appliqué.
     */
    private double amplificationMultiplier = 1.0;

}
