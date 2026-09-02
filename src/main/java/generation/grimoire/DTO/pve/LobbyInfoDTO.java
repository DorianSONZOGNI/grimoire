package generation.grimoire.dto.pve;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LobbyInfoDTO {
    private String shortCode;
    private String hostUsername;
    private String dungeonName;
    private int recommendedLevel;
    private int maxHeroes;
    private int hostCount;
    private int availableSlots;
    private List<HostHeroInfoDTO> hostHeroInfos;
}
