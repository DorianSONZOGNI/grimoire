package generation.grimoire.event;

import generation.grimoire.entity.personnage.Personnage;

/**
 * Émis au début de chaque tour d'un personnage.
 * Permet aux passifs de réinitialiser des compteurs, appliquer des régénérations, etc.
 */
public class TurnStartEvent extends GameEvent {
    public TurnStartEvent(Personnage source) {
        super(source, null, null);
    }
}
