package generation.grimoire.service;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.EquipmentEffectType;
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

        assertThat(hero.getManaCurrent()).isEqualTo(55);
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
}
