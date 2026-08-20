package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;

class SpellServiceCostTest {

    private SpellService spellService;
    private SpellRepository spellRepository;
    private PersonnageService personnageService;
    private PassiveDispatcher passiveDispatcher;

    private Personnage caster;
    private Personnage target;

    @BeforeEach
    void setUp() {
        spellRepository = Mockito.mock(SpellRepository.class);
        personnageService = Mockito.mock(PersonnageService.class);
        passiveDispatcher = new PassiveDispatcher();
        spellService = new SpellService(spellRepository, personnageService, passiveDispatcher);

        caster = new Personnage();
        caster.setName("Caster");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);
        caster.setManaMax(100);
        caster.setManaCurrent(100);
        caster.setPassiveState("destruction_heat", 50); // Start with 50 heat

        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(100);
        target.setHealthCurrent(100);
    }

    @Test
    void shouldFailWhenManaIsInsufficient() {
        Spell spell = new Spell();
        spell.setNom("Mana Heavy Spell");
        spell.setManaCost(150); // Needs 150, has 100

        spellService.castSpell(spell, caster, target, null);

        // Spell shouldn't have been cast, mana should still be 100
        assertThat(caster.getManaCurrent()).isEqualTo(100);
    }

    @Test
    void shouldFailWhenHpIsInsufficient() {
        Spell spell = new Spell();
        spell.setNom("Blood Spell");
        spell.setHealCost(150); // Needs 150 HP, has 100

        spellService.castSpell(spell, caster, target, null);

        // Spell shouldn't have been cast, HP should still be 100
        assertThat(caster.getHealthCurrent()).isEqualTo(100);
    }

    @Test
    void shouldFailWhenHeatIsInsufficient() {
        Spell spell = new Spell();
        spell.setNom("Heat Spell");
        spell.setHeatCost(60); // Needs 60 heat, has 50

        spellService.castSpell(spell, caster, target, null);

        // Spell shouldn't have been cast, heat should still be 50
        assertThat(caster.getPassiveState("destruction_heat", 0)).isEqualTo(50);
    }

    @Test
    void shouldPayPercentCostsCorrectly() {
        Spell spell = new Spell();
        spell.setNom("Percent Cost Spell");
        
        spell.setPercentManaCost(10);
        spell.setPercentHealCost(20);
        
        spell.setManaCost(5);
        spell.setHealCost(5);
        
        spell.setHeatCost(10);
        spell.setPercentHeatCost(20); // 100.0 * 20 / 100.0 = 20. Total = 30.

        spellService.castSpell(spell, caster, target, null);

        assertThat(caster.getManaCurrent()).isEqualTo(85);
        assertThat(caster.getHealthCurrent()).isEqualTo(75);
        assertThat(caster.getPassiveState("destruction_heat", 0)).isEqualTo(20); // 50 - 30 = 20
    }
}
