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
        buff.setModifier(0.5);
        buff.setDuration(2);

        hero.applyBuff(buff, 0.5);
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
        penDebuff.setModifier(-1.0); // < 0.0 -> debuff
        penDebuff.setDuration(2);
        enemy.applyBuff(penDebuff, -1.0);

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
        shieldDmgBuff.setModifier(1.0); // double damage to shield
        shieldDmgBuff.setDuration(2);
        hero.applyBuff(shieldDmgBuff, 1.0);

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

    @Test
    void shouldMultiplyShieldReceived() {
        BuffDebuffEffect recBuff = new BuffDebuffEffect();
        recBuff.setStatAffected(StatType.SHIELD_RECEIVED);
        recBuff.setModifier(0.5); // +50% shield received
        recBuff.setDuration(2);
        hero.applyBuff(recBuff, 0.5);

        // base amount = 100
        // with 1.5 multiplier on recipient -> final amount = 150
        hero.addShield(100, 2, "TestShield");
        assertThat(hero.getTotalShield()).isEqualTo(150);
    }

    @Test
    void shouldMultiplyShieldGivenByCaster() {
        BuffDebuffEffect giveBuff = new BuffDebuffEffect();
        giveBuff.setStatAffected(StatType.SHIELD_GIVEN);
        giveBuff.setModifier(1.0); // +100% shield given
        giveBuff.setDuration(2);
        hero.applyBuff(giveBuff, 1.0);

        ShieldEffect shieldEff = new ShieldEffect();
        shieldEff.setFixedValue(50);
        shieldEff.setDuration(3);
        shieldEff.apply(hero, enemy);

        // base amount = 50
        // with 2.0 SHIELD_GIVEN on hero -> final amount created = 100
        // since enemy has no SHIELD_RECEIVED buff, enemy receives 100.
        assertThat(enemy.getTotalShield()).isEqualTo(100);
    }

    @Test
    void shouldAmplifyMagicShieldDamageIfCasterHasShieldDamageBuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect shieldDmgBuff = new BuffDebuffEffect();
        shieldDmgBuff.setStatAffected(StatType.DAMAGE_GIVEN_MAGIC_TO_SHIELD);
        shieldDmgBuff.setModifier(1.0); // double damage to shield
        shieldDmgBuff.setDuration(2);
        hero.applyBuff(shieldDmgBuff, 1.0);

        // resistance = 100, constant = 100 -> reduction factor = 0.5
        // raw damage = 50 -> effective damage = 25
        // shield multiplier = 2.0 -> damageToShield = 25 * 2 = 50
        // enemy has 50 shield, which absorbs all 50 damage against shield.
        // rawConsumed = (50 - 0) / 2 = 25.
        // remainingRawDamage = 25 - 25 = 0.
        // health current remains 100. enemy shield becomes 0.
        enemy.takeDamage(50, DamageType.MAGIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(0);
        assertThat(enemy.getHealthCurrent()).isEqualTo(100);
    }

    @Test
    void shouldBypassShieldIfCasterHasShieldPenetrationFlatBuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect penBuff = new BuffDebuffEffect();
        penBuff.setStatAffected(StatType.SHIELD_PENETRATION);
        penBuff.setFlatValue(50); // Flat bonus > 0 -> buff
        penBuff.setDuration(2);
        hero.applyBuff(penBuff, 1.0); // flat is 50

        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(50);
        assertThat(enemy.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    void shouldBypassShieldIfTargetHasShieldPenetrationFlatDebuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect penDebuff = new BuffDebuffEffect();
        penDebuff.setStatAffected(StatType.SHIELD_PENETRATION);
        penDebuff.setFlatValue(-50); // Flat bonus < 0 -> debuff
        penDebuff.setDuration(2);
        enemy.applyBuff(penDebuff, 1.0); // flat is -50

        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(50);
        assertThat(enemy.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    void shouldBypassShieldIfTargetHasShieldPiercedDebuff() {
        enemy.addShield(50, 2, "ShieldSource");

        BuffDebuffEffect pierceDebuff = new BuffDebuffEffect();
        pierceDebuff.setStatAffected(StatType.SHIELD_PIERCED);
        pierceDebuff.setFlatValue(50); // Flat bonus > 0 -> debuff is active
        pierceDebuff.setDuration(2);
        enemy.applyBuff(pierceDebuff, 1.0);

        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        assertThat(enemy.getTotalShield()).isEqualTo(50);
        assertThat(enemy.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    void shouldBypassShieldPartiallyIfCasterHasShieldPenetrationPercentageBuff() {
        enemy.addShield(100, 2, "ShieldSource");

        BuffDebuffEffect penBuff = new BuffDebuffEffect();
        penBuff.setStatAffected(StatType.SHIELD_PENETRATION);
        penBuff.setModifier(0.2); // 20% modifier
        penBuff.setDuration(2);
        hero.applyBuff(penBuff, 0.2); // set modifier to 0.2

        enemy.takeDamage(50, DamageType.PHYSIC, hero);

        // 25 effective damage * 20% = 5 damage bypasses shield.
        // Remaining 20 damage is absorbed by shield.
        // Shield goes from 100 to 80.
        // Health goes from 100 to 95.
        assertThat(enemy.getTotalShield()).isEqualTo(80);
        assertThat(enemy.getHealthCurrent()).isEqualTo(95);
    }

    @Test
    void shouldNotInflateModifierIfModifierSourceIsNull() {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.SHIELD_PENETRATION);
        buff.setModifier(0.2);
        buff.setDuration(2);
        buff.setModifierSource(null);

        buff.apply(hero, enemy);

        assertThat(enemy.getActiveBuffs()).hasSize(1);
        assertThat(enemy.getActiveBuffs().get(0).getModifier()).isEqualTo(0.2);
    }

    @Test
    void shouldCloneBuffEffectAndNotMutateTemplateDuration() {
        BuffDebuffEffect buffTemplate = new BuffDebuffEffect();
        buffTemplate.setStatAffected(StatType.ARMURE);
        buffTemplate.setFlatValue(10);
        buffTemplate.setModifier(0.2);
        buffTemplate.setDuration(2);

        buffTemplate.apply(hero, enemy);

        // Template duration should remain 2
        assertThat(buffTemplate.getDuration()).isEqualTo(2);

        // Enemy should have cloned active buffs
        assertThat(enemy.getActiveBuffs()).hasSize(2); // One flat, one modifier clone

        // Update buffs: should decrement active buff duration to 1
        enemy.updateBuffs();
        assertThat(enemy.getActiveBuffs()).hasSize(2);
        assertThat(enemy.getActiveBuffs().get(0).getDuration()).isEqualTo(1);
        assertThat(enemy.getActiveBuffs().get(1).getDuration()).isEqualTo(1);

        // Template duration remains 2
        assertThat(buffTemplate.getDuration()).isEqualTo(2);
    }

    @Test
    void shouldCleansePoisonOnHeal() {
        BuffDebuffEffect poisonFlat = new BuffDebuffEffect();
        poisonFlat.setStatAffected(StatType.POISON);
        poisonFlat.setFlatValue(5);
        poisonFlat.setDuration(2);

        BuffDebuffEffect poisonMult = new BuffDebuffEffect();
        poisonMult.setStatAffected(StatType.POISON);
        poisonMult.setModifier(0.2); // 20% vulnerability
        poisonMult.setDuration(2);

        enemy.getActiveBuffs().add(poisonFlat);
        enemy.getActiveBuffs().add(poisonMult);

        assertThat(enemy.getActiveBuffs()).hasSize(2);

        enemy.setHealthCurrent(50);
        enemy.heal(10); // Heal should cleanse both

        assertThat(enemy.getActiveBuffs()).isEmpty();
    }

    @Test
    void shouldDoubleMagicResistanceForBurnDamage() {
        // enemy has resistance=100
        // Burn is MAGIC damage with isBurn=true.
        // For MAGIC, constant=100.
        // resistanceValue = resistance * 2 = 100 * 2 = 200.
        // reductionFactor = 200 / (200 + 100) = 2/3 = 0.6666...
        // Damage = 60
        // finalDamage = 60 * (1 - 2/3) = 60 * 1/3 = 20.

        enemy.takeDamage(60, DamageType.MAGIC, hero, true);
        assertThat(enemy.getHealthCurrent()).isEqualTo(100 - 20);

        // Without isBurn, magic damage:
        // resistanceValue = 100. reductionFactor = 100 / (100 + 100) = 0.5.
        // finalDamage = 60 * 0.5 = 30.
        enemy.setHealthCurrent(100);
        enemy.takeDamage(60, DamageType.MAGIC, hero, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(100 - 30);
    }
}
