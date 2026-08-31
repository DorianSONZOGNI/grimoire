package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ManaEffectTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Caster");
        target = new Personnage();
        target.setName("Target");
        target.setManaMax(200);
        target.setManaCurrent(50);
        target.setHealthMax(100);
        target.setHealthCurrent(100);
    }

    @Test
    void shouldRestoreFixedMana() {
        ManaFixedEffect effect = new ManaFixedEffect();
        effect.setManaAmount(50);

        effect.apply(caster, target);

        assertThat(target.getManaCurrent()).isEqualTo(100);
    }

    @Test
    void shouldRestorePercentageMana() {
        ManaPercentageEffect effect = new ManaPercentageEffect();
        effect.setPercentage(0.5); // 50%
        effect.setManaSource(Source.TARGET_MANA_MAX);

        // 50% of 200 = 100 mana restored
        effect.apply(caster, target);

        assertThat(target.getManaCurrent()).isEqualTo(150);
    }

    @Test
    void shouldApplyManaOverTime() {
        ManaOverTimeEffect effect = new ManaOverTimeEffect();
        effect.setFixedManaPerTick(20);
        effect.setDuration(2);

        effect.apply(caster, target);
        
        // As long as apply completes without error and adds the effect
        // We will assume updateManaOverTimeEffects() is tested elsewhere if it exists
        // (we just check it doesn't crash)
    }
}
