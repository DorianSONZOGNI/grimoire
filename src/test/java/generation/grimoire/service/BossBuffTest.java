package generation.grimoire.service;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.enumeration.DamageType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

class BossBuffTest {

    private Personnage hero;
    private Personnage boss;

    @BeforeEach
    void setUp() {
        hero = new Personnage();
        hero.setId(1L);
        hero.setName("Hero");
        hero.setHealthMax(200);
        hero.setHealthCurrent(200);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        hero.setEquipments(new ArrayList<>());

        boss = new Personnage();
        boss.setId(2L);
        boss.setName("Boss");
        boss.setHealthMax(500);
        boss.setHealthCurrent(500);
        boss.setEquipments(new ArrayList<>());
    }

    @Test
    void testDamageReflection() {
        // DAMAGE_REFLECTION is stored as a passive state on bosses
        boss.getPassiveStates().put("DAMAGE_REFLECTION", 20); // 20% reflection

        boss.takeDamage(100, DamageType.PHYSIC, hero);

        // Takes 100
        assertThat(boss.getHealthCurrent()).isEqualTo(400);

        // Reflects 20% of 100 = 20
        assertThat(hero.getHealthCurrent()).isEqualTo(180);
    }

    @Test
    void testPhysicalShroud() {
        boss.getPassiveStates().put("PHYSICAL_SHROUD", 30); // 30% reduction

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setDamageType(DamageType.PHYSIC);
        dmg.setDamage(100);
        dmg.apply(hero, boss);

        // 100 - 30% = 70
        assertThat(boss.getHealthCurrent()).isEqualTo(430);
    }

    @Test
    void testMagicShroud() {
        boss.getPassiveStates().put("MAGIC_SHROUD", 40); // 40% reduction

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setDamageType(DamageType.MAGIC);
        dmg.setDamage(100);
        dmg.apply(hero, boss);

        // 100 - 40% = 60
        assertThat(boss.getHealthCurrent()).isEqualTo(440);
    }

    @Test
    void testFrenzy() {
        boss.getPassiveStates().put("FRENZY", 50); // +50% damage

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setDamageType(DamageType.PHYSIC);
        dmg.setDamage(100);
        dmg.apply(boss, hero);

        // 100 + 50% = 150
        assertThat(hero.getHealthCurrent()).isEqualTo(50);
    }

    @Test
    void testLifestealAura() {
        boss.getPassiveStates().put("LIFESTEAL_ON_HIT", 25); // 25% lifesteal

        boss.setHealthCurrent(200);

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setDamageType(DamageType.PHYSIC);
        dmg.setDamage(100);
        dmg.apply(boss, hero);

        assertThat(hero.getHealthCurrent()).isEqualTo(100); // 200 - 100
        assertThat(boss.getHealthCurrent()).isEqualTo(225); // 200 + 25
    }

    @Test
    void testFreezeOnHit() {
        boss.getPassiveStates().put("FREEZE_ON_HIT", 5);
        boss.getPassiveStates().put("FREEZE_ON_HIT_DURATION", 2);

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setDamageType(DamageType.PHYSIC);
        dmg.setDamage(50);
        dmg.apply(boss, hero);

        // Hero takes 50 damage
        assertThat(hero.getHealthCurrent()).isEqualTo(150);

        // Verify speed debuff
        long freezeDebuffs = hero.getActiveBuffs().stream()
                .filter(b -> b instanceof generation.grimoire.entity.spell.type.effect.BuffDebuffEffect &&
                        ((generation.grimoire.entity.spell.type.effect.BuffDebuffEffect) b)
                                .getStatAffected() == generation.grimoire.enumeration.StatType.SPEED)
                .count();

        assertThat(freezeDebuffs).isGreaterThan(0);
    }
}
