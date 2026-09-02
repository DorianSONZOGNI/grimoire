package generation.grimoire.mapper;

import generation.grimoire.dto.equipment.EquipmentRequestDTO;
import generation.grimoire.dto.equipment.EquipmentResponseDTO;
import generation.grimoire.dto.equipment.EquipmentShopDTO;
import generation.grimoire.entity.Equipment;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface EquipmentMapper {

    // ── Input: DTO → Entity ──

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "personnage", ignore = true)
    @Mapping(target = "ownerUsername", ignore = true)
    void updateEntity(EquipmentRequestDTO dto, @MappingTarget Equipment entity);

    // ── Output: Entity → Response DTO ──

    @Mapping(target = "slot", expression = "java(e.getSlot() != null ? e.getSlot().name() : null)")
    @Mapping(target = "rarity", expression = "java(e.getRarity() != null ? e.getRarity().name() : null)")
    @Mapping(target = "specialEffect", expression = "java(e.getSpecialEffect() != null ? e.getSpecialEffect().name() : null)")
    @Mapping(target = "consumableCategory", expression = "java(e.getConsumableCategory() != null ? e.getConsumableCategory().name() : \"AUTRE\")")
    @Mapping(target = "weight", expression = "java(e.calculateWeight())")
    @Mapping(target = "maxWeight", ignore = true)
    @Mapping(target = "personnage", ignore = true)
    @Mapping(target = "ownerUsername", ignore = true)
    @Mapping(target = "template", source = "template")
    EquipmentResponseDTO toResponse(Equipment e);

    // ── Output: Entity → Shop DTO ──

    @Mapping(target = "consumableCategory", expression = "java(e.getConsumableCategory() != null ? e.getConsumableCategory().name() : \"AUTRE\")")
    @Mapping(target = "weight", expression = "java(e.calculateWeight())")
    @Mapping(target = "consumable", expression = "java(e.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE)")
    @Mapping(target = "shopPrice", ignore = true)
    @Mapping(target = "discount", ignore = true)
    @Mapping(target = "originalPrice", ignore = true)
    EquipmentShopDTO toShopDto(Equipment e);
}
