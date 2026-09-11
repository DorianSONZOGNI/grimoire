package generation.grimoire.controller.pve;

import generation.grimoire.service.pve.HuntingQuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/pve/hunting")
@RequiredArgsConstructor
public class HuntingQuestController {

    private final HuntingQuestService huntingQuestService;

    @GetMapping("/daily")
    public ResponseEntity<?> getDailyQuest(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        Map<String, Object> data = huntingQuestService.getDailyQuestData(username);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/weekly")
    public ResponseEntity<?> getWeeklyQuest(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        Map<String, Object> data = huntingQuestService.getWeeklyQuestData(username);
        return ResponseEntity.ok(data);
    }

    @PostMapping("/claim/{questId}")
    public ResponseEntity<?> claimReward(@PathVariable Long questId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Non connecté."));
        }
        try {
            String message = huntingQuestService.claimReward(questId, principal.getName());
            return ResponseEntity.ok(Map.of("message", message));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
