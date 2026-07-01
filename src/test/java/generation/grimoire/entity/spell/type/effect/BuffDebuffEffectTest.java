package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BuffDebuffEffectTest {

    private Personnage caster;
    private Personnage target;
    private BuffDebuffEffect effect;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setName("Lanceur");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);

        target = new Personnage();
        target.setName("Cible");
        target.setHealthMax(200);
        target.setHealthCurrent(200);
        target.setArmor(50);
        target.setPower(30);

        effect = new BuffDebuffEffect();
        effect.setId(1L);
    }

    @Test
    void testFlatValuePositiveBuffWithDuration() {
        effect.setStatAffected(StatType.ARMURE);
        effect.setFlatValue(10);
        effect.setDuration(3);

        effect.apply(caster, target);

        assertEquals(50, target.getArmor(), "La stat de base ne doit pas être modifiée directement si durée > 0");
        assertEquals(1, target.getActiveBuffs().size(), "Un buff persistant doit être ajouté");

        BuffDebuffEffect active = target.getActiveBuffs().get(0);
        assertEquals(10, active.getFlatValue());
        assertEquals(0, active.getModifier());
        assertEquals(3, active.getDuration());
        assertEquals(StatType.ARMURE, active.getStatAffected());
    }

    @Test
    void testFlatValueNegativeDebuffWithDuration() {
        effect.setStatAffected(StatType.RESISTANCE);
        effect.setFlatValue(-15);
        effect.setDuration(2);

        effect.apply(caster, target);

        assertEquals(1, target.getActiveBuffs().size());

        BuffDebuffEffect active = target.getActiveBuffs().get(0);
        assertEquals(-15, active.getFlatValue());
        assertEquals(0, active.getModifier());
        assertEquals(2, active.getDuration());
        assertEquals(StatType.RESISTANCE, active.getStatAffected());
    }

    @Test
    void testFlatValueInstantZeroDuration() {
        effect.setStatAffected(StatType.ARMURE);
        effect.setFlatValue(25);
        effect.setDuration(0);

        // Armure is currently 50, so applying 25 flat directly via applyFlatBuff should
        // add to it.
        effect.apply(caster, target);

        assertEquals(75, target.getArmor(), "L'armure doit être modifiée directement");
        assertEquals(0, target.getActiveBuffs().size(), "Aucun buff ne doit être ajouté à la liste");
    }

    @Test
    void testModifierPositiveBuffWithDuration() {
        effect.setStatAffected(StatType.POWER);
        effect.setModifier(0.5); // +50%
        effect.setDuration(2);

        effect.apply(caster, target);

        assertEquals(1, target.getActiveBuffs().size());

        BuffDebuffEffect active = target.getActiveBuffs().get(0);
        assertEquals(0, active.getFlatValue());
        assertEquals(0.5, active.getModifier());
        assertEquals(StatType.POWER, active.getStatAffected());
    }

    @Test
    void testModifierNegativeDebuffWithDuration() {
        effect.setStatAffected(StatType.POWER);
        effect.setModifier(-0.25); // -25%
        effect.setDuration(1);

        effect.apply(caster, target);

        assertEquals(1, target.getActiveBuffs().size());

        BuffDebuffEffect active = target.getActiveBuffs().get(0);
        assertEquals(-0.25, active.getModifier());
    }

    @Test
    void testModifierSourceCalculation() {
        // Source = TARGET_HEALTH_MAX = 200
        // Modifier = 0.5 (50%)
        // Result flatValue to apply = 100
        effect.setStatAffected(StatType.ARMURE);
        effect.setModifier(0.5);
        effect.setModifierSource(Source.TARGET_HEALTH_MAX);
        effect.setDuration(3);

        effect.apply(caster, target);

        assertEquals(1, target.getActiveBuffs().size());
        BuffDebuffEffect active = target.getActiveBuffs().get(0);

        // When a source is used, it translates the modifier into a flatValue and clears
        // the modifier.
        assertEquals(100, active.getFlatValue());
        assertEquals(0, active.getModifier());
        assertEquals(3, active.getDuration());
    }

    @Test
    void testCombinationFlatAndModifierWithoutSource() {
        effect.setStatAffected(StatType.CRIT);
        effect.setFlatValue(15);
        effect.setModifier(0.3); // +30%
        effect.setDuration(2);

        effect.apply(caster, target);

        // It should create two distinct buff clones: one for flat, one for modifier.
        assertEquals(2, target.getActiveBuffs().size());

        BuffDebuffEffect flatBuff = target.getActiveBuffs().get(0);
        assertEquals(15, flatBuff.getFlatValue());
        assertEquals(0, flatBuff.getModifier());

        BuffDebuffEffect multBuff = target.getActiveBuffs().get(1);
        assertEquals(0, multBuff.getFlatValue());
        assertEquals(0.3, multBuff.getModifier());
    }

    @Test
    void testAmeDetacheeLogic() {
        effect.setStatAffected(StatType.AME_DETACHEE);

        // First application
        effect.apply(caster, target);

        assertEquals(1, target.getActiveBuffs().size());
        BuffDebuffEffect ame = target.getActiveBuffs().get(0);
        assertEquals(StatType.AME_DETACHEE, ame.getStatAffected());
        assertEquals(2, ame.getDuration(), "Ame Detachee duration is strictly 2");

        // Simulate duration passing
        ame.setDuration(1);

        // Second application
        effect.apply(caster, target);

        assertEquals(1, target.getActiveBuffs().size(), "Doit réinitialiser sans dupliquer");
        assertEquals(2, ame.getDuration(), "La durée doit avoir été réinitialisée à 2");
    }

    @Test
    void testImpactedSpellsApplyDirectlyToSpell() {
        Spell mockSpell = new Spell();
        mockSpell.setNom("Sort Cible");

        // Add a mock effect to the spell
        BuffDebuffEffect spellInnerEffect = new BuffDebuffEffect();
        spellInnerEffect.setStatAffected(StatType.DAMAGE_GIVEN_PHYSIC);
        spellInnerEffect.setFlatValue(5);
        mockSpell.getEffects().add(spellInnerEffect);

        effect.setStatAffected(StatType.ARMURE);
        effect.setFlatValue(10);
        effect.setModifier(0.2);

        effect.getImpactedSpells().add(mockSpell);

        // We need to apply this effect.
        // According to logic, if impactedSpells is not empty:
        // - applies flat value directly to target.
        // - applies modifier directly to the spells' effects.

        effect.apply(caster, target);

        // Target receives flat buff immediately
        assertEquals(60, target.getArmor(), "10 armure flat appliqués directement");

        // Active buffs should be empty because impacted spells bypasses persistent
        assertEquals(0, target.getActiveBuffs().size());
    }

    @Test
    void testAllStandardStatsPersistent() {
        StatType[] standardStats = {
                StatType.ARMURE, StatType.SPEED, StatType.MANA, StatType.HEALTH, StatType.CRIT,
                StatType.RESISTANCE, StatType.POWER, StatType.STRENGTH
        };

        for (StatType stat : standardStats) {
            target.getActiveBuffs().clear();
            effect.setStatAffected(stat);
            effect.setFlatValue(10);
            effect.setDuration(2);
            effect.apply(caster, target);
            assertEquals(1, target.getActiveBuffs().size(), "Should persist " + stat);
            assertEquals(stat, target.getActiveBuffs().get(0).getStatAffected());
        }
    }

    @Test
    void testAllCombatStatsPersistent() {
        StatType[] combatStats = {
                StatType.DAMAGE_TAKEN_MAGIC, StatType.DAMAGE_TAKEN_PHYSIC, StatType.DAMAGE_TAKEN_BRUT,
                StatType.DAMAGE_GIVEN_MAGIC, StatType.DAMAGE_GIVEN_PHYSIC, StatType.DAMAGE_GIVEN_BRUT,
                StatType.HEAL_RECEIVED, StatType.SHIELD_RECEIVED,
                StatType.HEAL_GIVEN, StatType.SHIELD_GIVEN,
                StatType.DAMAGE_GIVEN_MAGIC_TO_SHIELD, StatType.DAMAGE_GIVEN_PHYSIC_TO_SHIELD,
                StatType.SHIELD_PENETRATION, StatType.SHIELD_PIERCED
        };

        for (StatType stat : combatStats) {
            target.getActiveBuffs().clear();
            effect.setStatAffected(stat);
            effect.setFlatValue(10);
            effect.setDuration(2);
            effect.apply(caster, target);
            assertEquals(1, target.getActiveBuffs().size(), "Should persist " + stat);
            assertEquals(stat, target.getActiveBuffs().get(0).getStatAffected());
        }
    }

    @Test
    void testInstantaneousApplicationThrowsExceptionForCombatStats() {
        StatType[] combatStats = {
                StatType.DAMAGE_TAKEN_MAGIC, StatType.DAMAGE_TAKEN_PHYSIC, StatType.DAMAGE_TAKEN_BRUT,
                StatType.DAMAGE_GIVEN_MAGIC, StatType.DAMAGE_GIVEN_PHYSIC, StatType.DAMAGE_GIVEN_BRUT,
                StatType.HEAL_RECEIVED, StatType.SHIELD_RECEIVED,
                StatType.HEAL_GIVEN, StatType.SHIELD_GIVEN,
                StatType.DAMAGE_GIVEN_MAGIC_TO_SHIELD, StatType.DAMAGE_GIVEN_PHYSIC_TO_SHIELD,
                StatType.SHIELD_PENETRATION, StatType.SHIELD_PIERCED
        };

        for (StatType stat : combatStats) {
            target.getActiveBuffs().clear();
            effect.setStatAffected(stat);
            effect.setFlatValue(10);
            effect.setDuration(0); // Instantaneous
            
            IllegalArgumentException thrown = assertThrows(
                    IllegalArgumentException.class,
                    () -> effect.apply(caster, target),
                    "Should throw exception for " + stat + " in flat instantaneous application"
            );
            assertTrue(thrown.getMessage().contains("Stat inexploitable en flat"));
        }
    }
}
