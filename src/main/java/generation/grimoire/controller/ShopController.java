package generation.grimoire.controller;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.Anomalie;
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

    // --- DAILY SHOP ---

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> getDailyShop() {
        List<Equipment> templates = equipmentRepository.findByIsTemplateTrueAndAvailableInShopTrue();

        List<Equipment> equipmentTemplates = templates.stream()
                .filter(e -> e.getSlot() != EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> allConsumables = templates.stream()
                .filter(e -> e.getSlot() == EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> commons = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> rares = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE).toList();

        // Seeded random based on today's date
        long seed = LocalDate.now().toEpochDay();
        Random random = new Random(seed);

        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        dailySelection.addAll(pickRandom(rares, 1, random));
        dailySelection.addAll(pickRandom(legendaries, 1, random));

        List<Equipment> consumableTemplates = pickRandom(allConsumables, 4, random);

        // Promo (rotates every 2 hours)
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
        response.put("daily", dailySelection.stream().map(this::toShopDto).toList());
        response.put("promoExpiresAt", promoExpiresAt);

        if (promoItem != null) {
            Map<String, Object> promoDto = toShopDto(promoItem);
            double originalPrice = (double) promoDto.get("shopPrice");
            promoDto.put("originalPrice", originalPrice);
            promoDto.put("shopPrice", Math.ceil(originalPrice * 0.8));
            promoDto.put("isDiscount", true);
            response.put("discount", promoDto);
        }

        // Consumables from templates
        List<Map<String, Object>> consumables = consumableTemplates.stream()
                .map(this::toShopDto)
                .toList();
        response.put("consumables", consumables);

        return ResponseEntity.ok(response);
    }


    private List<Equipment> pickRandom(List<Equipment> source, int count, Random random) {
        if (source.isEmpty())
            return new ArrayList<>();
        List<Equipment> copy = new ArrayList<>(source);
        Collections.shuffle(copy, random);
        return copy.subList(0, Math.min(count, copy.size()));
    }

    @PostMapping("/buy/{templateId}")
    public ResponseEntity<?> buyItem(@PathVariable @org.springframework.lang.NonNull Long templateId,
            Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();

        Equipment template = equipmentRepository.findById(templateId).orElse(null);
        if (template == null || !template.isTemplate()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Objet introuvable dans la boutique."));
        }

        // Verify it's in today's selection
        long seed = LocalDate.now().toEpochDay();
        Random random = new Random(seed);
        List<Equipment> allTemplates = equipmentRepository.findByIsTemplateTrueAndAvailableInShopTrue();
        
        List<Equipment> equipmentTemplates = allTemplates.stream()
                .filter(e -> e.getSlot() != EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> allConsumables = allTemplates.stream()
                .filter(e -> e.getSlot() == EquipmentSlot.CONSOMMABLE)
                .toList();

        List<Equipment> commons = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> rares = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries = equipmentTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE)
                .toList();

        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        dailySelection.addAll(pickRandom(rares, 1, random));
        dailySelection.addAll(pickRandom(legendaries, 1, random));

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

        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.status(401).build();

        double price = template.calculateShopPrice();
        if (isPromo) {
            price = Math.ceil(price * 0.8);
        }

        if (user.getMonnaie() < price) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fonds insuffisants en or."));
        }

        List<Anomalie> toConsumeList = new ArrayList<>();
        List<String> missingAnomaliesMsg = new ArrayList<>();
        if (template.getPriceAnomalies() != null && !template.getPriceAnomalies().isEmpty()) {
            List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());

            for (Map.Entry<String, Integer> entry : template.getPriceAnomalies().entrySet()) {
                String reqName = entry.getKey();
                int reqQuantity = entry.getValue();

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
        user.setMonnaie(user.getMonnaie() - price);
        userRepository.save(user);

        if (!toConsumeList.isEmpty()) {
            anomalieRepository.deleteAll(toConsumeList);
        }

        // Clone equipment
        Equipment clone = new Equipment();
        clone.copyStatsFrom(template);

        clone.setTemplate(false);
        clone.setUser(user);
        clone.setOwnerUsername(user.getUsername());

        equipmentRepository.save(clone);

        return ResponseEntity.ok(Map.of("message", "Achat réussi !"));
    }



    // --- ADMIN TEMPLATES CRUD ---

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();
        List<Equipment> templates = equipmentRepository.findByIsTemplateTrueAndAvailableInShopTrue();
        return ResponseEntity.ok(templates.stream().map(this::toShopDto).toList());
    }

    @PostMapping("/templates")
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<?> createTemplate(
            @RequestBody generation.grimoire.controller.EquipmentController.EquipmentDto dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        Equipment eq = new Equipment();
        updateFromDto(eq, dto);
        eq.setTemplate(true);
        eq.setOwnerUsername("MODELE");
        eq.setUser(null);
        equipmentRepository.save(eq);
        return ResponseEntity.ok(toShopDto(eq));
    }

    @PutMapping("/templates/{id}")
    @org.springframework.cache.annotation.CacheEvict(value = {"equipmentTemplates", "equipmentShopTemplates", "equipmentTemplateByName", "publicEquipmentTemplates", "equipmentDistinctNames", "alchemyRecipes", "alchemyRecipesList", "alchemyRecipeById", "lootEntriesByEquipment", "salles", "monstres"}, allEntries = true)
    public ResponseEntity<?> updateTemplate(@PathVariable @org.springframework.lang.NonNull Long id,
            @RequestBody generation.grimoire.controller.EquipmentController.EquipmentDto dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        return equipmentRepository.findById(id).map(eq -> {
            if (!eq.isTemplate())
                return ResponseEntity.badRequest().body(Map.of("message", "Not a template"));

            String oldName = eq.getName();
            updateFromDto(eq, dto);
            equipmentRepository.save(eq);

            // Update all instances with the same old name
            if (oldName != null && !oldName.isEmpty()) {
                List<Equipment> instances = equipmentRepository.findByName(oldName);
                for (Equipment instance : instances) {
                    if (instance.getId().equals(eq.getId()))
                        continue;
                    updateFromDto(instance, dto);
                    instance.setTemplate(false); // ensure it remains an instance
                    equipmentRepository.save(instance);
                }
                renameCascadeService.cascadeEquipmentRename(oldName, eq.getName());
            }

            return ResponseEntity.ok(toShopDto(eq));
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

    // --- HELPERS ---

    private boolean isAdmin(Principal principal) {
        return ((org.springframework.security.core.Authentication) principal).getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
    }



    private Map<String, Object> toShopDto(Equipment e) {
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
        double shopPrice = e.calculateShopPrice();
        if (e.getSlot() == EquipmentSlot.CONSOMMABLE && e.getName() != null) {
            String nameLower = e.getName().toLowerCase().trim();
            if (nameLower.equals("corde")) shopPrice = 15;
            else if (nameLower.equals("clé")) shopPrice = 25;
            else if (nameLower.equals("pain")) shopPrice = 5;
            else if (nameLower.equals("potion de mana")) shopPrice = 10;
        }
        map.put("shopPrice", shopPrice);
        map.put("priceAnomalies", e.getPriceAnomalies());
        map.put("weight", e.calculateWeight());
        map.put("baseWeight", e.getBaseWeight());
        map.put("consumableHpPercent", e.getConsumableHpPercent());
        map.put("consumableManaPercent", e.getConsumableManaPercent());
        map.put("consumableMissingHpPercent", e.getConsumableMissingHpPercent());
        map.put("consumableMissingManaPercent", e.getConsumableMissingManaPercent());
        map.put("consumableCategory", e.getConsumableCategory() != null ? e.getConsumableCategory().name() : "AUTRE");
        map.put("isConsumable", e.getSlot() == EquipmentSlot.CONSOMMABLE);
        map.put("availableInShop", e.isAvailableInShop());
        return map;
    }

    private void updateFromDto(Equipment eq, generation.grimoire.controller.EquipmentController.EquipmentDto dto) {
        eq.setName(dto.getName());
        eq.setSlot(dto.getSlot());
        eq.setBonusHealthMax(dto.getBonusHealthMax());
        eq.setBonusManaMax(dto.getBonusManaMax());
        eq.setBonusPower(dto.getBonusPower());
        eq.setBonusStrength(dto.getBonusStrength());
        eq.setBonusArmor(dto.getBonusArmor());
        eq.setBonusResistance(dto.getBonusResistance());
        eq.setBonusSpeed(dto.getBonusSpeed());
        eq.setBonusCrit(dto.getBonusCrit());
        eq.setRegenHealthPerTurn(dto.getRegenHealthPerTurn());
        eq.setRegenManaPerTurn(dto.getRegenManaPerTurn());
        eq.setBaseWeight(dto.getBaseWeight());
        eq.setConsumableHpPercent(dto.getConsumableHpPercent());
        eq.setConsumableManaPercent(dto.getConsumableManaPercent());
        eq.setConsumableMissingHpPercent(dto.getConsumableMissingHpPercent());
        eq.setConsumableMissingManaPercent(dto.getConsumableMissingManaPercent());
        if (dto.getConsumableCategory() != null) {
            eq.setConsumableCategory(dto.getConsumableCategory());
        }
        if (dto.getAvailableInShop() != null) {
            eq.setAvailableInShop(dto.getAvailableInShop());
        }
        if (dto.getPriceAnomalies() != null) {
            eq.setPriceAnomalies(new HashMap<>(dto.getPriceAnomalies()));
        } else {
            eq.setPriceAnomalies(new HashMap<>());
        }

        if (dto.getRarity() != null) {
            eq.setRarity(dto.getRarity());
        } else {
            eq.setRarity(EquipmentRarity.COMMUN);
        }

        if (dto.getSpecialEffect() != null) {
            eq.setSpecialEffect(dto.getSpecialEffect());
            eq.setSpecialEffectValue(dto.getSpecialEffectValue());
        } else {
            eq.setSpecialEffect(generation.grimoire.enumeration.EquipmentEffectType.NONE);
            eq.setSpecialEffectValue(0);
        }
    }
}
