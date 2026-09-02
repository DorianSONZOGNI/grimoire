package generation.grimoire.controller.pve;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.MultiCombatSession;
import generation.grimoire.service.pve.CombatEventEmitter;
import generation.grimoire.service.pve.MultiCombatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pve/multi")
@RequiredArgsConstructor
public class MultiCombatController {

    private final MultiCombatService multiCombatService;
    private final CombatEventEmitter combatEventEmitter;

    // ─────────────────────────────────────────────────────────────────────────
    // Création du lobby
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * L'hôte crée un lobby co-op.
     * Body params: hostCharacterIds (required), dungeonId (required), consumableIds (optional).
     */
    @PostMapping("/create")
    public ResponseEntity<?> createLobby(
            @RequestParam List<Long> characterIds,
            @RequestParam Long dungeonId,
            @RequestParam(required = false) List<Long> consumableIds,
            Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        try {
            MultiCombatSession lobby = multiCombatService.createLobby(
                    principal.getName(), characterIds, dungeonId, consumableIds);
            return ResponseEntity.ok(lobby);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Jonction du joueur 2
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Le joueur 2 rejoint un lobby par son multiSessionId (ou retrouvé via shortCode).
     */
    @PostMapping("/{multiId}/join")
    public ResponseEntity<?> joinLobby(
            @PathVariable String multiId,
            @RequestParam List<Long> characterIds,
            @RequestParam(required = false) List<Long> consumableIds,
            Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        try {
            CombatSession session = multiCombatService.joinLobby(
                    multiId, principal.getName(), characterIds, consumableIds);
            // Retourne la CombatSession pour que le joueur 2 puisse aller sur combat.html
            return ResponseEntity.ok(Map.of(
                    "sessionId", session.getSessionId(),
                    "multiSessionId", multiId
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Recherche par code court
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/find/{shortCode}")
    public ResponseEntity<?> findByShortCode(@PathVariable String shortCode) {
        MultiCombatSession lobby = multiCombatService.getByShortCode(shortCode);
        if (lobby == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(lobby);
    }

    @GetMapping("/lobby/{shortCode}/info")
    public ResponseEntity<?> getLobbyInfo(@PathVariable String shortCode) {
        generation.grimoire.dto.pve.LobbyInfoDTO info = multiCombatService.getLobbyInfo(shortCode);
        if (info == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(info);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Statut du lobby (polling hôte pendant l'attente)
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/{multiId}/status")
    public ResponseEntity<?> getLobbyStatus(@PathVariable String multiId) {
        MultiCombatSession lobby = multiCombatService.getMultiSession(multiId);
        if (lobby == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(lobby);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SSE — événements du lobby (lobby-ready, lobby-cancelled)
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping(value = "/{multiId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToLobby(@PathVariable String multiId) {
        return combatEventEmitter.subscribe(multiId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Annulation par l'hôte
    // ─────────────────────────────────────────────────────────────────────────

    @DeleteMapping("/{multiId}/cancel")
    public ResponseEntity<?> cancelLobby(@PathVariable String multiId, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        try {
            multiCombatService.cancelLobby(multiId, principal.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
