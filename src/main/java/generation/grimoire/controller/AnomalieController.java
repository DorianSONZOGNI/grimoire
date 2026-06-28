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
        
        Optional<AppUser> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent() && "ADMIN".equals(userOpt.get().getRole())) {
            syncAdminAnomalies(userOpt.get());
        }

        return ResponseEntity.ok(anomalieRepository.findByOwnerUsername(username));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Anomalie>> getAllAdmin() {
        String username = getCurrentUsername();
        if (username == null) return ResponseEntity.status(401).build();
        
        Optional<AppUser> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || !"ADMIN".equals(userOpt.get().getRole())) {
            return ResponseEntity.status(403).build();
        }
        
        return ResponseEntity.ok(anomalieRepository.findAll());
    }
    
    private void syncAdminAnomalies(AppUser adminUser) {
        List<String> distinctNames = anomalieRepository.findDistinctNames();
        List<Anomalie> adminAnomalies = anomalieRepository.findByOwnerUsername(adminUser.getUsername());
        
        for (String name : distinctNames) {
            if (name == null || name.trim().isEmpty()) continue;
            boolean hasIt = adminAnomalies.stream().anyMatch(a -> name.equals(a.getName()));
            if (!hasIt) {
                Anomalie template = anomalieRepository.findFirstByName(name);
                if (template != null) {
                    Anomalie newAno = new Anomalie();
                    newAno.setName(template.getName());
                    newAno.setSpiritualite(template.getSpiritualite());
                    newAno.setCategory(template.getCategory());
                    newAno.setDescription(template.getDescription());
                    newAno.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                    newAno.setMagicObject(template.isMagicObject());
                    newAno.setOwnerUsername(adminUser.getUsername());
                    newAno.setUser(adminUser);
                    anomalieRepository.save(newAno);
                }
            }
        }
    }

    @GetMapping("/all-names")
    public ResponseEntity<List<String>> getAllAnomalyNames() {
        return ResponseEntity.ok(anomalieRepository.findDistinctNames());
    }

    @GetMapping("/all-templates")
    public ResponseEntity<List<Anomalie>> getAllAnomalyTemplates() {
        List<String> names = anomalieRepository.findDistinctNames();
        List<Anomalie> templates = new java.util.ArrayList<>();
        for (String name : names) {
            if (name != null && !name.trim().isEmpty()) {
                Anomalie template = anomalieRepository.findFirstByName(name);
                if (template != null) {
                    templates.add(template);
                }
            }
        }
        return ResponseEntity.ok(templates);
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
                boolean isAdmin = "ADMIN".equals(userOpt.get().getRole());
                if (!isAdmin && !existing.getOwnerUsername().equals(username)) {
                    return ResponseEntity.status(403).body("Ce n'est pas votre anomalie.");
                }
                
                String originalName = existing.getName();
                List<Anomalie> sameAnomalies = anomalieRepository.findByName(originalName);
                for (Anomalie a : sameAnomalies) {
                    a.setName(anomalie.getName());
                    a.setSpiritualite(anomalie.getSpiritualite());
                    a.setCategory(anomalie.getCategory());
                    a.setDescription(anomalie.getDescription());
                    a.setLevel(anomalie.getLevel() != null ? anomalie.getLevel() : 1);
                    a.setMagicObject(anomalie.isMagicObject());
                }
                anomalieRepository.saveAll(sameAnomalies);
                return ResponseEntity.ok(existing);
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
