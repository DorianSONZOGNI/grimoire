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
        assertThat(caster.getChannelingAlly()).isNull();
    }
}
