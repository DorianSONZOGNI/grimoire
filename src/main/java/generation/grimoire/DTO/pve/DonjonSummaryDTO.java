package generation.grimoire.dto.pve;

import lombok.Data;

@Data
public class DonjonSummaryDTO {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private int recommendedLevel;
    private int maxHeroes;
    private int unlockCostGold;
    private int entryCostGold;
    private String requiredSecret;
    private int requiredSecretLevel;
    private int roomCount;
    private int displayOrder;
    private java.util.List<generation.grimoire.entity.pve.Salle> salles;
}
