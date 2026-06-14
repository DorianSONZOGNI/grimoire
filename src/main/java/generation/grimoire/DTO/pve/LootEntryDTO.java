package generation.grimoire.DTO.pve;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class LootEntryDTO {
    private Long equipmentId;
    private double probability;
    
    // Marchand fields
    private String specialItemName;
    private Integer priceGold;
    private String priceSpecialItemName;
}
