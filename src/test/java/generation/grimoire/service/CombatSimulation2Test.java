package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.DamagePercentageEffect;
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
        if (mage.getVoie() != null) mage.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(mage));
        if (necromancien.getVoie() != null) necromancien.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(necromancien));
        if (boss.getVoie() != null) boss.getVoie().getPassiveEffects().forEach(p -> p.onTurnStart(boss));
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
}
