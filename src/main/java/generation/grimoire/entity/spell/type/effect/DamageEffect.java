package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
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

    @Override
    public void applyModifierFromBuff(BuffDebuffEffect buff, Personnage caster, Personnage target) {
        this.amplificationMultiplier *= buff.getModifier();
        System.out.println("Amplification appliquée au DamageEffect avec x" + buff.getModifier());
    }

    public double getDamageTakenMultiplier(Personnage target) {
        StatType resistance = switch (this.getDamageType()) {
            case MAGIC -> StatType.RESISTANCE;
            case PHYSIC -> StatType.ARMURE;
            case BRUT -> StatType.HEALTH;
        };

        StatType vulnerability = switch (this.getDamageType()) {
            case MAGIC -> StatType.DAMAGE_TAKEN_MAGIC;
            case PHYSIC -> StatType.DAMAGE_TAKEN_PHYSIC;
            case BRUT -> StatType.DAMAGE_TAKEN_BRUT;
        };

        System.out.println("Multiplicateurs appliqués : " +
                resistance + " = " + target.getStatBuffMultiplier(resistance) + ", " +
                vulnerability + " = " + target.getStatBuffMultiplier(vulnerability));

        return target.getStatBuffMultiplier(resistance) * target.getStatBuffMultiplier(vulnerability);
    }
}
