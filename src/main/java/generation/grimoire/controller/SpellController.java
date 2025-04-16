package generation.grimoire.controller;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.*;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.service.SpellService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SpellController {

    private final SpellService spellService;

    public SpellController(SpellService spellService) {
        this.spellService = spellService;
    }

    @GetMapping("/createspell")
    public String saveSpellExample() {

        Spell spell = new Spell();
        spell.setNom("Explosion Arcanique");
        spell.setNiveau(3);

        DamagePercentageEffect effect = new DamagePercentageEffect();
        effect.setPercentage(0.10); // 10% des dégâts
        effect.setDamageSource(Source.CASTER_POWER); // Les dégâts se baseront sur la puissance du caster
        effect.setDamageType(DamageType.MAGIC); // Des dégâts magiques

        spell.addEffect(effect);

        spellService.saveSpell(spell);

        return "Sort lancé ! Consultez la console pour voir les résultats.";
    }

    @GetMapping("/poison")
    public String saveSpellPoison() {

        Spell spell = new Spell();
        spell.setNom("Poison Arcanique");
        spell.setNiveau(4);

        DamageOverTimeEffect effect = new DamageOverTimeEffect();
        effect.setDuration(2);
        effect.setDamageType(DamageType.MAGIC);
        effect.setPercentageDamagePerTick(0.1);

        spell.addEffect(effect);

        spellService.saveSpell(spell);

        return "Sort lancé ! Consultez la console pour voir les résultats.";
    }

    /**
     * Endpoint pour appliquer un buff consommable sur le prochain sort(s)
     * Exemple : pour la Voie de la Raison, buffer les 3 prochains sorts avec +50% de dégâts.
     */
    @GetMapping("/applyBuff")
    public void applyNextSpellBuff() {
        // Par exemple, le buff est consomé au bout d'un sorts et augmente les dégâts de 50%
        ConsumableSpellBuffDebuffEffect buff = new ConsumableSpellBuffDebuffEffect();
        buff.setModifier(0.5);
        buff.setRemainingApplications(1);


        ConsumableSpellBuffDebuffEffect buff2 = new ConsumableSpellBuffDebuffEffect();
        buff.setModifier(0.5);
        buff.setDuration(1);
    }

    /**
     * Endpoint pour lancer un sort de dégâts qui bénéficiera du buff consommable s'il est actif.
     * Le sort est instantané (1 action) et coûte 15 mana.
     * Dans cet exemple, le sort inflige des dégâts fixes de 100 points.
     */
    @GetMapping("/castSpell")
    public void castSpellExample() {

        // Création du sort "Boule de Feu"
        Spell spell = new Spell();
        spell.setNom("Boule de Feu");
        spell.setNiveau(3);
        spell.setManaCost(15);
        spell.setAction(1);

        // Ajout d'un effet de dégâts fixes qui pourra être amplifié par le buff consommable
        DamageFixedEffect damageEffect = new DamageFixedEffect();
        damageEffect.setDamage(100);
        spell.addEffect(damageEffect);

    }

    @GetMapping("/BuffSystem")
    public void testCombatBuffSystem2() {

        Personnage mage = new Personnage();
        mage.setName("Mage Rouge");
        mage.setHealthMax(500);
        mage.setHealthCurrent(500);
        mage.setManaCurrent(100);
        mage.setManaMax(100);

        Personnage moine = new Personnage();
        moine.setName("Moine de Jade");
        moine.setHealthMax(500);
        moine.setHealthCurrent(500);
        moine.setManaCurrent(100);
        moine.setManaMax(100);
        moine.setResistance(50);

        // ===== Buff de vulnérabilité (cible) =====
        BuffDebuffEffect buffVulne = new BuffDebuffEffect();
        buffVulne.setStatAffected(StatType.DAMAGE_TAKEN_MAGIC); // +100% dégâts magiques reçus
        buffVulne.setModifier(2.0);
        buffVulne.setDuration(2);
        System.out.println("Avant buff - Multiplicateur : " + moine.getStatBuffMultiplier(StatType.DAMAGE_TAKEN_MAGIC));
        buffVulne.apply(mage, moine);  // Appliquer le buff
        System.out.println("Après buff - Multiplicateur : " + moine.getStatBuffMultiplier(StatType.DAMAGE_TAKEN_MAGIC));



        // ===== Dégâts infligés sur la cible =====
        DamageFixedEffect bouleDeFeu = new DamageFixedEffect();
        bouleDeFeu.setDamage(100);
        bouleDeFeu.setDamageType(DamageType.MAGIC);
        bouleDeFeu.apply(mage, moine); // Devrait infliger 200 grâce au buff

        System.out.println("PV de " + moine.getName() + " après boule de feu : " + moine.getHealthCurrent());

        // ===== Buff de soin reçu (auto-appliqué) =====
        BuffDebuffEffect buffHealReceve = new BuffDebuffEffect();
        buffHealReceve.setStatAffected(StatType.HEALTH);
        buffHealReceve.setModifier(1.10); // +10%
        buffHealReceve.setDuration(3);
        buffHealReceve.setModifierSource(Source.CASTER_POWER);
        buffHealReceve.apply(moine, moine);

        // ===== Soin reçu =====
        HealFixedEffect soin = new HealFixedEffect();
        soin.setHealAmount(80);
        soin.apply(moine, moine); // Devrait donner 88 PV grâce au buff

        System.out.println("PV de " + moine.getName() + " après soin : " + moine.getHealthCurrent());
    }


    @GetMapping("/testCombatBuffSystem")
    public void testCombatBuffSystem() {

        Personnage mage = new Personnage();
        mage.setName("Mage Rouge");
        mage.setHealthMax(500);
        mage.setHealthCurrent(500);
        mage.setManaCurrent(100);
        mage.setManaMax(100);

        Personnage moine = new Personnage();
        moine.setName("Moine de Jade");
        moine.setHealthMax(500);
        moine.setHealthCurrent(500);
        moine.setManaCurrent(100);
        moine.setManaMax(100);
        moine.setResistance(50);

        // ===== Buff de vulnérabilité (cible) =====
        BuffDebuffEffect buffVulne = new BuffDebuffEffect();
        buffVulne.setStatAffected(StatType.DAMAGE_TAKEN_MAGIC); // +100% dégâts magiques reçus
        buffVulne.setModifier(2.0);
        buffVulne.setDuration(2);
        buffVulne.setModifierSource(Source.CASTER_POWER);
        buffVulne.apply(mage, moine);

        // ===== Dégâts infligés sur la cible =====
        DamageFixedEffect bouleDeFeu = new DamageFixedEffect();
        bouleDeFeu.setDamage(100);
        bouleDeFeu.setDamageType(DamageType.MAGIC);
        bouleDeFeu.apply(mage, moine); // Devrait infliger 200 grâce au buff

        System.out.println("PV de " + moine.getName() + " après boule de feu : " + moine.getHealthCurrent());

        // ===== Buff de soin reçu (auto-appliqué) =====
        BuffDebuffEffect buffHealReceve = new BuffDebuffEffect();
        buffHealReceve.setStatAffected(StatType.HEALTH);
        buffHealReceve.setModifier(1.10); // +10%
        buffHealReceve.setDuration(3);
        buffHealReceve.setModifierSource(Source.CASTER_POWER);
        buffHealReceve.apply(moine, moine);

        // ===== Soin reçu =====
        HealFixedEffect soin = new HealFixedEffect();
        soin.setHealAmount(80);
        soin.apply(moine, moine); // Devrait donner 88 PV grâce au buff

        System.out.println("PV de " + moine.getName() + " après soin : " + moine.getHealthCurrent());
    }

}
