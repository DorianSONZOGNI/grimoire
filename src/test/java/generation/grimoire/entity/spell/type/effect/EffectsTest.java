package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EffectsTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Caster");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);

        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(100);
        target.setHealthCurrent(50);
        target.setArmor(50);
    }

    @Test
    void shouldApplyAndDispelBuffs() {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.ARMURE);
        buff.setModifier(1.0); // +100% armure
        buff.setDuration(3);
        
        // This will call target.applyBuff(buff, 2.0)
        buff.apply(caster, target);

        assertThat(target.getActiveBuffs()).hasSize(1);
        assertThat(target.getStatBuffMultiplier(StatType.ARMURE)).isEqualTo(2.0);

        DispelEffect dispel = new DispelEffect();
        dispel.apply(caster, target);

        assertThat(target.getActiveBuffs()).isEmpty();
        assertThat(target.getStatBuffMultiplier(StatType.ARMURE)).isEqualTo(1.0);
    }

    @Test
    void shouldApplyFlatHealAndNotExceedMax() {
        HealFixedEffect heal = new HealFixedEffect();
        heal.setHealAmount(60); // 50 + 60 = 110, capped at 100
        
        heal.apply(caster, target);
        
        assertThat(target.getHealthCurrent()).isEqualTo(100);
    }

    @Test
    void shouldApplyHealOverTime() {
        HealOverTimeEffect hot = new HealOverTimeEffect();
        hot.setFixedHealPerTick(10);
        hot.setDuration(2);

        hot.apply(caster, target);
        assertThat(target.getActiveHealOverTimeEffects()).hasSize(1);

        target.updateHealOverTimeEffects();
        assertThat(target.getHealthCurrent()).isEqualTo(60);

        target.updateHealOverTimeEffects();
        assertThat(target.getHealthCurrent()).isEqualTo(70);
        assertThat(target.getActiveHealOverTimeEffects()).isEmpty();
    }

    @Test
    void shouldApplyPercentageHeal() {
        HealPercentageEffect healPct = new HealPercentageEffect();
        healPct.setPercentage(0.5); // 50%
        healPct.setHealSource(generation.grimoire.enumeration.Source.TARGET_HEALTH_MAX);
        
        // 50% de 100 (target max hp) = 50 heal
        healPct.apply(caster, target);
        
        // 50 current hp + 50 heal = 100
        assertThat(target.getHealthCurrent()).isEqualTo(100);
    }
}
