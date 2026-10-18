package generation.grimoire.dto.equipment;

import java.util.List;

public record DungeonDropSourceDTO(
    Long dungeonId,
    String dungeonName,
    String requiredSecret,
    List<String> sourceTypes
) {}
