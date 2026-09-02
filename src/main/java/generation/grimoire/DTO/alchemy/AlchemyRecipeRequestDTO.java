package generation.grimoire.dto.alchemy;

import lombok.Data;

@Data
public class AlchemyRecipeRequestDTO {
    private Long resultTemplateId;
    private Long requiredMaterial1Id;
    private int quantity1;
    private Long requiredMaterial2Id;
    private int quantity2;
    private Long requiredMaterial3Id;
    private int quantity3;
}
