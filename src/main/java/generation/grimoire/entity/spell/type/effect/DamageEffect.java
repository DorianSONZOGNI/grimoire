package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
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
    @jakarta.persistence.Transient
    private double amplificationMultiplier = 1.0;

    @Override
    public void applyModifierFromBuff(BuffDebuffEffect buff, Personnage caster, Personnage target) {
        this.amplificationMultiplier *= buff.getModifier();
        System.out.println("Amplification appliquée au DamageEffect avec x" + buff.getModifier());
    }

    @Override
    public void resetModifiers() {
        this.amplificationMultiplier = 1.0;
    }

    public double applyEquipmentModifiers(double damage, Personnage caster, Personnage target, DamageType damageType) {
        if (caster == null || damageType == null) return damage;
        if (damageType == DamageType.MAGIC) {
            int cursedRed = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_MAGIC_DAMAGE_REDUCTION);
            if (cursedRed != 0) {
                double multiplier = Math.max(0.0, 1.0 - (Math.abs(cursedRed) / 100.0));
                damage *= multiplier;
            }
        } else if (damageType == DamageType.PHYSIC) {
            int cursedRed = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_PHYSICAL_DAMAGE_REDUCTION);
            if (cursedRed != 0) {
                double multiplier = Math.max(0.0, 1.0 - (Math.abs(cursedRed) / 100.0));
                damage *= multiplier;
            }
            if (target != null && target.getHealthCurrent() <= target.getHealthMax() / 2) {
                int executionBonusPct = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.EXECUTION);
                if (executionBonusPct > 0) {
                    damage *= (1.0 + executionBonusPct / 100.0);
                }
            }
        }
        
        int overloadPct = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.MAGIC_OVERLOAD);
        if (overloadPct > 0) {
            damage += caster.getManaCurrent() * overloadPct / 100.0;
        }

        return damage;
    }
}
