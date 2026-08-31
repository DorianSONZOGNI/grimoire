package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SuretePassiveEffectTest {

    private SuretePassiveEffect passive;
    private Personnage hero;
    private Spell spell;

    @BeforeEach
    void setUp() {
        passive = new SuretePassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");
        spell = new Spell();
    }

    @Test
    void shouldGain10PointsPassiveEachTurnStart() {
        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(10);
        
        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(20);
    }

    @Test
    void shouldConvertManaPaidToPoints() {
        // 35% of 100 mana = 35 points
        passive.onSpellCostPaid(hero, spell, 100);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(35);
        
        // 35% of 50 mana = 18 points (Math.round(17.5))
        passive.onSpellCostPaid(hero, spell, 50);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(53); // 35 + 18
    }

    @Test
    void shouldTriggerCritBuffWhenReaching100PointsAndKeepOverflow() {
        // Gain 90 points
        hero.setPassiveState("surete_points", 90);
        
        // Pay 100 mana -> +35 points -> Total 125 points
        passive.onSpellCostPaid(hero, spell, 100);
        
        // Overflow should be 25 points
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(25);
        
        // Should gain +15% CRIT buff for 2 turns
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.CRIT);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(15);
        assertThat(hero.getActiveBuffs().get(0).getDuration()).isEqualTo(2);
    }

    @Test
    void shouldTriggerCritBuffAtTurnStartIfPointsReach100() {
        hero.setPassiveState("surete_points", 95);
        
        // +10 passive points -> 105 points
        passive.onTurnStart(hero);
        
        // Overflow 5 points
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(5);
        
        // Trigger buff
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.CRIT);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(25);
    }
}
