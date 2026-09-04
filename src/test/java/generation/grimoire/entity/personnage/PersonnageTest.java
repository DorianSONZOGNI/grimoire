package generation.grimoire.entity.personnage;

import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.ShieldEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealOverTimeEffect;
import generation.grimoire.enumeration.EquipmentEffectType;
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

    @Test
    void testMonsterType_Reptile_ReducesPhysicalDamage() {
        // base armor 100 -> 50% reduction.
        // raw damage = 100.
        // REPTILE reduces raw by 15% -> 85.
        // final damage = 85 / 2 = 42.5 -> 42.
        enemy.setMonsterType(generation.grimoire.enumeration.MonsterType.REPTILE);
        enemy.takeDamage(100, DamageType.PHYSIC, hero);
        assertThat(enemy.getHealthCurrent()).isEqualTo(100 - 42);
    }

    @Test
    void testMonsterType_Demon_ExtraBrutDamage() {
        hero.setMonsterType(generation.grimoire.enumeration.MonsterType.DEMON);
        // hero deals 100 damage.
        // Enemy has 100 armor -> 50% reduction.
        // Base damage dealt is 100.
        // Demon adds 10% (10) as BRUT damage.
        // Enemy takes 50 (PHYSIC) + 10 (BRUT) = 60.
        hero.dealDamage(enemy, 100, DamageType.PHYSIC);
        assertThat(enemy.getHealthCurrent()).isEqualTo(100 - 60);
    }

    @Test
    void testMonsterType_Vampire_Lifesteal() {
        hero.setMonsterType(generation.grimoire.enumeration.MonsterType.VAMPIRE);
        hero.setHealthCurrent(50);
        hero.dealDamage(enemy, 100, DamageType.PHYSIC);
        // Hero dealt 100 base damage -> 20% lifesteal = 20 heal.
        assertThat(hero.getHealthCurrent()).isEqualTo(70);
    }

    @Test
    void testMonsterType_Ectoplasme_DebuffResistance() {
        hero.setMonsterType(generation.grimoire.enumeration.MonsterType.ECTOPLASME);
        hero.dealDamage(enemy, 100, DamageType.PHYSIC);
        
        assertThat(enemy.getActiveBuffs()).hasSize(1);
        assertThat(enemy.getActiveBuffs().get(0).getStatAffected()).isEqualTo(generation.grimoire.enumeration.StatType.RESISTANCE);
        assertThat(enemy.getActiveBuffs().get(0).getFlatValue()).isEqualTo(-5);
        assertThat(enemy.getActiveBuffs().get(0).getDuration()).isEqualTo(3);
    }

    @Test
    void testMonsterType_Hybride_SplitDamage() {
        hero.setMonsterType(generation.grimoire.enumeration.MonsterType.HYBRIDE);
        // Base damage 100. Hybride total = 120.
        // Split: 60 PHYSIC, 60 MAGIC.
        // Enemy has 100 armor (50% reduction) and 100 resistance (50% reduction).
        // Takes 30 PHYSIC + 30 MAGIC = 60 damage.
        hero.dealDamage(enemy, 100, DamageType.PHYSIC);
        assertThat(enemy.getHealthCurrent()).isEqualTo(100 - 60);
    }

    @Test
    void shouldNotReduceHealthBelowZero() {
        hero.setHealthCurrent(10);
        hero.takeDamage(100, DamageType.BRUT);
        assertThat(hero.getHealthCurrent()).isEqualTo(0);
    }

    @Test
    void shouldApplyPartialShieldAbsorption() {
        enemy.addShield(20, 2, "SmallShield");
        // Enemy has 100 armor -> 0.5 reduction.
        // 100 damage -> 50 effective damage.
        // Shield absorbs 20. Remaining 30 goes to health.
        // Health = 100 - 30 = 70.
        enemy.takeDamage(100, DamageType.PHYSIC, hero);
        assertThat(enemy.getTotalShield()).isEqualTo(0);
        assertThat(enemy.getHealthCurrent()).isEqualTo(70);
    }

    @Test
    void shouldRegenHealthAndManaOnStartTurn() {
        hero.setHealthMax(200);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(50);
        hero.setRegenHp(10);
        hero.setRegenMana(5);
        
        Equipment regenItem = new Equipment();
        regenItem.setRegenHealthPerTurn(5);
        regenItem.setRegenManaPerTurn(2);
        hero.getEquipments().add(regenItem);

        hero.startTurn();

        assertThat(hero.getHealthCurrent()).isEqualTo(115);
        assertThat(hero.getManaCurrent()).isEqualTo(57);
    }

    @Test
    void shouldApplyCursedManaDrainOnStartTurn() {
        hero.setManaMax(100);
        hero.setManaCurrent(50);
        hero.setRegenMana(10);

        Equipment cursedItem = new Equipment();
        cursedItem.setSpecialEffect(EquipmentEffectType.CURSED_MANA_DRAIN);
        cursedItem.setSpecialEffectValue(20);
        hero.getEquipments().add(cursedItem);

        hero.startTurn();

        // regen is 10, drain is 20% of 50 = 10 -> net 0.
        // 50 + 0 = 50
        assertThat(hero.getManaCurrent()).isEqualTo(50);
    }

    @Test
    void shouldAllowCastIfRequirementsMet() {
        Voie voie = new Voie();
        voie.setId(1L);
        voie.setNom("Feu");
        hero.setVoie(voie);
        hero.setExperience(1000); // level 5

        Spell spell = new Spell();
        spell.setVoie(voie);
        spell.setNiveau(3);
        spell.setNom("Boule de feu");

        String error = hero.canCast(spell);
        assertThat(error).isNull();
    }

    @Test
    void shouldRejectCastIfVoieRequirementNotMet() {
        Voie voie = new Voie();
        voie.setId(1L);
        voie.setNom("Feu");
        hero.setVoie(voie);
        hero.setExperience(100); // level 2

        Spell spell = new Spell();
        spell.setVoie(voie);
        spell.setNiveau(5);
        spell.setNom("Météore");

        String error = hero.canCast(spell);
        assertThat(error).contains("a besoin de Feu niveau 5");

        Voie voie2 = new Voie();
        voie2.setId(2L);
        voie2.setNom("Eau");
        spell.setVoie(voie2);
        
        error = hero.canCast(spell);
        assertThat(error).contains("n'a pas la Eau requise");
    }

    @Test
    void shouldRejectCastIfSpiritualiteRequirementNotMet() {
        Spiritualite spi = new Spiritualite();
        spi.setId(1L);
        spi.setNom("Lumière");
        hero.setSpiritualite(spi);
        hero.setSpiritualiteExperience(0); // level 1

        Spell spell = new Spell();
        spell.setSpiritualite(spi);
        spell.setNiveau(2);
        spell.setNom("Soin lumineux");

        String error = hero.canCast(spell);
        assertThat(error).contains("a besoin de Lumière niveau 2");
    }

    @Test
    void shouldRejectGenericSpellIfHasAffinity() {
        Voie voie = new Voie();
        voie.setId(1L);
        voie.setNom("Feu");
        hero.setVoie(voie);

        Spell spell = new Spell();
        spell.setNom("Sort générique");

        String error = hero.canCast(spell);
        assertThat(error).contains("ne peut pas lancer de sorts génériques sans affinité");
    }
    
    @Test
    void shouldIncreaseVoieLevelBasedOnExperience() {
        Voie voie = new Voie();
        voie.setNom("destruction");
        hero.setVoie(voie);
        
        assertThat(hero.getVoieLevel()).isEqualTo(1);
        
        hero.setExperience(100);
        assertThat(hero.getVoieLevel()).isEqualTo(2);
        
        hero.setExperience(350);
        assertThat(hero.getVoieLevel()).isEqualTo(3);
        
        hero.setExperience(650);
        assertThat(hero.getVoieLevel()).isEqualTo(4);
        
        hero.setExperience(1200);
        assertThat(hero.getVoieLevel()).isEqualTo(5);
    }

    @Test
    void shouldCumulateMultipleBuffModifiersOnSameStat() {
        BuffDebuffEffect buff1 = new BuffDebuffEffect();
        buff1.setStatAffected(StatType.POWER);
        buff1.setModifier(0.2);
        buff1.setDuration(2);
        
        BuffDebuffEffect buff2 = new BuffDebuffEffect();
        buff2.setStatAffected(StatType.POWER);
        buff2.setModifier(0.3);
        buff2.setDuration(2);
        
        hero.applyBuff(buff1, 0.2);
        hero.applyBuff(buff2, 0.3);
        
        // base modifier is 1.0. 1.0 + 0.2 + 0.3 = 1.5
        assertThat(hero.getStatBuffMultiplier(StatType.POWER)).isEqualTo(1.5);
    }

    @Test
    void shouldPurgeAllBuffsDebuffsAndEffects() {
        hero.applyBuff(new BuffDebuffEffect(), 0.1);
        hero.addHealOverTimeEffect(new HealOverTimeEffect());
        hero.addDamageOverTimeEffect(new DamageOverTimeEffect());
        
        hero.purgeAllBuffsAndDebuffs();
        
        assertThat(hero.getActiveBuffs()).isEmpty();
        
        BuffDebuffEffect debuff = new BuffDebuffEffect();
        debuff.setStatAffected(StatType.POWER);
        debuff.setModifier(-0.5);
        debuff.setDuration(2);
        hero.applyBuff(debuff, -0.5);
        
        assertThat(hero.hasDebuff()).isTrue();
        hero.purgeAllBuffsAndDebuffs();
        assertThat(hero.hasDebuff()).isFalse();
    }

    @Test
    void shouldIdentifyAllyBasedOnTeamId() {
        Personnage ally = new Personnage();
        ally.setTeamId("ALLIES");
        Personnage enemyTeam = new Personnage();
        enemyTeam.setTeamId("ENEMIES");
        
        assertThat(hero.isAlly(ally)).isTrue();
        assertThat(hero.isAlly(enemyTeam)).isFalse();
        assertThat(hero.isAlly(null)).isFalse();
    }

    @Test
    void shouldAdjustBaseStatsCorrectly() {
        hero.setPower(10);
        hero.adjustStat(StatType.POWER, 5);
        assertThat(hero.getPower()).isEqualTo(15);
        
        hero.adjustStat(StatType.ARMURE, -10);
        // Base armor is 50. 50 - 10 = 40.
        assertThat(hero.getArmor()).isEqualTo(40);
    }

    @Test
    void shouldApplyFlatBuffCorrectly() {
        hero.setHealthMax(200);
        hero.setHealthCurrent(100);
        
        hero.applyFlatBuff(StatType.HEALTH, 50);
        assertThat(hero.getHealthCurrent()).isEqualTo(150);
        
        hero.applyFlatBuff(StatType.HEALTH, -20);
        assertThat(hero.getHealthCurrent()).isEqualTo(130);
        
        hero.setManaMax(100);
        hero.setManaCurrent(50);
        hero.applyFlatBuff(StatType.MANA, 20);
        assertThat(hero.getManaCurrent()).isEqualTo(70);
        hero.applyFlatBuff(StatType.MANA, -30);
        assertThat(hero.getManaCurrent()).isEqualTo(40);
        
        hero.applyFlatBuff(StatType.POWER, 10);
        // Base power was 20. + 10 = 30.
        assertThat(hero.getPower()).isEqualTo(30); 
    }

    @Test
    void shouldReturnTrueIfHasDebuffAndFalseOtherwise() {
        assertThat(hero.hasDebuff()).isFalse();
        
        BuffDebuffEffect debuff = new BuffDebuffEffect();
        debuff.setStatAffected(StatType.POWER);
        debuff.setModifier(-0.2); // Debuff (negative modifier, equivalent to < 1 multiplier)
        debuff.setDuration(2);
        hero.applyBuff(debuff, -0.2);
        
        assertThat(hero.hasDebuff()).isTrue();
        
        hero.purgeAllBuffsAndDebuffs();
        
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.POWER);
        buff.setModifier(0.2); // Buff
        buff.setDuration(2);
        hero.applyBuff(buff, 0.2);
        
        assertThat(hero.hasDebuff()).isFalse();
    }
}
