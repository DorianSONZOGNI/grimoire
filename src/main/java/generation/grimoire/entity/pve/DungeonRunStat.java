package generation.grimoire.entity.pve;

import generation.grimoire.enumeration.DungeonOutcome;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(name = "dungeon_run_stat")
public class DungeonRunStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long dungeonId;

    private String dungeonName;

    @Enumerated(EnumType.STRING)
    private DungeonOutcome outcome;

    private String voieName;

    private String spiritualiteName;

    private int heroLevel;

    private boolean isMulti;

    /** Numéro de run pour ce donjon (1er run = 1, 2e = 2, etc.) */
    private int runNumber;

    /** Vrai si le héros a terminé le donjon mort (PV <= 0) */
    private boolean isDead;

    private Instant timestamp;
}
