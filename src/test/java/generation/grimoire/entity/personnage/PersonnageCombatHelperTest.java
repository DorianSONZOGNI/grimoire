package generation.grimoire.entity.personnage;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.ManaOverTimeEffect;
import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.EquipmentEffectType;
import generation.grimoire.enumeration.MonsterType;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PersonnageCombatHelperTest {

    private Personnage hero;
    private Personnage enemy;

    @BeforeEach
    void setUp() {
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        hero.setArmor(50);
        hero.setResistance(50);
        hero.setPower(20);
        hero.setStrength(10);
        hero.setSpeed(5);
        hero.setCrit(10);
        hero.setRegenHp(0);
        hero.setRegenMana(0);
        hero.setTeamId("ALLIES");

        enemy = new Personnage();
        enemy.setName("Enemy");
        enemy.setHealthMax(100);
        enemy.setHealthCurrent(100);
        enemy.setManaMax(100);
        enemy.setManaCurrent(100);
        enemy.setArmor(100);
        enemy.setResistance(100);
        enemy.setPower(15);
        enemy.setStrength(10);
        enemy.setSpeed(4);
        enemy.setCrit(5);
        enemy.setRegenHp(0);
        enemy.setRegenMana(0);
        enemy.setTeamId("ENEMIES");
    }

    // ── startTurn ──────────────────────────────────────────────

    @Test
    @DisplayName("startTurn sets spell cast flags to false and flags banal spell when channeling")
    void startTurn_shouldHandleChanneling() {
        hero.setInstantSpellCastThisTurn(true);
        hero.setBanalSpellCastThisTurn(true);
        hero.setRemainingChannelingTurns(2);

        PersonnageCombatHelper.startTurn(hero);

        assertThat(hero.isInstantSpellCastThisTurn()).isFalse();
        assertThat(hero.isBanalSpellCastThisTurn()).isTrue();
    }

    @Test
    @DisplayName("startTurn applies REGENERATION passive percentage of total health max")
    void startTurn_shouldApplyPassiveRegeneration() {
        hero.setHealthCurrent(50);
        hero.setPassiveState("REGENERATION", 10); // 10% of 100 = 10 HP

        PersonnageCombatHelper.startTurn(hero);

        assertThat(hero.getHealthCurrent()).isEqualTo(60);
    }

    @Test
    @DisplayName("startTurn applies negative HP regen as incompressible damage")
    void startTurn_shouldTakeIncompressibleDamageOnNegativeHpRegen() {
        hero.setRegenHp(-15);

        PersonnageCombatHelper.startTurn(hero);

        assertThat(hero.getHealthCurrent()).isEqualTo(85);
    }

    @Test
    @DisplayName("startTurn calculates equipment hp and mana regen per turn")
    void startTurn_shouldIncludeEquipmentRegen() {
        hero.setHealthCurrent(50);
        hero.setManaCurrent(40);

        Equipment eq = new Equipment();
        eq.setName("Anneau de vitalité");
        eq.setRegenHealthPerTurn(5);
        eq.setRegenManaPerTurn(10);
        hero.setEquipments(List.of(eq));

        PersonnageCombatHelper.startTurn(hero);

        assertThat(hero.getHealthCurrent()).isEqualTo(55);
        assertThat(hero.getManaCurrent()).isEqualTo(50);
    }

    @Test
    @DisplayName("startTurn drains mana when CURSED_MANA_DRAIN is equipped")
    void startTurn_shouldApplyCursedManaDrain() {
        hero.setManaCurrent(100);
        hero.setRegenMana(10);

        Equipment eq = new Equipment();
        eq.setName("Anneau Maudit");
        eq.setSpecialEffect(EquipmentEffectType.CURSED_MANA_DRAIN);
        eq.setSpecialEffectValue(20); // Drains 20% of 100 mana = 20, net regen = 10 - 20 = -10
        hero.setEquipments(List.of(eq));

        PersonnageCombatHelper.startTurn(hero);

        assertThat(hero.getManaCurrent()).isEqualTo(90);
    }

    @Test
    @DisplayName("startTurn caps mana at zero if mana regen is excessively negative")
    void startTurn_shouldClampManaAtZero() {
        hero.setManaCurrent(10);
        hero.setRegenMana(-30);

        PersonnageCombatHelper.startTurn(hero);

        assertThat(hero.getManaCurrent()).isEqualTo(0);
    }

    // ── takeDamage ─────────────────────────────────────────────

    @Test
    @DisplayName("takeDamage with INCOMPRESSIBLE directly reduces health ignoring armor and shields")
    void takeDamage_incompressible_shouldDirectlyReduceHealth() {
        hero.addShield(50, 2, "Bouclier");
        hero.setArmor(200);

        PersonnageCombatHelper.takeDamage(hero, 40, DamageType.INCOMPRESSIBLE, null, false);

        assertThat(hero.getHealthCurrent()).isEqualTo(60);
        assertThat(hero.getTotalShield()).isEqualTo(50);
    }

    @Test
    @DisplayName("takeDamage reduces physical damage by 15% for REPTILE monster type")
    void takeDamage_reptile_shouldReducePhysicalDamageBy15Percent() {
        enemy.setMonsterType(MonsterType.REPTILE);
        enemy.setArmor(0); // 0 armor = 0 reduction factor

        // 100 * 0.85 = 85 damage
        PersonnageCombatHelper.takeDamage(enemy, 100, DamageType.PHYSIC, null, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(15);
    }

    @Test
    @DisplayName("takeDamage handles negative resistance with damage amplification")
    void takeDamage_negativeResistance_shouldAmplifyDamage() {
        // armor = -50, constant = 100
        // reductionFactor = -50 / (|-50| + 100) = -50 / 150 = -0.3333...
        // 1 - reductionFactor = 1.3333...
        // finalDamage = 30 * 1.3333 = 40
        enemy.setArmor(-50);

        PersonnageCombatHelper.takeDamage(enemy, 30, DamageType.PHYSIC, null, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(60);
    }

    @Test
    @DisplayName("takeDamage caps resistance reduction at 90%")
    void takeDamage_highResistance_shouldCapAt90Percent() {
        // armor = 2000, 2000 / 2100 = ~95% -> capped at 90%
        // finalDamage = 100 * (1 - 0.90) = 9.999... truncated to 9
        // 100 - 9 = 91
        enemy.setArmor(2000);

        PersonnageCombatHelper.takeDamage(enemy, 100, DamageType.PHYSIC, null, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(91);
    }

    @Test
    @DisplayName("takeDamage doubles resistance for MAGIC when isBurn is true")
    void takeDamage_magicWithBurn_shouldDoubleResistance() {
        // res = 50, doubled = 100
        // reduction = 100 / (100 + 100) = 0.5
        // 50 * (1 - 0.5) = 25
        hero.setResistance(50);

        PersonnageCombatHelper.takeDamage(hero, 50, DamageType.MAGIC, null, true);

        assertThat(hero.getHealthCurrent()).isEqualTo(75);
    }

    @Test
    @DisplayName("takeDamage cursed vulnerability increases damage taken")
    void takeDamage_cursedVulnerability_shouldIncreaseDamageTaken() {
        Equipment eq = new Equipment();
        eq.setName("Vulnérabilité");
        eq.setSpecialEffect(EquipmentEffectType.CURSED_VULNERABILITY);
        eq.setSpecialEffectValue(50); // +50% damage taken
        enemy.setEquipments(List.of(eq));
        enemy.setArmor(0); // 0 reduction factor

        // 40 * 1.5 = 60
        PersonnageCombatHelper.takeDamage(enemy, 40, DamageType.PHYSIC, null, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(40);
    }

    @Test
    @DisplayName("takeDamage shroud reduces damage taken multiplier")
    void takeDamage_shroud_shouldReduceDamageMultiplier() {
        enemy.setArmor(0);
        enemy.setPassiveState("PHYSICAL_SHROUD", 40); // -40% damage multiplier -> 0.60

        // 50 * 0.60 = 30
        PersonnageCombatHelper.takeDamage(enemy, 50, DamageType.PHYSIC, null, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(70);
    }

    @Test
    @DisplayName("takeDamage guarantees at least 1 damage if damage after buff is > 0")
    void takeDamage_shouldDealAtLeast1Damage() {
        enemy.setArmor(900); // 90% reduction
        // 1 * (1 - 0.90) = 0.1 -> clamped to 1
        PersonnageCombatHelper.takeDamage(enemy, 1, DamageType.PHYSIC, null, false);

        assertThat(enemy.getHealthCurrent()).isEqualTo(99);
    }

    @Test
    @DisplayName("takeDamage mana shield absorbs damage using current mana")
    void takeDamage_manaShield_shouldAbsorbDamageWithMana() {
        Equipment eq = new Equipment();
        eq.setName("Amulette de Mana");
        eq.setSpecialEffect(EquipmentEffectType.MANA_SHIELD);
        eq.setSpecialEffectValue(50); // Absorbs 50% of damage using mana
        hero.setEquipments(List.of(eq));
        hero.setArmor(0);
        hero.setManaCurrent(100);

        // 40 damage: mana shield absorbs 50% = 20 mana. Remaining health damage = 20.
        PersonnageCombatHelper.takeDamage(hero, 40, DamageType.PHYSIC, null, false);

        assertThat(hero.getManaCurrent()).isEqualTo(80);
        assertThat(hero.getHealthCurrent()).isEqualTo(80);
    }

    @Test
    @DisplayName("takeDamage cheat death revives character when health reaches zero")
    void takeDamage_cheatDeath_shouldReviveCharacter() {
        Equipment eq = new Equipment();
        eq.setName("Amulette Phénix");
        eq.setSpecialEffect(EquipmentEffectType.CHEAT_DEATH);
        eq.setSpecialEffectValue(6); // 5% * 6 = 30% of 100 max HP = 30 HP
        hero.setEquipments(List.of(eq));
        hero.setHealthCurrent(20);
        hero.setArmor(0);

        PersonnageCombatHelper.takeDamage(hero, 50, DamageType.PHYSIC, null, false);

        assertThat(hero.isUsedCheatDeath()).isTrue();
        assertThat(hero.getHealthCurrent()).isEqualTo(30);
    }

    @Test
    @DisplayName("takeDamage freeze on hit applies speed debuff to target")
    void takeDamage_freezeOnHit_shouldApplySpeedDebuff() {
        hero.setPassiveState("FREEZE_ON_HIT", 3);
        hero.setPassiveState("FREEZE_ON_HIT_DURATION", 2);
        enemy.setArmor(0);

        PersonnageCombatHelper.takeDamage(enemy, 20, DamageType.PHYSIC, hero, false);

        assertThat(enemy.getActiveBuffs()).hasSize(1);
        BuffDebuffEffect debuff = enemy.getActiveBuffs().get(0);
        assertThat(debuff.getStatAffected()).isEqualTo(StatType.SPEED);
        assertThat(debuff.getFlatValue()).isEqualTo(-3);
        assertThat(debuff.getDuration()).isEqualTo(2);
    }

    @Test
    @DisplayName("takeDamage epine reflects 10% damage to caster as brut damage")
    void takeDamage_epineMonsterType_shouldReflectDamage() {
        enemy.setMonsterType(MonsterType.EPINE);
        enemy.setArmor(0);

        PersonnageCombatHelper.takeDamage(enemy, 50, DamageType.PHYSIC, hero, false);

        // 50 * 0.10 = 5 brut damage reflected to hero
        assertThat(hero.getHealthCurrent()).isEqualTo(95);
    }

    @Test
    @DisplayName("takeDamage DAMAGE_REFLECTION passive reflects % to caster")
    void takeDamage_damageReflection_shouldReflectDamage() {
        enemy.setArmor(0);
        enemy.setResistance(0);
        enemy.setPassiveState("DAMAGE_REFLECTION", 20); // 20% of 40 = 8

        PersonnageCombatHelper.takeDamage(enemy, 40, DamageType.MAGIC, hero, false);

        assertThat(hero.getHealthCurrent()).isEqualTo(92);
    }

    @Test
    @DisplayName("takeDamage THORNS reflects physical damage to caster")
    void takeDamage_thorns_shouldReflectPhysicalDamage() {
        Equipment eq = new Equipment();
        eq.setName("Armure d'épines");
        eq.setSpecialEffect(EquipmentEffectType.THORNS);
        eq.setSpecialEffectValue(25); // 25% of 40 = 10
        enemy.setEquipments(List.of(eq));
        enemy.setArmor(0);

        PersonnageCombatHelper.takeDamage(enemy, 40, DamageType.PHYSIC, hero, false);

        assertThat(hero.getHealthCurrent()).isEqualTo(90);
    }

    @Test
    @DisplayName("takeDamage lifesteal heals caster on damage dealt")
    void takeDamage_lifesteal_shouldHealCaster() {
        hero.setHealthCurrent(50);
        Equipment eq = new Equipment();
        eq.setName("Lame de vampire");
        eq.setSpecialEffect(EquipmentEffectType.LIFESTEAL);
        eq.setSpecialEffectValue(20); // 20% lifesteal
        hero.setEquipments(List.of(eq));
        enemy.setArmor(0);

        PersonnageCombatHelper.takeDamage(enemy, 50, DamageType.PHYSIC, hero, false);

        // 50 * 0.20 = 10 healed to hero
        assertThat(hero.getHealthCurrent()).isEqualTo(60);
    }

    // ── dealDamage ─────────────────────────────────────────────

    @Test
    @DisplayName("dealDamage applies frenzy bonus and deals damage to target")
    void dealDamage_withFrenzy_shouldIncreaseDamage() {
        hero.setPassiveState("FRENZY", 20); // +20% damage
        enemy.setArmor(0);

        // 50 * 1.20 = 60
        PersonnageCombatHelper.dealDamage(hero, enemy, 50, DamageType.PHYSIC);

        assertThat(enemy.getHealthCurrent()).isEqualTo(40);
    }

    @Test
    @DisplayName("dealDamage with HYBRIDE monster type splits non-brut damage into 50% physical and 50% magic with 1.2 multiplier")
    void dealDamage_hybride_shouldSplitDamage() {
        hero.setMonsterType(MonsterType.HYBRIDE);
        enemy.setArmor(0);
        enemy.setResistance(0);

        // baseDamage 100 * 1.2 = 120 total -> 60 physic + 60 magic
        PersonnageCombatHelper.dealDamage(hero, enemy, 100, DamageType.PHYSIC);

        assertThat(enemy.getHealthCurrent()).isEqualTo(0);
    }

    @Test
    @DisplayName("dealDamage with DEMON monster type inflicts extra 10% brut damage")
    void dealDamage_demon_shouldInflictExtraBrutDamage() {
        hero.setMonsterType(MonsterType.DEMON);
        enemy.setArmor(0);

        // base 50 physic -> target takes 50 physic + 5 brut = 55 total
        PersonnageCombatHelper.dealDamage(hero, enemy, 50, DamageType.PHYSIC);

        assertThat(enemy.getHealthCurrent()).isEqualTo(45);
    }

    @Test
    @DisplayName("dealDamage with VAMPIRE monster type heals attacker for 20% base damage")
    void dealDamage_vampire_shouldHealAttacker() {
        hero.setMonsterType(MonsterType.VAMPIRE);
        hero.setHealthCurrent(50);
        enemy.setArmor(0);

        // 50 * 0.20 = 10 healed to hero
        PersonnageCombatHelper.dealDamage(hero, enemy, 50, DamageType.PHYSIC);

        assertThat(hero.getHealthCurrent()).isEqualTo(60);
    }

    @Test
    @DisplayName("dealDamage with ECTOPLASME monster type reduces target resistance by 5 for 3 turns")
    void dealDamage_ectoplasme_shouldApplyResistanceDebuff() {
        hero.setMonsterType(MonsterType.ECTOPLASME);
        enemy.setArmor(0);

        PersonnageCombatHelper.dealDamage(hero, enemy, 20, DamageType.PHYSIC);

        assertThat(enemy.getActiveBuffs()).hasSize(1);
        BuffDebuffEffect buff = enemy.getActiveBuffs().get(0);
        assertThat(buff.getStatAffected()).isEqualTo(StatType.RESISTANCE);
        assertThat(buff.getFlatValue()).isEqualTo(-5);
        assertThat(buff.getDuration()).isEqualTo(3);
    }

    // ── heal ───────────────────────────────────────────────────

    @Test
    @DisplayName("heal with CURSED_HEALING_REDUCTION reduces received heal")
    void heal_cursedHealingReduction_shouldReduceHeal() {
        hero.setHealthCurrent(50);
        Equipment eq = new Equipment();
        eq.setName("Bague d'affliction");
        eq.setSpecialEffect(EquipmentEffectType.CURSED_HEALING_REDUCTION);
        eq.setSpecialEffectValue(50); // -50% heal received
        hero.setEquipments(List.of(eq));

        // 40 * 0.50 = 20 heal
        PersonnageCombatHelper.heal(hero, 40, false);

        assertThat(hero.getHealthCurrent()).isEqualTo(70);
    }

    @Test
    @DisplayName("heal overheal converts surplus to shield when OVERHEAL_SHIELD equipped")
    void heal_overhealShield_shouldConvertSurplusToShield() {
        hero.setHealthCurrent(90);
        hero.setHealthMax(100);

        Equipment eq = new Equipment();
        eq.setName("Bouclier de bénédiction");
        eq.setSpecialEffect(EquipmentEffectType.OVERHEAL_SHIELD);
        eq.setSpecialEffectValue(50); // 50% surplus converted to shield
        hero.setEquipments(List.of(eq));

        // 30 heal on 90/100 -> newHp 120 -> surplus 20 -> shield 10
        PersonnageCombatHelper.heal(hero, 30, false);

        assertThat(hero.getHealthCurrent()).isEqualTo(100);
        assertThat(hero.getTotalShield()).isEqualTo(10);
    }

    @Test
    @DisplayName("heal purges poison buffs and poison DoTs when not native regen")
    void heal_nonNativeRegen_shouldPurgePoison() {
        hero.setHealthCurrent(50);

        BuffDebuffEffect poisonBuff = new BuffDebuffEffect();
        poisonBuff.setStatAffected(StatType.POISON);
        poisonBuff.setFlatValue(10);
        hero.getActiveBuffs().add(poisonBuff);

        DamageOverTimeEffect poisonDot = new DamageOverTimeEffect();
        poisonDot.setPoison(true);
        hero.getActiveDamageOverTimeEffects().add(poisonDot);

        PersonnageCombatHelper.heal(hero, 10, false);

        assertThat(hero.getActiveBuffs()).isEmpty();
        assertThat(hero.getActiveDamageOverTimeEffects()).isEmpty();
    }

    @Test
    @DisplayName("heal does not purge poison when isNativeRegen is true")
    void heal_nativeRegen_shouldNotPurgePoison() {
        hero.setHealthCurrent(50);

        BuffDebuffEffect poisonBuff = new BuffDebuffEffect();
        poisonBuff.setStatAffected(StatType.POISON);
        poisonBuff.setFlatValue(10);
        hero.getActiveBuffs().add(poisonBuff);

        PersonnageCombatHelper.heal(hero, 10, true);

        assertThat(hero.getActiveBuffs()).hasSize(1);
    }

    // ── updateBuffs & updateShields ────────────────────────────

    @Test
    @DisplayName("updateBuffs deals burn and poison ticks and decrements buff duration")
    void updateBuffs_shouldDealBurnAndPoisonAndDecrementBuffs() {
        hero.setArmor(0);
        hero.setResistance(0);

        BuffDebuffEffect burnBuff = new BuffDebuffEffect();
        burnBuff.setStatAffected(StatType.BURN);
        burnBuff.setFlatValue(10);
        burnBuff.setDuration(2);
        hero.getActiveBuffs().add(burnBuff);

        BuffDebuffEffect poisonBuff = new BuffDebuffEffect();
        poisonBuff.setStatAffected(StatType.POISON);
        poisonBuff.setFlatValue(15);
        poisonBuff.setDuration(1);
        hero.getActiveBuffs().add(poisonBuff);

        hero.setConsumableBonusXpTurns(2);
        hero.setConsumableBonusXpPercent(50);

        PersonnageCombatHelper.updateBuffs(hero);

        // 10 burn magic damage + 15 poison brut damage = 25 damage
        assertThat(hero.getHealthCurrent()).isEqualTo(75);
        // burn duration 2 -> 1, poison duration 1 -> 0 (removed)
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.BURN);
        assertThat(hero.getActiveBuffs().get(0).getDuration()).isEqualTo(1);
        assertThat(hero.getConsumableBonusXpTurns()).isEqualTo(1);
    }

    @Test
    @DisplayName("updateBuffs resets consumableBonusXpPercent when turns reach zero")
    void updateBuffs_shouldResetConsumableBonusXpWhenExpired() {
        hero.setConsumableBonusXpTurns(1);
        hero.setConsumableBonusXpPercent(50);

        PersonnageCombatHelper.updateBuffs(hero);

        assertThat(hero.getConsumableBonusXpTurns()).isEqualTo(0);
        assertThat(hero.getConsumableBonusXpPercent()).isEqualTo(0);
    }

    @Test
    @DisplayName("updateShields decrements shield duration and removes expired or empty shields")
    void updateShields_shouldDecrementAndRemoveExpired() {
        ActiveShield s1 = new ActiveShield(50, 2, "Shield1");
        ActiveShield s2 = new ActiveShield(0, 3, "EmptyShield");
        ActiveShield s3 = new ActiveShield(30, 1, "ExpiringShield");
        hero.setActiveShields(new ArrayList<>(List.of(s1, s2, s3)));

        PersonnageCombatHelper.updateShields(hero);

        // s1: duration 2 -> 1, remains
        // s2: amount <= 0, removed
        // s3: duration 1 -> 0, removed
        assertThat(hero.getActiveShields()).hasSize(1);
        assertThat(hero.getActiveShields().get(0).getSourceName()).isEqualTo("Shield1");
        assertThat(hero.getActiveShields().get(0).getDuration()).isEqualTo(1);
    }

    // ── update OverTime effects ────────────────────────────────

    @Test
    @DisplayName("updateHealOverTimeEffects ticks and removes expired HoTs")
    void updateHealOverTimeEffects_shouldTickAndRemove() {
        hero.setHealthCurrent(50);
        HealOverTimeEffect hot = new HealOverTimeEffect();
        hot.setFixedHealPerTick(10);
        hot.setDuration(1);
        hero.getActiveHealOverTimeEffects().add(hot);

        PersonnageCombatHelper.updateHealOverTimeEffects(hero);

        assertThat(hero.getHealthCurrent()).isEqualTo(60);
        assertThat(hero.getActiveHealOverTimeEffects()).isEmpty();
    }

    @Test
    @DisplayName("updateManaOverTimeEffects ticks and removes expired MoTs")
    void updateManaOverTimeEffects_shouldTickAndRemove() {
        hero.setManaCurrent(50);
        ManaOverTimeEffect mot = new ManaOverTimeEffect();
        mot.setFixedManaPerTick(15);
        mot.setDuration(1);
        hero.getActiveManaOverTimeEffects().add(mot);

        PersonnageCombatHelper.updateManaOverTimeEffects(hero);

        assertThat(hero.getManaCurrent()).isEqualTo(65);
        assertThat(hero.getActiveManaOverTimeEffects()).isEmpty();
    }

    @Test
    @DisplayName("updateDamageOverTimeEffects ticks and removes expired DoTs")
    void updateDamageOverTimeEffects_shouldTickAndRemove() {
        enemy.setArmor(0);
        DamageOverTimeEffect dot = new DamageOverTimeEffect();
        dot.setFixedDamagePerTick(20);
        dot.setDuration(1);
        dot.setDamageType(DamageType.BRUT);
        enemy.getActiveDamageOverTimeEffects().add(dot);

        PersonnageCombatHelper.updateDamageOverTimeEffects(enemy);

        assertThat(enemy.getHealthCurrent()).isEqualTo(80);
        assertThat(enemy.getActiveDamageOverTimeEffects()).isEmpty();
    }

    @Test
    @DisplayName("updateHeatOverTimeEffects ticks and removes expired HeatOTs")
    void updateHeatOverTimeEffects_shouldTickAndRemove() {
        HeatOverTimeEffect hot = new HeatOverTimeEffect();
        hot.setFixedValue(10);
        hot.setDuration(1);
        enemy.getActiveHeatOverTimeEffects().add(hot);

        PersonnageCombatHelper.updateHeatOverTimeEffects(enemy);

        assertThat(enemy.getActiveHeatOverTimeEffects()).isEmpty();
    }

    // ── Stat calculations & Helpers ────────────────────────────

    @Test
    @DisplayName("getStatBuffMultiplier sums positives and compounds negatives")
    void getStatBuffMultiplier_shouldSumPositivesAndCompoundNegatives() {
        BuffDebuffEffect pos1 = new BuffDebuffEffect();
        pos1.setStatAffected(StatType.POWER);
        pos1.setModifier(0.20);
        hero.getActiveBuffs().add(pos1);

        BuffDebuffEffect pos2 = new BuffDebuffEffect();
        pos2.setStatAffected(StatType.POWER);
        pos2.setModifier(0.30);
        hero.getActiveBuffs().add(pos2);

        BuffDebuffEffect neg = new BuffDebuffEffect();
        neg.setStatAffected(StatType.POWER);
        neg.setModifier(-0.10);
        hero.getActiveBuffs().add(neg);

        // positiveModifier = 0.50
        // negativeMultiplier = (1 - 0.10) = 0.90
        // result = 1.50 * 0.90 = 1.35
        double mult = PersonnageCombatHelper.getStatBuffMultiplier(hero, StatType.POWER);
        assertThat(mult).isCloseTo(1.35, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    @DisplayName("getStatBuffMultiplier adds 30% for DAMAGE_GIVEN_PHYSIC if AME_DETACHEE buff present")
    void getStatBuffMultiplier_ameDetachee_shouldAdd30Percent() {
        BuffDebuffEffect ame = new BuffDebuffEffect();
        ame.setStatAffected(StatType.AME_DETACHEE);
        hero.getActiveBuffs().add(ame);

        double mult = PersonnageCombatHelper.getStatBuffMultiplier(hero, StatType.DAMAGE_GIVEN_PHYSIC);
        assertThat(mult).isCloseTo(1.30, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    @DisplayName("getStatFlatBonus aggregates buff, equipment, passive state and Voie/Spiritualite passifs")
    void getStatFlatBonus_shouldAggregateAllSources() {
        // Buff flat
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.POWER);
        buff.setFlatValue(5);
        hero.getActiveBuffs().add(buff);

        // Passive state flat
        hero.setPassiveState("stat_flat_POWER", 3);

        // Equipment bonus
        Equipment eq = new Equipment();
        eq.setName("Bâton d'archimage");
        eq.setBonusPower(12);
        hero.setEquipments(List.of(eq));

        // Voie passive effect adjust
        VoiePassiveEffect voiePassif = new VoiePassiveEffect() {
            @Override
            public void onSpellCast(Personnage personnage, Spell spell) {}
            @Override
            public void onTurnStart(Personnage personnage) {}
            @Override
            public int adjustFlatBonus(Personnage p, StatType statType, int currentBonus) {
                if (statType == StatType.POWER) {
                    return currentBonus + 4;
                }
                return currentBonus;
            }
        };
        generation.grimoire.entity.Voie voie = new generation.grimoire.entity.Voie();
        voie.setPassiveEffects(List.of(voiePassif));
        hero.setVoie(voie);

        // Spiritualite passive effect adjust
        SpiritualitePassiveEffect spiritPassif = new SpiritualitePassiveEffect() {
            @Override
            public void onSpellCast(Personnage personnage, Spell spell) {}
            @Override
            public void onTurnStart(Personnage personnage) {}
            @Override
            public boolean canCastSpell(Personnage caster, Spell spell) { return true; }
            @Override
            public int adjustFlatBonus(Personnage p, StatType statType, int currentBonus) {
                if (statType == StatType.POWER) {
                    return currentBonus + 2;
                }
                return currentBonus;
            }
        };
        generation.grimoire.entity.Spiritualite spirit = new generation.grimoire.entity.Spiritualite();
        spirit.setPassiveEffects(List.of(spiritPassif));
        hero.setSpiritualite(spirit);

        // 5 + 3 + 12 + 4 + 2 = 26
        int totalFlat = PersonnageCombatHelper.getStatFlatBonus(hero, StatType.POWER);
        assertThat(totalFlat).isEqualTo(26);
    }

    @Test
    @DisplayName("getEffectiveStat calculates (base + flat) * multiplier")
    void getEffectiveStat_shouldCalculateCorrectly() {
        hero.setPower(20);

        BuffDebuffEffect flatBuff = new BuffDebuffEffect();
        flatBuff.setStatAffected(StatType.POWER);
        flatBuff.setFlatValue(10);
        hero.getActiveBuffs().add(flatBuff);

        BuffDebuffEffect multBuff = new BuffDebuffEffect();
        multBuff.setStatAffected(StatType.POWER);
        multBuff.setModifier(0.50);
        hero.getActiveBuffs().add(multBuff);

        // (20 base + 10 flat) * 1.50 = 45
        int effectivePower = PersonnageCombatHelper.getEffectiveStat(hero, StatType.POWER);
        assertThat(effectivePower).isEqualTo(45);
    }
}
