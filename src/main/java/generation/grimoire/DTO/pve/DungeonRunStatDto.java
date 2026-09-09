package generation.grimoire.dto.pve;

import generation.grimoire.enumeration.DungeonOutcome;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DungeonRunStatDto {
    private Long id;
    private Long dungeonId;
    private String dungeonName;
    private DungeonOutcome outcome;
    private String voieName;
    private String spiritualiteName;
    private int heroLevel;
    private boolean isMulti;
    private int runNumber;
    private boolean isDead;
    private Instant timestamp;
}
