package generation.grimoire.mapper;

import generation.grimoire.dto.alchemy.AlchemyRecipeRequestDTO;
import generation.grimoire.entity.AlchemyRecipe;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface AlchemyRecipeMapper {

    AlchemyRecipe toEntity(AlchemyRecipeRequestDTO dto);

    void updateEntity(AlchemyRecipeRequestDTO dto, @MappingTarget AlchemyRecipe entity);
}
