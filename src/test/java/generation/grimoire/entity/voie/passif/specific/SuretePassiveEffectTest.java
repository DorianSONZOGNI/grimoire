package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.spell.type.effect.HealFixedEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SuretePassiveEffectTest {

    private SuretePassiveEffect passive;
    private Personnage hero;
    private Personnage ally;
    private Personnage enemy;
    private Spell spell;

    @BeforeEach
    void setUp() {
        passive = new SuretePassiveEffect();

        hero = new Personnage();
        hero.setName("Hero");
        hero.setTeamId("1");

        ally = new Personnage();
        ally.setName("Ally");
        ally.setTeamId("1");

        enemy = new Personnage();
        enemy.setName("Enemy");
        enemy.setTeamId("2");

        spell = new Spell();
        spell.setNom("Sort de Test");
    }

    @Test
    void shouldGain10PointsPassiveEachTurnStartCappedAt100() {
        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(10);

        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(20);

        hero.setPassiveState("surete_points", 95);
        passive.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(100);
        // Ne doit pas déclencher de buff au début de tour
        assertThat(hero.getActiveBuffs()).isEmpty();
    }

    @Test
    void shouldConvertManaPaidToPoints() {
        // 35% of 100 mana = 35 points
        passive.onSpellCostPaid(hero, spell, 100);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(35);

        // 35% of 50 mana = 18 points (Math.round(17.5))
        passive.onSpellCostPaid(hero, spell, 50);
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(53);
    }

    @Test
    void shouldNotTriggerBonusesBelow100Points() {
        hero.setPassiveState("surete_points", 50);

        HealFixedEffect heal = new HealFixedEffect();
        heal.setEffectTarget(EffectTarget.ALLY);
        heal.setHealAmount(100);
        spell.getEffects().add(heal);

        passive.handleSpellCostPaid(hero, enemy, spell, 20, List.of(ally), List.of(enemy));

        // 50 + round(20 * 0.35) = 57
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(57);
        assertThat(heal.getAmplificationMultiplier()).isEqualTo(1.0);
        assertThat(hero.getActiveBuffs()).isEmpty();
        assertThat(enemy.getActiveBuffs()).isEmpty();
    }

    @Test
    void shouldTriggerAllyHealBonusWhenAt100Points() {
        hero.setPassiveState("surete_points", 100);

        HealFixedEffect heal = new HealFixedEffect();
        heal.setEffectTarget(EffectTarget.ALLY);
        heal.setHealAmount(100);
        spell.getEffects().add(heal);

        passive.handleSpellCostPaid(hero, enemy, spell, 0, List.of(ally), List.of(enemy));

        // 100 consommés, 0 mana dépensé -> 0 pts restants
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(0);
        // Amplification +50%
        assertThat(heal.getAmplificationMultiplier()).isEqualTo(1.5);
        // Pas d'effet sur soi ou ennemi
        assertThat(hero.getActiveBuffs()).isEmpty();
        assertThat(enemy.getActiveBuffs()).isEmpty();
    }

    @Test
    void shouldTriggerEnemyDebuffsWhenAt100Points() {
        hero.setPassiveState("surete_points", 100);

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setEffectTarget(EffectTarget.TARGET);
        dmg.setDamageType(DamageType.MAGIC);
        dmg.setDamage(50);
        spell.getEffects().add(dmg);

        passive.handleSpellCostPaid(hero, enemy, spell, 0, List.of(ally), List.of(enemy));

        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(0);
        // Débuffs sur l'ennemi
        assertThat(enemy.getActiveBuffs()).hasSize(2);
        assertThat(enemy.getActiveBuffs().stream().anyMatch(b ->
                b.getStatAffected() == StatType.DAMAGE_TAKEN_MAGIC && b.getModifier() == 0.20 && b.getDuration() == 2)).isTrue();
        assertThat(enemy.getActiveBuffs().stream().anyMatch(b ->
                b.getStatAffected() == StatType.DAMAGE_TAKEN_PHYSIC && b.getModifier() == 0.20 && b.getDuration() == 2)).isTrue();
        // Pas de buff sur hero
        assertThat(hero.getActiveBuffs()).isEmpty();
    }

    @Test
    void shouldTriggerSelfPowerBuffWhenAt100Points() {
        hero.setPassiveState("surete_points", 100);

        BuffDebuffEffect selfEff = new BuffDebuffEffect();
        selfEff.setEffectTarget(EffectTarget.CASTER);
        selfEff.setStatAffected(StatType.ARMURE);
        selfEff.setFlatValue(10);
        spell.getEffects().add(selfEff);

        passive.handleSpellCostPaid(hero, enemy, spell, 0, List.of(ally), List.of(enemy));

        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(0);
        // Buff puissance +20% pendant 3 tours
        assertThat(hero.getActiveBuffs()).hasSize(1);
        BuffDebuffEffect powerBuff = hero.getActiveBuffs().get(0);
        assertThat(powerBuff.getStatAffected()).isEqualTo(StatType.POWER);
        assertThat(powerBuff.getModifier()).isEqualTo(0.20);
        assertThat(powerBuff.getDuration()).isEqualTo(3);
    }

    @Test
    void shouldTriggerMultipleBonusesWhenSpellTouchesMultipleCategories() {
        hero.setPassiveState("surete_points", 100);

        HealFixedEffect heal = new HealFixedEffect();
        heal.setEffectTarget(EffectTarget.ALLY);
        heal.setHealAmount(50);

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setEffectTarget(EffectTarget.TARGET);
        dmg.setDamageType(DamageType.MAGIC);
        dmg.setDamage(30);

        BuffDebuffEffect selfBuff = new BuffDebuffEffect();
        selfBuff.setEffectTarget(EffectTarget.CASTER);
        selfBuff.setStatAffected(StatType.ARMURE);
        selfBuff.setFlatValue(5);

        spell.getEffects().addAll(List.of(heal, dmg, selfBuff));

        // Sort coûte 50 mana
        passive.handleSpellCostPaid(hero, enemy, spell, 50, List.of(ally), List.of(enemy));

        // 100 consommés + 18 pts gagnés (35% de 50) = 18
        assertThat(hero.getPassiveState("surete_points", 0)).isEqualTo(18);

        // 1. Soin allié +50%
        assertThat(heal.getAmplificationMultiplier()).isEqualTo(1.5);

        // 2. Débuffs ennemi
        assertThat(enemy.getActiveBuffs()).hasSize(2);

        // 3. Buff puissance sur hero
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.POWER);
    }
}
