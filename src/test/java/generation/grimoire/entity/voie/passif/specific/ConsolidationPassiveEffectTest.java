package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConsolidationPassiveEffectTest {

    private ConsolidationPassiveEffect passive;
    private Personnage hero;

    @BeforeEach
    void setUp() {
        passive = new ConsolidationPassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");
    }

    @Test
    void shouldApplyShieldAndHpLossWhenHpAbove20Percent() {
        hero.setHealthMax(100);
        hero.setHealthCurrent(50); // > 20%
        
        passive.onTurnStart(hero);
        
        assertThat(hero.getHealthCurrent()).isEqualTo(45); // 50 - 5
        assertThat(hero.getTotalShield()).isEqualTo(5); // 10% de 50
    }

    @Test
    void shouldApplyArmorAndResistanceWhenHpBelowOrEqual20Percent() {
        hero.setHealthMax(100);
        hero.setHealthCurrent(20); // <= 20%
        
        passive.onTurnStart(hero);
        
        assertThat(hero.getActiveBuffs()).hasSize(2);
        assertThat(hero.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.ARMURE && b.getModifier() == 0.20)).isTrue();
        assertThat(hero.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.RESISTANCE && b.getModifier() == 0.20)).isTrue();
        assertThat(hero.getTotalShield()).isEqualTo(0);
    }
}
