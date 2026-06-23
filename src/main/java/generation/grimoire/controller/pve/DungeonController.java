package generation.grimoire.controller.pve;

import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.service.pve.PvEAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.entity.auth.AppUser;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import java.security.Principal;

@RestController
@RequestMapping("/api/pve/dungeons")
@RequiredArgsConstructor
public class DungeonController {

    private final PvEAdminService pvEAdminService;
    private final UserRepository userRepository;
    private final DonjonRepository donjonRepository;

    @GetMapping
    public ResponseEntity<List<Donjon>> getAvailableDungeons() {
        // Here we could filter based on player level in the future
        return ResponseEntity.ok(pvEAdminService.getAllDungeons());
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<?> unlockDungeon(@PathVariable Long id, Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        AppUser user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Donjon donjon = donjonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donjon introuvable"));

        if (donjon.getUnlockCostGold() <= 0) {
            return ResponseEntity.badRequest().body("Ce donjon n'a pas de coût de dévérouillage.");
        }

        if (user.getUnlockedDungeons().contains(id)) {
            return ResponseEntity.badRequest().body("Ce donjon est déjà débloqué.");
        }

        if (user.getMonnaie() < donjon.getUnlockCostGold()) {
            return ResponseEntity.badRequest().body("Fonds insuffisants.");
        }

        user.setMonnaie(user.getMonnaie() - donjon.getUnlockCostGold());
        user.getUnlockedDungeons().add(id);
        userRepository.save(user);

        return ResponseEntity.ok("Donjon débloqué avec succès.");
    }
}
