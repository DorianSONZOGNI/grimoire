package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DamageEffectTest {

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Caster");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);
        caster.setPower(20);

        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(200);
        target.setHealthCurrent(200);
        target.setArmor(50);
        target.setResistance(50);
    }

    @Test
    void shouldInflictFixedDamage() {
        DamageFixedEffect effect = new DamageFixedEffect();
        effect.setDamage(100);
        effect.setDamageType(DamageType.PHYSIC);

        effect.apply(caster, target);

        // Target should take some damage.
        assertThat(target.getHealthCurrent()).isLessThan(200);
    }

    @Test
    void shouldInflictPercentageDamage() {
        DamagePercentageEffect effect = new DamagePercentageEffect();
        effect.setPercentage(0.5); // 50%
        effect.setDamageSource(Source.TARGET_HEALTH_MAX);
        effect.setDamageType(DamageType.BRUT);

        effect.apply(caster, target);

        // 50% of 200 = 100 damage. BRUT = 100 damage dealt.
        assertThat(target.getHealthCurrent()).isEqualTo(100);
    }
}
