package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BudEffectTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Caster");
        target = new Personnage();
        target.setName("Target");
    }

    @Test
    void shouldAddBudsToCasterAndCapAtMax() {
        BudEffect effect = new BudEffect();
        effect.setAmount(3);

        // BudEffect always applies to caster internally, but we pass both.
        effect.apply(caster, target);
        assertThat(caster.getPassiveState("creation_buds", 0)).isEqualTo(3);

        effect.apply(caster, target);
        // Max is 5
        assertThat(caster.getPassiveState("creation_buds", 0)).isEqualTo(5);
    }
}
