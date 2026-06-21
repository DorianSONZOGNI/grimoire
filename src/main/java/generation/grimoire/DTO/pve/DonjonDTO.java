package generation.grimoire.DTO.pve;

import lombok.Data;
import java.util.List;

@Data
public class DonjonDTO {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private int recommendedLevel;
    private int maxHeroes;
    
    private double unlockCostGold;
    private String requiredSecret;
    private double entryCostGold;
    
    private List<SalleDTO> salles;
}
