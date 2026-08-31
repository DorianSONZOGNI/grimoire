package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RaisonPassiveEffectTest {

    private RaisonPassiveEffect passive;
    private Personnage hero;
    private Spell spell;
    private generation.grimoire.entity.Voie voieRaison;

    @BeforeEach
    void setUp() {
        passive = new RaisonPassiveEffect();
        hero = new Personnage();
        hero.setName("Hero");
        hero.setSpeed(5); // base speed

        voieRaison = new generation.grimoire.entity.Voie();
        voieRaison.setNom("Voie de la Raison");
        voieRaison.setPassiveEffects(java.util.List.of(passive));
        hero.setVoie(voieRaison);

        spell = new Spell();
        spell.setVoie(voieRaison);
    }

    @Test
    void shouldConvertSpeedToCritAtTurnStart() {
        passive.onTurnStart(hero);
        
        // Crit flat bonus should be speed * 2 = 5 * 2 = 10
        assertThat(hero.getStatFlatBonus(StatType.CRIT)).isEqualTo(10);
    }

    @Test
    void shouldGainSpeedStackAfterCastingRaisonSpell() {
        passive.onTurnStart(hero); // initialize crit to 10

        passive.onSpellCast(hero, spell);
        
        // Turn 2 start
        passive.onTurnStart(hero);
        
        // Speed should have +1 flat bonus
        assertThat(hero.getPassiveState("raison_speed_stacks", 0)).isEqualTo(1);
        assertThat(hero.getStatFlatBonus(StatType.SPEED)).isEqualTo(1);
        
        // Total speed = 5 + 1 = 6. Crit = 6 * 2 = 12
        assertThat(hero.getStatFlatBonus(StatType.CRIT)).isEqualTo(12);
    }

    @Test
    void shouldLoseSpeedStacksIfNoSpellCast() {
        passive.onSpellCast(hero, spell);
        passive.onTurnStart(hero); // gets 1 stack
        
        assertThat(hero.getStatFlatBonus(StatType.SPEED)).isEqualTo(1);
        
        // Turn 3 starts without casting a spell in Turn 2
        passive.onTurnStart(hero);
        
        // Speed stacks should reset to 0
        assertThat(hero.getPassiveState("raison_speed_stacks", 0)).isEqualTo(0);
        assertThat(hero.getStatFlatBonus(StatType.SPEED)).isEqualTo(0);
        
        // Crit goes back to base speed * 2 = 10
        assertThat(hero.getStatFlatBonus(StatType.CRIT)).isEqualTo(10);
    }

    @Test
    void shouldNotGainSpeedStackIfSpellNotFromRaison() {
        generation.grimoire.entity.Voie otherVoie = new generation.grimoire.entity.Voie();
        otherVoie.setNom("Autre");
        spell.setVoie(otherVoie);
        
        passive.onSpellCast(hero, spell);
        
        passive.onTurnStart(hero);
        
        assertThat(hero.getPassiveState("raison_speed_stacks", 0)).isEqualTo(0);
        assertThat(hero.getStatFlatBonus(StatType.SPEED)).isEqualTo(0);
    }
}
