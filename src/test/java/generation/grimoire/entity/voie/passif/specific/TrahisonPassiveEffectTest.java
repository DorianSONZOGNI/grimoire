package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TrahisonPassiveEffectTest {

    private TrahisonPassiveEffect passive;
    private Personnage hero;
    private Personnage target;

    @BeforeEach
    void setUp() {
        passive = new TrahisonPassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");

        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(200);
        target.setHealthCurrent(200);
    }

    @Test
    void shouldApplyBaseBonusOnFirstHit() {
        // First hit: +10% damage
        passive.onPhysicalHit(hero, target, 100);
        // Damage is 10. Health -> 190
        assertThat(target.getHealthCurrent()).isEqualTo(190);
        
        // Second hit in same turn: base bonus is already consumed
        passive.onPhysicalHit(hero, target, 100);
        // Damage is 0. Health -> 190
        assertThat(target.getHealthCurrent()).isEqualTo(190);
    }

    @Test
    void shouldApplyLowHpBonusWhenTargetIsBelowHalfHealth() {
        target.setHealthCurrent(90); // < 100 (half of 200)
        
        // Base bonus (10%) + Low HP bonus (20%) = 30% extra damage
        passive.onPhysicalHit(hero, target, 100);
        
        // 30 damage. 90 - 30 = 60
        assertThat(target.getHealthCurrent()).isEqualTo(60);

        // Next hit: bonuses consumed
        passive.onPhysicalHit(hero, target, 100);
        assertThat(target.getHealthCurrent()).isEqualTo(60);
    }

    @Test
    void shouldApplyDebuffBonusWhenTargetHasDebuff() {
        BuffDebuffEffect debuff = new BuffDebuffEffect();
        debuff.setStatAffected(StatType.ARMURE);
        debuff.setFlatValue(-10);
        target.getActiveBuffs().add(debuff);

        // Base bonus (10%) + Debuff bonus (15%) = 25% extra
        passive.onPhysicalHit(hero, target, 100);
        
        // 25 damage. Health -> 200 - 25 = 175
        assertThat(target.getHealthCurrent()).isEqualTo(175);
    }

    @Test
    void shouldStackAllBonusesIfConditionsMet() {
        target.setHealthCurrent(90);
        
        BuffDebuffEffect debuff = new BuffDebuffEffect();
        debuff.setStatAffected(StatType.ARMURE);
        debuff.setFlatValue(-10);
        target.getActiveBuffs().add(debuff);

        // Base (10%) + Low HP (20%) + Debuff (15%) = 45%
        passive.onPhysicalHit(hero, target, 100);
        
        // 45 damage. Health -> 90 - 45 = 45
        assertThat(target.getHealthCurrent()).isEqualTo(45);
    }

    @Test
    void shouldResetUsedFlagsOnTurnStart() {
        passive.onPhysicalHit(hero, target, 100); // Uses base bonus (10 damage)
        assertThat(target.getHealthCurrent()).isEqualTo(190);

        passive.onTurnStart(hero); // Resets flags
        
        passive.onPhysicalHit(hero, target, 100); // Base bonus applies again (10 damage)
        assertThat(target.getHealthCurrent()).isEqualTo(180);
    }
}
