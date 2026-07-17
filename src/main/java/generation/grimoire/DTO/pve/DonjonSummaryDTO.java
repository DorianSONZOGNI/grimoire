package generation.grimoire.DTO.pve;

import lombok.Data;

@Data
public class DonjonSummaryDTO {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private int recommendedLevel;
    private int maxHeroes;
    
    private double unlockCostGold;
    private String requiredSecret;
    private int requiredSecretLevel;
    private double entryCostGold;
    private int displayOrder;
}
