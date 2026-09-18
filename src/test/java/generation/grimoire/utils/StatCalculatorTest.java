package generation.grimoire.utils;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StatCalculatorTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Caster");
        caster.setPower(100);
        caster.setStrength(50);
        caster.setManaMax(200);
        caster.setManaCurrent(150);
        caster.setHealthMax(500);
        caster.setHealthCurrent(400);

        target = new Personnage();
        target.setName("Target");
        target.setPower(80);
        target.setStrength(40);
        target.setManaMax(300);
        target.setManaCurrent(200);
        target.setHealthMax(600);
        target.setHealthCurrent(300);
    }

    @Test
    void shouldReturnOneIfSourceIsNull() {
        double value = StatCalculator.getSourceValue(null, caster, target);
        assertThat(value).isEqualTo(1.0);
    }

    @Test
    void shouldUseCasterAsTargetIfTargetIsNull() {
        // Target is null, so TARGET_HEALTH_MAX should evaluate to caster's Health Max (500)
        double value = StatCalculator.getSourceValue(Source.TARGET_HEALTH_MAX, caster, null);
        assertThat(value).isEqualTo(500.0);
    }

    @Test
    void shouldCalculatePowerSources() {
        assertThat(StatCalculator.getSourceValue(Source.CASTER_POWER, caster, target)).isEqualTo(100.0);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_POWER, caster, target)).isEqualTo(80.0);

        // With flat bonus
        caster.applyFlatBuff(StatType.POWER, 20); // Adds 20 to flat bonus
        assertThat(StatCalculator.getSourceValue(Source.CASTER_POWER, caster, target)).isEqualTo(120.0);
    }

    @Test
    void shouldCalculatePhysicalPowerSources() {
        assertThat(StatCalculator.getSourceValue(Source.CASTER_PHYSICAL_POWER, caster, target)).isEqualTo(50.0);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_PHYSICAL_POWER, caster, target)).isEqualTo(40.0);

        // With flat bonus
        target.applyFlatBuff(StatType.STRENGTH, 15);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_PHYSICAL_POWER, caster, target)).isEqualTo(55.0);
    }

    @Test
    void shouldCalculateManaMaxSources() {
        assertThat(StatCalculator.getSourceValue(Source.CASTER_MANA_MAX, caster, target)).isEqualTo(200.0);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_MANA_MAX, caster, target)).isEqualTo(300.0);
    }

    @Test
    void shouldCalculateManaMissingSources() {
        // Missing: max - current
        // Caster: 200 - 150 = 50
        assertThat(StatCalculator.getSourceValue(Source.CASTER_MANA_MISSING, caster, target)).isEqualTo(50.0);
        
        // Target: 300 - 200 = 100
        assertThat(StatCalculator.getSourceValue(Source.TARGET_MANA_MISSING, caster, target)).isEqualTo(100.0);
    }

    @Test
    void shouldCalculateManaCurrentSources() {
        assertThat(StatCalculator.getSourceValue(Source.CASTER_MANA_CURRENT, caster, target)).isEqualTo(150.0);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_MANA_CURRENT, caster, target)).isEqualTo(200.0);
    }

    @Test
    void shouldCalculateHealthMaxSources() {
        assertThat(StatCalculator.getSourceValue(Source.CASTER_HEALTH_MAX, caster, target)).isEqualTo(500.0);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_HEALTH_MAX, caster, target)).isEqualTo(600.0);
    }

    @Test
    void shouldCalculateHealthMissingSources() {
        // Missing: max - current
        // Caster: 500 - 400 = 100
        assertThat(StatCalculator.getSourceValue(Source.CASTER_HEALTH_MISSING, caster, target)).isEqualTo(100.0);
        
        // Target: 600 - 300 = 300
        assertThat(StatCalculator.getSourceValue(Source.TARGET_HEALTH_MISSING, caster, target)).isEqualTo(300.0);
    }

    @Test
    void shouldCalculateHealthCurrentSources() {
        assertThat(StatCalculator.getSourceValue(Source.CASTER_HEALTH_CURRENT, caster, target)).isEqualTo(400.0);
        assertThat(StatCalculator.getSourceValue(Source.TARGET_HEALTH_CURRENT, caster, target)).isEqualTo(300.0);
    }

    @Test
    void shouldCalculatePowerSourcesWithPercentageBuffs() {
        // Apply a percentage buff (+20% power)
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        buff.setStatAffected(StatType.POWER);
        buff.setModifier(0.20);
        buff.setDuration(2);
        caster.applyBuff(buff, 0.20);

        // Base power is 100. 100 * 1.20 = 120
        assertThat(StatCalculator.getSourceValue(Source.CASTER_POWER, caster, target)).isEqualTo(120.0);

        // Target Power is 80. Add 50%
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buffTarget = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        buffTarget.setStatAffected(StatType.POWER);
        buffTarget.setModifier(0.50);
        buffTarget.setDuration(2);
        target.applyBuff(buffTarget, 0.50);

        // Base Power is 80. 80 * 1.50 = 120
        assertThat(StatCalculator.getSourceValue(Source.TARGET_POWER, caster, target)).isEqualTo(120.0);
    }
    @Test
    void shouldCalculatePhysicalPowerSourcesWithPercentageBuffs() {
        // Apply a percentage buff (+30% strength)
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        buff.setStatAffected(StatType.STRENGTH);
        buff.setModifier(0.30);
        buff.setDuration(2);
        caster.applyBuff(buff, 0.30);

        // Base strength is 50. 50 * 1.30 = 65
        assertThat(StatCalculator.getSourceValue(Source.CASTER_PHYSICAL_POWER, caster, target)).isEqualTo(65.0);
    }

    @Test
    void shouldCalculateSpeedSourcesWithPercentageBuffs() {
        caster.setSpeed(100);
        
        // Apply a percentage buff (+10% speed)
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        buff.setStatAffected(StatType.SPEED);
        buff.setModifier(0.10);
        buff.setDuration(2);
        caster.applyBuff(buff, 0.10);

        // Base speed is 100. 100 * 1.10 = 110
        assertThat(StatCalculator.getSourceValue(Source.CASTER_SPEED, caster, target)).isEqualTo(110.0);
    }

    @Test
    void shouldCalculateCritSourcesWithPercentageBuffs() {
        caster.setCrit(20);
        
        // Apply a percentage buff (+50% crit)
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect buff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        buff.setStatAffected(StatType.CRIT);
        buff.setModifier(0.50);
        buff.setDuration(2);
        caster.applyBuff(buff, 0.50);

        // Base crit is 20. 20 * 1.50 = 30
        assertThat(StatCalculator.getSourceValue(Source.CASTER_CRIT, caster, target)).isEqualTo(30.0);
    }
}
