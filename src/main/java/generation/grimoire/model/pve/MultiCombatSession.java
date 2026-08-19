package generation.grimoire.model.pve;

import lombok.Data;

import java.time.Instant;
import java.util.List;

/**
 * Représente un lobby de donjon co-op.
 * Stocké en mémoire dans MultiCombatService.
 * Une fois les deux joueurs prêts, un CombatSession standard est créé
 * et son ID est stocké dans combatSessionId.
 */
@Data
public class MultiCombatSession {

    public enum Status {
        WAITING,  // Hôte a créé le lobby, attend le joueur 2
        ACTIVE,   // Combat démarré
        FINISHED, // Combat terminé
        CANCELLED // Hôte a annulé
    }

    /** Identifiant unique du lobby (UUID complet). */
    private String multiSessionId;

    /** Code court affiché aux joueurs (4 premiers chars du UUID, en majuscules). */
    private String shortCode;

    private String hostUsername;
    private List<Long> hostCharacterIds;

    private String guestUsername;
    private List<Long> guestCharacterIds;

    private Long dungeonId;
    private List<Long> consumableIds;

    private Status status = Status.WAITING;

    /** ID de la CombatSession sous-jacente, rempli après joinLobby(). */
    private String combatSessionId;

    private Instant createdAt = Instant.now();
    private Instant lastActivity = Instant.now();
}
