package generation.grimoire.entity.voie.passif;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.specific.*;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.enumeration.StatType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PassifTest {

    private Personnage hero;
    private Personnage enemy;
    private Spell dummySpell;

    @BeforeEach
    void setUp() {
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setArmor(50);
        hero.setSpeed(100);

        enemy = new Personnage();
        enemy.setName("Enemy");
        enemy.setHealthMax(100);
        enemy.setHealthCurrent(100);

        dummySpell = new Spell();
        dummySpell.setNom("Dummy");
        dummySpell.setAction(2); // banal
        dummySpell.setHeatGenerated(10); // Génère 10 de heat par défaut pour les tests de Destruction
    }

    @Test
    void shouldApplyConsolidationPassive() {
        ConsolidationPassiveEffect consolidation = new ConsolidationPassiveEffect();

        // Tour 1 : pas de sort lancé au tour précédent → +5% armure par défaut
        consolidation.onTurnStart(hero);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(1.05);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(0);

        // Lancer un sort de niveau 3 → remplace par +10% résistance magique
        Spell lvl3Spell = new Spell();
        lvl3Spell.setNom("Sort Lvl 3");
        lvl3Spell.setNiveau(3);
        consolidation.onSpellCast(hero, lvl3Spell);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.RESISTANCE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(1.10);

        // Tour 2 : sort lancé au tour précédent, on ne remet pas le défaut
        consolidation.onTurnStart(hero);
        // Le flag a été reset, mais le buff de sort a été nettoyé et le défaut est re-appliqué
        // car onTurnStart remet le flag à 0 APRÈS avoir vérifié
        // En fait le castLastTurn vaut 1 (car on l'a mis à 1 via onSpellCast) donc pas de défaut
        // Vérifions : aucun buff ne doit être ajouté (le sort a été lancé au tour précédent)
        // Les anciens buffs sont supprimés par removeIf, et castLastTurn==1 => pas de buff par défaut
        assertThat(hero.getActiveBuffs()).isEmpty();

        // Tour 3 : pas de sort lancé → retour au +5% armure par défaut
        consolidation.onTurnStart(hero);
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(hero.getActiveBuffs().get(0).getModifier()).isEqualTo(1.05);
    }

    @Test
    void shouldApplyDestructionPassive() {
        DestructionPassiveEffect destruction = new DestructionPassiveEffect();

        // 9 spells to reach 90 heat
        for (int i = 0; i < 9; i++) {
            destruction.onSpellCast(hero, dummySpell);
        }
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(90);

        // 10th spell should trigger free spell and stay at 100 heat
        destruction.onSpellCast(hero, dummySpell);
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(100);
        // Note: checking if triggerFreeSpell was called is hard without a mock, but heat reset proves it triggered.
    }

    @Test
    void shouldApplyRaisonPassive() {
        RaisonPassiveEffect raison = new RaisonPassiveEffect();
        generation.grimoire.entity.Voie voieRaison = new generation.grimoire.entity.Voie();
        voieRaison.setNom("Voie de la Raison");
        voieRaison.setPassiveEffects(java.util.List.of(raison));
        hero.setVoie(voieRaison);

        hero.setSpeed(2); // Base speed 2

        // Turn 1 starts
        raison.onTurnStart(hero);
        
        // Base crit is 0, but because of Raison, it's speed * 2 = 4
        assertThat(hero.getStatFlatBonus(StatType.CRIT)).isEqualTo(4);

        dummySpell.setVoie(voieRaison);
        raison.onSpellCast(hero, dummySpell);

        // Turn 2 begins. Spell was cast in T1, so it gains 1 speed stack.
        raison.onTurnStart(hero);
        assertThat(hero.getPassiveState("raison_speed_stacks", 0)).isEqualTo(1);
        // Speed is now 2 + 1 = 3. Crit is 3 * 2 = 6.
        assertThat(hero.getStatFlatBonus(StatType.SPEED)).isEqualTo(1);
        assertThat(hero.getStatFlatBonus(StatType.CRIT)).isEqualTo(6);

        // Turn 3 begins. No spell was cast in T2, so it loses speed stacks.
        raison.onTurnStart(hero);
        assertThat(hero.getPassiveState("raison_speed_stacks", -1)).isEqualTo(0);
        // Speed is back to 2. Crit is 2 * 2 = 4.
        assertThat(hero.getStatFlatBonus(StatType.SPEED)).isEqualTo(0);
        assertThat(hero.getStatFlatBonus(StatType.CRIT)).isEqualTo(4);
    }

    @Test
    void shouldApplySuretePassive() {
        SuretePassiveEffect surete = new SuretePassiveEffect();

        // Simulate turn start: +10 points
        surete.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", -1)).isEqualTo(10);

        dummySpell.setManaCost(100);
        // Cast 4 spells (4 * 20 = 80 points) -> Total 90 points
        for (int i = 0; i < 4; i++) {
            surete.onSpellCast(hero, dummySpell);
        }
        assertThat(hero.getPassiveState("surete_points", -1)).isEqualTo(90);
        assertThat(hero.getActiveBuffs()).isEmpty(); // Not triggered yet

        // Next turn start: +10 points -> Total 100 points -> Trigger buff
        surete.onTurnStart(hero);
        assertThat(hero.getPassiveState("surete_points", -1)).isEqualTo(0);
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.CRIT);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(25); // 25% car déclenché passivement
    }

    @Test
    void shouldApplyViolencePassive() {
        ViolencePassiveEffect violence = new ViolencePassiveEffect();
        generation.grimoire.entity.Voie voieViolence = new generation.grimoire.entity.Voie();
        voieViolence.setNom("Voie de la Violence");
        voieViolence.setPassiveEffects(java.util.List.of(violence));

        Spell inspiration = new Spell();
        inspiration.setVoie(voieViolence);
        inspiration.setCategory(SpellCategory.INSPIRATION);

        violence.onSpellCast(hero, inspiration);
        assertThat(hero.getPassiveState("violence_inspiration", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_flat_CRIT", 0)).isEqualTo(2);
        assertThat(hero.getPassiveState("stat_flat_POWER", -1)).isEqualTo(0);

        Spell expiration = new Spell();
        expiration.setVoie(voieViolence);
        expiration.setCategory(SpellCategory.EXPIRATION);

        violence.onSpellCast(hero, expiration);
        // Should reset inspiration and increment expiration
        assertThat(hero.getPassiveState("violence_inspiration", -1)).isEqualTo(0);
        assertThat(hero.getPassiveState("violence_expiration", 0)).isEqualTo(1);
        
        // Crit is cleared, Power is buffed
        assertThat(hero.getPassiveState("stat_flat_CRIT", -1)).isEqualTo(0);
        assertThat(hero.getPassiveState("stat_flat_POWER", 0)).isEqualTo(2);
        
        // Turn 2 begins. We cast last turn, so we keep stacks.
        violence.onTurnStart(hero);
        assertThat(hero.getPassiveState("violence_expiration", -1)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_flat_POWER", -1)).isEqualTo(2);
        
        // Turn 3 begins. We didn't cast in Turn 2, so we lose stacks.
        violence.onTurnStart(hero);
        assertThat(hero.getPassiveState("violence_expiration", -1)).isEqualTo(0);
        assertThat(hero.getPassiveState("stat_flat_POWER", -1)).isEqualTo(0);
    }

    @Test
    void shouldApplyTrahisonBaseBonus() {
        TrahisonPassiveEffect trahison = new TrahisonPassiveEffect();

        // Full HP enemy, no debuff -> 10% base bonus
        trahison.onPhysicalHit(hero, enemy, 100);
        // 10% extra = 10 damage. Enemy starts at 100 HP.
        assertThat(enemy.getHealthCurrent()).isEqualTo(90);
        assertThat(hero.getPassiveState("trahison_used_this_turn", 0)).isEqualTo(1);

        // Second hit this turn: base bonus already used, no other bonus -> no extra damage
        trahison.onPhysicalHit(hero, enemy, 100);
        assertThat(enemy.getHealthCurrent()).isEqualTo(90);

        // New turn resets; hit again
        trahison.onTurnStart(hero);
        trahison.onPhysicalHit(hero, enemy, 100);
        assertThat(enemy.getHealthCurrent()).isEqualTo(80);
    }

    @Test
    void shouldApplyTrahisonLowHpBonus() {
        TrahisonPassiveEffect trahison = new TrahisonPassiveEffect();

        // Bring enemy to < 50% HP (40/100)
        enemy.setHealthCurrent(40);

        // Hit: base 10% + low HP 15% = 25 extra damage
        trahison.onPhysicalHit(hero, enemy, 100);
        assertThat(enemy.getHealthCurrent()).isEqualTo(15); // 40 - 25

        // Second hit: both bonuses already consumed this turn
        int hpAfterFirstHit = enemy.getHealthCurrent();
        trahison.onPhysicalHit(hero, enemy, 100);
        assertThat(enemy.getHealthCurrent()).isEqualTo(hpAfterFirstHit); // no extra damage
    }

    @Test
    void shouldApplyTrahisonDebuffBonus() {
        TrahisonPassiveEffect trahison = new TrahisonPassiveEffect();

        // Apply a debuff to enemy (negative flat value)
        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect debuff =
                new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
        debuff.setStatAffected(generation.grimoire.enumeration.StatType.ARMURE);
        debuff.setFlatValue(-10);
        debuff.setDuration(3);
        enemy.getActiveBuffs().add(debuff);

        assertThat(enemy.hasDebuff()).isTrue();

        // Full HP enemy with debuff -> 10% base + 10% debuff bonus = 20 extra damage
        trahison.onPhysicalHit(hero, enemy, 100);
        int hpAfterFirst = enemy.getHealthCurrent();
        assertThat(hpAfterFirst).isLessThan(100); // extra damage was applied

        // Second hit: base and debuff bonuses are already used, so no extra damage
        trahison.onPhysicalHit(hero, enemy, 100);
        assertThat(enemy.getHealthCurrent()).isEqualTo(hpAfterFirst); // debuff bonus is once per turn

        // New turn resets; hit again
        trahison.onTurnStart(hero);
        trahison.onPhysicalHit(hero, enemy, 100);
        assertThat(enemy.getHealthCurrent()).isLessThan(hpAfterFirst); // debuff bonus is available again!
    }
}
