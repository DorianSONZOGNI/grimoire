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
    private double amplificationMultiplier = 1.0;

    @Override
    public void applyModifierFromBuff(BuffDebuffEffect buff, Personnage caster, Personnage target) {
        this.amplificationMultiplier *= buff.getModifier();
        System.out.println("Amplification appliquée au DamageEffect avec x" + buff.getModifier());
    }

    public double applyCursedReduction(double damage, Personnage caster, DamageType damageType) {
        if (caster == null || damageType == null) return damage;
        if (damageType == DamageType.MAGIQUE) {
            int cursedRed = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_MAGIC_DAMAGE_REDUCTION);
            if (cursedRed != 0) {
                double multiplier = Math.max(0.0, 1.0 - (Math.abs(cursedRed) / 100.0));
                damage *= multiplier;
            }
        } else if (damageType == DamageType.PHYSIQUE) {
            int cursedRed = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_PHYSICAL_DAMAGE_REDUCTION);
            if (cursedRed != 0) {
                double multiplier = Math.max(0.0, 1.0 - (Math.abs(cursedRed) / 100.0));
                damage *= multiplier;
            }
        }
        return damage;
    }
}
