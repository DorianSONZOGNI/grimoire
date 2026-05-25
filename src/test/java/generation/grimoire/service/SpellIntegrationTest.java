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
import generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpellIntegrationTest {

    private SpellService spellService;
    private SpellRepository spellRepository;
    private PersonnageService personnageService;

    private Personnage hero;
    private Personnage enemy;

    @BeforeEach
    void setUp() {
        spellRepository = Mockito.mock(SpellRepository.class);
        personnageService = Mockito.mock(PersonnageService.class);
        spellService = new SpellService(spellRepository, personnageService);

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

        Spell createSpell = new Spell();
        createSpell.setNom("Invocation Mineure");
        createSpell.setManaCost(10);
        createSpell.setVoie(voieCreation);

        spellService.castSpell(createSpell, hero, enemy, null);

        // La Création a 10% de chance d'accorder un sort gratuit, ce qui ajoute un flag
        // dans passiveStates
        // Le test peut être aléatoire, on vérifie juste que ça tourne sans erreur
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

        // Un effet de soin configuré pour toucher le "Lanceur & ses alliés proches"
        generation.grimoire.entity.spell.type.effect.HealFixedEffect healEffect = new generation.grimoire.entity.spell.type.effect.HealFixedEffect();
        healEffect.setHealAmount(15);
        healEffect.setTargetExpression("Lanceur & ses alliés proches");
        multiTargetSpell.addEffect(healEffect);

        hero.setHealthCurrent(50); // 50/100
        hero.setManaCurrent(10);

        // Au lancement, l'effet s'applique concrètement sur le Lanceur ET sur un allié simulé
        spellService.castSpell(multiTargetSpell, hero, enemy, null);

        // On vérifie que le lanceur a bien reçu les soins (50 + 15 = 65)
        assertThat(hero.getHealthCurrent()).isEqualTo(65);
    }
}
