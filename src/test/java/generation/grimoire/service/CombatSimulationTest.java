package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.voie.passif.specific.SuretePassiveEffect;
import generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CombatSimulationTest {

    private SpellService spellService;

    private Personnage ally1; // Voie de Trahison
    private Personnage ally2; // Voie de la Sûreté
    private Personnage boss;  // Sans Voie

    private TrahisonPassiveEffect trahisonEffect;
    private SuretePassiveEffect sureteEffect;

    private Spell attackSpellAlly1;
    private Spell attackSpellAlly2;
    private Spell bossAttack;
    private Spell debuffSpellAlly2;

    @BeforeEach
    void setUp() {
        SpellRepository spellRepository = Mockito.mock(SpellRepository.class);
        PersonnageService personnageService = Mockito.mock(PersonnageService.class);
        spellService = new SpellService(spellRepository, personnageService);

        // --- SETUP ALLY 1 (Assassin - Trahison) ---
        ally1 = new Personnage();
        ally1.setName("Zane (Trahison)");
        ally1.setTeamId("HEROES");
        ally1.setHealthMax(150);
        ally1.setHealthCurrent(150);
        ally1.setManaMax(100);
        ally1.setManaCurrent(100);
        ally1.setArmor(10);

        Voie voieTrahison = new Voie();
        voieTrahison.setNom("Voie de Trahison");
        trahisonEffect = new TrahisonPassiveEffect();
        voieTrahison.setPassiveEffects(List.of(trahisonEffect));
        ally1.setVoie(voieTrahison);

        attackSpellAlly1 = new Spell();
        attackSpellAlly1.setNom("Frappe de l'Ombre");
        attackSpellAlly1.setManaCost(15);
        attackSpellAlly1.setVoie(voieTrahison);
        DamageFixedEffect dmg1 = new DamageFixedEffect();
        dmg1.setDamageType(DamageType.PHYSIC);
        dmg1.setDamage(40);
        attackSpellAlly1.getEffects().add(dmg1);

        // --- SETUP ALLY 2 (Paladin - Sûreté) ---
        ally2 = new Personnage();
        ally2.setName("Elara (Sûreté)");
        ally2.setTeamId("HEROES");
        ally2.setHealthMax(200);
        ally2.setHealthCurrent(200);
        ally2.setManaMax(150);
        ally2.setManaCurrent(150);
        ally2.setArmor(30);

        Voie voieSurete = new Voie();
        voieSurete.setNom("Voie de la Sûreté");
        sureteEffect = new SuretePassiveEffect();
        voieSurete.setPassiveEffects(List.of(sureteEffect));
        ally2.setVoie(voieSurete);

        attackSpellAlly2 = new Spell();
        attackSpellAlly2.setNom("Châtiment Lumineux");
        attackSpellAlly2.setManaCost(20);
        attackSpellAlly2.setVoie(voieSurete);
        DamageFixedEffect dmg2 = new DamageFixedEffect();
        dmg2.setDamageType(DamageType.MAGIC);
        dmg2.setDamage(30);
        attackSpellAlly2.getEffects().add(dmg2);

        debuffSpellAlly2 = new Spell();
        debuffSpellAlly2.setNom("Sceau de Fragilité");
        debuffSpellAlly2.setManaCost(25);
        debuffSpellAlly2.setVoie(voieSurete);
        BuffDebuffEffect debuff = new BuffDebuffEffect();
        debuff.setStatAffected(StatType.ARMURE);
        debuff.setFlatValue(-10);
        debuff.setDuration(3);
        debuffSpellAlly2.getEffects().add(debuff);

        // --- SETUP BOSS (Sans Voie) ---
        boss = new Personnage();
        boss.setName("Seigneur Démon");
        boss.setTeamId("MONSTERS");
        boss.setHealthMax(1000);
        boss.setHealthCurrent(1000);
        boss.setManaMax(0);
        boss.setManaCurrent(0);
        boss.setArmor(20);

        bossAttack = new Spell();
        bossAttack.setNom("Balayage Démoniaque");
        bossAttack.setManaCost(0);
        DamageFixedEffect dmgBoss = new DamageFixedEffect();
        dmgBoss.setDamageType(DamageType.PHYSIC);
        dmgBoss.setDamage(50);
        bossAttack.getEffects().add(dmgBoss);
    }

    @Test
    void simulateEpicCombat_5Turns() {
        System.out.println("=== DÉBUT DU COMBAT ===");

        // ==========================================
        // TOUR 1
        // ==========================================
        System.out.println("\n--- TOUR 1 ---");
        triggerTurnStartForAll();

        // Elara (Sûreté) applique le sceau de fragilité sur le boss (débuff armure)
        spellService.castSpell(debuffSpellAlly2, ally2, boss, null);
        
        // Sûreté a gagné 20 points de passif pour son sort (coût non pris en compte dans le passif tel que codé, il donne 20 fixe par sort)
        assertThat(ally2.getPassiveState("surete_points", 0)).isEqualTo(30); // 10 début de tour + 20 cast

        // Le boss a maintenant un débuff
        assertThat(boss.hasDebuff()).isTrue();

        // Zane (Trahison) attaque physiquement le boss. Comme le boss a un débuff, le passif Trahison s'applique (10% de base + 10% debuff = 20% extra damage)
        // Les dégâts de base de l'attaque manuelle (hit physical) seront disons de 50.
        trahisonEffect.onPhysicalHit(ally1, boss, 50);

        // Boss attaque Zane
        spellService.castSpell(bossAttack, boss, ally1, null);
        
        triggerTurnEndForAll();

        // ==========================================
        // TOUR 2
        // ==========================================
        System.out.println("\n--- TOUR 2 ---");
        triggerTurnStartForAll();

        // Zane lance son sort
        spellService.castSpell(attackSpellAlly1, ally1, boss, null);

        // Elara lance son sort de dégâts
        spellService.castSpell(attackSpellAlly2, ally2, boss, null);

        // Boss attaque Elara
        spellService.castSpell(bossAttack, boss, ally2, null);

        triggerTurnEndForAll();

        // ==========================================
        // TOUR 3
        // ==========================================
        System.out.println("\n--- TOUR 3 ---");
        triggerTurnStartForAll();
        
        // Zane hit physical
        trahisonEffect.onPhysicalHit(ally1, boss, 50);
        
        // Elara cast attack (Points de Sûreté: 10(t1) + 20(cast t1) + 10(t2) + 20(cast t2) + 10(t3) = 70 points avant de cast, 90 après cast)
        spellService.castSpell(attackSpellAlly2, ally2, boss, null);

        // Le boss a perdu son débuff à la fin du tour 3 ? 
        // Le sceau dure 3 tours : appliqué T1. Réduit à la fin T1 (reste 2), réduit à la fin T2 (reste 1), réduit à la fin T3 (expire).
        
        triggerTurnEndForAll();
        assertThat(boss.hasDebuff()).isFalse(); // Le débuff a expiré !

        // ==========================================
        // TOUR 4
        // ==========================================
        System.out.println("\n--- TOUR 4 ---");
        triggerTurnStartForAll();
        // Elara gagne +10 points de sûreté passifs -> 90 + 10 = 100 points !
        // Le buff de Sûreté (25% crit) devrait s'activer et les points retomber à 0.
        assertThat(ally2.getPassiveState("surete_points", -1)).isEqualTo(0);
        assertThat(ally2.getActiveBuffs()).hasSize(1);
        assertThat(ally2.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.CRIT);

        // Zane frappe, le boss n'a plus de débuff, juste le bonus de base (10%) ou Low HP si < 500 hp
        trahisonEffect.onPhysicalHit(ally1, boss, 50);

        // Elara cast avec son buff critique actif
        spellService.castSpell(attackSpellAlly2, ally2, boss, null);

        // Boss frappe
        spellService.castSpell(bossAttack, boss, ally1, null);

        triggerTurnEndForAll();

        // ==========================================
        // TOUR 5
        // ==========================================
        System.out.println("\n--- TOUR 5 ---");
        triggerTurnStartForAll();

        // Elara attaque une dernière fois
        spellService.castSpell(attackSpellAlly2, ally2, boss, null);
        
        // Zane attaque
        spellService.castSpell(attackSpellAlly1, ally1, boss, null);

        triggerTurnEndForAll();

        System.out.println("=== FIN DU COMBAT ===");

        // --- ASSERTIONS FINALES ---
        System.out.println("Boss HP restants : " + boss.getHealthCurrent());
        System.out.println("Zane HP : " + ally1.getHealthCurrent() + " | Mana : " + ally1.getManaCurrent());
        System.out.println("Elara HP : " + ally2.getHealthCurrent() + " | Mana : " + ally2.getManaCurrent());

        // Le boss a pris beaucoup de dégâts
        assertThat(boss.getHealthCurrent()).isLessThan(1000);
        
        // Zane a pris des dégâts (boss attack T1 et T4 = 100 dégâts avant armure)
        assertThat(ally1.getHealthCurrent()).isLessThan(150);

        // Elara a dépensé de la mana (T1:25, T2:20, T3:20, T4:20, T5:20 = 105 mana total)
        assertThat(ally2.getManaCurrent()).isEqualTo(150 - 105);
        
        // La mécanique de heal de Trahison (Zane se soigne sur ses frappes physiques) a fait remonter sa vie
        // Sans le heal, il serait plus bas. On peut juste s'assurer que tout a tourné sans erreur.
    }

    private void triggerTurnStartForAll() {
        if (ally1.getVoie() != null) ally1.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(ally1));
        if (ally2.getVoie() != null) ally2.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(ally2));
        if (boss.getVoie() != null) boss.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(boss));

        if (ally1.getSpiritualite() != null && ally1.getSpiritualite().getPassiveEffects() != null) {
            ally1.getSpiritualite().getPassiveEffects().forEach(p -> p.onTurnStart(ally1));
        }
        if (ally2.getSpiritualite() != null && ally2.getSpiritualite().getPassiveEffects() != null) {
            ally2.getSpiritualite().getPassiveEffects().forEach(p -> p.onTurnStart(ally2));
        }
        if (boss.getSpiritualite() != null && boss.getSpiritualite().getPassiveEffects() != null) {
            boss.getSpiritualite().getPassiveEffects().forEach(p -> p.onTurnStart(boss));
        }
    }

    private void triggerTurnEndForAll() {
        ally1.updateBuffs();
        ally1.updateHealOverTimeEffects();
        ally1.updateDamageOverTimeEffects();

        ally2.updateBuffs();
        ally2.updateHealOverTimeEffects();
        ally2.updateDamageOverTimeEffects();

        boss.updateBuffs();
        boss.updateHealOverTimeEffects();
        boss.updateDamageOverTimeEffects();
    }
}
