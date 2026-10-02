package generation.grimoire.controller;

import generation.grimoire.dto.equipment.EquipmentRequestDTO;
import generation.grimoire.dto.equipment.EquipmentShopDTO;
import generation.grimoire.dto.shop.ShopStatusDTO;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.Anomalie;
import generation.grimoire.mapper.EquipmentMapper;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.enumeration.EquipmentRarity;
import generation.grimoire.enumeration.EquipmentSlot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shop")
public class ShopController {

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnomalieRepository anomalieRepository;

    @Autowired
    private generation.grimoire.service.RenameCascadeService renameCascadeService;

    @Autowired
    private EquipmentMapper equipmentMapper;

    @Autowired
    private generation.grimoire.repository.ShopUpgradeConfigRepository shopUpgradeConfigRepository;

    // ============================================================
    // NIVEAUX BOUTIQUE — lecture depuis BDD
    // ============================================================

    private generation.grimoire.entity.ShopUpgradeConfig getUpgradeConfigFromDb(int targetLevel) {
        return shopUpgradeConfigRepository.findByTargetLevel(targetLevel).orElse(null);
    }

    // --- DAILY SHOP ---

    @GetMapping("/level")
    public ResponseEntity<?> getShopLevel(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).build();

        int currentLevel = user.getShopLevel();
        int nextLevel = currentLevel + 1;
        var config = getUpgradeConfigFromDb(nextLevel);

        if (config == null) {
            return ResponseEntity.ok(new ShopStatusDTO(currentLevel, null, null, List.of(), false));
        }

        List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());
        List<ShopStatusDTO.UpgradeRequirementDTO> reqs = new ArrayList<>();
        boolean canUpgrade = true;

        if (config.getGoldCost() > 0) {
            boolean ok = user.getMonnaie() >= config.getGoldCost();
            reqs.add(new ShopStatusDTO.UpgradeRequirementDTO(
                    "GOLD", "Or", config.getGoldCost(), (int) user.getMonnaie(), ok));
            if (!ok) canUpgrade = false;
        }

        for (Map.Entry<String, Integer> entry : config.getAnomalyCost().entrySet()) {
            long owned = userAnomalies.stream().filter(a -> entry.getKey().equals(a.getName())).count();
            boolean ok = owned >= entry.getValue();
            reqs.add(new ShopStatusDTO.UpgradeRequirementDTO(
                    "ANOMALIE", entry.getKey(), entry.getValue(), (int) owned, ok));
            if (!ok) canUpgrade = false;
        }

        return ResponseEntity.ok(new ShopStatusDTO(currentLevel, nextLevel, config.getDescription(), reqs, canUpgrade));
    }

    @PostMapping("/upgrade")
    public ResponseEntity<?> upgradeShop(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).build();

        int nextLevel = user.getShopLevel() + 1;
        var config = getUpgradeConfigFromDb(nextLevel);
        if (config == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Niveau maximum atteint ou non configuré."));
        }

        if (user.getMonnaie() < config.getGoldCost()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Or insuffisant."));
        }

        List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());
        List<Anomalie> toConsume = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : config.getAnomalyCost().entrySet()) {
            List<Anomalie> matches = userAnomalies.stream()
                    .filter(a -> entry.getKey().equals(a.getName()))
                    .collect(Collectors.toList());
            if (matches.size() < entry.getValue()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Anomalie manquante : " + entry.getKey()));
            }
            toConsume.addAll(matches.subList(0, entry.getValue()));
        }

        user.setMonnaie(user.getMonnaie() - config.getGoldCost());
        user.setShopLevel(nextLevel);
        userRepository.save(user);
        if (!toConsume.isEmpty()) anomalieRepository.deleteAll(toConsume);

        return ResponseEntity.ok(Map.of("message", "Boutique améliorée au niveau " + nextLevel + " !", "newLevel", nextLevel));
    }

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> getDailyShop(Principal principal) {
        AppUser user = null;
        if (principal != null) {
            user = userRepository.findByUsername(principal.getName()).orElse(null);
        }

        int shopLevel = (user != null) ? user.getShopLevel() : 1;

        final java.util.Set<String> ownedEquipments = new java.util.HashSet<>();
        if (user != null) {
            java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Paris"));
            if (today.equals(user.getLastShopPurchaseDate()) && user.getDailyShopPurchases() != null) {
                ownedEquipments.addAll(user.getDailyShopPurchases());
            }
        }

        List<Equipment> templates = equipmentRepository.findByIsTemplateTrueAndAvailableInShopTrue();

        List<Equipment> equipmentTemplates = templates.stream()
                .filter(e -> e.getSlot() != EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> allConsumables = templates.stream()
                .filter(e -> e.getSlot() == EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> commons    = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> unusuals   = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.INHABITUEL).toList();
        List<Equipment> rares      = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries= equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE).toList();

        long seed = LocalDate.now(java.time.ZoneId.of("Europe/Paris")).toEpochDay();
        Random random = new Random(seed);

        List<Equipment> dailySelection = new ArrayList<>();
        // Slot 1-3 : COMMUN (toujours dispo)
        dailySelection.addAll(pickRandom(commons, 3, random));

        // Slot 4 : INHABITUEL — débloqué au niveau 2 (pas de RARE encore)
        List<LockedSlotDTO> lockedSlots = new ArrayList<>();
        if (shopLevel >= 2) {
            dailySelection.addAll(pickRandom(unusuals, 1, random));
        } else {
            // Consommer le random pour garder la cohérence du seed
            pickRandom(unusuals, 1, random);
            lockedSlots.add(new LockedSlotDTO(4, "Niveau 2", "Améliorer la boutique pour débloquer ce slot"));
        }

        List<Equipment> consumableTemplates = pickRandom(allConsumables, 4, random);

        // Promo (toutes les 2h)
        List<Equipment> remainingTemplates = new ArrayList<>(equipmentTemplates);
        remainingTemplates.removeAll(dailySelection);

        long currentEpochMillis = System.currentTimeMillis();
        long twoHoursInMillis = 2 * 60 * 60 * 1000L;
        long promoSeed = currentEpochMillis / twoHoursInMillis;
        Random promoRandom = new Random(promoSeed);
        long promoExpiresAt = (promoSeed + 1) * twoHoursInMillis;

        Equipment promoItem = null;
        if (!remainingTemplates.isEmpty()) {
            promoItem = remainingTemplates.get(promoRandom.nextInt(remainingTemplates.size()));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("shopLevel", shopLevel);
        response.put("lockedSlots", lockedSlots);
        response.put("daily", dailySelection.stream().map(e -> toShopDto(e, ownedEquipments)).toList());
        response.put("promoExpiresAt", promoExpiresAt);

        if (promoItem != null) {
            EquipmentShopDTO promoDto = toShopDto(promoItem, ownedEquipments);
            double originalPrice = promoDto.getShopPrice();
            promoDto.setShopPrice(Math.ceil(originalPrice * 0.8));
            promoDto.setOriginalPrice(originalPrice);
            promoDto.setDiscount(true);
            response.put("discount", promoDto);
        }

        List<EquipmentShopDTO> consumables = consumableTemplates.stream()
                .map(e -> toShopDto(e, ownedEquipments))
                .toList();
        response.put("consumables", consumables);

        return ResponseEntity.ok(response);
    }

    /** Représente un slot verrouillé dans la grille daily. */
    private record LockedSlotDTO(int slotNumber, String requiredLevel, String hint) {}


    private List<Equipment> pickRandom(List<Equipment> source, int count, Random random) {
        if (source.isEmpty())
            return new ArrayList<>();
        List<Equipment> copy = new ArrayList<>(source);
        Collections.shuffle(copy, random);
        return copy.subList(0, Math.min(count, copy.size()));
    }

    @PostMapping("/buy/{templateId}")
    public ResponseEntity<?> buyItem(@PathVariable @org.springframework.lang.NonNull Long templateId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "1") int quantity,
            Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        Equipment template = equipmentRepository.findById(templateId).orElse(null);
        if (template == null || !template.isTemplate()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Objet introuvable dans la boutique."));
        }

        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.status(401).build();

        int shopLevel = user.getShopLevel();

        // Verify it's in today's selection
        long seed = LocalDate.now(java.time.ZoneId.of("Europe/Paris")).toEpochDay();
        Random random = new Random(seed);
        List<Equipment> allTemplates = equipmentRepository.findByIsTemplateTrueAndAvailableInShopTrue();
        
        List<Equipment> equipmentTemplates = allTemplates.stream()
                .filter(e -> e.getSlot() != EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> allConsumables = allTemplates.stream()
                .filter(e -> e.getSlot() == EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> commons    = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> unusuals   = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.INHABITUEL).toList();
        List<Equipment> rares      = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries= equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE).toList();

        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        // Slot 4 INHABITUEL : accessible seulement niveau 2+
        if (shopLevel >= 2) {
            dailySelection.addAll(pickRandom(unusuals, 1, random));
        } else {
            pickRandom(unusuals, 1, random); // consume seed
        }

        List<Equipment> consumableTemplates = pickRandom(allConsumables, 4, random);

        List<Equipment> remainingTemplates = new ArrayList<>(equipmentTemplates);
        remainingTemplates.removeAll(dailySelection);
        
        long currentEpochMillis = System.currentTimeMillis();
        long twoHoursInMillis = 2 * 60 * 60 * 1000L;
        long promoSeed = currentEpochMillis / twoHoursInMillis;
        Random promoRandom = new Random(promoSeed);
        
        Equipment promoItem = null;
        if (!remainingTemplates.isEmpty()) {
            promoItem = remainingTemplates.get(promoRandom.nextInt(remainingTemplates.size()));
        }

        boolean isDaily = dailySelection.stream().anyMatch(e -> e.getId().equals(templateId));
        boolean isPromo = promoItem != null && promoItem.getId().equals(templateId);
        boolean isConsumable = consumableTemplates.stream().anyMatch(e -> e.getId().equals(templateId));

        if (!isDaily && !isPromo && !isConsumable) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cet objet n'est pas en vente aujourd'hui."));
        }

        double price = template.calculateShopPrice();
        if (isPromo) {
            price = Math.ceil(price * 0.8);
        }

        if (quantity < 1) quantity = 1;
        if (template.getSlot() != EquipmentSlot.CONSOMMABLE && quantity > 1) {
            quantity = 1;
        }
        
        double totalGoldPrice = price * quantity;
        if (user.getMonnaie() < totalGoldPrice) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fonds insuffisants en or."));
        }

        if (template.getSlot() != EquipmentSlot.CONSOMMABLE) {
            java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Paris"));
            if (user.getLastShopPurchaseDate() == null || !user.getLastShopPurchaseDate().equals(today)) {
                user.setLastShopPurchaseDate(today);
                if (user.getDailyShopPurchases() != null) {
                    user.getDailyShopPurchases().clear();
                } else {
                    user.setDailyShopPurchases(new java.util.HashSet<>());
                }
            }
            
            boolean alreadyOwns = user.getDailyShopPurchases().contains(template.getName());
            if (alreadyOwns) {
                return ResponseEntity.badRequest().body(Map.of("message", "Vous avez déjà acheté cet objet aujourd'hui."));
            }
            user.getDailyShopPurchases().add(template.getName());
        }

        List<Anomalie> toConsumeList = new ArrayList<>();
        List<String> missingAnomaliesMsg = new ArrayList<>();
        if (template.getPriceAnomalies() != null && !template.getPriceAnomalies().isEmpty()) {
            List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());

            for (Map.Entry<String, Integer> entry : template.getPriceAnomalies().entrySet()) {
                String reqName = entry.getKey();
                int reqQuantity = entry.getValue() * quantity;

                List<Anomalie> matches = userAnomalies.stream()
                        .filter(a -> a.getName() != null && a.getName().equals(reqName))
                        .collect(Collectors.toList());

                if (matches.size() < reqQuantity) {
                    missingAnomaliesMsg.add(reqName + " (" + matches.size() + "/" + reqQuantity + ")");
                } else {
                    boolean isAdmin = "ADMIN".equals(user.getRole());
                    int qtyToConsume = reqQuantity;
                    if (isAdmin && matches.size() == reqQuantity) {
                        qtyToConsume = reqQuantity - 1;
                        if (qtyToConsume < 0) qtyToConsume = 0;
                    }

                    for (int i = 0; i < qtyToConsume; i++) {
                        toConsumeList.add(matches.get(i));
                        userAnomalies.remove(matches.get(i));
                    }
                }
            }
            if (!missingAnomaliesMsg.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Fonds insuffisants. Il vous manque des anomalies : " + String.join(", ", missingAnomaliesMsg)));
            }
        }

        // Deductions
        user.setMonnaie(user.getMonnaie() - totalGoldPrice);
        userRepository.save(user);

        if (!toConsumeList.isEmpty()) {
            anomalieRepository.deleteAll(toConsumeList);
        }

        // Clone equipment(s)
        List<Equipment> toSave = new ArrayList<>();
        for (int i = 0; i < quantity; i++) {
            Equipment clone = new Equipment();
            clone.copyStatsFrom(template);
            clone.setTemplate(false);
            clone.setUser(user);
            clone.setOwnerUsername(user.getUsername());
            toSave.add(clone);
        }
        equipmentRepository.saveAll(toSave);
        user.getDiscoveredItems().add(template.getName());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Achat réussi !"));
    }



    // --- ADMIN TEMPLATES CRUD ---

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();
        List<Equipment> templates = equipmentRepository.findByIsTemplateTrueAndAvailableInShopTrue();
        return ResponseEntity.ok(templates.stream().map(e -> toShopDto(e, java.util.Collections.emptySet())).toList());
    }

    @PostMapping("/templates")
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<?> createTemplate(
            @RequestBody EquipmentRequestDTO dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        Equipment eq = new Equipment();
        equipmentMapper.updateEntity(dto, eq);
        eq.setTemplate(true);
        eq.setOwnerUsername("MODELE");
        eq.setUser(null);
        equipmentRepository.save(eq);
        return ResponseEntity.ok(toShopDto(eq, java.util.Collections.emptySet()));
    }

    @PutMapping("/templates/{id}")
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<?> updateTemplate(@PathVariable @org.springframework.lang.NonNull Long id,
            @RequestBody EquipmentRequestDTO dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        return equipmentRepository.findById(id).map(eq -> {
            if (!eq.isTemplate())
                return ResponseEntity.badRequest().body(Map.of("message", "Not a template"));

            String oldName = eq.getName();
            equipmentMapper.updateEntity(dto, eq);
            equipmentRepository.save(eq);

            if (oldName != null && !oldName.isEmpty()) {
                List<Equipment> instances = equipmentRepository.findByName(oldName);
                for (Equipment instance : instances) {
                    if (instance.getId().equals(eq.getId()))
                        continue;
                    equipmentMapper.updateEntity(dto, instance);
                    instance.setTemplate(false);
                    equipmentRepository.save(instance);
                }
                renameCascadeService.cascadeEquipmentRename(oldName, eq.getName());
            }

            return ResponseEntity.ok(toShopDto(eq, java.util.Collections.emptySet()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{id}")
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<?> deleteTemplate(@PathVariable @org.springframework.lang.NonNull Long id,
            Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        return equipmentRepository.findById(id).map(eq -> {
            if (eq.isTemplate()) {
                equipmentRepository.delete(eq);
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.badRequest().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ============================================================
    // ADMIN — CRUD paliers d'amélioration boutique
    // ============================================================

    @GetMapping("/admin/upgrades")
    public ResponseEntity<?> getUpgradeConfigs(Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(shopUpgradeConfigRepository.findAll());
    }

    @PostMapping("/admin/upgrades")
    public ResponseEntity<?> createUpgradeConfig(
            @RequestBody generation.grimoire.entity.ShopUpgradeConfig dto, Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        if (shopUpgradeConfigRepository.findByTargetLevel(dto.getTargetLevel()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Un palier niveau " + dto.getTargetLevel() + " existe déjà."));
        }
        dto.setId(null);
        return ResponseEntity.ok(shopUpgradeConfigRepository.save(dto));
    }

    @PutMapping("/admin/upgrades/{id}")
    public ResponseEntity<?> updateUpgradeConfig(
            @PathVariable Long id,
            @RequestBody generation.grimoire.entity.ShopUpgradeConfig dto, Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        return shopUpgradeConfigRepository.findById(id).map(existing -> {
            existing.setTargetLevel(dto.getTargetLevel());
            existing.setDescription(dto.getDescription());
            existing.setGoldCost(dto.getGoldCost());
            existing.setAnomalyCost(dto.getAnomalyCost() != null ? dto.getAnomalyCost() : new java.util.HashMap<>());
            
            existing.setUnlocksSlot4(dto.isUnlocksSlot4());
            existing.setUnlocksSlot5(dto.isUnlocksSlot5());
            existing.setUnlocksPromo(dto.isUnlocksPromo());
            existing.setUnlocksBlackMarket(dto.isUnlocksBlackMarket());
            
            existing.getSlotRules().clear();
            if (dto.getSlotRules() != null) {
                existing.getSlotRules().addAll(dto.getSlotRules());
            }

            return ResponseEntity.ok(shopUpgradeConfigRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/upgrades/{id}")
    public ResponseEntity<?> deleteUpgradeConfig(
            @PathVariable Long id, Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        if (!shopUpgradeConfigRepository.existsById(id)) return ResponseEntity.notFound().build();
        shopUpgradeConfigRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- HELPERS ---

    private boolean isAdmin(Principal principal) {
        return ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
    }

    private EquipmentShopDTO toShopDto(Equipment e, java.util.Set<String> ownedEquipments) {
        EquipmentShopDTO dto = equipmentMapper.toShopDto(e);
        
        double shopPrice = e.calculateShopPrice();
        if (e.getSlot() == EquipmentSlot.CONSOMMABLE && e.getName() != null) {
            String nameLower = e.getName().toLowerCase().trim();
            if (nameLower.equals("corde")) shopPrice = 15;
            else if (nameLower.equals("clé")) shopPrice = 25;
            else if (nameLower.equals("pain")) shopPrice = 5;
            else if (nameLower.equals("potion de mana")) shopPrice = 10;
        }
        dto.setShopPrice(shopPrice);
        
        if (e.getSlot() != EquipmentSlot.CONSOMMABLE && ownedEquipments != null && e.getName() != null) {
            dto.setAlreadyOwned(ownedEquipments.contains(e.getName()));
        } else {
            dto.setAlreadyOwned(false);
        }
        
        return dto;
    }
}
