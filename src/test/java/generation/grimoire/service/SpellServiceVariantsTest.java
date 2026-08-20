package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class SpellServiceVariantsTest {

    private SpellService spellService;
    private SpellRepository spellRepository;
    private PersonnageService personnageService;
    private PassiveDispatcher passiveDispatcher;

    private Personnage caster;
    private Personnage targetAlly;
    private Personnage targetEnemy;

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

        targetAlly = new Personnage();
        targetAlly.setName("Ally");
        targetAlly.setTeamId("1"); // Same team = ally
        targetAlly.setHealthMax(100);
        targetAlly.setHealthCurrent(100);

        targetEnemy = new Personnage();
        targetEnemy.setName("Enemy");
        targetEnemy.setTeamId("2"); // Diff team = enemy
        targetEnemy.setHealthMax(100);
        targetEnemy.setHealthCurrent(100);
    }

    @Test
    void shouldSelectVariantByChoiceKey() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(1);
        baseSpell.setManaCost(10);

        Spell variant1 = new Spell();
        variant1.setNom("Variant 1");
        variant1.setChoiceKey(1);

        Spell variant2 = new Spell();
        variant2.setNom("Variant 2");
        variant2.setChoiceKey(2);
        variant2.setManaCost(10);

        when(spellRepository.findByVariantId(1)).thenReturn(List.of(variant1, variant2));

        spellService.castSpell(baseSpell, caster, targetEnemy, 2);

        // Variant 2 should have been cast.
        // It costs 10 mana, so caster should have 90 mana left.
        assertThat(caster.getManaCurrent()).isEqualTo(90);
    }

    @Test
    void shouldSelectVariantByAllyCondition() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(2);
        baseSpell.setManaCost(10);

        Spell variantEnemy = new Spell();
        variantEnemy.setNom("Enemy Variant");
        variantEnemy.setConditionType(SpellCondition.IS_ENNEMY);

        Spell variantAlly = new Spell();
        variantAlly.setNom("Ally Variant");
        variantAlly.setConditionType(SpellCondition.IS_ALLY);
        variantAlly.setManaCost(20);

        when(spellRepository.findByVariantId(2)).thenReturn(List.of(variantEnemy, variantAlly));

        spellService.castSpell(baseSpell, caster, targetAlly, null);

        // Should select Ally Variant (costs 20)
        assertThat(caster.getManaCurrent()).isEqualTo(80);
    }

    @Test
    void shouldSelectVariantByLowLifeCondition() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(3);
        baseSpell.setManaCost(10);

        Spell variantLowLife = new Spell();
        variantLowLife.setNom("Low Life Variant");
        variantLowLife.setConditionType(SpellCondition.LOW_LIFE);
        variantLowLife.setManaCost(50); // 50 mana cost

        when(spellRepository.findByVariantId(3)).thenReturn(List.of(variantLowLife));

        // target is low life (< 35%)
        targetEnemy.setHealthCurrent(30);

        spellService.castSpell(baseSpell, caster, targetEnemy, null);

        assertThat(caster.getManaCurrent()).isEqualTo(50);
    }

    @Test
    void shouldSelectVariantByHighLifeCondition() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(3);
        baseSpell.setManaCost(10);

        Spell variantHighLife = new Spell();
        variantHighLife.setNom("High Life Variant");
        variantHighLife.setConditionType(SpellCondition.HIGH_LIFE);
        variantHighLife.setManaCost(30); 

        when(spellRepository.findByVariantId(3)).thenReturn(List.of(variantHighLife));

        // target is high life (> 65%)
        targetEnemy.setHealthCurrent(80);

        spellService.castSpell(baseSpell, caster, targetEnemy, null);

        assertThat(caster.getManaCurrent()).isEqualTo(70);
    }

    @Test
    void shouldSelectVariantByHigherArmorCondition() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(4);
        baseSpell.setManaCost(10);

        Spell variantHigherArmor = new Spell();
        variantHigherArmor.setNom("High Armor Variant");
        variantHigherArmor.setConditionType(SpellCondition.HIGHER_ARMURE);
        variantHigherArmor.setManaCost(40);

        when(spellRepository.findByVariantId(4)).thenReturn(List.of(variantHigherArmor));

        targetEnemy.setArmor(50);
        targetEnemy.setResistance(20);

        spellService.castSpell(baseSpell, caster, targetEnemy, null);

        assertThat(caster.getManaCurrent()).isEqualTo(60);
    }

    @Test
    void shouldSelectVariantByHigherResistanceCondition() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(5);
        baseSpell.setManaCost(10);

        Spell variantHigherRes = new Spell();
        variantHigherRes.setNom("High Res Variant");
        variantHigherRes.setConditionType(SpellCondition.HIGHER_RESISTANCE);
        variantHigherRes.setManaCost(60);

        when(spellRepository.findByVariantId(5)).thenReturn(List.of(variantHigherRes));

        targetEnemy.setArmor(20);
        targetEnemy.setResistance(50);

        spellService.castSpell(baseSpell, caster, targetEnemy, null);

        assertThat(caster.getManaCurrent()).isEqualTo(40);
    }

    @Test
    void shouldSelectSpellcasterCondition() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(6);
        baseSpell.setManaCost(10);

        Spell variantSelf = new Spell();
        variantSelf.setNom("Self Variant");
        variantSelf.setConditionType(SpellCondition.IS_SPELLCASTER);
        variantSelf.setManaCost(15);

        when(spellRepository.findByVariantId(6)).thenReturn(List.of(variantSelf));

        spellService.castSpell(baseSpell, caster, caster, null); // Target is caster

        assertThat(caster.getManaCurrent()).isEqualTo(85);
    }

    @Test
    void shouldFallbackToFirstVariantWhenNoConditionMatches() {
        Spell baseSpell = new Spell();
        baseSpell.setNom("Base Spell");
        baseSpell.setVariantId(7);
        baseSpell.setManaCost(10);

        Spell variant1 = new Spell(); // No condition
        variant1.setNom("Variant 1");
        variant1.setManaCost(20);

        when(spellRepository.findByVariantId(7)).thenReturn(List.of(variant1));

        spellService.castSpell(baseSpell, caster, targetEnemy, null);

        // Fallback to first variant
        assertThat(caster.getManaCurrent()).isEqualTo(80);
    }
}
