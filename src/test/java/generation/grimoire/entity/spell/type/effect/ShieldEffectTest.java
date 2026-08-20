package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ShieldEffectTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Caster");
        caster.setHealthMax(100);
        
        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(200);
    }

    @Test
    void shouldApplyFixedShield() {
        ShieldEffect effect = new ShieldEffect();
        effect.setFixedValue(50);
        effect.setDuration(2);
        
        effect.apply(caster, target);

        assertThat(target.getTotalShield()).isEqualTo(50);
    }

    @Test
    void shouldApplyPercentageShield() {
        ShieldEffect effect = new ShieldEffect();
        effect.setFixedValue(10);
        effect.setPercentage(0.5); // 50%
        effect.setShieldSource(Source.TARGET_HEALTH_MAX);
        effect.setDuration(2);

        // 50% of 200 = 100 + 10 = 110 shield
        effect.apply(caster, target);

        assertThat(target.getTotalShield()).isEqualTo(110);
    }

    @Test
    void shouldMultiplyShieldGiven() {
        // Caster has a buff: +100% shield given
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.SHIELD_GIVEN);
        buff.setModifier(1.0);
        caster.applyBuff(buff, 1.0);

        ShieldEffect effect = new ShieldEffect();
        effect.setFixedValue(50);
        effect.setDuration(2);

        // 50 * 2.0 = 100
        effect.apply(caster, target);

        assertThat(target.getTotalShield()).isEqualTo(100);
    }
}
