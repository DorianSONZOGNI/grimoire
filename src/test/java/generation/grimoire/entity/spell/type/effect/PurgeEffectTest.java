package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PurgeEffectTest {

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
    void shouldPurgeAllBuffsAndDebuffsOnTarget() {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(StatType.POWER);
        buff.setModifier(1.0);
        target.applyBuff(buff, 1.0);

        assertThat(target.getActiveBuffs()).hasSize(1);

        PurgeEffect effect = new PurgeEffect();
        effect.apply(caster, target);

        assertThat(target.getActiveBuffs()).isEmpty();
    }
}
