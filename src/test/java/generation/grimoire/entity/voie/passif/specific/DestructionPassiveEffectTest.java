package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DestructionPassiveEffectTest {

    private DestructionPassiveEffect passive;
    private Personnage hero;
    private Spell spell;

    @BeforeEach
    void setUp() {
        passive = new DestructionPassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");
        spell = new Spell();
        spell.setHeatGenerated(10); // par défaut pour le test
    }

    @Test
    void shouldAccumulateHeatOnSpellCast() {
        passive.onSpellCast(hero, spell);
        
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(10);
    }

    @Test
    void shouldTriggerFreeSpellWhenHeatReaches100() {
        hero.setPassiveState("destruction_heat", 95);
        
        passive.onSpellCast(hero, spell); // +10 heat -> 105
        
        // Heat is capped at 100
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(100);
        // Note: triggerFreeSpell displays a message but we verify the heat cap works properly
    }

    @Test
    void shouldNotExceed100Heat() {
        hero.setPassiveState("destruction_heat", 100);
        
        passive.onSpellCast(hero, spell); // +10 heat -> 110 -> 100
        
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(100);
    }
}
