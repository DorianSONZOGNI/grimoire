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
    void shouldGainInspirationBuffOnInspirationSpell() {
        passive.onSpellCast(hero, inspirationSpell);

        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_flat_CRIT", 0)).isEqualTo(2); // +2 flat CRIT
        assertThat(hero.getPassiveState("stat_flat_POWER", 0)).isEqualTo(0);

        // Expiration is reset
        assertThat(hero.getPassiveState("violence_expiration", -1)).isEqualTo(0);
    }

    @Test
    void shouldGainExpirationBuffOnExpirationSpellAndResetInspiration() {
        // Assume we had Inspiration before
        hero.setPassiveState("violence_inspiration", 1);
        hero.setPassiveState("stat_flat_CRIT", 2);

        passive.onSpellCast(hero, expirationSpell);

        assertThat(hero.getPassiveState("violence_expiration", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_flat_POWER", 0)).isEqualTo(2); // +2 flat POWER

        // Inspiration is reset
        assertThat(hero.getPassiveState("violence_inspiration", -1)).isEqualTo(0);
        assertThat(hero.getPassiveState("stat_flat_CRIT", -1)).isEqualTo(0);
    }

    @Test
    void shouldMaintainBuffOnTurnStartIfSpellWasCast() {
        passive.onSpellCast(hero, inspirationSpell);

        // Next turn
        passive.onTurnStart(hero);

        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_flat_CRIT", 0)).isEqualTo(2);
    }

    @Test
    void shouldLoseBuffOnTurnStartIfNoSpellWasCast() {
        passive.onSpellCast(hero, inspirationSpell);
        passive.onTurnStart(hero); // maintains

        // Turn 3 (no spell cast in Turn 2)
        passive.onTurnStart(hero);

        assertThat(hero.getPassiveState("violence_inspiration", -1)).isEqualTo(0);
        assertThat(hero.getPassiveState("stat_flat_CRIT", -1)).isEqualTo(0);
    }

    @Test
    void shouldDoNothingOnBanalSpell() {
        passive.onSpellCast(hero, banalSpell);

        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("violence_expiration", 0)).isEqualTo(0);
    }
}
