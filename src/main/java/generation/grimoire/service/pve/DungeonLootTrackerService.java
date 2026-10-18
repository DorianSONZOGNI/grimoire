package generation.grimoire.service.pve;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import generation.grimoire.dto.equipment.DungeonDropSourceDTO;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.EventSubType;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DungeonLootTrackerService {

    private final DonjonRepository donjonRepository;
    private final EquipmentRepository equipmentRepository;
    private final AnomalieRepository anomalieRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, List<DungeonDropSourceDTO>> buildEquipmentDungeonSourcesMap() {
        List<Donjon> dungeons = donjonRepository.findAllByOrderByDisplayOrderAsc();
        Map<Long, String> equipmentIdToName = new HashMap<>();
        Map<String, Map<Long, DungeonSourceAccumulator>> resultMap = new HashMap<>();

        for (Donjon d : dungeons) {
            if (d.getSalles() == null) continue;
            for (Salle s : d.getSalles()) {
                // 1. Tables de loot (Coffre, Boutique/Marchand, Porte étrange item, etc.)
                if (s.getLootTable() != null) {
                    for (LootEntry entry : s.getLootTable()) {
                        if (entry.getEquipment() != null) {
                            String eqName = entry.getEquipment().getName();
                            if (eqName != null && !eqName.trim().isEmpty()) {
                                String sourceType = determineLootTableSourceType(s);
                                addSource(resultMap, eqName, d.getId(), d.getName(), sourceType);
                                equipmentIdToName.putIfAbsent(entry.getEquipment().getId(), eqName);
                            }
                        }
                    }
                }

                // 2. Autel sacrificiel classique (Salle EVENT ou AUTEL)
                if ("ITEM".equalsIgnoreCase(s.getAltarRewardType())) {
                    String eqName = null;
                    if (s.getAltarRewardEquipment() != null) {
                        eqName = s.getAltarRewardEquipment().getName();
                    } else if (s.getAltarRewardValue() > 0) {
                        eqName = resolveEquipmentName((long) s.getAltarRewardValue(), equipmentIdToName);
                    }
                    if (eqName != null && !eqName.trim().isEmpty()) {
                        addSource(resultMap, eqName, d.getId(), d.getName(), "Autel sacrificiel");
                    }
                }

                // 3. Issue Porte Étrange avec issue AUTEL
                if (s.getEventSubType() == EventSubType.PORTE_ETRANGE && s.getDoorOutcomes() != null) {
                    parseDoorOutcomesForEquipment(s.getDoorOutcomes(), d, resultMap, equipmentIdToName);
                }
            }
        }

        Map<String, List<DungeonDropSourceDTO>> finalMap = new HashMap<>();
        for (Map.Entry<String, Map<Long, DungeonSourceAccumulator>> entry : resultMap.entrySet()) {
            List<DungeonDropSourceDTO> list = entry.getValue().values().stream()
                    .map(DungeonSourceAccumulator::toDTO)
                    .toList();
            finalMap.put(entry.getKey(), list);
        }
        return finalMap;
    }

    public Map<String, List<DungeonDropSourceDTO>> buildAnomalieDungeonSourcesMap() {
        List<Donjon> dungeons = donjonRepository.findAllByOrderByDisplayOrderAsc();
        Map<Long, String> anomalieIdToName = new HashMap<>();
        Map<String, Map<Long, DungeonSourceAccumulator>> resultMap = new HashMap<>();

        for (Donjon d : dungeons) {
            if (d.getSalles() == null) continue;
            for (Salle s : d.getSalles()) {
                // 1. Récompense spéciale d'altération
                if (s.getAlterationSpecialItemReward() != null && !s.getAlterationSpecialItemReward().trim().isEmpty()) {
                    addSource(resultMap, s.getAlterationSpecialItemReward(), d.getId(), d.getName(), "Altération");
                }

                // 2. Tables de loot avec specialItemName
                if (s.getLootTable() != null) {
                    for (LootEntry entry : s.getLootTable()) {
                        if (entry.getSpecialItemName() != null && !entry.getSpecialItemName().trim().isEmpty()) {
                            String sourceType = determineLootTableSourceType(s);
                            addSource(resultMap, entry.getSpecialItemName(), d.getId(), d.getName(), sourceType);
                        }
                    }
                }

                // 3. Porte étrange avec issue TRESOR
                if (s.getEventSubType() == EventSubType.PORTE_ETRANGE && s.getDoorOutcomes() != null) {
                    parseDoorOutcomesForAnomalie(s.getDoorOutcomes(), d, resultMap, anomalieIdToName);
                }
            }
        }

        Map<String, List<DungeonDropSourceDTO>> finalMap = new HashMap<>();
        for (Map.Entry<String, Map<Long, DungeonSourceAccumulator>> entry : resultMap.entrySet()) {
            List<DungeonDropSourceDTO> list = entry.getValue().values().stream()
                    .map(DungeonSourceAccumulator::toDTO)
                    .toList();
            finalMap.put(entry.getKey(), list);
        }
        return finalMap;
    }

    private String determineLootTableSourceType(Salle s) {
        if (s.getType() == RoomType.TREASURE) {
            return "Coffre";
        } else if (s.getType() == RoomType.EVENT) {
            if (s.getEventSubType() == EventSubType.RENCONTRE) {
                return "Boutique";
            } else if (s.getEventSubType() == EventSubType.PORTE_ETRANGE) {
                return "Coffre (Porte étrange)";
            }
        } else if (s.getType() == RoomType.BOSS) {
            return "Boss";
        } else if (s.getType() == RoomType.COMBAT) {
            return "Combat";
        }
        return "Coffre";
    }

    private void parseDoorOutcomesForEquipment(String json, Donjon d,
            Map<String, Map<Long, DungeonSourceAccumulator>> resultMap,
            Map<Long, String> equipmentIdToName) {
        if (json == null || json.trim().isEmpty()) return;
        try {
            JsonNode root = objectMapper.readTree(json);
            if (root.isArray()) {
                for (JsonNode node : root) {
                    String type = node.path("type").asText("");
                    if ("AUTEL".equalsIgnoreCase(type)) {
                        String rewType = node.path("altarRewardType").asText("");
                        if ("ITEM".equalsIgnoreCase(rewType)) {
                            long eqId = node.path("altarRewardValue").asLong(0);
                            if (eqId > 0) {
                                String eqName = resolveEquipmentName(eqId, equipmentIdToName);
                                if (eqName != null && !eqName.trim().isEmpty()) {
                                    addSource(resultMap, eqName, d.getId(), d.getName(), "Autel sacrificiel");
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Erreur parsing doorOutcomes equipment: {}", e.getMessage());
        }
    }

    private void parseDoorOutcomesForAnomalie(String json, Donjon d,
            Map<String, Map<Long, DungeonSourceAccumulator>> resultMap,
            Map<Long, String> anomalieIdToName) {
        if (json == null || json.trim().isEmpty()) return;
        try {
            JsonNode root = objectMapper.readTree(json);
            if (root.isArray()) {
                for (JsonNode node : root) {
                    String type = node.path("type").asText("");
                    if ("TRESOR".equalsIgnoreCase(type)) {
                        long anId = node.path("treasureAnomalieId").asLong(0);
                        if (anId > 0) {
                            String anName = resolveAnomalieName(anId, anomalieIdToName);
                            if (anName != null && !anName.trim().isEmpty()) {
                                addSource(resultMap, anName, d.getId(), d.getName(), "Trésor (Porte étrange)");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Erreur parsing doorOutcomes anomalie: {}", e.getMessage());
        }
    }

    private String resolveEquipmentName(Long id, Map<Long, String> cache) {
        if (id == null || id <= 0) return null;
        if (cache.containsKey(id)) return cache.get(id);
        return equipmentRepository.findById(id).map(e -> {
            cache.put(id, e.getName());
            return e.getName();
        }).orElse(null);
    }

    private String resolveAnomalieName(Long id, Map<Long, String> cache) {
        if (id == null || id <= 0) return null;
        if (cache.containsKey(id)) return cache.get(id);
        return anomalieRepository.findById(id).map(a -> {
            cache.put(id, a.getName());
            return a.getName();
        }).orElse(null);
    }

    private void addSource(Map<String, Map<Long, DungeonSourceAccumulator>> resultMap, String name,
            Long dungeonId, String dungeonName, String sourceType) {
        if (name == null || name.trim().isEmpty()) return;
        String key = name.trim().toLowerCase();
        resultMap.computeIfAbsent(key, k -> new LinkedHashMap<>())
                .computeIfAbsent(dungeonId, id -> new DungeonSourceAccumulator(dungeonId, dungeonName))
                .sourceTypes.add(sourceType);
    }

    private static class DungeonSourceAccumulator {
        private final Long dungeonId;
        private final String dungeonName;
        private final Set<String> sourceTypes = new LinkedHashSet<>();

        DungeonSourceAccumulator(Long dungeonId, String dungeonName) {
            this.dungeonId = dungeonId;
            this.dungeonName = dungeonName;
        }

        DungeonDropSourceDTO toDTO() {
            return new DungeonDropSourceDTO(dungeonId, dungeonName, new ArrayList<>(sourceTypes));
        }
    }
}
