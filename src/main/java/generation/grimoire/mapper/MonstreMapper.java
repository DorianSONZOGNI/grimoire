package generation.grimoire.mapper;

import generation.grimoire.dto.pve.MonstreRequestDTO;
import generation.grimoire.entity.pve.Monstre;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface MonstreMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mutations", ignore = true)
    Monstre toEntity(MonstreRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mutations", ignore = true)
    void updateEntity(MonstreRequestDTO dto, @MappingTarget Monstre entity);
}
