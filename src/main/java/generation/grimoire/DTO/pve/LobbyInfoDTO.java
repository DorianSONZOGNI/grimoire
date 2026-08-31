package generation.grimoire.DTO.pve;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LobbyInfoDTO {
    private String shortCode;
    private String hostUsername;
    private String dungeonName;
    private int dungeonLevel;
    private int maxHeroesTotal;
    private int hostHeroesCount;
    private int availableSlots;
    private java.util.List<HostHeroInfoDTO> hostHeroes;
}
