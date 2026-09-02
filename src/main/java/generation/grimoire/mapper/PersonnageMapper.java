package generation.grimoire.mapper;

import generation.grimoire.dto.personnage.PersonnageResponseDTO;
import generation.grimoire.dto.personnage.PersonnageSummaryDTO;
import generation.grimoire.entity.personnage.Personnage;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface PersonnageMapper {

    // ── Output: Entity → Full Response DTO ──
    // Most fields require custom logic (effectiveStat, XP thresholds, etc.)
    // so we use @AfterMapping or manual post-processing in the controller.

    @Mapping(target = "ownerUsername", ignore = true)
    @Mapping(target = "healthMax", source = "baseHealthMax")
    @Mapping(target = "manaMax", source = "baseManaMax")
    @Mapping(target = "totalHealthMax", expression = "java(p.getTotalHealthMax())")
    @Mapping(target = "totalManaMax", expression = "java(p.getTotalManaMax())")
    @Mapping(target = "totalPower", expression = "java(p.getEffectiveStat(generation.grimoire.enumeration.StatType.POWER))")
    @Mapping(target = "totalStrength", expression = "java(p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH))")
    @Mapping(target = "totalArmor", expression = "java(p.getEffectiveStat(generation.grimoire.enumeration.StatType.ARMURE))")
    @Mapping(target = "totalResistance", expression = "java(p.getEffectiveStat(generation.grimoire.enumeration.StatType.RESISTANCE))")
    @Mapping(target = "totalSpeed", expression = "java(p.getEffectiveStat(generation.grimoire.enumeration.StatType.SPEED))")
    @Mapping(target = "totalCrit", expression = "java(p.getEffectiveStat(generation.grimoire.enumeration.StatType.CRIT))")
    @Mapping(target = "totalRegenHp", expression = "java(p.getTotalRegenHp())")
    @Mapping(target = "totalRegenMana", expression = "java(p.getTotalRegenMana())")
    @Mapping(target = "currentLevelXp", ignore = true)
    @Mapping(target = "nextLevelXp", ignore = true)
    @Mapping(target = "currentLevelSpiritXp", ignore = true)
    @Mapping(target = "nextLevelSpiritXp", ignore = true)
    @Mapping(target = "voie", ignore = true)
    @Mapping(target = "spiritualite", ignore = true)
    PersonnageResponseDTO toResponse(Personnage p);

    // ── Output: Entity → Summary DTO ──

    @Mapping(target = "ownerUsername", ignore = true)
    @Mapping(target = "voieName", source = "voie.nom")
    @Mapping(target = "spiritualiteName", source = "spiritualite.nom")
    @Mapping(target = "level", expression = "java(p.getVoieLevel())")
    @Mapping(target = "avatarUrl", ignore = true)
    PersonnageSummaryDTO toSummary(Personnage p);
}
