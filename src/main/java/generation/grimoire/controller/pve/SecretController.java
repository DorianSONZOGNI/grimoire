package generation.grimoire.controller.pve;

import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/secrets")
public class SecretController {

    private final UserRepository userRepository;
    private final DonjonRepository donjonRepository;

    public SecretController(UserRepository userRepository, DonjonRepository donjonRepository) {
        this.userRepository = userRepository;
        this.donjonRepository = donjonRepository;
    }

    @PostMapping("/claim/{secretName}/{level}")
    public ResponseEntity<?> claimSecretReward(@PathVariable String secretName, @PathVariable int level) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Non connecté."));
        }

        AppUser user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String key = secretName + ":" + level;

        // Check if already claimed
        if (user.getClaimedSecretRewards().contains(key)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Récompense déjà récupérée."));
        }

        // Check if unlocked
        Integer maxUnlocked = user.getUnlockedSecrets().get(secretName);
        if (maxUnlocked == null || maxUnlocked < level) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ce niveau de secret n'est pas débloqué."));
        }

        // Check if all dungeons are completed
        List<generation.grimoire.entity.pve.Donjon> allDungeons = donjonRepository.findAll();
        List<generation.grimoire.entity.pve.Donjon> dungeonsForLevel = allDungeons.stream()
                .filter(d -> secretName.equalsIgnoreCase(d.getRequiredSecret()) && d.getRequiredSecretLevel() == level)
                .toList();

        if (dungeonsForLevel.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucun donjon n'existe pour ce secret et ce niveau."));
        }

        for (generation.grimoire.entity.pve.Donjon d : dungeonsForLevel) {
            if (!user.getCompletedDungeons().contains(d.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Tous les donjons de ce niveau ne sont pas terminés."));
            }
        }

        // Add reward
        int reward = level * 100;
        user.setMonnaie(user.getMonnaie() + reward);
        user.getClaimedSecretRewards().add(key);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Récompense obtenue : " + reward + " golds !", "reward", reward));
    }
}
