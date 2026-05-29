package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.spiritualite.passif.specific.EspritPassiveEffect;
import generation.grimoire.entity.spiritualite.passif.specific.KarmaPassiveEffect;
import generation.grimoire.entity.spiritualite.passif.specific.TenebrePassiveEffect;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect;
import generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCostPaidEvent;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class SpellIntegrationTest {

    private SpellService spellService;
    private SpellRepository spellRepository;
    private PersonnageService personnageService;
    private PassiveDispatcher passiveDispatcher;

    private Personnage hero;
    private Personnage enemy;

    @BeforeEach
    void setUp() {
        spellRepository = Mockito.mock(SpellRepository.class);
        personnageService = Mockito.mock(PersonnageService.class);
        passiveDispatcher = new PassiveDispatcher();
        spellService = new SpellService(spellRepository, personnageService, passiveDispatcher);

        hero = new Personnage();
        hero.setName("Héros");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(50);
        hero.setManaCurrent(50);
        hero.setPower(10);
        hero.setArmor(5);
        hero.setResistance(5);

        enemy = new Personnage();
        enemy.setName("Monstre");
        enemy.setHealthMax(200);
        enemy.setHealthCurrent(200);
        enemy.setArmor(10);
        enemy.setResistance(10);
    }

    @Test
    void testComplexSpell_DamageAndDebuff() {
        // 1. Création de la Voie et de son Passif
        Voie voieDestruction = new Voie();
        voieDestruction.setNom("Voie de la Destruction");

        generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect destructionEffect = new generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect();
        voieDestruction.setPassiveEffects(List.of(destructionEffect));
        hero.setVoie(voieDestruction);

        // 2. Création d'un sort complexe "Frappe Écrasante" lié à cette Voie
        Spell crushSpell = new Spell();
        crushSpell.setNom("Frappe Écrasante");
        crushSpell.setManaCost(15);
        crushSpell.setHeatGenerated(20); // Génère 20 de Chaleur !
        crushSpell.setVoie(voieDestruction);

        // Effet 1 : Dégâts physiques fixes
        DamageFixedEffect damageEffect = new DamageFixedEffect();
        damageEffect.setDamageType(DamageType.PHYSIC);
        damageEffect.setDamage(30);
        crushSpell.getEffects().add(damageEffect);

        // Effet 2 : Débuff d'armure (-5)
        BuffDebuffEffect armorBreak = new BuffDebuffEffect();
        armorBreak.setStatAffected(StatType.ARMURE);
        armorBreak.setFlatValue(-5);
        armorBreak.setDuration(2);
        crushSpell.getEffects().add(armorBreak);

        // 2. Lancer le sort
        spellService.castSpell(crushSpell, hero, enemy, null);

        // 3. Vérifications
        // Coût en mana : 50 - 15 = 35
        assertThat(hero.getManaCurrent()).isEqualTo(35);

        // Dégâts calculés :
        // Base = 30 + (0.5 * 10 puissance) = 35 dégâts bruts
        // Le monstre a 10 d'armure (avant que le débuff ne prenne effet si l'ordre
        // compte,
        // l'effet de dégât est appliqué en premier car inséré en premier)
        // Donc Dégâts finaux = 35. L'armure de l'ennemi va réduire ça.
        // On vérifie que la vie de l'ennemi a baissé
        assertThat(enemy.getHealthCurrent()).isLessThan(200);

        // Débuff appliqué
        assertThat(enemy.getActiveBuffs()).hasSize(1);
        assertThat(enemy.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(enemy.getActiveBuffs().get(0).getFlatValue()).isEqualTo(-5);
        assertThat(enemy.hasDebuff()).isTrue();

        // Passif de Destruction (Chaleur)
        // Le sort génère 20 heat, on vérifie que le state est à 20
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(20);
    }

    @Test
    void testSpellWithVoiePassive_Trahison() {
        // Ajout de la Voie de Trahison au héros
        Voie voieTrahison = new Voie();
        TrahisonPassiveEffect trahisonEffect = new TrahisonPassiveEffect();
        voieTrahison.setPassiveEffects(List.of(trahisonEffect));
        hero.setVoie(voieTrahison);

        // Sort basique lié à la Voie de Trahison
        Spell pokeSpell = new Spell();
        pokeSpell.setNom("Pichenette");
        pokeSpell.setManaCost(5);
        pokeSpell.setVoie(voieTrahison);

        DamageFixedEffect dmg = new DamageFixedEffect();
        dmg.setDamageType(DamageType.PHYSIC);
        dmg.setDamage(20);
        pokeSpell.getEffects().add(dmg);

        // On lance le sort
        spellService.castSpell(pokeSpell, hero, enemy, null);

        // Comme TrahisonPassiveEffect ne réagit pas sur onSpellCast, on vérifie juste
        // que rien n'a crashé
        assertThat(hero.getManaCurrent()).isEqualTo(45);
        assertThat(enemy.getHealthCurrent()).isLessThan(200);

        // On déclenche un hit physique manuel pour tester l'intégration
        trahisonEffect.onPhysicalHit(hero, enemy, 50);
        assertThat(hero.getPassiveState("trahison_used_this_turn", 0)).isEqualTo(1);
    }

    @Test
    void testSpellWithVoiePassive_Surete() {
        // Voie de Sûreté
        Voie voieSurete = new Voie();
        voieSurete.setNom("Voie de la Sûreté");
        generation.grimoire.entity.voie.passif.specific.SuretePassiveEffect sureteEffect = new generation.grimoire.entity.voie.passif.specific.SuretePassiveEffect();
        voieSurete.setPassiveEffects(List.of(sureteEffect));
        hero.setVoie(voieSurete);

        // Sort de Sûreté
        Spell safeSpell = new Spell();
        safeSpell.setNom("Esprit Protectrice");
        safeSpell.setManaCost(10);
        safeSpell.setVoie(voieSurete);

        // Lance le sort 5 fois (5 * 20 points = 100 points -> déclenche le buff crit)
        for (int i = 0; i < 5; i++) {
            hero.startTurn();
            spellService.castSpell(safeSpell, hero, enemy, null);
        }

        // Vérifications
        assertThat(hero.getManaCurrent()).isEqualTo(0); // 50 - (5*10) = 0
        assertThat(hero.getPassiveState("surete_points", -1)).isEqualTo(0); // Les points ont reset

        // Un buff de critique a dû être appliqué
        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.CRIT);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(15);
    }

    @Test
    void testSpellWithVoiePassive_Raison() {
        // Voie de la Raison
        Voie voieRaison = new Voie();
        voieRaison.setNom("Voie de la Raison");
        generation.grimoire.entity.voie.passif.specific.RaisonPassiveEffect raisonEffect = new generation.grimoire.entity.voie.passif.specific.RaisonPassiveEffect();
        voieRaison.setPassiveEffects(List.of(raisonEffect));
        hero.setVoie(voieRaison);

        Spell reasonSpell = new Spell();
        reasonSpell.setNom("Calcul Mental");
        reasonSpell.setManaCost(5);
        reasonSpell.setVoie(voieRaison);

        // Lance 3 sorts
        for (int i = 0; i < 3; i++) {
            hero.startTurn();
            spellService.castSpell(reasonSpell, hero, enemy, null);
        }

        // Le passif flag qu'un sort a été lancé
        assertThat(hero.getPassiveState("raison_cast_this_turn", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_derive_CRIT_from_SPEED", 0)).isEqualTo(2);

        // Au prochain tour, le héros gagne 1 stack de vitesse
        raisonEffect.onTurnStart(hero);
        assertThat(hero.getPassiveState("raison_speed_stacks", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("stat_flat_SPEED", 0)).isEqualTo(1);
    }

    @Test
    void testSpellWithVoiePassive_Creation() {
        Voie voieCreation = new Voie();
        voieCreation.setNom("Voie de la Création");
        generation.grimoire.entity.voie.passif.specific.CreationPassiveEffect creationEffect = new generation.grimoire.entity.voie.passif.specific.CreationPassiveEffect();
        voieCreation.setPassiveEffects(List.of(creationEffect));
        hero.setVoie(voieCreation);

        // --- Cas 1 : Sort instantané (action = 1) -> Gratuit ! ---
        Spell instantSpell = new Spell();
        instantSpell.setNom("Lancer Rapide");
        instantSpell.setManaCost(20);
        instantSpell.setAction(1);
        instantSpell.setCastingType(generation.grimoire.enumeration.SpellCastingType.INSTANTANE);
        instantSpell.setVoie(voieCreation);

        int manaBefore = hero.getManaCurrent();
        spellService.castSpell(instantSpell, hero, enemy, null);
        // Doit avoir coûté 0 mana car premier sort du tour
        assertThat(hero.getManaCurrent()).isEqualTo(manaBefore);
        // A consommé l'effet passif de création pour ce tour
        assertThat(hero.getPassiveState("creation_spells_cast", 0)).isEqualTo(1);

        // Reset du tour et du passif
        hero.startTurn();
        creationEffect.onTurnStart(hero);
        assertThat(hero.getPassiveState("creation_spells_cast", 0)).isEqualTo(0);

        // --- Cas 2 : Sort banal (action = 2) -> Lancé comme un instantané ---
        Spell banalSpell = new Spell();
        banalSpell.setNom("Projectile Magique");
        banalSpell.setManaCost(15);
        banalSpell.setAction(2);
        banalSpell.setCastingType(generation.grimoire.enumeration.SpellCastingType.BANAL);
        banalSpell.setVoie(voieCreation);

        spellService.castSpell(banalSpell, hero, enemy, null);
        // Doit coûter du mana car ce n'est pas un instantané gratuit
        assertThat(hero.getManaCurrent()).isEqualTo(manaBefore - 15);
        // Mais doit être marqué comme instantané du tour, pas comme sort banal !
        assertThat(hero.isInstantSpellCastThisTurn()).isTrue();
        assertThat(hero.isBanalSpellCastThisTurn()).isFalse();

        // Reset
        hero.startTurn();
        creationEffect.onTurnStart(hero);
        hero.setManaCurrent(manaBefore);

        // --- Cas 3 : Sort canalisé (action >= 3) -> Donne un bouclier = mana dépensé
        // ---
        Spell channeledSpell = new Spell();
        channeledSpell.setNom("Tempête Canalisée");
        channeledSpell.setManaCost(25);
        channeledSpell.setAction(3);
        channeledSpell.setCastingType(generation.grimoire.enumeration.SpellCastingType.CANALISE);
        channeledSpell.setChannelingDuration(3);
        channeledSpell.setVoie(voieCreation);

        spellService.castSpell(channeledSpell, hero, enemy, null);
        // Doit coûter du mana
        assertThat(hero.getManaCurrent()).isEqualTo(manaBefore - 25);
        // Doit avoir généré un bouclier égal au coût en mana dépensé (25) pour la durée
        // du sort (3 tours)
        assertThat(hero.getTotalShield()).isEqualTo(25);
    }

    @Test
    void testSpellWithVoiePassive_Violence() {
        Voie voieViolence = new Voie();
        voieViolence.setNom("Voie de la Violence");
        generation.grimoire.entity.voie.passif.specific.ViolencePassiveEffect violenceEffect = new generation.grimoire.entity.voie.passif.specific.ViolencePassiveEffect();
        voieViolence.setPassiveEffects(List.of(violenceEffect));
        hero.setVoie(voieViolence);

        Spell hitSpell = new Spell();
        hitSpell.setNom("Coup Brutal");
        hitSpell.setManaCost(15);
        hitSpell.setVoie(voieViolence);
        hitSpell.setCategory(generation.grimoire.enumeration.SpellCategory.EXPIRATION); // Le sort doit être
                                                                                        // d'Expiration

        spellService.castSpell(hitSpell, hero, enemy, null);

        // Inspiration reset, expiration ++
        assertThat(hero.getPassiveState("violence_inspiration", -1)).isEqualTo(0);
        assertThat(hero.getPassiveState("violence_expiration", 0)).isEqualTo(1);
    }

    @Test
    void testSpellWithVoiePassive_Consolidation() {
        Voie voieConsolidation = new Voie();
        voieConsolidation.setNom("Voie de la Consolidation");
        generation.grimoire.entity.voie.passif.specific.ConsolidationPassiveEffect consoEffect = new generation.grimoire.entity.voie.passif.specific.ConsolidationPassiveEffect();
        consoEffect.setBonusLevel(2); // Niveau investi
        voieConsolidation.setPassiveEffects(List.of(consoEffect));
        hero.setVoie(voieConsolidation);

        // Armor de base du héros : 5
        // 5 * (0.05 * 2) = 0.5 (arrondi à 0 car entier).
        // Mettons l'armure du héros à 20 pour que le buff soit de 20 * 0.10 = 2.
        hero.setArmor(20);

        Spell buffSpell = new Spell();
        buffSpell.setNom("Mur de Pierre");
        buffSpell.setManaCost(10);
        buffSpell.setVoie(voieConsolidation);

        spellService.castSpell(buffSpell, hero, enemy, null);

        // La consolidation ajoute de l'armure en début de tour
        consoEffect.onTurnStart(hero);

        assertThat(hero.getActiveBuffs()).hasSize(1);
        assertThat(hero.getActiveBuffs().get(0).getStatAffected()).isEqualTo(StatType.ARMURE);
        assertThat(hero.getActiveBuffs().get(0).getFlatValue()).isEqualTo(2); // +2 armure
    }

    @Test
    void testSpiritualiteEsprit() {
        Spiritualite esprit = new Spiritualite();
        esprit.setNom("Esprit");
        EspritPassiveEffect espritEffect = new EspritPassiveEffect();
        esprit.setPassiveEffects(List.of(espritEffect));

        Spell lightSpell = new Spell();
        lightSpell.setNom("Rayon Sacré");
        lightSpell.setManaCost(5);
        lightSpell.setSpiritualite(esprit);

        // Cas 1 : HP < 20% et Mana < 20% -> Lancement impossible
        hero.setHealthCurrent(10); // 10/100 = 10%
        hero.setManaCurrent(5); // 5/50 = 10%

        spellService.castSpell(lightSpell, hero, enemy, null);
        assertThat(hero.getManaCurrent()).isEqualTo(5); // Non consommé

        // Cas 2 : HP >= 20% -> Lancement réussi
        hero.setHealthCurrent(30);
        hero.startTurn();
        spellService.castSpell(lightSpell, hero, enemy, null);
        assertThat(hero.getManaCurrent()).isEqualTo(0); // 5 - 5 = 0
    }

    @Test
    void testSpiritualiteTenebres() {
        Spiritualite tenebres = new Spiritualite();
        tenebres.setNom("Ténèbres");
        TenebrePassiveEffect tenebresEffect = new TenebrePassiveEffect();
        tenebres.setPassiveEffects(List.of(tenebresEffect));

        Spell darkSpell = new Spell();
        darkSpell.setNom("Orbe Noir");
        darkSpell.setManaCost(10);
        darkSpell.setSpiritualite(tenebres);

        // Cas 1 : HP > 80% et Mana > 80% -> Lancement impossible
        hero.setHealthCurrent(90); // 90%
        hero.setManaCurrent(45); // 90%

        spellService.castSpell(darkSpell, hero, enemy, null);
        assertThat(hero.getManaCurrent()).isEqualTo(45); // Non consommé

        // Cas 2 : HP <= 80% -> Lancement réussi
        hero.setHealthCurrent(70);
        hero.startTurn();
        spellService.castSpell(darkSpell, hero, enemy, null);
        assertThat(hero.getManaCurrent()).isEqualTo(35); // 45 - 10 = 35
    }

    @Test
    void testSpiritualiteKarma() {
        Spiritualite karma = new Spiritualite();
        karma.setNom("Karma");
        KarmaPassiveEffect karmaEffect = new KarmaPassiveEffect();
        karma.setPassiveEffects(List.of(karmaEffect));

        Spell karmaSpell = new Spell();
        karmaSpell.setNom("Onde Karmique");
        karmaSpell.setManaCost(5);
        karmaSpell.setSpiritualite(karma);

        // Le Karma n'a pas de restriction, le sort se lance
        hero.setManaCurrent(10);
        spellService.castSpell(karmaSpell, hero, enemy, null);
        assertThat(hero.getManaCurrent()).isEqualTo(5);
    }

    @Test
    void testSpellWithBothVoieAndSpiritualite() {
        // Configuration de la Voie (ex: Trahison)
        Voie voieTrahison = new Voie();
        voieTrahison.setNom("Voie de Trahison");
        generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect trahisonEffect = new generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect();
        voieTrahison.setPassiveEffects(List.of(trahisonEffect));
        hero.setVoie(voieTrahison);

        // Configuration de la Spiritualité (ex: Esprit)
        Spiritualite esprit = new Spiritualite();
        esprit.setNom("Esprit");
        EspritPassiveEffect espritEffect = new EspritPassiveEffect();
        esprit.setPassiveEffects(List.of(espritEffect));

        // Création d'un sort possédant à la fois la Voie et la Spiritualité
        Spell hybridSpell = new Spell();
        hybridSpell.setNom("Lame de l'Aube");
        hybridSpell.setManaCost(10);
        hybridSpell.setVoie(voieTrahison);
        hybridSpell.setSpiritualite(esprit);

        // Les prérequis de Esprit exigent >= 20% HP ou >= 20% Mana
        hero.setHealthCurrent(100); // 100% -> condition remplie
        hero.setManaCurrent(50);

        spellService.castSpell(hybridSpell, hero, enemy, null);

        // Le sort s'est lancé avec succès, déduisant son coût
        assertThat(hero.getManaCurrent()).isEqualTo(40);
    }

    @Test
    void testCustomTargetExpressionMultiTarget() {
        Spell multiTargetSpell = new Spell();
        multiTargetSpell.setNom("Lumière Partagée");
        multiTargetSpell.setManaCost(5);

        // Un effet de soin configuré pour toucher le Lanceur ET ses alliés (ALL_ALLIES)
        generation.grimoire.entity.spell.type.effect.HealFixedEffect healEffect = new generation.grimoire.entity.spell.type.effect.HealFixedEffect();
        healEffect.setHealAmount(15);
        healEffect.setEffectTarget(generation.grimoire.enumeration.EffectTarget.ALL_ALLIES);
        multiTargetSpell.addEffect(healEffect);

        hero.setHealthCurrent(50); // 50/100
        hero.setManaCurrent(10);

        // Au lancement, l'effet s'applique concrètement sur le Lanceur ET sur un allié
        // simulé
        spellService.castSpell(multiTargetSpell, hero, enemy, null);

        // On vérifie que le lanceur a bien reçu les soins (50 + 15 = 65)
        assertThat(hero.getHealthCurrent()).isEqualTo(65);
    }

    @Test
    void testSandboxScenario_HeatOverTimeAndNextTurnCast() {
        Voie voieDestruction = new Voie();
        voieDestruction.setNom("Voie de la Destruction");
        generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect destructionEffect = new generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect();
        voieDestruction.setPassiveEffects(List.of(destructionEffect));
        hero.setVoie(voieDestruction);

        // Spell A: Heat Over Time Effect
        Spell spellA = new Spell();
        spellA.setNom("Spell A");
        spellA.setManaCost(10);
        spellA.setVoie(voieDestruction);

        generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect heatOt = new generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect();
        heatOt.setFixedValue(10);
        heatOt.setPercentage(0.05);
        heatOt.setDuration(2);
        heatOt.setSource(Source.TARGET_HEALTH_MAX);
        heatOt.setEffectTarget(generation.grimoire.enumeration.EffectTarget.CASTER);
        spellA.addEffect(heatOt);

        // Tour 1: Cast Spell A
        spellService.castSpell(spellA, hero, enemy, null);
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(0); // Applique le Over Time (qui ne tick
                                                                              // qu'au début du tour suivant)

        // Fin Tour 1 / Début Tour 2
        hero.startTurn();
        enemy.startTurn();
        hero.updateHeatOverTimeEffects();
        enemy.updateHeatOverTimeEffects();
        // Le tick s'applique: fixed 10 + 5% of target (hero) health (100 * 0.05 = 5) =
        // 15 heat.
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(15);

        // Tour 2: Cast Spell B (normal or generates heat, e.g. flat value heat)
        Spell spellB = new Spell();
        spellB.setNom("Spell B");
        spellB.setManaCost(10);
        spellB.setVoie(voieDestruction);

        generation.grimoire.entity.spell.type.effect.HeatFixedEffect heatFixed = new generation.grimoire.entity.spell.type.effect.HeatFixedEffect();
        heatFixed.setAmount(15);
        heatFixed.setEffectTarget(generation.grimoire.enumeration.EffectTarget.CASTER);
        spellB.addEffect(heatFixed);

        spellService.castSpell(spellB, hero, enemy, null);
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(30); // 15 + 15
    }

    @Test
    void testFreeSpellOn100Heat() {
        Voie voieDestruction = new Voie();
        voieDestruction.setNom("Voie de la Destruction");
        generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect destructionEffect = new generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect();
        voieDestruction.setPassiveEffects(List.of(destructionEffect));
        hero.setVoie(voieDestruction);

        // Spell A: Generates 60 heat
        Spell spellA = new Spell();
        spellA.setNom("Spell A");
        spellA.setManaCost(10);
        spellA.setVoie(voieDestruction);
        generation.grimoire.entity.spell.type.effect.HeatFixedEffect heatFixedA = new generation.grimoire.entity.spell.type.effect.HeatFixedEffect();
        heatFixedA.setAmount(60);
        heatFixedA.setEffectTarget(generation.grimoire.enumeration.EffectTarget.CASTER);
        spellA.addEffect(heatFixedA);

        // Cast Spell A first time -> 60 heat, cost paid (mana goes 50 -> 40)
        spellService.castSpell(spellA, hero, enemy, null);
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(60);
        assertThat(hero.getManaCurrent()).isEqualTo(40);

        hero.startTurn();

        // Cast Spell A second time -> 120 capped at 100 heat, cost paid (mana goes 40
        // -> 30)
        spellService.castSpell(spellA, hero, enemy, null);
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(100);
        assertThat(hero.getManaCurrent()).isEqualTo(30);

        hero.startTurn();

        // Cast Spell A third time -> Should be FREE (mana stays at 30) and heat resets
        // to 0 (then generates 60 heat)
        spellService.castSpell(spellA, hero, enemy, null);
        // Cost was free: mana remains 30
        assertThat(hero.getManaCurrent()).isEqualTo(30);
        // Heat was reset to 0, then Spell A execution added 60 heat -> 60 heat
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(60);
    }

    @Test
    void testHeatRemains100DuringCast() {
        Voie voieDestruction = new Voie();
        voieDestruction.setNom("Voie de la Destruction");

        DestructionPassiveEffect destructionEffect = new DestructionPassiveEffect();

        AtomicBoolean spellCostPaidEventSeen = new AtomicBoolean(false);
        AtomicInteger heatDuringCostPaid = new AtomicInteger(-1);
        AtomicInteger wasMaxDuringCostPaid = new AtomicInteger(-1);

        VoiePassiveEffect testAssertPassive = new VoiePassiveEffect() {

            @Override
            public void onEvent(GameEvent event) {
                if (event instanceof SpellCostPaidEvent) {
                    spellCostPaidEventSeen.set(true);

                    heatDuringCostPaid.set(
                            event.getSource().getPassiveState("destruction_heat", 0));

                    wasMaxDuringCostPaid.set(
                            event.getSource().getPassiveState("destruction_heat_was_max", 0));
                }
            }

            @Override
            public void onTurnStart(Personnage personnage) {
                // No-op for this test
            }

            @Override
            public void onSpellCast(Personnage caster, Spell spell) {
                // No-op for this test
            }
        };

        voieDestruction.setPassiveEffects(List.of(destructionEffect, testAssertPassive));
        hero.setVoie(voieDestruction);

        // Put hero at 100 heat before casting
        hero.setPassiveState("destruction_heat", 100);

        Spell spell = new Spell();
        spell.setNom("Test Spell");
        spell.setManaCost(10);
        spell.setVoie(voieDestruction);

        spellService.castSpell(spell, hero, enemy, null);

        // Verify the event really happened
        assertThat(spellCostPaidEventSeen.get()).isTrue();

        // During SpellCostPaidEvent, heat must still be 100
        assertThat(heatDuringCostPaid.get()).isEqualTo(100);
        assertThat(wasMaxDuringCostPaid.get()).isEqualTo(1);

        // After cast is finished, heat should be consumed/reset
        assertThat(hero.getPassiveState("destruction_heat", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("destruction_heat_was_max", 0)).isEqualTo(0);
    }
}
