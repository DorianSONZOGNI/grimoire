package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.utils.StatCalculator;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("BUFF_DEBUFF")
public class BuffDebuffEffect extends SpellEffect {

    @Enumerated(EnumType.STRING)
    private StatType statAffected;

    // Valeur du modificateur : positif pour buff, négatif pour débuff.
    private double modifier;

    // Duration 0 -> tours en cours (on invalide les buff duration == 0 en fin de tours et duration -1 après)
    private int duration;

    // S'il y a un ration, la source est importante
    @Enumerated(EnumType.STRING)
    private Source modifierSource;

    @Override
    public void apply(Personnage caster, Personnage target) {
        double baseValue = StatCalculator.getSourceValue(modifierSource, caster, target);
        double modifierValue = baseValue * modifier;
        target.applyBuff(this, modifierValue);
    }
}