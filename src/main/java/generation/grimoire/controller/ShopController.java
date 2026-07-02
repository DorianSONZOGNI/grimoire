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

    // --- DAILY SHOP ---

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> getDailyShop() {
        List<Equipment> templates = equipmentRepository.findAll().stream()
                .filter(e -> e != null && e.isShopTemplate())
                .collect(Collectors.toList());

        List<Equipment> commons = templates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> rares = templates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries = templates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE)
                .toList();

        // Seeded random based on today's date
        long seed = LocalDate.now().toEpochDay();
        Random random = new Random(seed);

        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        dailySelection.addAll(pickRandom(rares, 1, random));
        dailySelection.addAll(pickRandom(legendaries, 1, random));

        // Promo
        List<Equipment> remainingTemplates = new ArrayList<>(templates);
        remainingTemplates.removeAll(dailySelection);
        Equipment promoItem = null;
        if (!remainingTemplates.isEmpty()) {
            promoItem = remainingTemplates.get(random.nextInt(remainingTemplates.size()));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("daily", dailySelection.stream().map(this::toShopDto).toList());

        if (promoItem != null) {
            Map<String, Object> promoDto = toShopDto(promoItem);
            double originalPrice = (double) promoDto.get("shopPrice");
            promoDto.put("originalPrice", originalPrice);
            promoDto.put("shopPrice", Math.ceil(originalPrice * 0.8));
            promoDto.put("isDiscount", true);
            response.put("discount", promoDto);
        }

        // Consumables
        List<Map<String, Object>> consumables = List.of(
                createConsumable("Corde", 15, "gesture", "rope", "Sert à éviter certains pièges", 5.0),
                createConsumable("Clé", 25, "vpn_key", "key", "Ouvre les compartiments secrets des coffres", 1.0),
                createConsumable("Pain", 5, "bakery_dining", "bread", "Régénère 10% de la vie max", 2.0),
                createConsumable("Potion de mana", 10, "water_drop", "potion", "Régénère 10% du mana max", 2.0));
        response.put("consumables", consumables);

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> createConsumable(String name, double price, String icon, String typeId,
            String description, double weight) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", name);
        map.put("shopPrice", price);
        map.put("slot", "CONSOMMABLE");
        map.put("iconId", icon); // Custom icon for display
        map.put("typeId", typeId); // ID for purchasing
        map.put("isConsumable", true);
        map.put("description", description);
        map.put("weight", weight);
        return map;
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
        if (template == null || !template.isShopTemplate()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Objet introuvable dans la boutique."));
        }

        // Verify it's in today's selection
        long seed = LocalDate.now().toEpochDay();
        Random random = new Random(seed);
        List<Equipment> allTemplates = equipmentRepository.findAll().stream()
                .filter(e -> e != null && e.isShopTemplate())
                .toList();
        List<Equipment> commons = allTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> rares = allTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries = allTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE)
                .toList();

        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        dailySelection.addAll(pickRandom(rares, 1, random));
        dailySelection.addAll(pickRandom(legendaries, 1, random));

        List<Equipment> remainingTemplates = new ArrayList<>(allTemplates);
        remainingTemplates.removeAll(dailySelection);
        Equipment promoItem = null;
        if (!remainingTemplates.isEmpty()) {
            promoItem = remainingTemplates.get(random.nextInt(remainingTemplates.size()));
        }

        boolean isDaily = dailySelection.stream().anyMatch(e -> e.getId().equals(templateId));
        boolean isPromo = promoItem != null && promoItem.getId().equals(templateId);

        if (!isDaily && !isPromo) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cet objet n'est pas en vente aujourd'hui."));
        }

        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.status(401).build();

        double price = calculateShopPrice(template);
        if (isPromo) {
            price = Math.ceil(price * 0.8);
        }

        if (user.getMonnaie() < price) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fonds insuffisants en or."));
        }

        List<Anomalie> toConsumeList = new ArrayList<>();
        if (template.getPriceAnomalies() != null && !template.getPriceAnomalies().isEmpty()) {
            List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());

            for (Map.Entry<String, Integer> entry : template.getPriceAnomalies().entrySet()) {
                String reqName = entry.getKey();
                int reqQuantity = entry.getValue();

                List<Anomalie> matches = userAnomalies.stream()
                        .filter(a -> a.getName() != null && a.getName().equals(reqName))
                        .collect(Collectors.toList());

                if (matches.size() < reqQuantity) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Fonds insuffisants. Vous n'avez pas assez d'anomalies : " + reqName
                                    + " (" + matches.size() + "/" + reqQuantity + ")"));
                }

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

        // Deductions
        user.setMonnaie(user.getMonnaie() - price);
        userRepository.save(user);

        if (!toConsumeList.isEmpty()) {
            anomalieRepository.deleteAll(toConsumeList);
        }

        // Clone equipment
        Equipment clone = new Equipment();
        clone.copyStatsFrom(template);

        clone.setShopTemplate(false);
        clone.setUser(user);
        clone.setOwnerUsername(user.getUsername());

        equipmentRepository.save(clone);

        return ResponseEntity.ok(Map.of("message", "Achat réussi !"));
    }

    @PostMapping("/buy/consumable/{type}")
    public ResponseEntity<?> buyConsumable(@PathVariable String type, Principal principal) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.status(401).build();

        String name = "";
        double price = 0;
        double weight = 0;
        switch (type.toLowerCase()) {
            case "rope":
                name = "Corde";
                price = 15;
                weight = 5.0;
                break;
            case "key":
                name = "Clé";
                price = 25;
                weight = 1.0;
                break;
            case "bread":
                name = "Pain";
                price = 5;
                weight = 2.0;
                break;
            case "potion":
                name = "Potion de mana";
                price = 10;
                weight = 2.0;
                break;
            default:
                return ResponseEntity.badRequest().body(Map.of("message", "Consommable inconnu."));
        }

        if (user.getMonnaie() < price) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fonds insuffisants."));
        }

        user.setMonnaie(user.getMonnaie() - price);
        userRepository.save(user);

        Equipment consumable = new Equipment();
        consumable.setName(name);
        consumable.setSlot(EquipmentSlot.CONSOMMABLE);
        consumable.setRarity(EquipmentRarity.COMMUN);
        consumable.setShopTemplate(false);
        consumable.setPersonnage(null); // Goes to vault
        consumable.setUser(user);
        consumable.setOwnerUsername(user.getUsername());
        consumable.setBonusHealthMax(0);
        consumable.setBonusManaMax(0);
        consumable.setBonusPower(0);
        consumable.setBonusStrength(0);
        consumable.setBonusArmor(0);
        consumable.setBonusResistance(0);
        consumable.setBonusSpeed(0);
        consumable.setBonusCrit(0);
        consumable.setRegenHealthPerTurn(0);
        consumable.setRegenManaPerTurn(0);
        consumable.setBaseWeight(weight);

        if ("bread".equalsIgnoreCase(type)) {
            consumable.setConsumableHpPercent(10);
        } else if ("potion".equalsIgnoreCase(type)) {
            consumable.setConsumableManaPercent(10);
        }

        equipmentRepository.save(consumable);

        return ResponseEntity.ok(Map.of("message", "Achat réussi !"));
    }

    // --- ADMIN TEMPLATES CRUD ---

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();
        List<Equipment> templates = equipmentRepository.findAll().stream()
                .filter(e -> e != null && e.isShopTemplate())
                .collect(Collectors.toList());
        return ResponseEntity.ok(templates.stream().map(this::toShopDto).toList());
    }

    @PostMapping("/templates")
    public ResponseEntity<?> createTemplate(
            @RequestBody generation.grimoire.controller.EquipmentController.EquipmentDto dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        Equipment eq = new Equipment();
        updateFromDto(eq, dto);
        eq.setShopTemplate(true);
        equipmentRepository.save(eq);
        return ResponseEntity.ok(toShopDto(eq));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable @org.springframework.lang.NonNull Long id,
            @RequestBody generation.grimoire.controller.EquipmentController.EquipmentDto dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        return equipmentRepository.findById(id).map(eq -> {
            if (!eq.isShopTemplate())
                return ResponseEntity.badRequest().body(Map.of("message", "Not a template"));
            updateFromDto(eq, dto);
            equipmentRepository.save(eq);
            return ResponseEntity.ok(toShopDto(eq));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable @org.springframework.lang.NonNull Long id,
            Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        return equipmentRepository.findById(id).map(eq -> {
            if (eq.isShopTemplate()) {
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

    private double calculateShopPrice(Equipment eq) {
        double weight = eq.calculateWeight();
        double multiplier = 1.0;
        if (eq.getRarity() == EquipmentRarity.COMMUN)
            multiplier = 1.0;
        else if (eq.getRarity() == EquipmentRarity.INHABITUEL)
            multiplier = 1.5;
        else if (eq.getRarity() == EquipmentRarity.RARE)
            multiplier = 2.0;
        else if (eq.getRarity() == EquipmentRarity.MYTHIQUE)
            multiplier = 2.5;
        else if (eq.getRarity() == EquipmentRarity.LEGENDAIRE)
            multiplier = 3.0;
        else if (eq.getRarity() == EquipmentRarity.EPIQUE)
            multiplier = 5.0;
        else if (eq.getRarity() == EquipmentRarity.RELIQUE)
            multiplier = 6.0;
        else if (eq.getRarity() == EquipmentRarity.MAUDIT)
            multiplier = 4;

        double slotMultiplier = 1.0;
        if (eq.getSlot() == EquipmentSlot.PLASTRON)
            slotMultiplier = 1.1;
        else if (eq.getSlot() == EquipmentSlot.ANNEAU_GAUCHE || eq.getSlot() == EquipmentSlot.ANNEAU_DROIT)
            slotMultiplier = 1.5;
        else if (eq.getSlot() == EquipmentSlot.BOTTES)
            slotMultiplier = 0.9;
        else if (eq.getSlot() == EquipmentSlot.CAPE)
            slotMultiplier = 1.2;

        return Math.ceil(weight * 2 * multiplier * slotMultiplier);
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
        map.put("shopPrice", calculateShopPrice(e));
        map.put("priceAnomalies", e.getPriceAnomalies());
        map.put("weight", e.calculateWeight());
        map.put("baseWeight", e.getBaseWeight());
        map.put("consumableHpPercent", e.getConsumableHpPercent());
        map.put("consumableManaPercent", e.getConsumableManaPercent());
        map.put("consumableMissingHpPercent", e.getConsumableMissingHpPercent());
        map.put("consumableMissingManaPercent", e.getConsumableMissingManaPercent());
        map.put("consumableCategory", e.getConsumableCategory() != null ? e.getConsumableCategory().name() : "AUTRE");
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
