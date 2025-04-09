package generation.grimoire.controller;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.spell.type.effect.PercentageDamageEffect;
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

        PercentageDamageEffect effect = new PercentageDamageEffect();
        effect.setPercentage(0.10); // 10% des dégâts
        effect.setSource(Source.CASTER_POWER); // Les dégâts se baseront sur la puissance du caster
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

        PercentageDamageEffect effect = new PercentageDamageEffect();
        effect.setPercentage(0.10); // 10% des dégâts
        effect.setSource(Source.CASTER_POWER); // Les dégâts se baseront sur la puissance du caster
        effect.setDamageType(DamageType.MAGIC); // Des dégâts magiques

        spell.addEffect(effect);

        spellService.saveSpell(spell);

        return "Sort lancé ! Consultez la console pour voir les résultats.";
    }
}
