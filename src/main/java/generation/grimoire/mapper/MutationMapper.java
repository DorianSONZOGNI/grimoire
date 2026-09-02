package generation.grimoire.mapper;

import generation.grimoire.dto.pve.MutationRequestDTO;
import generation.grimoire.entity.pve.Mutation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface MutationMapper {

    @Mapping(target = "id", ignore = true)
    Mutation toEntity(MutationRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    void updateEntity(MutationRequestDTO dto, @MappingTarget Mutation entity);
}
