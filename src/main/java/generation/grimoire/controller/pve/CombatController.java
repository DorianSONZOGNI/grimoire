package generation.grimoire.controller.pve;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/pve/combat")
@RequiredArgsConstructor
public class CombatController {

    private final CombatService combatService;

    @PostMapping("/start")
    public ResponseEntity<CombatSession> startCombat(
            @RequestParam @NonNull List<Long> characterIds,
            @RequestParam @NonNull Long dungeonId,
            @RequestParam(required = false) List<Long> consumableIds,
            Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        try {
            CombatSession session = combatService.startCombat(characterIds, dungeonId, consumableIds, principal.getName());
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<CombatSession> getCombatStatus(@PathVariable String sessionId) {
        CombatSession session = combatService.getSession(sessionId);
        if (session == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{sessionId}/action")
    public ResponseEntity<CombatSession> executeAction(
            @PathVariable String sessionId,
            @RequestParam(required = false) Long spellId,
            @RequestParam(required = false) Integer targetIndex,
            @RequestParam(required = false) Integer allyTargetIndex,
            @RequestParam(required = false) Integer choiceKey) {
        try {
            CombatSession session = combatService.executeAction(sessionId, spellId, targetIndex, allyTargetIndex,
                    choiceKey);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/end-turn")
    public ResponseEntity<CombatSession> endTurn(@PathVariable String sessionId) {
        try {
            CombatSession session = combatService.endTurn(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/auto-turn")
    public ResponseEntity<CombatSession> autoTurn(@PathVariable String sessionId) {
        try {
            CombatSession session = combatService.processNextAutoTurn(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/next-room")
    public ResponseEntity<CombatSession> nextRoom(@PathVariable String sessionId) {
        try {
            CombatSession session = combatService.proceedToNextRoom(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/open-strange-door")
    public ResponseEntity<CombatSession> openStrangeDoor(@PathVariable String sessionId) {
        try {
            CombatSession session = combatService.openStrangeDoor(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/merchant-buy")
    public ResponseEntity<CombatSession> buyMerchantItem(
            @PathVariable String sessionId,
            @RequestParam int lootIndex,
            @RequestParam Long characterId) {
        try {
            CombatSession session = combatService.buyMerchantItem(sessionId, lootIndex, characterId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/open-chest")
    public ResponseEntity<CombatSession> openChest(@PathVariable String sessionId) {
        try {
            CombatSession session = combatService.openChest(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping("/{sessionId}/alteration-accept")
    public ResponseEntity<?> acceptAlteration(
            @PathVariable String sessionId,
            @RequestParam(required = false) Long anomalyId) {
        try {
            CombatSession session = combatService.acceptAlteration(sessionId, anomalyId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{sessionId}/use-rope")
    public ResponseEntity<?> useRope(@PathVariable String sessionId) {
        try {
            CombatSession session = combatService.useRope(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
