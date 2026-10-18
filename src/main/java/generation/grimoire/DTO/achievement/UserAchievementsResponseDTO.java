package generation.grimoire.dto.achievement;

import java.util.List;
import java.util.Set;

public record UserAchievementsResponseDTO(
    List<AchievementDTO> achievements,
    String activeTitle,
    Set<String> unlockedTitles,
    int totalUnlocked,
    int totalCount
) {}
