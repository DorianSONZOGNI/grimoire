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

    public EquipmentController(EquipmentRepository equipmentRepository,
                               PersonnageService personnageService) {
        this.equipmentRepository = equipmentRepository;
        this.personnageService = personnageService;
    }

    /** Liste tous les équipements */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(equipmentRepository.findAll().stream().map(this::toDto).toList());
    }

    /** Liste les équipements d'un personnage */
    @GetMapping("/personnage/{personnageId}")
    public ResponseEntity<List<Map<String, Object>>> getByPersonnage(@PathVariable Long personnageId) {
        return ResponseEntity.ok(
                equipmentRepository.findByPersonnageId(personnageId).stream().map(this::toDto).toList());
    }

    /** Liste les équipements non-assignés (inventaire libre) */
    @GetMapping("/unassigned")
    public ResponseEntity<List<Map<String, Object>>> getUnassigned() {
        return ResponseEntity.ok(
                equipmentRepository.findByPersonnageIsNull().stream().map(this::toDto).toList());
    }

    /** Créer ou mettre à jour un équipement */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrUpdate(@RequestBody EquipmentDto dto) {
        Equipment equipment;
        boolean isUpdate = false;

        if (dto.getId() != null && equipmentRepository.existsById(dto.getId())) {
            equipment = equipmentRepository.findById(dto.getId()).orElseThrow();
            isUpdate = true;
        } else {
            equipment = new Equipment();
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
            Personnage personnage = personnageService.findByIdOrThrow(dto.getPersonnageId());

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
        } else {
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
            @PathVariable Long equipmentId,
            @PathVariable Long personnageId) {

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("Équipement non trouvé."));
        Personnage personnage = personnageService.findByIdOrThrow(personnageId);

        try {
            validateRarityLimit(personnage, equipment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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
    public ResponseEntity<Map<String, Object>> unequip(@PathVariable Long equipmentId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("Équipement non trouvé."));

        String charName = equipment.getPersonnage() != null ? equipment.getPersonnage().getName() : "Inconnu";
        equipment.setPersonnage(null);
        equipmentRepository.save(equipment);

        Map<String, Object> response = new HashMap<>();
        response.put("message", charName + " retire \"" + equipment.getName() + "\".");
        return ResponseEntity.ok(response);
    }

    /** Supprimer un équipement */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        if (equipmentRepository.existsById(id)) {
            equipmentRepository.deleteById(id);
            return ResponseEntity.ok("Équipement supprimé.");
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
    }
}
