package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;

public class SpellService {

    /**
     * Applique un sort sur une cible en parcourant chacun de ses effets.
     *
     * @param spell  le sort à lancer
     * @param caster le personnage qui lance le sort
     * @param target la cible sur laquelle appliquer les effets
     */
    public void castSpell(Spell spell, Personnage caster, Personnage target) {
        for (SpellEffect effect : spell.getEffects()) {
            effect.apply(caster, target);
        }
    }

}
