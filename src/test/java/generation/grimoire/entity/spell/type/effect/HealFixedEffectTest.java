package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HealFixedEffectTest {

    private Personnage hero;
    private Personnage target;
    private HealFixedEffect healEffect;

    @BeforeEach
    void setUp() {
        hero = new Personnage();
        hero.setName("Hero");

        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(100);
        target.setHealthCurrent(50);

        healEffect = new HealFixedEffect();
        healEffect.setHealAmount(20);
    }

    @Test
    void shouldApplyFixedHeal() {
        healEffect.apply(hero, target);
        assertThat(target.getHealthCurrent()).isEqualTo(70);
    }

    @Test
    void shouldApplyHealWithAmplification() {
        healEffect.setAmplificationMultiplier(1.5);
        healEffect.apply(hero, target);
        // 20 * 1.5 = 30
        // 50 + 30 = 80
        assertThat(target.getHealthCurrent()).isEqualTo(80);
    }

    @Test
    void shouldReactToBuff() {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setModifier(2.0);
        
        healEffect.applyModifierFromBuff(buff, hero, target);
        assertThat(healEffect.getAmplificationMultiplier()).isEqualTo(2.0);
        
        healEffect.apply(hero, target);
        // 20 * 2.0 = 40
        // 50 + 40 = 90
        assertThat(target.getHealthCurrent()).isEqualTo(90);
    }
}
