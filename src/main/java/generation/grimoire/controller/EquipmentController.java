package generation.grimoire.controller;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.service.PersonnageService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentRepository equipmentRepository;
    private final PersonnageService personnageService;
    private final generation.grimoire.repository.auth.UserRepository userRepository;

    public EquipmentController(EquipmentRepository equipmentRepository,
                               PersonnageService personnageService,
                               generation.grimoire.repository.auth.UserRepository userRepository) {
        this.equipmentRepository = equipmentRepository;
        this.personnageService = personnageService;
        this.userRepository = userRepository;
    }

    /** Liste tous les équipements */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll(java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        
        List<Equipment> equipmentList = isAdmin ? equipmentRepository.findAll() : equipmentRepository.findByUser_Username(principal.getName());
        return ResponseEntity.ok(equipmentList.stream().filter(e -> !e.isShopTemplate()).map(this::toDto).toList());
    }

    /** Liste les équipements d'un personnage */
    @GetMapping("/personnage/{personnageId}")
    public ResponseEntity<List<Map<String, Object>>> getByPersonnage(@PathVariable Long personnageId, java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        // Optionnel : on pourrait vérifier si le personnage appartient à l'utilisateur
        return ResponseEntity.ok(
                equipmentRepository.findByPersonnageId(personnageId).stream()
                        .filter(e -> isAdmin || (e.getUser() != null && e.getUser().getUsername().equals(principal.getName())))
                        .map(this::toDto).toList());
    }

    /** Liste les équipements non-assignés (inventaire libre) */
    @GetMapping("/unassigned")
    public ResponseEntity<List<Map<String, Object>>> getUnassigned(java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        return ResponseEntity.ok(
                equipmentRepository.findByPersonnageIsNull().stream()
                        .filter(e -> !e.isShopTemplate())
                        .filter(e -> isAdmin || (e.getUser() != null && e.getUser().getUsername().equals(principal.getName())))
                        .map(this::toDto).toList());
    }

    /** Créer ou mettre à jour un équipement */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrUpdate(@RequestBody EquipmentDto dto, java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        generation.grimoire.entity.auth.AppUser currentUser = userRepository.findByUsername(principal.getName()).orElse(null);
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        Equipment equipment;
        boolean isUpdate = false;

        if (dto.getId() != null && equipmentRepository.existsById(java.util.Objects.requireNonNull(dto.getId()))) {
            equipment = equipmentRepository.findById(java.util.Objects.requireNonNull(dto.getId())).orElseThrow();
            if (!isAdmin && equipment.getUser() != null && !equipment.getUser().getUsername().equals(principal.getName())) {
                return ResponseEntity.status(403).build();
            }
            isUpdate = true;
        } else {
            equipment = new Equipment();
            equipment.setUser(currentUser);
        }

        equipment.setName(dto.getName());
        equipment.setSlot(dto.getSlot());
        equipment.setBonusHealthMax(dto.getBonusHealthMax());
        equipment.setBonusManaMax(dto.getBonusManaMax());
        equipment.setBonusPower(dto.getBonusPower());
        equipment.setBonusStrength(dto.getBonusStrength());
        equipment.setBonusArmor(dto.getBonusArmor());
        equipment.setBonusResistance(dto.getBonusResistance());
        equipment.setBonusSpeed(dto.getBonusSpeed());
        equipment.setBonusCrit(dto.getBonusCrit());
        equipment.setRegenHealthPerTurn(dto.getRegenHealthPerTurn());
        equipment.setRegenManaPerTurn(dto.getRegenManaPerTurn());
        if (dto.getRarity() != null) {
            equipment.setRarity(dto.getRarity());
        }
        if (dto.getSpecialEffect() != null) {
            equipment.setSpecialEffect(dto.getSpecialEffect());
        }
        equipment.setSpecialEffectValue(dto.getSpecialEffectValue());

        // Assigner à un personnage si fourni
        if (dto.getPersonnageId() != null) {
            Personnage personnage = personnageService.findByIdOrThrow(java.util.Objects.requireNonNull(dto.getPersonnageId()));

            // Si l'admin forge pour un autre joueur, l'objet doit appartenir à ce joueur
            if (personnage.getUser() != null && (equipment.getUser() == null || equipment.getUser().getId().equals(currentUser.getId()))) {
                equipment.setUser(personnage.getUser());
            }

            try {
                validateRarityLimit(personnage, equipment);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
            }

            // Vérifier si le slot est déjà occupé
            equipmentRepository.findByPersonnageIdAndSlot(personnage.getId(), dto.getSlot())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(equipment.getId())) {
                            existing.setPersonnage(null);
                            equipmentRepository.save(existing);
                        }
                    });

            equipment.setPersonnage(personnage);
        } else if (!isUpdate) {
            equipment.setPersonnage(null);
        }

        Equipment saved = equipmentRepository.save(equipment);

        Map<String, Object> response = new HashMap<>();
        response.put("message", isUpdate
                ? "Équipement \"" + saved.getName() + "\" mis à jour."
                : "Équipement \"" + saved.getName() + "\" créé.");
        response.put("equipment", toDto(saved));
        return ResponseEntity.ok(response);
    }

    /** Équiper un objet sur un personnage (remplace l'ancien dans le même slot) */
    @PostMapping("/{equipmentId}/equip/{personnageId}")
    public ResponseEntity<Map<String, Object>> equip(
            @PathVariable @org.springframework.lang.NonNull Long equipmentId,
            @PathVariable @org.springframework.lang.NonNull Long personnageId,
            @RequestParam(required = false) generation.grimoire.enumeration.EquipmentSlot targetSlot,
            java.security.Principal principal) {
        
        if (principal == null) return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("Équipement non trouvé."));
        Personnage personnage = personnageService.findByIdOrThrow(personnageId);

        if (!isAdmin && equipment.getUser() != null && !equipment.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }
        if (!isAdmin && personnage.getUser() != null && !personnage.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }

        try {
            validateRarityLimit(personnage, equipment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        // Si on précise un slot cible (ex: changer un anneau de main), on met à jour l'équipement
        generation.grimoire.enumeration.EquipmentSlot finalSlot = targetSlot != null ? targetSlot : equipment.getSlot();

        // Si l'admin équipe un de ses propres objets sur le personnage d'un autre joueur, on duplique l'objet
        if (isAdmin && equipment.getUser() != null && personnage.getUser() != null
                && !equipment.getUser().getId().equals(personnage.getUser().getId())) {
            
            Equipment duplicate = new Equipment();
            duplicate.setUser(personnage.getUser());
            duplicate.setName(equipment.getName());
            duplicate.setSlot(finalSlot);
            duplicate.setBonusHealthMax(equipment.getBonusHealthMax());
            duplicate.setBonusManaMax(equipment.getBonusManaMax());
            duplicate.setBonusPower(equipment.getBonusPower());
            duplicate.setBonusStrength(equipment.getBonusStrength());
            duplicate.setBonusArmor(equipment.getBonusArmor());
            duplicate.setBonusResistance(equipment.getBonusResistance());
            duplicate.setBonusSpeed(equipment.getBonusSpeed());
            duplicate.setBonusCrit(equipment.getBonusCrit());
            duplicate.setRegenHealthPerTurn(equipment.getRegenHealthPerTurn());
            duplicate.setRegenManaPerTurn(equipment.getRegenManaPerTurn());
            duplicate.setRarity(equipment.getRarity());
            duplicate.setSpecialEffect(equipment.getSpecialEffect());
            duplicate.setSpecialEffectValue(equipment.getSpecialEffectValue());

            equipmentRepository.findByPersonnageIdAndSlot(personnageId, finalSlot)
                    .ifPresent(old -> {
                        old.setPersonnage(null);
                        equipmentRepository.save(old);
                    });

            duplicate.setPersonnage(personnage);
            equipmentRepository.save(duplicate);

            Map<String, Object> response = new HashMap<>();
            response.put("message", personnage.getName() + " équipe une copie de \"" + duplicate.getName() + "\".");
            return ResponseEntity.ok(response);
        }

        if (targetSlot != null) {
            equipment.setSlot(targetSlot);
        }

        // Retirer l'ancien équipement du même slot
        equipmentRepository.findByPersonnageIdAndSlot(personnageId, equipment.getSlot())
                .ifPresent(old -> {
                    old.setPersonnage(null);
                    equipmentRepository.save(old);
                });

        equipment.setPersonnage(personnage);
        equipmentRepository.save(equipment);

        Map<String, Object> response = new HashMap<>();
        response.put("message", personnage.getName() + " équipe \"" + equipment.getName() + "\".");
        return ResponseEntity.ok(response);
    }

    /** Déséquiper un objet */
    @PostMapping("/{equipmentId}/unequip")
    public ResponseEntity<Map<String, Object>> unequip(@PathVariable @org.springframework.lang.NonNull Long equipmentId, java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("Équipement non trouvé."));

        if (!isAdmin && equipment.getUser() != null && !equipment.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }

        String charName = equipment.getPersonnage() != null ? equipment.getPersonnage().getName() : "Inconnu";
        equipment.setPersonnage(null);
        equipmentRepository.save(equipment);

        Map<String, Object> response = new HashMap<>();
        response.put("message", charName + " retire \"" + equipment.getName() + "\".");
        return ResponseEntity.ok(response);
    }

    /** Supprimer un équipement */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable @org.springframework.lang.NonNull Long id, java.security.Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        Equipment equipment = equipmentRepository.findById(id).orElse(null);
        if (equipment != null) {
            if (!isAdmin && equipment.getUser() != null && !equipment.getUser().getUsername().equals(principal.getName())) {
                return ResponseEntity.status(403).build();
            }
            
            if (!isAdmin && equipment.getUser() != null) {
                generation.grimoire.entity.auth.AppUser owner = equipment.getUser();
                owner.setMonnaie(owner.getMonnaie() + equipment.calculateWeight());
                userRepository.save(owner);
            }

            equipmentRepository.deleteById(id);
            return ResponseEntity.ok("Équipement supprimé et monnaie ajoutée.");
        }
        return ResponseEntity.notFound().build();
    }

    private void validateRarityLimit(Personnage personnage, Equipment newEquipment) {
        if (newEquipment.getRarity() == generation.grimoire.enumeration.EquipmentRarity.EPIQUE) {
            boolean hasEpic = equipmentRepository.findByPersonnageId(personnage.getId()).stream()
                    .anyMatch(e -> e.getRarity() == generation.grimoire.enumeration.EquipmentRarity.EPIQUE 
                            && (newEquipment.getId() == null || !e.getId().equals(newEquipment.getId()))
                            && e.getSlot() != newEquipment.getSlot()); // Ignorer si c'est pour remplacer le même slot
            if (hasEpic) {
                throw new IllegalArgumentException("Impossible d'équiper plus d'un objet Épique.");
            }
        }
        if (newEquipment.getRarity() == generation.grimoire.enumeration.EquipmentRarity.RELIQUE) {
            boolean hasRelic = equipmentRepository.findByPersonnageId(personnage.getId()).stream()
                    .anyMatch(e -> e.getRarity() == generation.grimoire.enumeration.EquipmentRarity.RELIQUE 
                            && (newEquipment.getId() == null || !e.getId().equals(newEquipment.getId()))
                            && e.getSlot() != newEquipment.getSlot());
            if (hasRelic) {
                throw new IllegalArgumentException("Impossible d'équiper plus d'une Relique.");
            }
        }
    }

    private Map<String, Object> toDto(Equipment e) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", e.getId());
        map.put("name", e.getName());
        map.put("slot", e.getSlot());
        map.put("bonusHealthMax", e.getBonusHealthMax());
        map.put("bonusManaMax", e.getBonusManaMax());
        map.put("bonusPower", e.getBonusPower());
        map.put("bonusStrength", e.getBonusStrength());
        map.put("bonusArmor", e.getBonusArmor());
        map.put("bonusResistance", e.getBonusResistance());
        map.put("bonusSpeed", e.getBonusSpeed());
        map.put("bonusCrit", e.getBonusCrit());
        map.put("regenHealthPerTurn", e.getRegenHealthPerTurn());
        map.put("regenManaPerTurn", e.getRegenManaPerTurn());
        map.put("rarity", e.getRarity());
        map.put("specialEffect", e.getSpecialEffect());
        map.put("specialEffectValue", e.getSpecialEffectValue());

        if (e.getPersonnage() != null) {
            Map<String, Object> perso = new HashMap<>();
            perso.put("id", e.getPersonnage().getId());
            perso.put("name", e.getPersonnage().getName());
            map.put("personnage", perso);
        }

        if (e.getUser() != null) {
            map.put("ownerUsername", e.getUser().getUsername());
        }

        return map;
    }

    @Data
    public static class EquipmentDto {
        private Long id;
        private String name;
        private EquipmentSlot slot;
        private int bonusHealthMax = 0;
        private int bonusManaMax = 0;
        private int bonusPower = 0;
        private int bonusStrength = 0;
        private int bonusArmor = 0;
        private int bonusResistance = 0;
        private int bonusSpeed = 0;
        private int bonusCrit = 0;
        private int regenHealthPerTurn = 0;
        private int regenManaPerTurn = 0;
        private generation.grimoire.enumeration.EquipmentRarity rarity;
        private generation.grimoire.enumeration.EquipmentEffectType specialEffect;
        private int specialEffectValue = 0;
        private Long personnageId;
        private java.util.Map<String, Integer> priceAnomalies = new java.util.HashMap<>();
    }
}
