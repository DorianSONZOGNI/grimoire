package generation.grimoire.controller;

import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/anomalies")
public class AnomalieController {

    @Autowired
    private AnomalieRepository anomalieRepository;

    @Autowired
    private UserRepository userRepository;

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return auth.getName();
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<List<Anomalie>> getMyAnomalies() {
        String username = getCurrentUsername();
        if (username == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(anomalieRepository.findByOwnerUsername(username));
    }

    @PostMapping
    public ResponseEntity<?> createAnomalie(@RequestBody Anomalie anomalie) {
        String username = getCurrentUsername();
        if (username == null) {
            return ResponseEntity.status(401).body("Non autorisé");
        }
        
        Optional<AppUser> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Utilisateur introuvable");
        }

        if (anomalie.getId() != null) {
            Optional<Anomalie> existingOpt = anomalieRepository.findById(java.util.Objects.requireNonNull(anomalie.getId()));
            if (existingOpt.isPresent()) {
                Anomalie existing = existingOpt.get();
                if (!existing.getOwnerUsername().equals(username)) {
                    return ResponseEntity.status(403).body("Ce n'est pas votre anomalie.");
                }
                existing.setName(anomalie.getName());
                existing.setSpiritualite(anomalie.getSpiritualite());
                existing.setDescription(anomalie.getDescription());
                existing.setLevel(anomalie.getLevel() != null ? anomalie.getLevel() : 1);
                existing.setMagicObject(anomalie.isMagicObject());
                return ResponseEntity.ok(anomalieRepository.save(existing));
            }
        }

        anomalie.setOwnerUsername(username);
        anomalie.setUser(userOpt.get());
        
        Anomalie saved = anomalieRepository.save(anomalie);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAnomalie(@PathVariable Long id) {
        String username = getCurrentUsername();
        if (username == null) {
            return ResponseEntity.status(401).body("Non autorisé");
        }
        
        Optional<Anomalie> opt = anomalieRepository.findById(java.util.Objects.requireNonNull(id));
        if (opt.isPresent()) {
            Anomalie a = opt.get();
            if (a.getOwnerUsername().equals(username)) {
                anomalieRepository.delete(a);
                return ResponseEntity.ok("Anomalie supprimée.");
            } else {
                return ResponseEntity.status(403).body("Ce n'est pas votre anomalie.");
            }
        }
        return ResponseEntity.status(404).body("Anomalie introuvable.");
    }
}
