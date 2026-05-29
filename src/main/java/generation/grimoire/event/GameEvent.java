package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Classe de base pour tous les événements de gameplay pouvant déclencher des passifs.
 * Chaque sous-classe représente un moment précis du cycle de jeu.
 */
@Data
@AllArgsConstructor
public abstract class GameEvent {
    private final Personnage source;
    private final Personnage target;
    private final Spell spell;
}
