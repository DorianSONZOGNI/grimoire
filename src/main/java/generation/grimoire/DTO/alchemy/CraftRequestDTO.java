package generation.grimoire.dto.alchemy;

import lombok.Data;

@Data
public class CraftRequestDTO {
    private Long recipeId;
    private int quantity;
    private Long personnageId;
    private java.util.List<Long> anomalieIds = new java.util.ArrayList<>();
    private java.util.List<Long> consumableIds = new java.util.ArrayList<>();
}
