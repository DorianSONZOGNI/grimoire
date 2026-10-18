package generation.grimoire.controller;

import generation.grimoire.dto.achievement.SetTitleRequestDTO;
import generation.grimoire.dto.achievement.UserAchievementsResponseDTO;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.service.AchievementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private final AchievementService achievementService;
    private final UserRepository userRepository;

    public AchievementController(AchievementService achievementService, UserRepository userRepository) {
        this.achievementService = achievementService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAchievements(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié."));
        }
        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Utilisateur introuvable."));
        }
        UserAchievementsResponseDTO response = achievementService.getAchievementsResponse(user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/active-title")
    public ResponseEntity<?> setActiveTitle(@RequestBody SetTitleRequestDTO dto, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié."));
        }
        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Utilisateur introuvable."));
        }
        try {
            achievementService.setActiveTitle(user, dto.title());
            return ResponseEntity.ok(Map.of(
                    "message", "Titre mis à jour avec succès.",
                    "activeTitle", user.getActiveTitle() != null ? user.getActiveTitle() : ""
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
