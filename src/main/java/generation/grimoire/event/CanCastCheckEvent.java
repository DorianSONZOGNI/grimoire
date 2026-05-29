package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import lombok.Getter;
import lombok.Setter;

/**
 * Événement mutable émis avant le lancement d'un sort pour vérifier les prérequis des passifs.
 * Un passif peut mettre {@code allowed} à {@code false} pour empêcher le lancement.
 */
@Getter
@Setter
public class CanCastCheckEvent extends GameEvent {
    private boolean allowed = true;

    public CanCastCheckEvent(Personnage source, Personnage target, Spell spell) {
        super(source, target, spell);
    }
}
