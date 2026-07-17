package generation.grimoire.controller;

import generation.grimoire.enumeration.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoint centralisé pour les métadonnées des enums enrichies.
 * Permet au frontend de consommer labels, icônes et classes CSS
 * sans hardcoder de dictionnaires de traduction (règle F1 / B2).
 */
@RestController
@RequestMapping("/api/meta")
public class EnumMetaController {

    @GetMapping("/equipment-slots")
    public List<Map<String, String>> getEquipmentSlots() {
        return Arrays.stream(EquipmentSlot.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("icon", e.getIcon());
                    m.put("color", e.getColorHex());
                    m.put("extraClass", e.getExtraClass());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/equipment-rarities")
    public List<Map<String, String>> getEquipmentRarities() {
        return Arrays.stream(EquipmentRarity.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("cssClass", e.getCssClass());
                    m.put("color", e.getColor());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/monster-behaviors")
    public List<Map<String, String>> getMonsterBehaviors() {
        return Arrays.stream(MonsterBehavior.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("description", e.getDescription());
                    m.put("icon", e.getIcon());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/monster-types")
    public List<Map<String, String>> getMonsterTypes() {
        return Arrays.stream(MonsterType.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("description", e.getDescription());
                    m.put("icon", e.getIcon());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/sources")
    public List<Map<String, String>> getSources() {
        return Arrays.stream(Source.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/consumable-categories")
    public List<Map<String, String>> getConsumableCategories() {
        return Arrays.stream(ConsumableCategory.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("icon", e.getIcon());
                    m.put("color", e.getColorHex());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/anomalie-categories")
    public List<Map<String, String>> getAnomalieCategories() {
        return Arrays.stream(AnomalieCategory.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("icon", e.getIcon());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/stat-types")
    public List<Map<String, String>> getStatTypes() {
        return Arrays.stream(StatType.values())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("name", e.name());
                    m.put("label", e.getLabel());
                    m.put("icon", e.getIcon());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/all")
    public Map<String, List<Map<String, String>>> getAllMeta() {
        Map<String, List<Map<String, String>>> allMeta = new LinkedHashMap<>();
        allMeta.put("equipmentSlots", getEquipmentSlots());
        allMeta.put("equipmentRarities", getEquipmentRarities());
        allMeta.put("monsterBehaviors", getMonsterBehaviors());
        allMeta.put("monsterTypes", getMonsterTypes());
        allMeta.put("sources", getSources());
        allMeta.put("consumableCategories", getConsumableCategories());
        allMeta.put("anomalieCategories", getAnomalieCategories());
        allMeta.put("statTypes", getStatTypes());
        return allMeta;
    }
}
