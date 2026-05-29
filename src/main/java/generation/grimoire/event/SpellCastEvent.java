package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;

/**
 * Émis après que tous les effets du sort ont été appliqués.
 * Permet aux passifs de réagir au lancement d'un sort (compteurs, chaleur, etc.).
 */
public class SpellCastEvent extends GameEvent {
    public SpellCastEvent(Personnage source, Personnage target, Spell spell) {
        super(source, target, spell);
    }
}
