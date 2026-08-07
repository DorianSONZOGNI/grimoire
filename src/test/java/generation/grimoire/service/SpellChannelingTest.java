package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpellChannelingTest {

    private SpellService spellService;
    private SpellRepository spellRepository;
    private PersonnageService personnageService;
    private PassiveDispatcher passiveDispatcher;

    private Personnage caster;
    private Personnage ally;
    private Personnage enemy;

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

        ally = new Personnage();
        ally.setName("Ally");
        ally.setArmor(0); // Testing armor buff

        enemy = new Personnage();
        enemy.setName("Enemy");
    }

    @Test
    void testChannelingSpellOnAlly() {
        // Create channeled spell targeting ally
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Lien vital");
        channeledSpell.setCastingType(SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(3);
        
        BuffDebuffEffect armorBuff = new BuffDebuffEffect();
        armorBuff.setStatAffected(StatType.ARMURE);
        armorBuff.setFlatValue(20);
        armorBuff.setDuration(3);
        armorBuff.setEffectTarget(EffectTarget.ALLY); // targets the chosen ally
        armorBuff.setChannelingTurns(List.of(1, 2, 3));
        
        channeledSpell.getEffects().add(armorBuff);

        List<Personnage> allAllies = List.of(caster, ally);
        List<Personnage> allEnemies = List.of(enemy);

        // Turn 1 (Cast)
        spellService.castSpellGroup(channeledSpell, caster, enemy, ally, allAllies, allEnemies, null);
        
        // Assert T1 effects
        assertThat(ally.getActiveBuffs()).hasSize(1);
        assertThat(ally.getActiveBuffs().get(0).getFlatValue()).isEqualTo(20);
        
        // Assert caster state
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(3);
        assertThat(caster.getChanneledSpell()).isEqualTo(channeledSpell);
        assertThat(caster.getChannelingAlly()).isEqualTo(ally);

        // End of Turn 1
        spellService.tickChanneling(caster, enemy, null, ally, allAllies, allEnemies);
        
        // Assert caster state
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(2);

        // Turn 2
        spellService.tickChanneling(caster, enemy, null, ally, allAllies, allEnemies);
        
        // Should add another instance of the buff or refresh (currently adds to list)
        assertThat(ally.getActiveBuffs()).hasSize(2);
        
        // Assure remaining is 1
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(1);

        // Turn 3
        spellService.tickChanneling(caster, enemy, null, ally, allAllies, allEnemies);
        
        // Should have 3 buffs
        assertThat(ally.getActiveBuffs()).hasSize(3);
        
        // Assure remaining is 0
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(0);
        
        assertThat(caster.getChanneledSpell()).isNull();
    }

    @Test
    void testChannelingSpellEffectApplicationByTurn() {
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Tempête Ciblée");
        channeledSpell.setCastingType(SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(3);

        BuffDebuffEffect damageBuff = new BuffDebuffEffect();
        damageBuff.setStatAffected(StatType.POWER);
        damageBuff.setFlatValue(15);
        damageBuff.setDuration(1);
        damageBuff.setEffectTarget(EffectTarget.CASTER);
        damageBuff.setChannelingTurns(List.of(2)); // Applies ONLY on turn 2

        channeledSpell.getEffects().add(damageBuff);

        List<Personnage> allAllies = List.of(caster);
        List<Personnage> allEnemies = List.of(enemy);

        // Turn 1 (Cast)
        spellService.castSpellGroup(channeledSpell, caster, enemy, null, allAllies, allEnemies, null);
        assertThat(caster.getActiveBuffs()).isEmpty(); // Not turn 2

        // End of Turn 1
        spellService.tickChanneling(caster, enemy, null, null, allAllies, allEnemies);

        // Turn 2
        spellService.tickChanneling(caster, enemy, null, null, allAllies, allEnemies);
        assertThat(caster.getActiveBuffs()).hasSize(1); // Turn 2!

        // Turn 3
        spellService.tickChanneling(caster, enemy, null, null, allAllies, allEnemies);
        assertThat(caster.getActiveBuffs()).hasSize(1); // Still 1, buff duration might expire naturally though, but it didn't add a new one.
    }

    @Test
    void testInstantSpellDuringChannelingAllowed() {
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Flux");
        channeledSpell.setCastingType(SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(2);
        channeledSpell.setAllowInstantDuringChanneling(true);

        Spell instantSpell = new Spell();
        instantSpell.setNom("Flash");
        instantSpell.setCastingType(SpellCastingType.INSTANTANE);

        // Cast channel
        spellService.castSpell(channeledSpell, caster, enemy, null);
        assertThat(caster.getChanneledSpell()).isEqualTo(channeledSpell);

        // Cast instant during channel
        spellService.castSpell(instantSpell, caster, enemy, null);
        assertThat(caster.isInstantSpellCastThisTurn()).isTrue();
        assertThat(caster.getChanneledSpell()).isEqualTo(channeledSpell); // Channel not broken
    }

    @Test
    void testInstantSpellDuringChannelingForbidden() {
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Flux");
        channeledSpell.setCastingType(SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(2);
        channeledSpell.setAllowInstantDuringChanneling(false);

        Spell instantSpell = new Spell();
        instantSpell.setNom("Flash");
        instantSpell.setCastingType(SpellCastingType.INSTANTANE);

        // Cast channel
        spellService.castSpell(channeledSpell, caster, enemy, null);

        // Cast instant during channel - should fail
        spellService.castSpell(instantSpell, caster, enemy, null);
        assertThat(caster.isInstantSpellCastThisTurn()).isFalse();
    }

    @Test
    void testBanalSpellDuringChannelingForbidden() {
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Flux");
        channeledSpell.setCastingType(SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(2);

        Spell banalSpell = new Spell();
        banalSpell.setNom("Fireball");
        banalSpell.setCastingType(SpellCastingType.BANAL);

        // Cast channel
        spellService.castSpell(channeledSpell, caster, enemy, null);

        // Cast banal during channel - should fail
        spellService.castSpell(banalSpell, caster, enemy, null);
        // Assuming castSpell prints error and returns, keeping the state intact
        assertThat(caster.getChanneledSpell()).isEqualTo(channeledSpell);
    }
    
    @Test
    void testHeatEffectTargetsCasterDuringChanneling() {
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Flamme");
        channeledSpell.setCastingType(SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(2);

        generation.grimoire.entity.spell.type.effect.HeatFixedEffect heatEffect = new generation.grimoire.entity.spell.type.effect.HeatFixedEffect();
        heatEffect.setAmount(20);
        heatEffect.setEffectTarget(EffectTarget.TARGET); // Tricky target
        heatEffect.setChannelingTurns(List.of(2));
        
        channeledSpell.getEffects().add(heatEffect);

        List<Personnage> allAllies = List.of(caster);
        List<Personnage> allEnemies = List.of(enemy);

        spellService.castSpellGroup(channeledSpell, caster, enemy, null, allAllies, allEnemies, null);
        
        // Turn 1 End
        spellService.tickChanneling(caster, enemy, null, null, allAllies, allEnemies);

        // Turn 2
        spellService.tickChanneling(caster, enemy, null, null, allAllies, allEnemies);

        // Heat should be applied to caster, not enemy
        assertThat(caster.getPassiveState("destruction_heat", 0)).isEqualTo(20);
        assertThat(enemy.getPassiveState("destruction_heat", 0)).isEqualTo(0);
    }
}
