package generation.grimoire.service;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.EquipmentEffectType;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

class CursedEffectTest {

    private SpellService spellService;
    private Personnage hero;
    private Personnage enemy;

    @BeforeEach
    void setUp() {
        SpellRepository spellRepository = Mockito.mock(SpellRepository.class);
        PersonnageService personnageService = Mockito.mock(PersonnageService.class);
        PassiveDispatcher passiveDispatcher = new PassiveDispatcher();
        spellService = new SpellService(spellRepository, personnageService, passiveDispatcher);

        hero = new Personnage();
        hero.setId(1L);
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        hero.setEquipments(new ArrayList<>());
        hero.setRegenMana(15); // Base regen

        enemy = new Personnage();
        enemy.setId(2L);
        enemy.setName("Enemy");
        enemy.setHealthMax(100);
        enemy.setHealthCurrent(100);
    }

    @Test
    void testCursedManaDrain() {
        // -10 power means drain 10 mana
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_MANA_DRAIN);
        cursedEq.setSpecialEffectValue(-10);
        hero.getEquipments().add(cursedEq);

        hero.startTurn();

        // Base regen is 15. Cursed drain is 10. Total regen should be 5.
        // Mana starts at 100, wait, regen only happens if current mana < max.
        // Let's set current mana to 50 so regen actually applies.
        hero.setManaCurrent(50);
        hero.startTurn();

        // Drain is 10% of 50 = 5.
        // Base regen is 15. Net change = +10.
        assertThat(hero.getManaCurrent()).isEqualTo(60);
    }

    @Test
    void testCursedHpLossOnMana() {
        // -20% of mana consumed becomes true damage
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_HP_LOSS_ON_MANA);
        cursedEq.setSpecialEffectValue(-20);
        hero.getEquipments().add(cursedEq);

        Spell spell = new Spell();
        spell.setNom("Test Spell");
        spell.setManaCost(50);
        spell.setEffects(new java.util.LinkedHashSet<>());

        spellService.castSpell(spell, hero, enemy, null);

        // Cost is 50 mana. 20% of 50 is 10 true damage.
        // HP starts at 100, should be 90.
        assertThat(hero.getHealthCurrent()).isEqualTo(90);
        assertThat(hero.getManaCurrent()).isEqualTo(50);
    }

    @Test
    void testCursedMagicDamageReduction() {
        // -30% magic damage reduction
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_MAGIC_DAMAGE_REDUCTION);
        cursedEq.setSpecialEffectValue(-30);
        hero.getEquipments().add(cursedEq);

        DamageFixedEffect damageEffect = new DamageFixedEffect();
        damageEffect.setDamageType(DamageType.MAGIC);
        damageEffect.setDamage(100);

        // Apply effect
        damageEffect.apply(hero, enemy);

        // 100 damage - 30% = 70 damage.
        // Enemy starts at 100 HP, should be 30 HP.
        assertThat(enemy.getHealthCurrent()).isEqualTo(30);
    }

    @Test
    void testCursedPhysicalDamageReduction() {
        // -25% physical damage reduction
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_PHYSICAL_DAMAGE_REDUCTION);
        cursedEq.setSpecialEffectValue(-25);
        hero.getEquipments().add(cursedEq);

        DamageFixedEffect damageEffect = new DamageFixedEffect();
        damageEffect.setDamageType(DamageType.PHYSIC);
        damageEffect.setDamage(100);

        // Apply effect
        damageEffect.apply(hero, enemy);

        // 100 damage - 25% = 75 damage.
        // Enemy starts at 100 HP, should be 25 HP.
        assertThat(enemy.getHealthCurrent()).isEqualTo(25);
    }

    @Test
    void testCursedVulnerability() {
        // +20% vulnerability (takes 20% more damage)
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_VULNERABILITY);
        cursedEq.setSpecialEffectValue(-20); // usually negative value on cursed item
        hero.getEquipments().add(cursedEq);

        // Enemy attacks hero for 100 base damage
        hero.takeDamage(100, DamageType.BRUT, enemy);

        // 100 base + 20% = 120 damage. Hero starts at 100 HP, should die or hit 0.
        // Let's set hero HP higher to see the exact deduction
        hero.setHealthMax(200);
        hero.setHealthCurrent(200);
        hero.takeDamage(100, DamageType.BRUT, enemy);

        assertThat(hero.getHealthCurrent()).isEqualTo(80);
    }

    @Test
    void testCursedHealingReduction() {
        // -30% healing received
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_HEALING_REDUCTION);
        cursedEq.setSpecialEffectValue(-30);
        hero.getEquipments().add(cursedEq);

        hero.setHealthMax(200);
        hero.setHealthCurrent(50); // injured
        hero.heal(100);

        // 100 base heal - 30% = 70 heal.
        // HP becomes 50 + 70 = 120
        assertThat(hero.getHealthCurrent()).isEqualTo(120);
    }

    @Test
    void testCursedManaTax() {
        // +50% mana cost on spells
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_MANA_TAX);
        cursedEq.setSpecialEffectValue(50);
        hero.getEquipments().add(cursedEq);

        Spell spell = new Spell();
        spell.setNom("Mana Spell");
        spell.setManaCost(50);
        spell.setEffects(new java.util.LinkedHashSet<>());

        hero.setManaMax(200);
        hero.setManaCurrent(200);

        spellService.castSpell(spell, hero, enemy, null);

        // Cost is 50 base + 50% = 75 mana.
        // Current mana: 200 - 75 = 125.
        assertThat(hero.getManaCurrent()).isEqualTo(125);
    }

    @Test
    void testCursedDefaillance() {
        // -20% armor and resistance for 2 turns applied at start of turn
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_DEFAILANCE);
        cursedEq.setSpecialEffectValue(-20);
        hero.getEquipments().add(cursedEq);

        hero.setArmor(100);
        hero.setResistance(100);

        // Turn 1 starts
        hero.startTurn();

        // 2 debuffs added (ARMURE and RESISTANCE), duration 2, modifier -0.20
        assertThat(hero.getActiveBuffs()).hasSize(2);
        assertThat(hero.getStatBuffMultiplier(StatType.ARMURE)).isEqualTo(0.80);
        assertThat(hero.getStatBuffMultiplier(StatType.RESISTANCE)).isEqualTo(0.80);

        // End of Turn 1
        hero.updateBuffs();
        // Still active with remaining duration 1
        assertThat(hero.getActiveBuffs()).hasSize(2);
        assertThat(hero.getActiveBuffs().get(0).getDuration()).isEqualTo(1);

        // Turn 2 starts -> applies a second stack
        hero.startTurn();
        assertThat(hero.getActiveBuffs()).hasSize(4);
        // During turn 2: (1 - 0.20) * (1 - 0.20) = 0.64
        assertThat(hero.getStatBuffMultiplier(StatType.ARMURE)).isCloseTo(0.64, org.assertj.core.data.Offset.offset(0.001));

        // End of Turn 2 -> first stack expires (duration reached 0)
        hero.updateBuffs();
        assertThat(hero.getActiveBuffs()).hasSize(2);
        assertThat(hero.getActiveBuffs().get(0).getDuration()).isEqualTo(1);
    }

    @Test
    void testCursedBurningBlood() {
        // Receives a burn of 20 flat damage for 3 turns each turn
        Equipment cursedEq = new Equipment();
        cursedEq.setSpecialEffect(EquipmentEffectType.CURSED_BURNING_BLOOD);
        cursedEq.setSpecialEffectValue(-20);
        hero.getEquipments().add(cursedEq);

        hero.setHealthMax(200);
        hero.setHealthCurrent(200);
        hero.setResistance(0); // 0 resistance so full 20 burn damage

        // Turn 1 starts
        hero.startTurn();

        // Burn buff added with flat 20, duration 3
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.BURN);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(20);
        assertThat(hero.getActiveBuffs().get(0).getDuration()).isEqualTo(3);

        // End of Turn 1: updateBuffs triggers burn damage
        hero.updateBuffs();

        // Hero takes 20 burn damage: 200 - 20 = 180 HP
        assertThat(hero.getHealthCurrent()).isEqualTo(180);
        // Burn duration decreased from 3 to 2
        assertThat(hero.getActiveBuffs().get(0).getDuration()).isEqualTo(2);
    }
}
