package generation.grimoire.entity.personnage;

import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.ShieldEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PersonnageTest {

    private Personnage hero;
    private Personnage enemy;

    @BeforeEach
    void setUp() {
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setArmor(50);
        hero.setResistance(50);
        hero.setPower(20);
        hero.setTeamId("ALLIES");

        enemy = new Personnage();
        enemy.setName("Enemy");
        enemy.setHealthMax(100);
        enemy.setHealthCurrent(100);
        enemy.setArmor(100);
        enemy.setResistance(100);
        enemy.setTeamId("ENEMIES");
    }

    @Test
    void shouldHealCharacter() {
        hero.setHealthCurrent(50);
        hero.heal(30);
        assertThat(hero.getHealthCurrent()).isEqualTo(80);
    }

    @Test
    void shouldNotHealBeyondMaxHealth() {
        hero.setHealthCurrent(90);
        hero.heal(20);
        assertThat(hero.getHealthCurrent()).isEqualTo(100);
    }

    @Test
    void shouldTakePhysicalDamageWithReduction() {
        // armor = 100, constant = 100
        // reductionFactor = 100 / (100 + 100) = 0.5
        // finalDamage = 50 * (1 - 0.5) = 25
        enemy.takeDamage(50, DamageType.PHYSIC);

        // If it's a bug, health will be 125. If it's correct (subtraction), it should
        // be 75.
        // Looking at the code, it seems it will be 125.
        assertThat(enemy.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    void shouldTakeBrutDamageWithoutReduction() {
        enemy.takeDamage(50, DamageType.BRUT);
        assertThat(enemy.getHealthCurrent()).isEqualTo(50);
    }

    @Test
    void shouldApplyAndExpireBuffs() {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.POWER);
        buff.setModifier(1.5);
        buff.setDuration(2);

        hero.applyBuff(buff, 1.5);
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getStatBuffMultiplier(StatType.POWER)).isEqualTo(1.5);

        hero.updateBuffs();
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(buff.getDuration()).isEqualTo(1);

        hero.updateBuffs();
        assertThat(hero.getActiveBuffs()).isEmpty();
    }

    @Test
    void shouldBypassShieldIfCasterHasShieldPenetrationBuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect penBuff = new BuffDebuffEffect();
        penBuff.setStatAffected(StatType.SHIELD_PENETRATION);
        penBuff.setModifier(2.0); // > 1.0 -> buff
        penBuff.setDuration(2);
        hero.applyBuff(penBuff, 2.0);

        // armor = 100, constant = 100 -> reduction factor = 0.5
        // damage = 50 -> finalDamage = 25
        // Since caster has shield penetration buff, it should ignore shield of 50 and
        // deal 25 damage directly to enemy's health current.
        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(50);
        assertThat(enemy.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    void shouldBypassShieldIfTargetHasShieldPenetrationDebuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect penDebuff = new BuffDebuffEffect();
        penDebuff.setStatAffected(StatType.SHIELD_PENETRATION);
        penDebuff.setModifier(0.0); // < 1.0 -> debuff
        penDebuff.setDuration(2);
        enemy.applyBuff(penDebuff, 0.0);

        // enemy armor = 100, constant = 100 -> reduction factor = 0.5
        // damage = 50 -> finalDamage = 25
        // Since target has shield penetration debuff, it ignores shield and deals 25
        // damage to health.
        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(50);
        assertThat(enemy.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    void shouldAmplifyShieldDamageIfCasterHasShieldDamageBuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect shieldDmgBuff = new BuffDebuffEffect();
        shieldDmgBuff.setStatAffected(StatType.DAMAGE_GIVEN_PHYSIC_TO_SHIELD);
        shieldDmgBuff.setModifier(2.0); // double damage to shield
        shieldDmgBuff.setDuration(2);
        hero.applyBuff(shieldDmgBuff, 2.0);

        // armor = 100, constant = 100 -> reduction factor = 0.5
        // raw damage = 50 -> effective damage = 25
        // shield multiplier = 2.0 -> damageToShield = 25 * 2 = 50
        // enemy has 50 shield, which absorbs all 50 damage against shield.
        // rawConsumed = (50 - 0) / 2 = 25.
        // remainingRawDamage = 25 - 25 = 0.
        // health current remains 100. enemy shield becomes 0.
        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(0);
        assertThat(enemy.getHealthCurrent()).isEqualTo(100);
    }
}
