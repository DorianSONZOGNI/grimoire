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

    // --- Esprit Karmique (Cost reduction) ---
    
    @Test
    void shouldReduceProtectiveSpellCostWhenInEspritState() {
        hero.setPassiveState("karma_gauge", 2);
        
        int[] costs = {100, 50, 20}; // mana, hp, heat
        SpellCostAdjustEvent event = new SpellCostAdjustEvent(hero, enemy, protSpell, costs);
        passive.onEvent(event);
        
        // 2 * 0.08 = 0.16 reduction -> 84, 42, 16
        assertThat(costs[0]).isEqualTo(84);
        assertThat(costs[1]).isEqualTo(42);
        assertThat(costs[2]).isEqualTo(16);
    }
    
    @Test
    void shouldNotReduceCostIfNotInEsprit() {
        hero.setPassiveState("karma_gauge", 0);
        
        int[] costs = {100, 50, 20};
        SpellCostAdjustEvent event = new SpellCostAdjustEvent(hero, enemy, protSpell, costs);
        passive.onEvent(event);
        assertThat(costs[0]).isEqualTo(100); // Not reduced because gauge == 0
    }
    
    // --- Ténèbres Karmiques (Damage buff) ---
    
    @Test
    void shouldApplyDamageMultiplierOnOffensiveSpellWhenInTenebres() {
        hero.setPassiveState("karma_gauge", -2);
        
        generation.grimoire.entity.spell.type.effect.DamageFixedEffect dmgEff = new generation.grimoire.entity.spell.type.effect.DamageFixedEffect();
        dmgEff.setDamageType(generation.grimoire.enumeration.DamageType.MAGIC);
        dmgEff.setAmplificationMultiplier(1.0);
        offSpell.getEffects().add(dmgEff);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        
        // Bonus is 2 * 0.08 = 0.16. So amplification becomes 1.16
        assertThat(dmgEff.getAmplificationMultiplier()).isEqualTo(1.16);
    }

    // --- Harmonie Karmique (Heal/Mana on 0) ---

    @Test
    void shouldHealAndRestoreManaOnRestorativeSpellWhenInHarmony() {
        hero.setPassiveState("karma_gauge", 0);
        hero.setHealthCurrent(50);
        hero.setManaCurrent(50);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        
        // 3% of 100 max = 3
        assertThat(hero.getHealthCurrent()).isEqualTo(53);
        assertThat(hero.getManaCurrent()).isEqualTo(53);
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
    }

    // --- Verrouillage ---

    @Test
    void shouldTriggerCorruptionWhenGaugeReachesMinus4() {
        hero.setPassiveState("karma_gauge", -3);
        
        generation.grimoire.entity.spell.type.effect.DamageFixedEffect dmgEff = new generation.grimoire.entity.spell.type.effect.DamageFixedEffect();
        dmgEff.setDamageType(generation.grimoire.enumeration.DamageType.MAGIC);
        dmgEff.setAmplificationMultiplier(1.0);
        offSpell.getEffects().add(dmgEff);
        
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(6);
        
        // Applies initial Tenebres buff (x1.24) and then corruption (x1.5) -> 1.24 * 1.5 = 1.86
        assertThat(dmgEff.getAmplificationMultiplier()).isCloseTo(1.86, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void shouldTriggerIlluminationWhenGaugeReachesPlus4() {
        hero.setPassiveState("karma_gauge", 3);
        passive.onEvent(new SpellCostPaidEvent(hero, enemy, protSpell, 10, 0, 0));
        
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(6);
        
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
