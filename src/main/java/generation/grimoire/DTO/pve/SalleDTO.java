package generation.grimoire.DTO.pve;

import generation.grimoire.enumeration.RoomType;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class SalleDTO {
    private Long id;
    private RoomType type;
    private List<MonstreDTO> monsters;
    private int treasureGold;
    private int treasureExp;
    private String eventText;
    private int eventEffectAmount;
}
