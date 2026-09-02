package generation.grimoire.controller.pve;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatService;
import generation.grimoire.service.pve.CombatEventEmitter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/pve/combat")
@RequiredArgsConstructor
public class CombatController {

    private final CombatService combatService;
    private final CombatEventEmitter combatEventEmitter;

    // ─────────────────────────────────────────────────────────────────────────
    // SSE — abonnement aux mises à jour temps réel
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping(value = "/{sessionId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToSession(@PathVariable("sessionId") String sessionId) {
        return combatEventEmitter.subscribe(sessionId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * En mode multi, vérifie que le principal est bien le propriétaire du
     * personnage actif.
     * Retourne null si OK, une ResponseEntity d'erreur sinon.
     */
    private ResponseEntity<?> guardTurn(CombatSession session, Principal principal) {
        if (session == null || !session.isMulti() || principal == null)
            return null;
        var active = session.getActivePlayer();
        if (active == null)
            return null; // tour d'un monstre ou fin de round
        String owner = active.getUser() != null ? active.getUser().getUsername() : null;
        if (!principal.getName().equals(owner)) {
            return ResponseEntity.status(403)
                    .body("Ce n'est pas votre tour (personnage actif appartient à " + owner + ").");
        }
        return null;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startCombat(
            @RequestParam @NonNull List<Long> characterIds,
            @RequestParam @NonNull Long dungeonId,
            @RequestParam(required = false) List<Long> consumableIds,
            Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        try {
            CombatSession session = combatService.startCombat(characterIds, dungeonId, consumableIds,
                    principal.getName());
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getCombatStatus(@PathVariable("sessionId") String sessionId) {
        CombatSession session = combatService.getSession(sessionId);
        if (session == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{sessionId}/resume")
    public ResponseEntity<?> resumeCombat(@PathVariable("sessionId") String sessionId) {
        try {
            CombatSession session = combatService.resumeCombat(sessionId);
            if (session == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/action")
    public ResponseEntity<?> executeAction(
            @PathVariable("sessionId") String sessionId,
            @RequestParam(required = false) Long spellId,
            @RequestParam(required = false) Integer targetIndex,
            @RequestParam(required = false) Integer allyTargetIndex,
            @RequestParam(required = false) Integer choiceKey,
            Principal principal) {
        try {
            CombatSession current = combatService.getSession(sessionId);
            ResponseEntity<?> guard = guardTurn(current, principal);
            if (guard != null)
                return guard;

            CombatSession session = combatService.executeAction(sessionId, spellId, targetIndex, allyTargetIndex,
                    choiceKey);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/end-turn")
    public ResponseEntity<?> endTurn(@PathVariable("sessionId") String sessionId, Principal principal) {
        try {
            CombatSession current = combatService.getSession(sessionId);
            ResponseEntity<?> guard = guardTurn(current, principal);
            if (guard != null)
                return guard;

            CombatSession session = combatService.endTurn(sessionId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/flee")
    public ResponseEntity<?> fleeCombat(@PathVariable("sessionId") String sessionId, java.security.Principal principal) {
        try {
            combatService.fleeCombat(sessionId, principal != null ? principal.getName() : null);
            CombatSession session = combatService.getSession(sessionId);
            if (session != null) {
                combatService.broadcastIfMulti(session);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{sessionId}/consumable/{consumableId}")
    public ResponseEntity<?> deleteConsumable(
            @PathVariable("sessionId") String sessionId,
            @PathVariable("consumableId") Long consumableId) {
        try {
            CombatSession session = combatService.deleteConsumable(sessionId, consumableId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/auto-turn")
    public ResponseEntity<?> autoTurn(@PathVariable("sessionId") String sessionId) {
        try {
            CombatSession session = combatService.processNextAutoTurn(sessionId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/next-room")
    public ResponseEntity<?> nextRoom(@PathVariable("sessionId") String sessionId) {
        try {
            CombatSession session = combatService.proceedToNextRoom(sessionId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/open-strange-door")
    public ResponseEntity<?> openStrangeDoor(@PathVariable("sessionId") String sessionId) {
        try {
            CombatSession session = combatService.openStrangeDoor(sessionId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/merchant-buy")
    public ResponseEntity<?> buyMerchantItem(
            @PathVariable("sessionId") String sessionId,
            @RequestParam int lootIndex,
            @RequestParam Long characterId) {
        try {
            CombatSession session = combatService.buyMerchantItem(sessionId, lootIndex, characterId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/open-chest")
    public ResponseEntity<?> openChest(@PathVariable("sessionId") String sessionId,
            @RequestParam(required = false) Long equipmentId) {
        try {
            CombatSession session = combatService.openChest(sessionId, equipmentId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/alteration-accept")
    public ResponseEntity<?> acceptAlteration(
            @PathVariable("sessionId") String sessionId,
            @RequestParam(required = false) Long anomalyId,
            @RequestParam(required = false) Long characterId) {
        try {
            CombatSession session = combatService.acceptAlteration(sessionId, anomalyId, characterId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/use-rope")
    public ResponseEntity<?> useRope(@PathVariable("sessionId") String sessionId,
            @RequestParam(required = false) Long equipmentId) {
        try {
            CombatSession session = combatService.useRope(sessionId, equipmentId);
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/consume/{consumableId}/target/{characterId}")
    public ResponseEntity<?> consumeItem(@PathVariable("sessionId") String sessionId,
            @PathVariable("consumableId") Long consumableId,
            @PathVariable("characterId") Long characterId,
            Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        try {
            CombatSession session = combatService.consumeItem(sessionId, consumableId, characterId,
                    principal.getName());
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/add-consumable-by-name")
    public ResponseEntity<?> addConsumableByName(
            @PathVariable("sessionId") String sessionId,
            @RequestParam("itemName") String itemName,
            Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        try {
            CombatSession session = combatService.addConsumableByName(sessionId, itemName, principal.getName());
            combatService.broadcastIfMulti(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
