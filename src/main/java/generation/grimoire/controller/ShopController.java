package generation.grimoire.controller;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
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

    // --- DAILY SHOP ---

    @GetMapping("/daily")
    public ResponseEntity<List<Map<String, Object>>> getDailyShop() {
        List<Equipment> templates = equipmentRepository.findAll().stream()
                .filter(Equipment::isShopTemplate)
                .collect(Collectors.toList());

        List<Equipment> commons = templates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> rares = templates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries = templates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE).toList();

        // Seeded random based on today's date
        long seed = LocalDate.now().toEpochDay();
        Random random = new Random(seed);

        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        dailySelection.addAll(pickRandom(rares, 1, random));
        dailySelection.addAll(pickRandom(legendaries, 1, random));

        return ResponseEntity.ok(dailySelection.stream().map(this::toShopDto).toList());
    }

    private List<Equipment> pickRandom(List<Equipment> source, int count, Random random) {
        if (source.isEmpty()) return new ArrayList<>();
        List<Equipment> copy = new ArrayList<>(source);
        Collections.shuffle(copy, random);
        return copy.subList(0, Math.min(count, copy.size()));
    }

    @PostMapping("/buy/{templateId}")
    public ResponseEntity<?> buyItem(@PathVariable Long templateId, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        Equipment template = equipmentRepository.findById(templateId).orElse(null);
        if (template == null || !template.isShopTemplate()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Objet introuvable dans la boutique."));
        }

        // Verify it's in today's selection
        long seed = LocalDate.now().toEpochDay();
        Random random = new Random(seed);
        List<Equipment> allTemplates = equipmentRepository.findAll().stream().filter(Equipment::isShopTemplate).toList();
        List<Equipment> commons = allTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.COMMUN).toList();
        List<Equipment> rares = allTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.RARE).toList();
        List<Equipment> legendaries = allTemplates.stream().filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE).toList();
        
        List<Equipment> dailySelection = new ArrayList<>();
        dailySelection.addAll(pickRandom(commons, 3, random));
        dailySelection.addAll(pickRandom(rares, 1, random));
        dailySelection.addAll(pickRandom(legendaries, 1, random));

        if (dailySelection.stream().noneMatch(e -> e.getId().equals(templateId))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cet objet n'est pas en vente aujourd'hui."));
        }

        AppUser user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).build();

        double price = calculateShopPrice(template);
        if (user.getMonnaie() < price) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fonds insuffisants."));
        }

        // Deduct money
        user.setMonnaie(user.getMonnaie() - price);
        userRepository.save(user);

        // Clone equipment
        Equipment clone = new Equipment();
        clone.setName(template.getName());
        clone.setSlot(template.getSlot());
        clone.setBonusHealthMax(template.getBonusHealthMax());
        clone.setBonusManaMax(template.getBonusManaMax());
        clone.setBonusPower(template.getBonusPower());
        clone.setBonusStrength(template.getBonusStrength());
        clone.setBonusArmor(template.getBonusArmor());
        clone.setBonusResistance(template.getBonusResistance());
        clone.setBonusSpeed(template.getBonusSpeed());
        clone.setBonusCrit(template.getBonusCrit());
        clone.setRegenHealthPerTurn(template.getRegenHealthPerTurn());
        clone.setRegenManaPerTurn(template.getRegenManaPerTurn());
        clone.setRarity(template.getRarity());
        clone.setSpecialEffect(template.getSpecialEffect());
        clone.setSpecialEffectValue(template.getSpecialEffectValue());
        
        clone.setShopTemplate(false);
        clone.setUser(user);
        clone.setOwnerUsername(user.getUsername());
        
        equipmentRepository.save(clone);

        return ResponseEntity.ok(Map.of("message", "Achat réussi !"));
    }

    // --- ADMIN TEMPLATES CRUD ---

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        List<Equipment> templates = equipmentRepository.findAll().stream()
                .filter(Equipment::isShopTemplate)
                .collect(Collectors.toList());
        return ResponseEntity.ok(templates.stream().map(this::toShopDto).toList());
    }

    @PostMapping("/templates")
    public ResponseEntity<?> createTemplate(@RequestBody generation.grimoire.controller.EquipmentController.EquipmentDto dto, Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        
        Equipment eq = new Equipment();
        updateFromDto(eq, dto);
        eq.setShopTemplate(true);
        equipmentRepository.save(eq);
        return ResponseEntity.ok(toShopDto(eq));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable Long id, @RequestBody generation.grimoire.controller.EquipmentController.EquipmentDto dto, Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        
        return equipmentRepository.findById(id).map(eq -> {
            if (!eq.isShopTemplate()) return ResponseEntity.badRequest().body(Map.of("message", "Not a template"));
            updateFromDto(eq, dto);
            equipmentRepository.save(eq);
            return ResponseEntity.ok(toShopDto(eq));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable Long id, Principal principal) {
        if (principal == null || !isAdmin(principal)) return ResponseEntity.status(403).build();
        
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
        int multiplier = 1;
        if (eq.getRarity() == EquipmentRarity.COMMUN) multiplier = 1;
        else if (eq.getRarity() == EquipmentRarity.RARE) multiplier = 2;
        else if (eq.getRarity() == EquipmentRarity.LEGENDAIRE) multiplier = 3;
        else if (eq.getRarity() == EquipmentRarity.EPIQUE) multiplier = 5;
        else if (eq.getRarity() == EquipmentRarity.RELIQUE) multiplier = 6;

        double slotMultiplier = 1.0;
        if (eq.getSlot() == EquipmentSlot.PLASTRON) slotMultiplier = 1.1;
        else if (eq.getSlot() == EquipmentSlot.ANNEAU_GAUCHE || eq.getSlot() == EquipmentSlot.ANNEAU_DROIT) slotMultiplier = 1.5;
        else if (eq.getSlot() == EquipmentSlot.BOTTES) slotMultiplier = 0.9;
        else if (eq.getSlot() == EquipmentSlot.CAPE) slotMultiplier = 1.2;

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
        map.put("weight", e.calculateWeight());
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
