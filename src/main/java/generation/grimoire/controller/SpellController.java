package generation.grimoire.controller;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.spell.type.effect.DamagePercentageEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
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
}
