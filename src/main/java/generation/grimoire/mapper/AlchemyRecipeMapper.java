package generation.grimoire.mapper;

import generation.grimoire.dto.alchemy.AlchemyRecipeRequestDTO;
import generation.grimoire.entity.AlchemyRecipe;
import org.springframework.stereotype.Component;

@Component
public class AlchemyRecipeMapper {

    public AlchemyRecipe toEntity(AlchemyRecipeRequestDTO dto) {
        if (dto == null) return null;
        AlchemyRecipe entity = new AlchemyRecipe();
        entity.setId(dto.getId());
        updateEntity(dto, entity);
        return entity;
    }

    public void updateEntity(AlchemyRecipeRequestDTO dto, AlchemyRecipe entity) {
        if (dto == null || entity == null) return;
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setCostGold(dto.getCostGold());
        entity.setCostSpiritXp(dto.getCostSpiritXp());
        
        if (dto.getRequiredAnomalies() != null) {
            entity.setRequiredAnomalies(new java.util.HashMap<>(dto.getRequiredAnomalies()));
        } else {
            entity.setRequiredAnomalies(new java.util.HashMap<>());
        }
        
        if (dto.getRequiredConsumables() != null) {
            entity.setRequiredConsumables(new java.util.HashMap<>(dto.getRequiredConsumables()));
        } else {
            entity.setRequiredConsumables(new java.util.HashMap<>());
        }
        
        entity.setRewardType(dto.getRewardType());
        entity.setRewardName(dto.getRewardName());
        entity.setRewardQuantity(dto.getRewardQuantity());
        entity.setRewardLevel(dto.getRewardLevel());
    }
}
