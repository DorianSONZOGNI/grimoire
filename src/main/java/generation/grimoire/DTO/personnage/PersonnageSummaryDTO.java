package generation.grimoire.dto.personnage;

import lombok.Data;

@Data
public class PersonnageSummaryDTO {
    private Long id;
    private String name;
    private String ownerUsername;
    private int level;
    private String avatarUrl;
    private int healthCurrent;
    private int healthMax;
    private String voieName;
    private String spiritualiteName;
}
