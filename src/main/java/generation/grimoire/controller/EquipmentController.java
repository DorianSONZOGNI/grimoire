package generation.grimoire.controller;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.pve.LootEntryRepository;
import generation.grimoire.service.PersonnageService;
import jakarta.transaction.Transactional;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/equipments")
public class EquipmentController {

    private final EquipmentRepository equipmentRepository;
    private final PersonnageService personnageService;
    private final generation.grimoire.repository.auth.UserRepository userRepository;
    private final LootEntryRepository lootEntryRepository;
    private final generation.grimoire.service.RenameCascadeService renameCascadeService;

    public EquipmentController(EquipmentRepository equipmentRepository,
            PersonnageService personnageService,
            generation.grimoire.repository.auth.UserRepository userRepository,
            LootEntryRepository lootEntryRepository,
            generation.grimoire.service.RenameCascadeService renameCascadeService) {
        this.equipmentRepository = equipmentRepository;
        this.personnageService = personnageService;
        this.userRepository = userRepository;
        this.lootEntryRepository = lootEntryRepository;
        this.renameCascadeService = renameCascadeService;
    }

    /** Liste tous les équipements du joueur */
    @GetMapping
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getAll(java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        List<Equipment> equipmentList = equipmentRepository.findByUser_Username(principal.getName());
        return ResponseEntity.ok(equipmentList.stream().filter(e -> !e.isTemplate()).map(this::toDto).toList());
    }

    /** Liste TOUS les équipements (réservé aux admins) */
    @GetMapping("/all")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getAllAdmin(java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        if (!isAdmin)
            return ResponseEntity.status(403).build();

        List<Equipment> equipmentList = equipmentRepository.findAll();
        return ResponseEntity.ok(equipmentList.stream().map(this::toDto).toList());
    }

    /** Récupérer tous les templates publiquement */
    @GetMapping("/templates/public")
    @org.springframework.cache.annotation.Cacheable("publicEquipmentTemplates")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getPublicTemplates() {
        List<Equipment> allTemplates = equipmentRepository.findByIsTemplateTrue();
        java.util.Map<String, Equipment> uniqueMap = new java.util.HashMap<>();
        for (Equipment e : allTemplates) {
            if (e.getName() != null && !e.getName().trim().isEmpty()) {
                if (!uniqueMap.containsKey(e.getName()) || uniqueMap.get(e.getName()).getId() > e.getId()) {
                    uniqueMap.put(e.getName(), e);
                }
            }
        }
        return ResponseEntity.ok(uniqueMap.values().stream().map(this::toDto).toList());
    }

    /** Liste les équipements d'un personnage */
    @GetMapping("/personnage/{personnageId}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getByPersonnage(@PathVariable Long personnageId,
            java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        // Optionnel : on pourrait vérifier si le personnage appartient à l'utilisateur
        return ResponseEntity.ok(
                equipmentRepository.findByPersonnageId(personnageId).stream()
                        .filter(e -> isAdmin
                                || (e.getUser() != null && e.getUser().getUsername().equals(principal.getName())))
                        .map(this::toDto).toList());
    }

    /** Liste les équipements non-assignés (inventaire libre) */
    @GetMapping("/unassigned")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getUnassigned(java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        return ResponseEntity.ok(
                equipmentRepository.findByPersonnageIsNullAndUser_Username(principal.getName()).stream()
                        .filter(e -> !e.isTemplate())
                        .map(this::toDto).toList());
    }

    /**
     * Calcule le poids d'un équipement en fonction de ses statistiques (Règle B4)
     */
    @PostMapping("/simulate-weight")
    public ResponseEntity<Map<String, Double>> simulateWeight(@RequestBody EquipmentDto dto) {
        Equipment temp = new Equipment();
        updateEquipmentFromDto(temp, dto);

        double weight = temp.calculateWeight();
        double maxWeight = getMaxWeight(dto.getSlot(), dto.getRarity());
        double shopPrice = temp.calculateShopPrice();

        Map<String, Double> response = new HashMap<>();
        response.put("weight", weight);
        response.put("maxWeight", maxWeight);
        response.put("shopPrice", shopPrice);
        return ResponseEntity.ok(response);
    }

    @SuppressWarnings("deprecation")
    private double getMaxWeight(EquipmentSlot slot, generation.grimoire.enumeration.EquipmentRarity rarity) {
        if (slot == null || rarity == null)
            return 5.0;
        switch (slot) {
            case CASQUE:
            case CAPE:
                switch (rarity) {
                    case COMMUN:
                        return 5;
                    case INHABITUEL:
                        return 9;
                    case RARE:
                        return 14;
                    case MYTHIQUE:
                        return 18;
                    case LEGENDAIRE:
                        return 22;
                    case EPIQUE:
                        return 35;
                    case RELIQUE:
                        return 40;
                    case MAUDIT:
                        return 27;
                }
                break;
            case PLASTRON:
            case ARME_DEUX_MAINS:
                switch (rarity) {
                    case COMMUN:
                        return 9;
                    case INHABITUEL:
                        return 14;
                    case RARE:
                        return 19;
                    case MYTHIQUE:
                        return 24;
                    case LEGENDAIRE:
                        return 29;
                    case EPIQUE:
                        return 40;
                    case RELIQUE:
                        return 46;
                    case MAUDIT:
                        return 35;
                }
                break;
            case ANNEAU_GAUCHE:
            case ANNEAU_DROIT:
                switch (rarity) {
                    case COMMUN:
                        return 3;
                    case INHABITUEL:
                        return 4;
                    case RARE:
                        return 6;
                    case MYTHIQUE:
                        return 8;
                    case LEGENDAIRE:
                        return 10;
                    case EPIQUE:
                        return 15;
                    case RELIQUE:
                        return 17;
                    case MAUDIT:
                        return 12;
                }
                break;
            case BOTTES:
                switch (rarity) {
                    case COMMUN:
                        return 4;
                    case INHABITUEL:
                        return 8;
                    case RARE:
                        return 12;
                    case MYTHIQUE:
                        return 15;
                    case LEGENDAIRE:
                        return 19;
                    case EPIQUE:
                        return 30;
                    case RELIQUE:
                        return 34;
                    case MAUDIT:
                        return 25;
                }
                break;
            case ARME:
            case ARME_GAUCHE:
            case ARME_DROITE:
                switch (rarity) {
                    case COMMUN:
                        return 5;
                    case INHABITUEL:
                        return 7;
                    case RARE:
                        return 10;
                    case MYTHIQUE:
                        return 12;
                    case LEGENDAIRE:
                        return 15;
                    case EPIQUE:
                        return 20;
                    case RELIQUE:
                        return 23;
                    case MAUDIT:
                        return 18;
                }
                break;
            case CONSOMMABLE:
                switch (rarity) {
                    case COMMUN:
                        return 5;
                    case INHABITUEL:
                        return 7;
                    case RARE:
                        return 9;
                    case MYTHIQUE:
                        return 11;
                    case LEGENDAIRE:
                        return 14;
                    case EPIQUE:
                        return 20;
                    case RELIQUE:
                        return 24;
                    case MAUDIT:
                        return 17;
                }
                break;
        }
        return 5.0;
    }

    private void updateEquipmentFromDto(Equipment equipment, EquipmentDto dto) {
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
        equipment.setBaseWeight(dto.getBaseWeight());
        equipment.setConsumableHpPercent(dto.getConsumableHpPercent());
        equipment.setConsumableManaPercent(dto.getConsumableManaPercent());
        equipment.setConsumableMissingHpPercent(dto.getConsumableMissingHpPercent());
        equipment.setConsumableMissingManaPercent(dto.getConsumableMissingManaPercent());
        if (dto.getConsumableCategory() != null) {
            equipment.setConsumableCategory(dto.getConsumableCategory());
        }
        if (dto.getAvailableInShop() != null) {
            equipment.setAvailableInShop(dto.getAvailableInShop());
        }
        if (dto.getRarity() != null) {
            equipment.setRarity(dto.getRarity());
        }
        if (dto.getSpecialEffect() != null) {
            equipment.setSpecialEffect(dto.getSpecialEffect());
        }
        equipment.setSpecialEffectValue(dto.getSpecialEffectValue());
    }

    /** Créer ou mettre à jour un équipement */
    @PostMapping
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<Map<String, Object>> createOrUpdate(@RequestBody EquipmentDto dto,
            java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        generation.grimoire.entity.auth.AppUser currentUser = userRepository.findByUsername(principal.getName())
                .orElse(null);
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        Equipment equipment;
        boolean isUpdate = false;

        if (dto.getId() != null && equipmentRepository.existsById(java.util.Objects.requireNonNull(dto.getId()))) {
            equipment = equipmentRepository.findById(java.util.Objects.requireNonNull(dto.getId())).orElseThrow();
            if (!isAdmin && equipment.getUser() != null
                    && !equipment.getUser().getUsername().equals(principal.getName())) {
                return ResponseEntity.status(403).build();
            }
            isUpdate = true;
        } else {
            equipment = new Equipment();
            if (isAdmin) {
                equipment.setTemplate(true);
                equipment.setOwnerUsername("MODELE");
                equipment.setUser(null);
            } else {
                equipment.setTemplate(false);
                equipment.setUser(currentUser);
                if (currentUser != null) {
                    equipment.setOwnerUsername(currentUser.getUsername());
                }
            }
        }

        String oldName = isUpdate ? equipment.getName() : null;
        updateEquipmentFromDto(equipment, dto);

        // Assigner à un personnage si fourni
        if (dto.getPersonnageId() != null) {
            Personnage personnage = personnageService
                    .findByIdOrThrow(java.util.Objects.requireNonNull(dto.getPersonnageId()));

            // Si l'admin forge pour un autre joueur, l'objet doit appartenir à ce joueur
            if (personnage.getUser() != null && (equipment.getUser() == null
                    || (currentUser != null && equipment.getUser().getId().equals(currentUser.getId())))) {
                equipment.setUser(personnage.getUser());
                equipment.setOwnerUsername(personnage.getUser().getUsername());
            }

            try {
                validateRarityLimit(personnage, equipment);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
            }

            // Vérifier les conflits potentiels avant de déséquiper ou assigner
            try {
                checkSlotConflicts(personnage.getId(), dto.getSlot(), equipment);
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

        Equipment saved = equipmentRepository.save(java.util.Objects.requireNonNull(equipment));

        if (isUpdate && oldName != null && !oldName.isEmpty()) {
            List<Equipment> instances = equipmentRepository.findByName(oldName);
            for (Equipment instance : instances) {
                if (instance.getId().equals(saved.getId()))
                    continue;
                updateEquipmentFromDto(instance, dto);
                equipmentRepository.save(instance);
            }
            renameCascadeService.cascadeEquipmentRename(oldName, saved.getName());
        }

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

        if (principal == null)
            return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("Équipement non trouvé."));
        Personnage personnage = personnageService.findByIdOrThrow(personnageId);

        if (!isAdmin && equipment.getUser() != null && !equipment.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }
        if (!isAdmin && personnage.getUser() != null
                && !personnage.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }

        try {
            validateRarityLimit(personnage, equipment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        // Si on précise un slot cible (ex: changer un anneau de main), on met à jour
        // l'équipement
        generation.grimoire.enumeration.EquipmentSlot finalSlot = targetSlot != null ? targetSlot : equipment.getSlot();

        // Ne jamais changer la catégorie d'une arme à 2 mains
        if (equipment.getSlot() == generation.grimoire.enumeration.EquipmentSlot.ARME_DEUX_MAINS) {
            finalSlot = generation.grimoire.enumeration.EquipmentSlot.ARME_DEUX_MAINS;
        }

        try {
            checkSlotConflicts(personnageId, finalSlot, equipment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        // Si l'admin équipe un de ses propres objets sur le personnage d'un autre
        // joueur, on duplique l'objet
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

        if (targetSlot != null
                && equipment.getSlot() != generation.grimoire.enumeration.EquipmentSlot.ARME_DEUX_MAINS) {
            equipment.setSlot(targetSlot);
        }

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

    private void checkSlotConflicts(Long personnageId, generation.grimoire.enumeration.EquipmentSlot slotToEquip, Equipment equipment) {
        if (slotToEquip == generation.grimoire.enumeration.EquipmentSlot.ARME_DEUX_MAINS) {
            if (equipmentRepository
                    .findByPersonnageIdAndSlot(personnageId, generation.grimoire.enumeration.EquipmentSlot.ARME_GAUCHE)
                    .filter(e -> equipment.getId() == null || !e.getId().equals(equipment.getId()))
                    .isPresent() ||
                    equipmentRepository.findByPersonnageIdAndSlot(personnageId,
                            generation.grimoire.enumeration.EquipmentSlot.ARME_DROITE)
                    .filter(e -> equipment.getId() == null || !e.getId().equals(equipment.getId()))
                    .isPresent()) {
                throw new IllegalArgumentException(
                        "Impossible d'équiper une arme à 2 mains : l'emplacement est déjà occupé.");
            }
        } else if (slotToEquip == generation.grimoire.enumeration.EquipmentSlot.ARME_GAUCHE
                || slotToEquip == generation.grimoire.enumeration.EquipmentSlot.ARME_DROITE) {
            if (equipmentRepository.findByPersonnageIdAndSlot(personnageId,
                    generation.grimoire.enumeration.EquipmentSlot.ARME_DEUX_MAINS)
                    .filter(e -> equipment.getId() == null || !e.getId().equals(equipment.getId()))
                    .isPresent()) {
                throw new IllegalArgumentException(
                        "Impossible d'équiper cette arme : une arme à 2 mains est déjà équipée.");
            }
        }

        if (slotToEquip == generation.grimoire.enumeration.EquipmentSlot.ANNEAU_GAUCHE) {
            equipmentRepository.findByPersonnageIdAndSlot(personnageId, generation.grimoire.enumeration.EquipmentSlot.ANNEAU_DROIT)
                    .ifPresent(otherRing -> {
                        if (otherRing.getName().equals(equipment.getName()) && (equipment.getId() == null || !otherRing.getId().equals(equipment.getId()))) {
                            throw new IllegalArgumentException("Impossible d'équiper deux anneaux identiques.");
                        }
                    });
        } else if (slotToEquip == generation.grimoire.enumeration.EquipmentSlot.ANNEAU_DROIT) {
            equipmentRepository.findByPersonnageIdAndSlot(personnageId, generation.grimoire.enumeration.EquipmentSlot.ANNEAU_GAUCHE)
                    .ifPresent(otherRing -> {
                        if (otherRing.getName().equals(equipment.getName()) && (equipment.getId() == null || !otherRing.getId().equals(equipment.getId()))) {
                            throw new IllegalArgumentException("Impossible d'équiper deux anneaux identiques.");
                        }
                    });
        }
    }

    /** Déséquiper un objet */
    @PostMapping("/{equipmentId}/unequip")
    public ResponseEntity<Map<String, Object>> unequip(@PathVariable @org.springframework.lang.NonNull Long equipmentId,
            java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
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
    @Transactional
    @DeleteMapping("/{id}")
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<String> delete(@PathVariable @org.springframework.lang.NonNull Long id,
            java.security.Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        boolean isAdmin = ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        Equipment equipment = equipmentRepository.findById(id).orElse(null);
        if (equipment != null) {
            if (!isAdmin && equipment.getUser() != null
                    && !equipment.getUser().getUsername().equals(principal.getName())) {
                return ResponseEntity.status(403).build();
            }

            if (!isAdmin && equipment.getUser() != null) {
                generation.grimoire.entity.auth.AppUser owner = equipment.getUser();
                owner.setMonnaie(owner.getMonnaie() + equipment.calculateWeight());
                userRepository.save(owner);
            }

            // Supprimer les références dans les tables de loot avant suppression
            lootEntryRepository.deleteByEquipmentId(id);

            if (equipment.getPersonnage() != null) {
                equipment.getPersonnage().getEquipments().remove(equipment);
                // On laisse orphanRemoval faire la suppression
            } else {
                equipmentRepository.deleteById(id);
            }
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
        map.put("slot", e.getSlot() != null ? e.getSlot().name() : null);
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
        map.put("rarity", e.getRarity() != null ? e.getRarity().name() : null);
        map.put("specialEffect", e.getSpecialEffect() != null ? e.getSpecialEffect().name() : null);
        map.put("specialEffectValue", e.getSpecialEffectValue());
        map.put("baseWeight", e.getBaseWeight());
        map.put("consumableHpPercent", e.getConsumableHpPercent());
        map.put("consumableManaPercent", e.getConsumableManaPercent());
        map.put("consumableMissingHpPercent", e.getConsumableMissingHpPercent());
        map.put("consumableMissingManaPercent", e.getConsumableMissingManaPercent());
        map.put("consumableCategory", e.getConsumableCategory() != null ? e.getConsumableCategory().name() : "AUTRE");
        map.put("weight", e.calculateWeight());
        map.put("maxWeight", getMaxWeight(e.getSlot(), e.getRarity()));

        if (e.getPersonnage() != null) {
            Map<String, Object> perso = new HashMap<>();
            perso.put("id", e.getPersonnage().getId());
            perso.put("name", e.getPersonnage().getName());
            map.put("personnage", perso);
        }

        if (e.getOwnerUsername() != null) {
            map.put("ownerUsername", e.getOwnerUsername());
        } else if (e.getUser() != null) {
            map.put("ownerUsername", e.getUser().getUsername());
        }
        
        map.put("isTemplate", e.isTemplate());
        map.put("availableInShop", e.isAvailableInShop());

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
        private double baseWeight = 0.0;
        private int consumableHpPercent = 0;
        private int consumableManaPercent = 0;
        private int consumableMissingHpPercent = 0;
        private int consumableMissingManaPercent = 0;
        private generation.grimoire.enumeration.ConsumableCategory consumableCategory;
        private generation.grimoire.enumeration.EquipmentRarity rarity;
        private generation.grimoire.enumeration.EquipmentEffectType specialEffect;
        private int specialEffectValue = 0;
        private Long personnageId;
        private java.util.Map<String, Integer> priceAnomalies = new java.util.HashMap<>();
        private Boolean availableInShop;
    }
}
