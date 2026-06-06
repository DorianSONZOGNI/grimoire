package generation.grimoire.controller.pve;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/pve/combat")
@RequiredArgsConstructor
public class CombatController {

    private final CombatService combatService;

    @PostMapping("/start")
    public ResponseEntity<CombatSession> startCombat(
            @RequestParam Long characterId, 
            @RequestParam Long dungeonId,
            Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        
        try {
            CombatSession session = combatService.startCombat(characterId, dungeonId, principal.getName());
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<CombatSession> getCombatStatus(@PathVariable String sessionId) {
        CombatSession session = combatService.getSession(sessionId);
        if (session == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{sessionId}/action")
    public ResponseEntity<CombatSession> executeAction(
            @PathVariable String sessionId,
            @RequestParam(required = false) Long spellId) {
        try {
            CombatSession session = combatService.executeTurn(sessionId, spellId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }
}
