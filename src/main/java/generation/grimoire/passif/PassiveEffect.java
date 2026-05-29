package generation.grimoire.passif;

import generation.grimoire.event.GameEvent;

/**
 * Contrat unifié pour tous les effets passifs du jeu, qu'ils proviennent
 * d'une Voie, d'une Spiritualité, ou d'une future source (Race, Équipement, etc.).
 * <p>
 * Chaque passif reçoit des {@link GameEvent} typés et réagit uniquement
 * à ceux qui le concernent (pattern matching via {@code instanceof}).
 * <p>
 * L'ordre d'exécution est déterminé par {@link #getPriority()} : une valeur
 * plus élevée signifie une exécution plus tôt dans la chaîne.
 */
public interface PassiveEffect {

    /**
     * Point d'entrée principal : réagir à un événement de gameplay.
     * Les implémentations doivent tester le type de l'événement via {@code instanceof}
     * et ne traiter que les événements pertinents.
     *
     * @param event l'événement de gameplay à traiter
     */
    default void onEvent(GameEvent event) {
        // Par défaut, ne fait rien. Les sous-classes réagissent aux événements pertinents.
    }

    /**
     * Détermine l'ordre d'exécution de ce passif par rapport aux autres.
     * Une valeur plus élevée signifie une exécution plus tôt.
     * <p>
     * Exemples de priorités recommandées :
     * <ul>
     *   <li>100+ : Passifs qui modifient le type de cast (Création)</li>
     *   <li>50  : Passifs qui modifient les coûts</li>
     *   <li>0   : Passifs standards (valeur par défaut)</li>
     *   <li>-50 : Passifs qui réagissent tardivement</li>
     * </ul>
     *
     * @return la priorité de ce passif
     */
    default int getPriority() {
        return 0;
    }
}
