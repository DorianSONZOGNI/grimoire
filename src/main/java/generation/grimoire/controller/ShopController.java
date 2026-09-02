package generation.grimoire.controller;

import generation.grimoire.dto.equipment.EquipmentRequestDTO;
import generation.grimoire.dto.equipment.EquipmentShopDTO;
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
            EquipmentShopDTO promoDto = toShopDto(promoItem);
            double originalPrice = promoDto.getShopPrice();
            promoDto.setShopPrice(Math.ceil(originalPrice * 0.8));
            promoDto.setOriginalPrice(originalPrice);
            promoDto.setDiscount(true);
            response.put("discount", promoDto);
        }

        // Consumables from templates
        List<EquipmentShopDTO> consumables = consumableTemplates.stream()
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
            @RequestBody EquipmentRequestDTO dto, Principal principal) {
        if (principal == null || !isAdmin(principal))
            return ResponseEntity.status(403).build();

        Equipment eq = new Equipment();
        equipmentMapper.updateEntity(dto, eq);
        eq.setTemplate(true);
        eq.setOwnerUsername("MODELE");
        eq.setUser(null);
        equipmentRepository.save(eq);
        return ResponseEntity.ok(toShopDto(eq));
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

            // Update all instances with the same old name
            if (oldName != null && !oldName.isEmpty()) {
                List<Equipment> instances = equipmentRepository.findByName(oldName);
                for (Equipment instance : instances) {
                    if (instance.getId().equals(eq.getId()))
                        continue;
                    equipmentMapper.updateEntity(dto, instance);
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



    private EquipmentShopDTO toShopDto(Equipment e) {
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
        
        return dto;
    }
}
