package generation.grimoire.DTO.pve;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HostHeroInfoDTO {
    private String name;
    private int level;
    private String voieName;
    private String spiritualiteName;
    private int healthMax;
}
