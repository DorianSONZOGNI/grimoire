package generation.grimoire.controller;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.repository.SpiritualiteRepository;
import generation.grimoire.repository.VoieRepository;
import generation.grimoire.service.PersonnageService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/personnages")
public class PersonnageController {

    private final PersonnageService personnageService;
    private final generation.grimoire.repository.PersonnageRepository personnageRepository;
    private final generation.grimoire.repository.auth.UserRepository userRepository;
    private final VoieRepository voieRepository;
    private final SpiritualiteRepository spiritualiteRepository;

    public PersonnageController(PersonnageService personnageService,
                                generation.grimoire.repository.PersonnageRepository personnageRepository,
                                generation.grimoire.repository.auth.UserRepository userRepository,
                                VoieRepository voieRepository,
                                SpiritualiteRepository spiritualiteRepository) {
        this.personnageService = personnageService;
        this.personnageRepository = personnageRepository;
        this.userRepository = userRepository;
        this.voieRepository = voieRepository;
        this.spiritualiteRepository = spiritualiteRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllPersonnages(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        List<Personnage> all = personnageRepository.findByUser_Username(principal.getName());
        List<Map<String, Object>> result = all.stream().map(this::toDto).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/limit")
    public ResponseEntity<Map<String, Integer>> getLimit(java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        generation.grimoire.entity.auth.AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        
        int userMax = user.getMaxCharacters();
        if (userMax <= 0) userMax = 2;
        int max = isAdmin ? 999 : userMax;
        
        int current = personnageRepository.findByUser_Username(principal.getName()).size();
        
        return ResponseEntity.ok(Map.of("maxCharacters", max, "currentCharacters", current));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAllAdmin(java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        if (!isAdmin) return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        
        List<Personnage> all = personnageRepository.findAll();
        List<Map<String, Object>> result = all.stream().map(this::toDto).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrUpdate(@RequestBody PersonnageCreationDto dto, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        generation.grimoire.entity.auth.AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        try {
            Personnage personnage;
            boolean isUpdate = false;

            if (dto.getId() != null && personnageService.existsById(java.util.Objects.requireNonNull(dto.getId()))) {
            personnage = personnageService.findByIdOrThrow(java.util.Objects.requireNonNull(dto.getId()));
            if (!isAdmin && personnage.getUser() != null && !personnage.getUser().getUsername().equals(principal.getName())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
            }
            isUpdate = true;
        } else {
            if (dto.getVoieId() == null || dto.getSpiritualiteId() == null) {
                Map<String, Object> errorResp = new HashMap<>();
                errorResp.put("message", "Une Voie et une Spiritualité sont obligatoires à la création.");
                return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST).body(errorResp);
            }
            int userMax = user != null ? user.getMaxCharacters() : 2;
            if (userMax <= 0) userMax = 2;
            int max = isAdmin ? 999 : userMax;
            
            int current = personnageRepository.findByUser_Username(principal.getName()).size();
            if (current >= max) {
                Map<String, Object> errorResp = new HashMap<>();
                errorResp.put("message", "Limite de personnages atteinte (" + max + ").");
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(errorResp);
            }
            personnage = new Personnage();
            personnage.setUser(user);
        }

        personnage.setName(dto.getName());
        personnage.setHealthMax(Math.max(1, dto.getHealthMax()));
        personnage.setHealthCurrent(Math.max(1, dto.getHealthMax()));
        personnage.setManaMax(Math.max(0, dto.getManaMax()));
        personnage.setManaCurrent(Math.max(0, dto.getManaMax()));
        personnage.setPower(Math.max(0, dto.getPower()));
        personnage.setStrength(Math.max(0, dto.getStrength()));
        personnage.setArmor(Math.max(0, dto.getArmor()));
        personnage.setResistance(Math.max(0, dto.getResistance()));
        personnage.setSpeed(Math.max(0, dto.getSpeed()));
        personnage.setCrit(Math.max(0, Math.min(100, dto.getCrit())));

        // Voie
        if (dto.getVoieId() != null) {
            voieRepository.findById(java.util.Objects.requireNonNull(dto.getVoieId())).ifPresent(personnage::setVoie);
        } else {
            personnage.setVoie(null);
        }
        personnage.setExperience(Math.max(0, dto.getExperience()));
        // Note: voieLevel est dérivé de l'expérience, mais pour garder la rétrocompatibilité ou un éventuel forçage :
        if (dto.getVoieLevel() > 1 && dto.getExperience() == 0) {
            personnage.setVoieLevel(Math.max(1, Math.min(5, dto.getVoieLevel())));
        }

        // Spiritualité
        if (dto.getSpiritualiteId() != null) {
            spiritualiteRepository.findById(java.util.Objects.requireNonNull(dto.getSpiritualiteId())).ifPresent(personnage::setSpiritualite);
        } else {
            personnage.setSpiritualite(null);
        }
        personnage.setSpiritualiteLevel(Math.max(1, Math.min(3, dto.getSpiritualiteLevel())));
        personnage.setSpiritualiteExperience(Math.max(0, dto.getSpiritualiteExperience()));
        if (dto.getSpiritualiteLevel() > 1 && dto.getSpiritualiteExperience() == 0) {
            personnage.setSpiritualiteLevel(Math.max(1, Math.min(3, dto.getSpiritualiteLevel())));
        }

            Personnage saved = personnageService.save(personnage);

            String message = isUpdate
                    ? "Personnage \"" + saved.getName() + "\" mis à jour avec succès."
                    : "Personnage \"" + saved.getName() + "\" créé avec succès.";

            Map<String, Object> response = new HashMap<>();
            response.put("message", message);
            response.put("personnage", toDto(saved));
            return ResponseEntity.ok(response);
        } catch (Throwable e) {
            e.printStackTrace();
            Map<String, Object> errorResp = new HashMap<>();
            errorResp.put("message", "Erreur serveur: " + e.getMessage() + " | " + e.getClass().getName());
            return ResponseEntity.status(500).body(errorResp);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable @org.springframework.lang.NonNull Long id, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        Personnage personnage = personnageService.findByIdOrThrow(id);
        if (!isAdmin && personnage.getUser() != null && !personnage.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        if (personnageService.existsById(id)) {
            personnageService.deleteById(id);
            return ResponseEntity.ok("Personnage supprimé.");
        }
        return ResponseEntity.notFound().build();
    }

    private Map<String, Object> toDto(Personnage p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId());
        map.put("name", p.getName());
        map.put("ownerUsername", p.getUser() != null ? p.getUser().getUsername() : "Inconnu");
        
        // Base stats pour le formulaire d'édition
        map.put("healthMax", p.getHealthMax());
        map.put("manaMax", p.getManaMax());
        map.put("power", p.getPower());
        map.put("strength", p.getStrength());
        map.put("armor", p.getArmor());
        map.put("resistance", p.getResistance());
        map.put("speed", p.getSpeed());
        map.put("crit", p.getCrit());
        
        // Total stats pour l'affichage (inclus équipements, buffs, passifs)
        map.put("totalHealthMax", p.getTotalHealthMax());
        map.put("totalManaMax", p.getTotalManaMax());
        map.put("totalPower", p.getEffectiveStat(generation.grimoire.enumeration.StatType.POWER));
        map.put("totalStrength", p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH));
        map.put("totalArmor", p.getEffectiveStat(generation.grimoire.enumeration.StatType.ARMURE));
        map.put("totalResistance", p.getEffectiveStat(generation.grimoire.enumeration.StatType.RESISTANCE));
        map.put("totalSpeed", p.getEffectiveStat(generation.grimoire.enumeration.StatType.SPEED));
        map.put("totalCrit", p.getEffectiveStat(generation.grimoire.enumeration.StatType.CRIT));

        map.put("experience", p.getExperience());
        
        int currentLevelXp = 0;
        int nextLevelXp = 100;
        int level = p.getVoieLevel();
        if (level == 1) { currentLevelXp = 0; nextLevelXp = 100; }
        else if (level == 2) { currentLevelXp = 100; nextLevelXp = 300; }
        else if (level == 3) { currentLevelXp = 300; nextLevelXp = 600; }
        else if (level == 4) { currentLevelXp = 600; nextLevelXp = 1000; }
        else if (level == 5) { currentLevelXp = 1000; nextLevelXp = 1000; }
        
        map.put("currentLevelXp", currentLevelXp);
        map.put("nextLevelXp", nextLevelXp);

        map.put("voieLevel", p.getVoieLevel());
        map.put("spiritualiteLevel", p.getSpiritualiteLevel());
        map.put("spiritualiteExperience", p.getSpiritualiteExperience());
        
        int currentLevelSpiritXp = 0;
        int nextLevelSpiritXp = 100;
        int spiritLevel = p.getSpiritualiteLevel();
        if (spiritLevel == 1) { currentLevelSpiritXp = 0; nextLevelSpiritXp = 100; }
        else if (spiritLevel == 2) { currentLevelSpiritXp = 100; nextLevelSpiritXp = 300; }
        else if (spiritLevel == 3) { currentLevelSpiritXp = 300; nextLevelSpiritXp = 300; }
        
        map.put("currentLevelSpiritXp", currentLevelSpiritXp);
        map.put("nextLevelSpiritXp", nextLevelSpiritXp);

        if (p.getVoie() != null) {
            Map<String, Object> voie = new HashMap<>();
            voie.put("id", p.getVoie().getId());
            voie.put("nom", p.getVoie().getNom());
            map.put("voie", voie);
        }
        if (p.getSpiritualite() != null) {
            Map<String, Object> spirit = new HashMap<>();
            spirit.put("id", p.getSpiritualite().getId());
            spirit.put("nom", p.getSpiritualite().getNom());
            map.put("spiritualite", spirit);
        }

        return map;
    }

    @Data
    public static class PersonnageCreationDto {
        private Long id;
        private String name;
        private int healthMax = 100;
        private int manaMax = 100;
        private int power = 25;
        private int strength = 10;
        private int armor = 10;
        private int resistance = 10;
        private int speed = 0;
        private int crit = 0;
        private Long voieId;
        private int voieLevel = 1;
        private int experience = 0;
        private Long spiritualiteId;
        private int spiritualiteLevel = 1;
        private int spiritualiteExperience = 0;
    }
}
