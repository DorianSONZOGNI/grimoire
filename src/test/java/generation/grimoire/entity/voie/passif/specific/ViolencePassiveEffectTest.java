package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ViolencePassiveEffectTest {

    private ViolencePassiveEffect passive;
    private Personnage hero;
    private generation.grimoire.entity.Voie voieViolence;
    private Spell inspirationSpell;
    private Spell expirationSpell;
    private Spell banalSpell;

    @BeforeEach
    void setUp() {
        passive = new ViolencePassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");

        voieViolence = new generation.grimoire.entity.Voie();
        voieViolence.setNom("Voie de la Violence");

        inspirationSpell = new Spell();
        inspirationSpell.setVoie(voieViolence);
        inspirationSpell.setCategory(SpellCategory.INSPIRATION);

        expirationSpell = new Spell();
        expirationSpell.setVoie(voieViolence);
        expirationSpell.setCategory(SpellCategory.EXPIRATION);

        banalSpell = new Spell();
        banalSpell.setVoie(voieViolence);
        // Category defaults to null or BANAL
    }

    @Test
    void shouldGainStrengthBuffOnInspirationAfterExpirationStacks() {
        // Set 4 Expiration stacks
        hero.setPassiveState("violence_expiration", 4);
        
        passive.onSpellCast(hero, inspirationSpell);

        // Inspiration stack added
        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(1);
        // Expiration reset
        assertThat(hero.getPassiveState("violence_expiration", -1)).isEqualTo(0);
        // Should have a STRENGTH buff
        assertThat(hero.getActiveBuffs()).anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.STRENGTH);
    }

    @Test
    void shouldGainCritBuffOnExpirationAfterInspirationStacks() {
        // Set 7 Inspiration stacks
        hero.setPassiveState("violence_inspiration", 7);

        passive.onSpellCast(hero, expirationSpell);

        // Expiration stack added
        assertThat(hero.getPassiveState("violence_expiration", 0)).isEqualTo(1);
        // Inspiration reset
        assertThat(hero.getPassiveState("violence_inspiration", -1)).isEqualTo(0);
        // Should have a CRIT buff of +200%
        assertThat(hero.getActiveBuffs()).anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.CRIT && b.getModifier() == 2.0);
    }

    @Test
    void shouldBurnSelfOn6StacksOfSameType() {
        // 6 stacks of Inspiration
        hero.setPassiveState("violence_inspiration", 6);
        hero.setPower(10);
        hero.setStrength(10);

        passive.onSpellCast(hero, inspirationSpell);

        // Should have a BURN debuff
        assertThat(hero.getActiveBuffs()).anyMatch(b -> b.getStatAffected() == generation.grimoire.enumeration.StatType.BURN);
        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(7); // Max 7
    }

    @Test
    void shouldDoNothingOnBanalSpell() {
        passive.onSpellCast(hero, banalSpell);

        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("violence_expiration", 0)).isEqualTo(0);
    }
}
