package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConsumableEffectTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        target = new Personnage();
    }

    @Test
    void shouldApplyBuffToSpellAndDecrementRemainingUses() {
        ConsumableSpellBuffDebuffEffect effect = new ConsumableSpellBuffDebuffEffect();
        effect.setRemainingApplications(2);

        Spell spell = new Spell();
        spell.setNom("Sort de test");

        assertThat(effect.isActive()).isTrue();

        effect.applyToSpell(spell, caster, target);
        assertThat(effect.getRemainingApplications()).isEqualTo(1);
        assertThat(effect.isActive()).isTrue();

        effect.applyToSpell(spell, caster, target);
        assertThat(effect.getRemainingApplications()).isEqualTo(0);
        assertThat(effect.isActive()).isFalse();

        // Should not decrement further or do anything if inactive
        effect.applyToSpell(spell, caster, target);
        assertThat(effect.getRemainingApplications()).isEqualTo(0);
    }
}
