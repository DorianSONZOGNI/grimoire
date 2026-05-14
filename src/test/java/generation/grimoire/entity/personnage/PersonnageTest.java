package generation.grimoire.entity.personnage;

import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
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
        
        // If it's a bug, health will be 125. If it's correct (subtraction), it should be 75.
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
}
