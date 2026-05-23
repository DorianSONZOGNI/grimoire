package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealFixedEffect;
import generation.grimoire.entity.spell.type.effect.ShieldEffect;
import generation.grimoire.entity.voie.passif.specific.RaisonPassiveEffect;
import generation.grimoire.entity.voie.passif.specific.ViolencePassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CombatSimulation2Test {

    private SpellService spellService;

    private Personnage mage; // Voie de la Raison
    private Personnage necromancien; // Voie de la Violence
    private Personnage boss;

    private RaisonPassiveEffect raisonEffect;
    private ViolencePassiveEffect violenceEffect;

    private Spell ratioSpellMage;
    private Spell debuffSpellNecro;
    private Spell poisonSpellNecro;
    private Spell bossAttack;

    @BeforeEach
    void setUp() {
        SpellRepository spellRepository = Mockito.mock(SpellRepository.class);
        PersonnageService personnageService = Mockito.mock(PersonnageService.class);
        spellService = new SpellService(spellRepository, personnageService);

        // --- SETUP ALLY 1 (Mage - Raison) ---
        mage = new Personnage();
        mage.setName("Aria (Raison)");
        mage.setTeamId("HEROES");
        mage.setHealthMax(150);
        mage.setHealthCurrent(150);
        mage.setManaMax(200);
        mage.setManaCurrent(200);
        mage.setPower(50); // Beaucoup de puissance
        mage.setSpeed(10);
        mage.setCrit(10); // Critique de base

        Voie voieRaison = new Voie();
        voieRaison.setNom("Voie de la Raison");
        raisonEffect = new RaisonPassiveEffect();
        voieRaison.setPassiveEffects(List.of(raisonEffect));
        mage.setVoie(voieRaison);

        // Sort complexe avec ratio : base + 0.2*puissance + 0.1*HP Actuel de l'ennemi
        ratioSpellMage = new Spell();
        ratioSpellMage.setNom("Éclat Stellaire");
        ratioSpellMage.setManaCost(30);
        ratioSpellMage.setVoie(voieRaison);
        
        DamageOverTimeEffect dmgBase = new DamageOverTimeEffect();
        dmgBase.setDamageType(DamageType.MAGIC);
        dmgBase.setFixedDamagePerTick(20); // Dégâts de base
        dmgBase.setDuration(3);
        
        DamageOverTimeEffect dmgPower = new DamageOverTimeEffect();
        dmgPower.setDamageType(DamageType.MAGIC);
        dmgPower.setDamageSource(Source.CASTER_POWER);
        dmgPower.setPercentageDamagePerTick(0.2); // + 0.2 * Puissance
        dmgPower.setDuration(3);
        
        DamageOverTimeEffect dmgHp = new DamageOverTimeEffect();
        dmgHp.setDamageType(DamageType.MAGIC);
        dmgHp.setDamageSource(Source.TARGET_HEALTH_CURRENT);
        dmgHp.setPercentageDamagePerTick(0.1); // + 0.1 * HP Actuel de l'ennemi
        dmgHp.setDuration(3);

        ratioSpellMage.getEffects().addAll(List.of(dmgBase, dmgPower, dmgHp));


        // --- SETUP ALLY 2 (Nécromancien - Violence) ---
        necromancien = new Personnage();
        necromancien.setName("Malzahar (Violence)");
        necromancien.setTeamId("HEROES");
        necromancien.setHealthMax(180);
        necromancien.setHealthCurrent(180);
        necromancien.setManaMax(150);
        necromancien.setManaCurrent(150);
        necromancien.setPower(30);
        necromancien.setCrit(5);

        Voie voieViolence = new Voie();
        voieViolence.setNom("Voie de la Violence");
        violenceEffect = new ViolencePassiveEffect();
        voieViolence.setPassiveEffects(List.of(violenceEffect));
        necromancien.setVoie(voieViolence);

        // Sort 1: Débuff de résistance magique (Inspiration)
        debuffSpellNecro = new Spell();
        debuffSpellNecro.setNom("Malédiction de Faiblesse");
        debuffSpellNecro.setManaCost(15);
        debuffSpellNecro.setVoie(voieViolence);
        debuffSpellNecro.setCategory(SpellCategory.INSPIRATION);
        
        BuffDebuffEffect resDebuff = new BuffDebuffEffect();
        resDebuff.setStatAffected(StatType.RESISTANCE);
        resDebuff.setFlatValue(-15); // -15 de résistance magique
        resDebuff.setDuration(3);
        debuffSpellNecro.getEffects().add(resDebuff);

        // Sort 2: Poison (Expiration)
        poisonSpellNecro = new Spell();
        poisonSpellNecro.setNom("Nuage Toxique");
        poisonSpellNecro.setManaCost(25);
        poisonSpellNecro.setVoie(voieViolence);
        poisonSpellNecro.setCategory(SpellCategory.EXPIRATION);
        
        DamageOverTimeEffect dot = new DamageOverTimeEffect();
        dot.setFixedDamagePerTick(15);
        dot.setDamageType(DamageType.MAGIC);
        dot.setDuration(4);
        poisonSpellNecro.getEffects().add(dot);


        // --- SETUP BOSS ---
        boss = new Personnage();
        boss.setName("Golem de Cristal");
        boss.setTeamId("MONSTERS");
        boss.setHealthMax(2000);
        boss.setHealthCurrent(2000);
        boss.setResistance(25); // Haute résistance magique au début
        boss.setArmor(50);

        bossAttack = new Spell();
        bossAttack.setNom("Coup de Poing Tellurique");
        bossAttack.setManaCost(0);
        DamageFixedEffect dmgBoss = new DamageFixedEffect();
        dmgBoss.setDamageType(DamageType.PHYSIC);
        dmgBoss.setDamage(60);
        bossAttack.getEffects().add(dmgBoss);
    }

    @Test
    void simulateMagicCombat_5Turns() {
        System.out.println("=== DÉBUT DU COMBAT MAGIQUE ===");

        // ==========================================
        // TOUR 1
        // ==========================================
        System.out.println("\n--- TOUR 1 ---");
        triggerTurnStartForAll();

        // Le Nécro applique le débuff de résistance magique (Sort d'Inspiration)
        spellService.castSpell(debuffSpellNecro, necromancien, boss, null);
        
        // Le boss a maintenant -15 de résistance (25 - 15 = 10 de res active)
        assertThat(boss.hasDebuff()).isTrue();
        assertThat(boss.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.RESISTANCE);

        // Le Mage lance son sort complexe.
        // HP boss: 2000. Dégâts théoriques de base avant réduc: 
        // 20 (base) + 10 (0.2 * 50 power) + 200 (0.1 * 2000 HP) = 230 dégâts bruts.
        // La résistance a été réduite par le Nécro juste avant, donc les dégâts seront très élevés !
        spellService.castSpell(ratioSpellMage, mage, boss, null);

        // Le boss attaque le mage
        spellService.castSpell(bossAttack, boss, mage, null);

        triggerTurnEndForAll();

        // ==========================================
        // TOUR 2
        // ==========================================
        System.out.println("\n--- TOUR 2 ---");
        triggerTurnStartForAll();

        // Le Nécro lance le sort de Poison (Sort d'Expiration)
        // Son passif Violence passe de l'Inspiration à l'Expiration, ce qui booste sa puissance flat
        spellService.castSpell(poisonSpellNecro, necromancien, boss, null);

        // On vérifie que le boss a bien les dots actifs (3 du ratioSpellMage + 1 poison)
        assertThat(boss.getActiveDamageOverTimeEffects()).hasSize(4);

        // Mage relance l'Éclat Stellaire. Les dégâts sur HP actuels seront un peu plus faibles car le boss a perdu de la vie.
        spellService.castSpell(ratioSpellMage, mage, boss, null);

        // Boss attaque Nécro
        spellService.castSpell(bossAttack, boss, necromancien, null);

        triggerTurnEndForAll();

        // ==========================================
        // TOUR 3
        // ==========================================
        System.out.println("\n--- TOUR 3 ---");
        triggerTurnStartForAll(); // <-- Ici le Poison fait ses premiers dégâts automatiques au début du tour !
        
        // Mage relance le sort
        spellService.castSpell(ratioSpellMage, mage, boss, null);

        // Nécro relance une malédiction (Inspiration)
        spellService.castSpell(debuffSpellNecro, necromancien, boss, null);

        // Boss attaque Mage
        spellService.castSpell(bossAttack, boss, mage, null);

        triggerTurnEndForAll();

        // ==========================================
        // TOUR 4
        // ==========================================
        System.out.println("\n--- TOUR 4 ---");
        triggerTurnStartForAll(); // Poison tick
        
        spellService.castSpell(ratioSpellMage, mage, boss, null);
        spellService.castSpell(bossAttack, boss, necromancien, null);
        
        triggerTurnEndForAll();

        // ==========================================
        // TOUR 5
        // ==========================================
        System.out.println("\n--- TOUR 5 ---");
        triggerTurnStartForAll(); // Poison tick

        spellService.castSpell(ratioSpellMage, mage, boss, null);
        
        triggerTurnEndForAll();

        System.out.println("=== FIN DU COMBAT ===");

        System.out.println("Boss HP restants : " + boss.getHealthCurrent());
        System.out.println("Aria HP : " + mage.getHealthCurrent() + " | Mana : " + mage.getManaCurrent());
        System.out.println("Malzahar HP : " + necromancien.getHealthCurrent() + " | Mana : " + necromancien.getManaCurrent());

        // Le boss a pris énormément de dégâts combinés du ratio spell + des dots + des débuffs
        assertThat(boss.getHealthCurrent()).isLessThan(2000);
        
        // Les mages ont dépensé pas mal de mana
        assertThat(mage.getManaCurrent()).isEqualTo(200 - (30 * 5)); // 50 de mana restants
    }

    private void triggerTurnStartForAll() {
        mage.startTurn();
        necromancien.startTurn();
        boss.startTurn();
        if (mage.getVoie() != null) mage.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(mage));
        if (necromancien.getVoie() != null) necromancien.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(necromancien));
        if (boss.getVoie() != null) boss.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(boss));

        if (mage.getSpiritualite() != null && mage.getSpiritualite().getPassiveEffects() != null) {
            mage.getSpiritualite().getPassiveEffects().forEach(p -> p.onTurnStart(mage));
        }
        if (necromancien.getSpiritualite() != null && necromancien.getSpiritualite().getPassiveEffects() != null) {
            necromancien.getSpiritualite().getPassiveEffects().forEach(p -> p.onTurnStart(necromancien));
        }
        if (boss.getSpiritualite() != null && boss.getSpiritualite().getPassiveEffects() != null) {
            boss.getSpiritualite().getPassiveEffects().forEach(p -> p.onTurnStart(boss));
        }
    }

    private void triggerTurnEndForAll() {
        mage.updateBuffs();
        mage.updateHealOverTimeEffects();
        mage.updateDamageOverTimeEffects();

        necromancien.updateBuffs();
        necromancien.updateHealOverTimeEffects();
        necromancien.updateDamageOverTimeEffects();

        boss.updateBuffs();
        boss.updateHealOverTimeEffects();
        boss.updateDamageOverTimeEffects();
    }

    @Test
    void testShieldEffect() {
        System.out.println("=== DEBUT TEST SHIELD ===");
        Personnage caster = new Personnage();
        caster.setName("Protecteur");
        caster.setPower(50);

        Personnage target = new Personnage();
        target.setName("Cible Protegee");
        target.setHealthMax(200);
        target.setHealthCurrent(200);

        generation.grimoire.entity.spell.type.effect.ShieldEffect shieldEffect = new generation.grimoire.entity.spell.type.effect.ShieldEffect();
        shieldEffect.setFixedValue(50);
        shieldEffect.setPercentage(0.20);
        shieldEffect.setShieldSource(Source.CASTER_POWER);
        shieldEffect.setDuration(2);

        // Appliquer le bouclier
        shieldEffect.apply(caster, target);

        // Attendu: 50 + (50 * 0.20) = 60 d'absorption
        assertThat(target.getTotalShield()).isEqualTo(60);
        assertThat(target.getActiveShields()).hasSize(1);

        // Subir 40 dégâts physiques
        // Attendu: absorbé par le bouclier, PV intacts (200), bouclier restant à 20
        target.takeDamage(40, DamageType.PHYSIC);
        assertThat(target.getHealthCurrent()).isEqualTo(200);
        assertThat(target.getTotalShield()).isEqualTo(20);

        // Subir 30 dégâts magiques
        // Attendu: 20 absorbés, 10 subis, PV à 190, bouclier détruit (0)
        target.takeDamage(30, DamageType.MAGIC);
        assertThat(target.getHealthCurrent()).isEqualTo(190);
        assertThat(target.getTotalShield()).isEqualTo(0);

        // Relancer un bouclier pour tester la durée
        shieldEffect.apply(caster, target);
        assertThat(target.getTotalShield()).isEqualTo(60);

        // Passer un tour (décrémenter la durée)
        target.updateBuffs(); // Appelle updateShields() en interne
        assertThat(target.getTotalShield()).isEqualTo(60);

        // Passer le second tour (durée expire)
        target.updateBuffs();
        assertThat(target.getTotalShield()).isEqualTo(0);
        assertThat(target.getActiveShields()).isEmpty();

        System.out.println("=== FIN TEST SHIELD SUCCESS ===");
    }

    @Test
    void testShieldCumulativeDecay() {
        System.out.println("=== DEBUT TEST SHIELD CUMULATIVE DECAY ===");
        Personnage target = new Personnage();
        target.setName("Cible Bouclier");
        target.setHealthMax(200);
        target.setHealthCurrent(200);

        // T1: Lance un shield de 10 pendant 2 tours
        target.addShield(10, 2, "Bouclier A");
        assertThat(target.getTotalShield()).isEqualTo(10);
        assertThat(target.getActiveShields()).hasSize(1);

        // Fin T1: Décompte (Bouclier A passe à 1 tour restant)
        target.updateBuffs();
        assertThat(target.getTotalShield()).isEqualTo(10);

        // T2: Lance un second shield de 10 pendant 2 tours
        target.addShield(10, 2, "Bouclier B");
        // Les deux boucliers cumulés font 20 d'absorption
        assertThat(target.getTotalShield()).isEqualTo(20);
        assertThat(target.getActiveShields()).hasSize(2);

        // Fin T2: Décompte (Bouclier A passe à 0 -> expire et retiré, Bouclier B passe à 1 tour restant)
        target.updateBuffs();
        
        // T3: Il ne reste plus que le Bouclier B (10 shield)
        assertThat(target.getTotalShield()).isEqualTo(10);
        assertThat(target.getActiveShields()).hasSize(1);
        assertThat(target.getActiveShields().get(0).getSourceName()).isEqualTo("Bouclier B");

        // Fin T3: Décompte (Bouclier B passe à 0 -> expire et retiré)
        target.updateBuffs();

        // T4: Plus aucun bouclier actif
        assertThat(target.getTotalShield()).isEqualTo(0);
        assertThat(target.getActiveShields()).isEmpty();

        System.out.println("=== FIN TEST SHIELD CUMULATIVE DECAY SUCCESS ===");
    }

    @Test
    void testHealAndShieldReceivedModifiers() {
        System.out.println("=== DEBUT TEST HEAL AND SHIELD RECEIVED MODIFIERS ===");
        Personnage target = new Personnage();
        target.setName("Cible Modifiers");
        target.setHealthMax(200);
        target.setHealthCurrent(100);

        // --- TEST 1 : SOIN REÇU (HEAL_RECEIVED) ---
        // 1. Soin de base : 50. Attendu : 50. PV à 150.
        target.heal(50);
        assertThat(target.getHealthCurrent()).isEqualTo(150);

        // 2. Appliquer un buff boost de soin reçu de +20% (multiplier 1.20)
        BuffDebuffEffect boostHeal = new BuffDebuffEffect();
        boostHeal.setStatAffected(StatType.HEAL_RECEIVED);
        boostHeal.setModifier(1.20);
        boostHeal.setDuration(3);
        target.applyBuff(boostHeal, 1.20);

        // Soin de base : 50. Attendu : 50 * 1.20 = 60. PV passe de 150 à 160.
        target.setHealthCurrent(100);
        target.heal(50);
        assertThat(target.getHealthCurrent()).isEqualTo(160);

        // 3. Appliquer un débuff malus de soin reçu de -30% (multiplier 0.70)
        target.getActiveBuffs().clear(); // reset pour isoler le malus

        BuffDebuffEffect malusHeal = new BuffDebuffEffect();
        malusHeal.setStatAffected(StatType.HEAL_RECEIVED);
        malusHeal.setModifier(0.70);
        malusHeal.setDuration(3);
        target.applyBuff(malusHeal, 0.70);

        // Soin de base : 100. Attendu : 100 * 0.70 = 70. PV passe de 100 à 170.
        target.setHealthCurrent(100);
        target.heal(100);
        assertThat(target.getHealthCurrent()).isEqualTo(170);


        // --- TEST 2 : BOUCLIER REÇU (SHIELD_RECEIVED) ---
        // Reset buffs
        target.getActiveBuffs().clear();

        // 1. Bouclier de base : 100. Attendu : 100.
        target.addShield(100, 2, "Base Shield");
        assertThat(target.getTotalShield()).isEqualTo(100);
        target.getActiveShields().clear();

        // 2. Appliquer un buff boost de bouclier reçu de +30% (multiplier 1.30)
        BuffDebuffEffect boostShield = new BuffDebuffEffect();
        boostShield.setStatAffected(StatType.SHIELD_RECEIVED);
        boostShield.setModifier(1.30);
        boostShield.setDuration(3);
        target.applyBuff(boostShield, 1.30);

        // Bouclier de base : 100. Attendu : 100 * 1.30 = 130.
        target.addShield(100, 2, "Boosted Shield");
        assertThat(target.getTotalShield()).isEqualTo(130);
        target.getActiveShields().clear();
        target.getActiveBuffs().clear();

        // 3. Appliquer un débuff malus de bouclier reçu de -40% (multiplier 0.60)
        BuffDebuffEffect malusShield = new BuffDebuffEffect();
        malusShield.setStatAffected(StatType.SHIELD_RECEIVED);
        malusShield.setModifier(0.60);
        malusShield.setDuration(3);
        target.applyBuff(malusShield, 0.60);

        // Bouclier de base : 100. Attendu : 100 * 0.60 = 60.
        target.addShield(100, 2, "Malused Shield");
        assertThat(target.getTotalShield()).isEqualTo(60);

        System.out.println("=== FIN TEST HEAL AND SHIELD RECEIVED MODIFIERS SUCCESS ===");
    }

    @Test
    void testHealAndShieldGivenModifiers() {
        Personnage caster = new Personnage();
        caster.setName("Lanceur Modifiers");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);

        Personnage target = new Personnage();
        target.setName("Cible Modifiers");
        target.setHealthMax(200);
        target.setHealthCurrent(100);

        // --- TEST 1 : SOIN DONNÉ (HEAL_GIVEN) ---
        // 1. Soin de base fixe : 50. Attendu : 50. PV de la cible passe à 150.
        HealFixedEffect healEffect = new HealFixedEffect();
        healEffect.setHealAmount(50);
        healEffect.apply(caster, target);
        assertThat(target.getHealthCurrent()).isEqualTo(150);

        // 2. Buff de +20% Soin Donné sur le Caster (multiplier 1.20)
        BuffDebuffEffect boostHealGiven = new BuffDebuffEffect();
        boostHealGiven.setStatAffected(StatType.HEAL_GIVEN);
        boostHealGiven.setModifier(1.20);
        boostHealGiven.setDuration(3);
        caster.applyBuff(boostHealGiven, 1.20);

        // Soin de base : 50. Attendu : 50 * 1.20 = 60. PV passe de 100 à 160.
        target.setHealthCurrent(100);
        healEffect.apply(caster, target);
        assertThat(target.getHealthCurrent()).isEqualTo(160);

        // 3. Débuff de -30% Soin Donné sur le Caster (multiplier 0.70)
        caster.getActiveBuffs().clear();
        BuffDebuffEffect malusHealGiven = new BuffDebuffEffect();
        malusHealGiven.setStatAffected(StatType.HEAL_GIVEN);
        malusHealGiven.setModifier(0.70);
        malusHealGiven.setDuration(3);
        caster.applyBuff(malusHealGiven, 0.70);

        // Soin de base : 100. Attendu : 100 * 0.70 = 70. PV passe de 100 à 170.
        HealFixedEffect bigHeal = new HealFixedEffect();
        bigHeal.setHealAmount(100);
        target.setHealthCurrent(100);
        bigHeal.apply(caster, target);
        assertThat(target.getHealthCurrent()).isEqualTo(170);


        // --- TEST 2 : BOUCLIER DONNÉ (SHIELD_GIVEN) ---
        caster.getActiveBuffs().clear();
        target.getActiveShields().clear();

        // 1. Bouclier de base : 100. Attendu : 100.
        ShieldEffect shieldEffect = new ShieldEffect();
        shieldEffect.setFixedValue(100);
        shieldEffect.setDuration(2);
        shieldEffect.apply(caster, target);
        assertThat(target.getTotalShield()).isEqualTo(100);

        // 2. Buff de +30% Bouclier Donné sur le Caster (multiplier 1.30)
        target.getActiveShields().clear();
        BuffDebuffEffect boostShieldGiven = new BuffDebuffEffect();
        boostShieldGiven.setStatAffected(StatType.SHIELD_GIVEN);
        boostShieldGiven.setModifier(1.30);
        boostShieldGiven.setDuration(3);
        caster.applyBuff(boostShieldGiven, 1.30);

        shieldEffect.apply(caster, target);
        assertThat(target.getTotalShield()).isEqualTo(130);

        // 3. Débuff de -40% Bouclier Donné sur le Caster (multiplier 0.60)
        caster.getActiveBuffs().clear();
        target.getActiveShields().clear();
        BuffDebuffEffect malusShieldGiven = new BuffDebuffEffect();
        malusShieldGiven.setStatAffected(StatType.SHIELD_GIVEN);
        malusShieldGiven.setModifier(0.60);
        malusShieldGiven.setDuration(3);
        caster.applyBuff(malusShieldGiven, 0.60);

        shieldEffect.apply(caster, target);
        assertThat(target.getTotalShield()).isEqualTo(60);

        System.out.println("=== FIN TEST HEAL AND SHIELD GIVEN MODIFIERS SUCCESS ===");
    }
}
