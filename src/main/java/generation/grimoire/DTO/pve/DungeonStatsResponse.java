package generation.grimoire.dto.pve;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DungeonStatsResponse {
    private List<DungeonRunStatDto> runs;
    private Map<String, DungeonGlobalStatDto> globalStatsByDungeon;
}
