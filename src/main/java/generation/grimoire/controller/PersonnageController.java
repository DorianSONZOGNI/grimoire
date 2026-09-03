package generation.grimoire.controller;

import generation.grimoire.dto.personnage.PersonnageRequestDTO;
import generation.grimoire.dto.personnage.PersonnageResponseDTO;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.mapper.PersonnageMapper;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.SpiritualiteRepository;
import generation.grimoire.repository.VoieRepository;
import generation.grimoire.service.PersonnageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/personnages")
public class PersonnageController {

    private final PersonnageService personnageService;
    private final PersonnageRepository personnageRepository;
    private final generation.grimoire.repository.auth.UserRepository userRepository;
    private final VoieRepository voieRepository;
    private final SpiritualiteRepository spiritualiteRepository;
    private final PersonnageMapper personnageMapper;

    public PersonnageController(PersonnageService personnageService,
            PersonnageRepository personnageRepository,
            generation.grimoire.repository.auth.UserRepository userRepository,
            VoieRepository voieRepository,
            SpiritualiteRepository spiritualiteRepository,
            PersonnageMapper personnageMapper) {
        this.personnageService = personnageService;
        this.personnageRepository = personnageRepository;
        this.userRepository = userRepository;
        this.voieRepository = voieRepository;
        this.spiritualiteRepository = spiritualiteRepository;
        this.personnageMapper = personnageMapper;
    }

    @GetMapping
    public ResponseEntity<List<PersonnageResponseDTO>> getAllPersonnages(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        List<Personnage> all = personnageRepository.findByUser_Username(principal.getName());
        List<PersonnageResponseDTO> result = all.stream().map(this::toResponseDto).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/limit")
    public ResponseEntity<Map<String, Integer>> getLimit(java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        generation.grimoire.entity.auth.AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();

        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        int userMax = user.getMaxCharacters();
        if (userMax < 2)
            userMax = 2;
        int max = isAdmin ? 999 : userMax;

        int current = personnageRepository.findByUser_Username(principal.getName()).size();

        return ResponseEntity.ok(Map.of("maxCharacters", max, "currentCharacters", current));
    }

    @GetMapping("/all")
    public ResponseEntity<List<PersonnageResponseDTO>> getAllAdmin(java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        if (!isAdmin)
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();

        List<Personnage> all = personnageRepository.findAll();
        List<PersonnageResponseDTO> result = all.stream().map(this::toResponseDto).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrUpdate(@RequestBody PersonnageRequestDTO dto,
            java.security.Principal principal) {
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
                if (!isAdmin && personnage.getUser() != null
                        && !personnage.getUser().getUsername().equals(principal.getName())) {
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
                if (userMax < 2)
                    userMax = 2;
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
            personnage.setRegenHp(Math.max(0, dto.getRegenHp()));
            personnage.setRegenMana(Math.max(0, dto.getRegenMana()));

            // Voie
            if (dto.getVoieId() != null) {
                voieRepository.findById(java.util.Objects.requireNonNull(dto.getVoieId()))
                        .ifPresent(personnage::setVoie);
            } else {
                personnage.setVoie(null);
            }
            personnage.setExperience(Math.max(0, dto.getExperience()));
            if (dto.getVoieLevel() > 1 && dto.getExperience() == 0) {
                personnage.setVoieLevel(Math.max(1, Math.min(5, dto.getVoieLevel())));
            }

            // Spiritualité
            if (dto.getSpiritualiteId() != null) {
                spiritualiteRepository.findById(java.util.Objects.requireNonNull(dto.getSpiritualiteId()))
                        .ifPresent(personnage::setSpiritualite);
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
            response.put("personnage", toResponseDto(saved));
            return ResponseEntity.ok(response);
        } catch (Throwable e) {
            e.printStackTrace();
            Map<String, Object> errorResp = new HashMap<>();
            errorResp.put("message", "Erreur serveur: " + e.getMessage() + " | " + e.getClass().getName());
            return ResponseEntity.status(500).body(errorResp);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable @org.springframework.lang.NonNull Long id,
            java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        Personnage personnage = personnageService.findByIdOrThrow(id);
        if (!isAdmin && personnage.getUser() != null
                && !personnage.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        if (personnageService.existsById(id)) {
            personnageService.deleteById(id);
            return ResponseEntity.ok("Personnage supprimé.");
        }
        return ResponseEntity.notFound().build();
    }

    private PersonnageResponseDTO toResponseDto(Personnage p) {
        PersonnageResponseDTO dto = personnageMapper.toResponse(p);

        if (p.getUser() != null) {
            dto.setOwnerUsername(p.getUser().getUsername());
        } else {
            dto.setOwnerUsername("Inconnu");
        }

        int currentLevelXp = 0;
        int nextLevelXp = 100;
        int level = p.getVoieLevel();
        if (level == 1) {
            currentLevelXp = 0;
            nextLevelXp = 100;
        } else if (level == 2) {
            currentLevelXp = 100;
            nextLevelXp = 350;
        } else if (level == 3) {
            currentLevelXp = 350;
            nextLevelXp = 1000;
        } else if (level == 4) {
            currentLevelXp = 1000;
            nextLevelXp = 2000;
        } else if (level == 5) {
            currentLevelXp = 2000;
            nextLevelXp = 2000;
        }
        dto.setCurrentLevelXp(currentLevelXp);
        dto.setNextLevelXp(nextLevelXp);

        int currentLevelSpiritXp = 0;
        int nextLevelSpiritXp = 100;
        int spiritLevel = p.getSpiritualiteLevel();
        if (spiritLevel == 1) {
            currentLevelSpiritXp = 0;
            nextLevelSpiritXp = 100;
        } else if (spiritLevel == 2) {
            currentLevelSpiritXp = 100;
            nextLevelSpiritXp = 350;
        } else if (spiritLevel == 3) {
            currentLevelSpiritXp = 350;
            nextLevelSpiritXp = 350;
        }
        dto.setCurrentLevelSpiritXp(currentLevelSpiritXp);
        dto.setNextLevelSpiritXp(nextLevelSpiritXp);

        if (p.getVoie() != null) {
            PersonnageResponseDTO.VoieRef voie = new PersonnageResponseDTO.VoieRef();
            voie.setId(p.getVoie().getId());
            voie.setNom(p.getVoie().getNom());
            dto.setVoie(voie);
        }
        if (p.getSpiritualite() != null) {
            PersonnageResponseDTO.SpiritualiteRef spirit = new PersonnageResponseDTO.SpiritualiteRef();
            spirit.setId(p.getSpiritualite().getId());
            spirit.setNom(p.getSpiritualite().getNom());
            dto.setSpiritualite(spirit);
        }

        return dto;
    }
}
