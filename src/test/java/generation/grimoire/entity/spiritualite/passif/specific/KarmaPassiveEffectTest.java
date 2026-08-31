package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.KarmaAlignment;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.SpellCostAdjustEvent;
import generation.grimoire.event.SpellCostPaidEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KarmaPassiveEffectTest {

    private KarmaPassiveEffect passive;
    private Personnage hero;
    private Personnage enemy;
    private Spiritualite karmaSpiritualite;
    
    private Spell offSpell;
    private Spell protSpell;
    private Spell restSpell;
    private Spell harmonieSpell;

    @BeforeEach
    void setUp() {
        passive = new KarmaPassiveEffect();
        
        karmaSpiritualite = new Spiritualite();
        karmaSpiritualite.setId(2L);
        karmaSpiritualite.setNom("Karma");
        
        passive.setSpiritualite(karmaSpiritualite);
        
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        
        enemy = new Personnage();
        enemy.setName("Enemy");

        offSpell = new Spell();
        offSpell.setNom("Offensive Spell");
        offSpell.setSpiritualite(karmaSpiritualite);
        offSpell.setKarmaAlignment(KarmaAlignment.OFFENSIVE);

        protSpell = new Spell();
        protSpell.setNom("Protective Spell");
        protSpell.setSpiritualite(karmaSpiritualite);
        protSpell.setKarmaAlignment(KarmaAlignment.PROTECTIVE);

        restSpell = new Spell();
        restSpell.setNom("Restorative Spell");
        restSpell.setSpiritualite(karmaSpiritualite);
        restSpell.setKarmaAlignment(KarmaAlignment.RESTORATIVE);
        
        harmonieSpell = new Spell();
        harmonieSpell.setNom("Sort d'harmonie");
        harmonieSpell.setSpiritualite(karmaSpiritualite);
        harmonieSpell.setKarmaAlignment(KarmaAlignment.OFFENSIVE); // Even if offensive, it has harmonie in name
    }

    // --- Harmonie Karmique ---
    
    @Test
    void shouldReduceProtectiveSpellCostWhenInHarmony() {
        hero.setPassiveState("karma_harmony", 1);
        
        int[] costs = {100, 50, 20}; // mana, hp, heat
        SpellCostAdjustEvent event = new SpellCostAdjustEvent(hero, enemy, protSpell, costs);
        passive.onEvent(event);
        
        assertThat(costs[0]).isEqualTo(80);
        assertThat(costs[1]).isEqualTo(40);
        assertThat(costs[2]).isEqualTo(16);
    }
    
    @Test
    void shouldNotReduceCostIfNotInHarmonyOrNotProtective() {
        hero.setPassiveState("karma_harmony", 0);
        
        int[] costs = {100, 50, 20};
        SpellCostAdjustEvent event = new SpellCostAdjustEvent(hero, enemy, protSpell, costs);
        passive.onEvent(event);
        assertThat(costs[0]).isEqualTo(100); // Not reduced
        
        hero.setPassiveState("karma_harmony", 1);
        SpellCostAdjustEvent event2 = new SpellCostAdjustEvent(hero, enemy, offSpell, costs);
        passive.onEvent(event2);
        assertThat(costs[0]).isEqualTo(100); // Not reduced because offensive
    }
    
    @Test
    void shouldApplyDamageBuffOnOffensiveSpellWhenInHarmony() {
        hero.setPassiveState("karma_harmony", 1);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        
        assertThat(hero.getConsumableSpellBuffs()).hasSize(1);
        assertThat(hero.getConsumableSpellBuffs().get(0).getModifier()).isEqualTo(1.10);
    }

    @Test
    void shouldHealAndRestoreManaOnRestorativeSpellWhenInHarmony() {
        hero.setPassiveState("karma_harmony", 1);
        hero.setHealthCurrent(50);
        hero.setManaCurrent(50);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        
        // 5% of 100 max = 5
        assertThat(hero.getHealthCurrent()).isEqualTo(55);
        assertThat(hero.getManaCurrent()).isEqualTo(55);
    }

    // --- Mécanique de Jauge ---

    @Test
    void offensiveSpellShouldDecreaseGauge() {
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(-1);
    }

    @Test
    void protectiveSpellShouldIncreaseGauge() {
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, protSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(1);
    }

    @Test
    void restorativeSpellShouldMovePositiveGaugeTowardsZero() {
        hero.setPassiveState("karma_gauge", 2);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(1);
    }

    @Test
    void restorativeSpellShouldMoveNegativeGaugeTowardsZero() {
        hero.setPassiveState("karma_gauge", -2);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(-1);
    }

    @Test
    void restorativeSpellShouldNotMoveNeutralGauge() {
        hero.setPassiveState("karma_gauge", 0);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);
    }

    @Test
    void shouldEnterHarmonyWhenGaugeReachesZero() {
        hero.setPassiveState("karma_gauge", 1);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("karma_harmony", 0)).isEqualTo(1);
    }

    // --- Verrouillage ---

    @Test
    void shouldTriggerCorruptionWhenGaugeReachesMinus4() {
        hero.setPassiveState("karma_gauge", -3);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(6);
        assertThat(hero.getPassiveState("karma_harmony", 0)).isEqualTo(0);
        
        // Applies x2.0 damage buff
        assertThat(hero.getConsumableSpellBuffs()).hasSize(1);
        assertThat(hero.getConsumableSpellBuffs().get(0).getModifier()).isEqualTo(2.0);
    }

    @Test
    void shouldTriggerIlluminationWhenGaugeReachesPlus4() {
        hero.setPassiveState("karma_gauge", 3);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, protSpell, 10, 0, 0));
        
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(6);
        assertThat(hero.getPassiveState("karma_harmony", 0)).isEqualTo(0);
        
        // Applies +20% Armor and Res buff for 3 turns
        assertThat(hero.getActiveBuffs()).hasSize(2);
        assertThat(hero.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.ARMURE)).isTrue();
        assertThat(hero.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.RESISTANCE)).isTrue();
    }

    @Test
    void canCastSpell_shouldBlockNormalSpellsWhenLocked() {
        hero.setPassiveState("karma_locked", 1);
        
        assertThat(passive.canCastSpell(hero, offSpell)).isFalse();
        assertThat(passive.canCastSpell(hero, protSpell)).isFalse();
    }

    @Test
    void canCastSpell_shouldAllowRestorativeSpellsWhenLocked() {
        hero.setPassiveState("karma_locked", 1);
        assertThat(passive.canCastSpell(hero, restSpell)).isTrue();
    }

    @Test
    void canCastSpell_shouldAllowSpellsWithHarmonieInNameWhenLocked() {
        hero.setPassiveState("karma_locked", 1);
        assertThat(passive.canCastSpell(hero, harmonieSpell)).isTrue();
    }

    @Test
    void restorativeSpellPaidEvent_shouldDecreaseLockDurationAndUnlockIfZero() {
        hero.setPassiveState("karma_locked", 1);
        hero.setPassiveState("karma_locked_duration", 2);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);
    }

    @Test
    void onTurnStart_shouldDecreaseLockDurationAndUnlockIfZero() {
        hero.setPassiveState("karma_locked", 1);
        hero.setPassiveState("karma_locked_duration", 2);
        
        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        
        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);
    }
}
