package generation.grimoire.dto.pve;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DungeonGlobalStatDto {
    private String dungeonName;
    private long totalRuns;
    private long totalVictories;
    private long totalDefeats;
    private long totalFlees;
    private long totalTimeouts;
    private long totalDeaths;
    private Map<String, Long> classPopularity;
    private Map<String, Long> spiritualitePopularity;
}
