package generation.grimoire.controller;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.*;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.service.SpellService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SpellController {

    private final SpellService spellService;

    public SpellController(SpellService spellService) {
        this.spellService = spellService;
    }

    @PostMapping("/cast")
    public ResponseEntity<String> cast(
            @RequestParam Long spellId,
            @RequestParam Long casterId,
            @RequestParam Long targetId,
            @RequestParam(required = false) Integer choiceKey) {
        spellService.castSpellInvoq(
                spellId,
                casterId,
                targetId,
                choiceKey);
        return ResponseEntity.ok("Sort lancé !");
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

    @PostMapping("/initVariants")
    public ResponseEntity<String> initVariants() {
        // === VARIANT 1 : heal allié vs dégâts ennemi ===
        int variant1 = 1;
        Spell healAlly = new Spell();
        healAlly.setNom("Fraternalité");
        healAlly.setVariantId(variant1);
        healAlly.setConditionType(SpellCondition.IS_ALLY);
        HealFixedEffect heal = new HealFixedEffect();
        heal.setHealAmount(50);
        healAlly.addEffect(heal);
        spellService.saveSpell(healAlly);

        Spell dmgEnemy = new Spell();
        dmgEnemy.setNom("Fraternalité");
        dmgEnemy.setVariantId(variant1);
        DamageFixedEffect dmg1 = new DamageFixedEffect();
        dmg1.setDamage(40);
        dmg1.setDamageType(DamageType.MAGIC);
        dmgEnemy.addEffect(dmg1);
        spellService.saveSpell(dmgEnemy);

        // === VARIANT 2 : adaptatif magie vs physique ===
        int variant2 = 2;
        Spell magicIfResHigh = new Spell();
        magicIfResHigh.setNom("Frappe");
        magicIfResHigh.setVariantId(variant2);
        magicIfResHigh.setConditionType(SpellCondition.HIGHER_RESISTANCE);
        DamageFixedEffect dmgMagic = new DamageFixedEffect();
        dmgMagic.setDamage(60);
        dmgMagic.setDamageType(DamageType.MAGIC);
        magicIfResHigh.addEffect(dmgMagic);
        spellService.saveSpell(magicIfResHigh);

        Spell physIfArmorHigh = new Spell();
        physIfArmorHigh.setNom("Frappe");
        physIfArmorHigh.setVariantId(variant2);
        physIfArmorHigh.setConditionType(SpellCondition.HIGHER_ARMURE);
        DamageFixedEffect dmgPhys = new DamageFixedEffect();
        dmgPhys.setDamage(60);
        dmgPhys.setDamageType(DamageType.PHYSIC);
        physIfArmorHigh.addEffect(dmgPhys);
        spellService.saveSpell(physIfArmorHigh);

        // === VARIANT 3 : choix manuel heal+res vs mana-HP ===
        int variant3 = 3;
        // choiceKey = 1 : heal + résistance
        Spell healResChoice = new Spell();
        healResChoice.setNom("Don");
        healResChoice.setVariantId(variant3);
        healResChoice.setChoiceKey(1);
        BuffDebuffEffect buffRes = new BuffDebuffEffect();
        buffRes.setStatAffected(StatType.RESISTANCE);
        buffRes.setModifier(1.5); // +50% résistance
        buffRes.setDuration(3);
        healResChoice.addEffect(buffRes);
        HealFixedEffect healSelf = new HealFixedEffect();
        healSelf.setHealAmount(30);
        healResChoice.addEffect(healSelf);
        spellService.saveSpell(healResChoice);

        // choiceKey = 2 : regen mana, perte de vie
        Spell manaHpChoice = new Spell();
        manaHpChoice.setNom("Don");
        manaHpChoice.setVariantId(variant3);
        manaHpChoice.setChoiceKey(2);
        manaHpChoice.setHealCost(20);
        // regen mana
        BuffDebuffEffect buffManaRegen = new BuffDebuffEffect();
        buffManaRegen.setStatAffected(StatType.MANA);
        buffManaRegen.setModifier(50);

        spellService.saveSpell(manaHpChoice);

        return ResponseEntity.ok("Variantes initialisées !");
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
     * Exemple : pour la Voie de la Raison, buffer les 3 prochains sorts avec +50%
     * de dégâts.
     */
    @GetMapping("/applyBuff")
    public void applyNextSpellBuff() {
        // Par exemple, le buff est consomé au bout d'un sorts et augmente les dégâts de
        // 50%
        ConsumableSpellBuffDebuffEffect buff = new ConsumableSpellBuffDebuffEffect();
        buff.setModifier(0.5);
        buff.setRemainingApplications(2);

        ConsumableSpellBuffDebuffEffect buff2 = new ConsumableSpellBuffDebuffEffect();
        buff2.setModifier(0.8);
        buff2.setDuration(1);
    }

    /**
     * Endpoint pour lancer un sort de dégâts qui bénéficiera du buff consommable
     * s'il est actif.
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

        // Ajout d'un effet de dégâts fixes qui pourra être amplifié par le buff
        // consommable
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
        buffVulne.apply(mage, moine); // Appliquer le buff
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

    @GetMapping("/voie")
    public void setvoie() {

    }

}
