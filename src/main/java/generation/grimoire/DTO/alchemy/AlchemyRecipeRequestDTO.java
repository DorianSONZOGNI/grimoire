package generation.grimoire.dto.alchemy;

import generation.grimoire.enumeration.RecipeRewardType;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
public class AlchemyRecipeRequestDTO {
    private Long id;
    private String name;
    private String description;
    private double costGold;
    private double costSpiritXp;
    private Map<String, Integer> requiredAnomalies = new HashMap<>();
    private Map<String, Integer> requiredConsumables = new HashMap<>();
    private RecipeRewardType rewardType;
    private String rewardName;
    private int rewardQuantity;
    private int rewardLevel;
}
