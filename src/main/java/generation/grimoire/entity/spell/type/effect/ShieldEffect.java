package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
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
@DiscriminatorValue("SHIELD")
public class ShieldEffect extends SpellEffect {

    private int fixedValue;
    private double percentage;
    private int duration;

    @Enumerated(EnumType.STRING)
    private Source shieldSource;

    @Override
    public void apply(Personnage caster, Personnage target) {
        double shieldAmount = this.fixedValue;
        if (this.shieldSource != null && this.percentage > 0) {
            double sourceValue = StatCalculator.getSourceValue(this.shieldSource, caster, target);
            shieldAmount += sourceValue * this.percentage;
        }

        if (checkCriticalHit(caster)) {
            shieldAmount *= 1.5;
        }

        int finalShield = (int) shieldAmount;
        String spellName = getSpell() != null ? getSpell().getNom() : "Bouclier";
        target.addShield(finalShield, this.duration, spellName);
    }
}
