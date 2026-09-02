package generation.grimoire.mapper;

import generation.grimoire.dto.spell.SpellCreationRequestDTO;
import generation.grimoire.entity.Spell;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface SpellMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "voie", ignore = true)
    @Mapping(target = "spiritualite", ignore = true)
    @Mapping(target = "mutation", ignore = true)
    @Mapping(target = "effects", ignore = true)
    Spell toEntity(SpellCreationRequestDTO dto);

}
