package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConsolidationPassiveEffectTest {

    private ConsolidationPassiveEffect passive;
    private Personnage hero;
    private Spell spell;

    @BeforeEach
    void setUp() {
        passive = new ConsolidationPassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");
        spell = new Spell();
    }

    @Test
    void shouldApplyDefaultBuffOnTurnStartIfNoSpellCastLastTurn() {
        passive.onTurnStart(hero);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(0.05);
    }

    @Test
    void shouldApplyLevel1Buff() {
        spell.setNiveau(1);
        passive.onSpellCast(hero, spell);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.SPEED);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(2);

        // Turn start maintains it
        passive.onTurnStart(hero);
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.SPEED);
    }

    @Test
    void shouldApplyLevel2Buff() {
        spell.setNiveau(2);
        passive.onSpellCast(hero, spell);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(0.15);
    }

    @Test
    void shouldApplyLevel3Buff() {
        spell.setNiveau(3);
        passive.onSpellCast(hero, spell);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.RESISTANCE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(0.15);
    }

    @Test
    void shouldApplyLevel4BuffAndReduceSpellCosts() {
        spell.setNiveau(4);
        passive.onSpellCast(hero, spell);

        assertThat(hero.getActiveBuffs()).isEmpty(); // Handled via adjustSpellCosts

        int[] costs = {100, 40, 20}; // mana, hp, heat
        passive.adjustSpellCosts(hero, spell, costs);

        assertThat(costs[0]).isEqualTo(75);
        assertThat(costs[1]).isEqualTo(30);
        assertThat(costs[2]).isEqualTo(15);
    }

    @Test
    void shouldApplyLevel5Buff() {
        spell.setNiveau(5);
        passive.onSpellCast(hero, spell);

        assertThat(hero.getActiveBuffs()).hasSize(2); // Armure + Resistance
        assertThat(hero.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.ARMURE && b.getModifier() == 0.10)).isTrue();
        assertThat(hero.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.RESISTANCE && b.getModifier() == 0.10)).isTrue();
    }

    @Test
    void shouldResetToDefaultIfNoSpellCast() {
        spell.setNiveau(3);
        passive.onSpellCast(hero, spell);

        // Turn start maintains lvl3 because spell was cast last turn
        passive.onTurnStart(hero);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.RESISTANCE);

        // Turn start without spell cast -> reset to default
        passive.onTurnStart(hero);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(0.05);
    }
}
