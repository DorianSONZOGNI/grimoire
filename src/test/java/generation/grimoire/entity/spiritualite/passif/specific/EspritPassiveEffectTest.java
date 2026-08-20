package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class EspritPassiveEffectTest {

    private EspritPassiveEffect passive;
    private Personnage hero;
    private Spell espritSpell;
    private Spiritualite espritSpiritualite;

    @BeforeEach
    void setUp() {
        passive = new EspritPassiveEffect();
        
        espritSpiritualite = new Spiritualite();
        espritSpiritualite.setId(1L);
        espritSpiritualite.setNom("Esprit");
        
        passive.setSpiritualite(espritSpiritualite);
        
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        
        espritSpell = new Spell();
        espritSpell.setNom("Esprit Spell");
        espritSpell.setSpiritualite(espritSpiritualite);
    }

    @Test
    void canCastSpell_shouldReturnTrueWhenHpAndManaAreAbove20Percent() {
        assertThat(passive.canCastSpell(hero, espritSpell)).isTrue();
    }

    @Test
    void canCastSpell_shouldReturnFalseWhenHpIsBelow20Percent() {
        hero.setHealthCurrent(10);
        assertThat(passive.canCastSpell(hero, espritSpell)).isFalse();
    }

    @Test
    void canCastSpell_shouldReturnFalseWhenManaIsBelow20Percent() {
        hero.setManaCurrent(10);
        assertThat(passive.canCastSpell(hero, espritSpell)).isFalse();
    }

    @Test
    void canCastSpell_shouldReturnFalseWhenBothHpAndManaAreBelow20Percent() {
        hero.setHealthCurrent(10);
        hero.setManaCurrent(10);
        assertThat(passive.canCastSpell(hero, espritSpell)).isFalse();
    }

    @Test
    void canCastSpell_shouldAlwaysReturnTrueForOtherSpiritualiteSpells() {
        Spiritualite karmaSpiritualite = new Spiritualite();
        karmaSpiritualite.setId(2L);
        karmaSpiritualite.setNom("Karma");
        
        Spell otherSpell = new Spell();
        otherSpell.setSpiritualite(karmaSpiritualite);
        
        hero.setHealthCurrent(10); // Low HP to ensure it would otherwise fail
        
        assertThat(passive.canCastSpell(hero, otherSpell)).isTrue();
    }

    @Test
    void onSpellCast_shouldBeNoOp() {
        assertThatCode(() -> passive.onSpellCast(hero, espritSpell)).doesNotThrowAnyException();
    }

    @Test
    void onTurnStart_shouldBeNoOp() {
        assertThatCode(() -> passive.onTurnStart(hero)).doesNotThrowAnyException();
    }
}
