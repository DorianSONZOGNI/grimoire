package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpellServiceTargetTest {

    private SpellService spellService;
    private SpellRepository spellRepository;
    private PersonnageService personnageService;
    private PassiveDispatcher passiveDispatcher;

    private Personnage caster;
    private Personnage ally1;
    private Personnage ally2;
    private Personnage enemy1;
    private Personnage enemy2;

    @BeforeEach
    void setUp() {
        spellRepository = Mockito.mock(SpellRepository.class);
        personnageService = Mockito.mock(PersonnageService.class);
        passiveDispatcher = new PassiveDispatcher();
        spellService = new SpellService(spellRepository, personnageService, passiveDispatcher);

        caster = new Personnage();
        caster.setName("Caster");
        caster.setTeamId("1");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);
        caster.setManaMax(100);
        caster.setManaCurrent(100);

        ally1 = new Personnage();
        ally1.setName("Ally 1");
        ally1.setTeamId("1");
        ally1.setHealthMax(100);
        ally1.setHealthCurrent(100);

        ally2 = new Personnage();
        ally2.setName("Ally 2");
        ally2.setTeamId("1");
        ally2.setHealthMax(100);
        ally2.setHealthCurrent(100);

        enemy1 = new Personnage();
        enemy1.setName("Enemy 1");
        enemy1.setTeamId("2");
        enemy1.setHealthMax(100);
        enemy1.setHealthCurrent(100);
        
        enemy2 = new Personnage();
        enemy2.setName("Enemy 2");
        enemy2.setTeamId("2");
        enemy2.setHealthMax(100);
        enemy2.setHealthCurrent(100);
    }

    @Test
    void shouldResolveAllAlliesCorrectly() {
        Spell aoeSpell = new Spell();
        aoeSpell.setNom("Heal All");
        
        DamageFixedEffect healEffect = new DamageFixedEffect(); // Using negative damage for heal or just checking recipients
        healEffect.setDamageType(DamageType.BRUT);
        healEffect.setDamage(10); // Actually deals damage for easier testing
        healEffect.setEffectTarget(EffectTarget.ALL_ALLIES);
        
        aoeSpell.getEffects().add(healEffect);

        List<Personnage> allAllies = List.of(caster, ally1, ally2);
        List<Personnage> allEnemies = List.of(enemy1, enemy2);

        spellService.castSpellGroup(aoeSpell, caster, enemy1, ally1, allAllies, allEnemies, null);

        // All allies should have taken 10 damage
        assertThat(caster.getHealthCurrent()).isEqualTo(90);
        assertThat(ally1.getHealthCurrent()).isEqualTo(90);
        assertThat(ally2.getHealthCurrent()).isEqualTo(90);

        // Enemies should be unaffected
        assertThat(enemy1.getHealthCurrent()).isEqualTo(100);
        assertThat(enemy2.getHealthCurrent()).isEqualTo(100);
    }

    @Test
    void shouldResolveAllEnemiesCorrectly() {
        Spell aoeSpell = new Spell();
        aoeSpell.setNom("Meteor");
        
        DamageFixedEffect dmgEffect = new DamageFixedEffect();
        dmgEffect.setDamageType(DamageType.BRUT);
        dmgEffect.setDamage(20);
        dmgEffect.setEffectTarget(EffectTarget.ALL_ENEMIES);
        
        aoeSpell.getEffects().add(dmgEffect);

        List<Personnage> allAllies = List.of(caster, ally1, ally2);
        List<Personnage> allEnemies = List.of(enemy1, enemy2);

        spellService.castSpellGroup(aoeSpell, caster, enemy1, ally1, allAllies, allEnemies, null);

        // Enemies should have taken 20 damage
        assertThat(enemy1.getHealthCurrent()).isEqualTo(80);
        assertThat(enemy2.getHealthCurrent()).isEqualTo(80);

        // Allies should be unaffected
        assertThat(caster.getHealthCurrent()).isEqualTo(100);
        assertThat(ally1.getHealthCurrent()).isEqualTo(100);
        assertThat(ally2.getHealthCurrent()).isEqualTo(100);
    }

    @Test
    void shouldResolveAllCombatantsCorrectly() {
        Spell aoeSpell = new Spell();
        aoeSpell.setNom("Apocalypse");
        
        DamageFixedEffect dmgEffect = new DamageFixedEffect();
        dmgEffect.setDamageType(DamageType.BRUT);
        dmgEffect.setDamage(30);
        dmgEffect.setEffectTarget(EffectTarget.ALL_COMBATANTS);
        
        aoeSpell.getEffects().add(dmgEffect);

        List<Personnage> allAllies = List.of(caster, ally1, ally2);
        List<Personnage> allEnemies = List.of(enemy1, enemy2);

        spellService.castSpellGroup(aoeSpell, caster, enemy1, ally1, allAllies, allEnemies, null);

        // Everyone should have taken 30 damage
        assertThat(caster.getHealthCurrent()).isEqualTo(70);
        assertThat(ally1.getHealthCurrent()).isEqualTo(70);
        assertThat(ally2.getHealthCurrent()).isEqualTo(70);
        assertThat(enemy1.getHealthCurrent()).isEqualTo(70);
        assertThat(enemy2.getHealthCurrent()).isEqualTo(70);
    }
}
