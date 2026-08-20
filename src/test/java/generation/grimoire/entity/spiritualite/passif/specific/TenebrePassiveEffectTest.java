package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class TenebrePassiveEffectTest {

    private TenebrePassiveEffect passive;
    private Personnage hero;
    private Spell tenebreSpell;
    private Spiritualite tenebreSpiritualite;

    @BeforeEach
    void setUp() {
        passive = new TenebrePassiveEffect();
        
        tenebreSpiritualite = new Spiritualite();
        tenebreSpiritualite.setId(3L);
        tenebreSpiritualite.setNom("Tenebres");
        
        passive.setSpiritualite(tenebreSpiritualite);
        
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        
        tenebreSpell = new Spell();
        tenebreSpell.setNom("Tenebre Spell");
        tenebreSpell.setSpiritualite(tenebreSpiritualite);
    }

    @Test
    void canCastSpell_shouldReturnFalseWhenHpAndManaAreAbove80Percent() {
        assertThat(passive.canCastSpell(hero, tenebreSpell)).isFalse();
    }

    @Test
    void canCastSpell_shouldReturnTrueWhenHpIsBelowOrEqual80Percent() {
        hero.setHealthCurrent(80);
        assertThat(passive.canCastSpell(hero, tenebreSpell)).isTrue();
    }

    @Test
    void canCastSpell_shouldReturnTrueWhenManaIsBelowOrEqual80Percent() {
        hero.setManaCurrent(80);
        assertThat(passive.canCastSpell(hero, tenebreSpell)).isTrue();
    }

    @Test
    void canCastSpell_shouldAlwaysReturnTrueForBaseSpells() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Attaque de base");
        baseSpell.setSpiritualite(tenebreSpiritualite);
        
        assertThat(passive.canCastSpell(hero, baseSpell)).isTrue();
    }

    @Test
    void canCastSpell_shouldAlwaysReturnTrueForOtherSpiritualiteSpells() {
        Spiritualite karmaSpiritualite = new Spiritualite();
        karmaSpiritualite.setId(2L);
        karmaSpiritualite.setNom("Karma");
        
        Spell otherSpell = new Spell();
        otherSpell.setSpiritualite(karmaSpiritualite);
        
        assertThat(passive.canCastSpell(hero, otherSpell)).isTrue();
    }

    @Test
    void onSpellCast_shouldBeNoOp() {
        assertThatCode(() -> passive.onSpellCast(hero, tenebreSpell)).doesNotThrowAnyException();
    }

    @Test
    void onTurnStart_shouldBeNoOp() {
        assertThatCode(() -> passive.onTurnStart(hero)).doesNotThrowAnyException();
    }
}
