package generation.grimoire.entity;

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

}
