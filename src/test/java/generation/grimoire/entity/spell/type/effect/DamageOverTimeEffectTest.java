package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DamageOverTimeEffectTest {

    private Personnage target;
    private DamageOverTimeEffect dotEffect;

    @BeforeEach
    void setUp() {
        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(100);
        target.setHealthCurrent(100);
        // default stats (armor, resistance, etc.) are 0 which yields a multiplier of 1.0
    }

    @Test
    void shouldApplyFixedDamageOverTimeWithResistanceMultiplier() {
        // Fixed 10 dmg each tick, PHYSIC type, 3 ticks total
        dotEffect = new DamageOverTimeEffect();
        dotEffect.setFixedDamagePerTick(10);
        dotEffect.setDuration(3);
        dotEffect.setDamageType(DamageType.PHYSIC);

        // Apply initial effect (adds to active list)
        dotEffect.apply(null, target);
        assertThat(target.getActiveDamageOverTimeEffects()).hasSize(1);

        // Tick three times – each tick should reduce health by 10 (armor multiplier = 1)
        dotEffect.tick(target);
        dotEffect.tick(target);
        dotEffect.tick(target);
        assertThat(target.getHealthCurrent()).isEqualTo(70);
        // After duration expires, subsequent tick does nothing
        dotEffect.tick(target);
        assertThat(target.getHealthCurrent()).isEqualTo(70);
    }

    @Test
    void shouldApplyPercentageDamageOverTime() {
        // 10% of max health per tick, MAGIC type, 2 ticks
        dotEffect = new DamageOverTimeEffect();
        dotEffect.setPercentageDamagePerTick(0.10);
        dotEffect.setDuration(2);
        dotEffect.setDamageType(DamageType.MAGIC);

        dotEffect.apply(null, target);
        dotEffect.tick(target); // first tick: 10 dmg
        dotEffect.tick(target); // second tick: another 10 dmg
        assertThat(target.getHealthCurrent()).isEqualTo(80);
    }

    @Test
    void shouldConsiderVulnerabilityMultiplierFromBuff() {
        // PHYSIC damage, fixed 10 per tick, duration 1
        dotEffect = new DamageOverTimeEffect();
        dotEffect.setFixedDamagePerTick(10);
        dotEffect.setDuration(1);
        dotEffect.setDamageType(DamageType.PHYSIC);

        // Apply a buff that increases vulnerability to PHYSIC damage
        var buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.DAMAGE_TAKEN_PHYSIC);
        buff.setModifier(1.5);
        buff.setDuration(1);
        target.applyBuff(buff, 1.5);

        dotEffect.apply(null, target);
        dotEffect.tick(target);
        // Base damage 10 * multiplier 1.5 = 15
        assertThat(target.getHealthCurrent()).isEqualTo(85);
    }
}
