package generation.grimoire.model.pve;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitiativeEntry {
    private boolean isPlayer;
    private int index; // Index in the players or enemies list
    private int initiativeScore;
    private int speedStat;
    private int tieBreakerRoll; // Used if speed is also tied
}
