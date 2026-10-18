package generation.grimoire.dto.achievement;

public record AchievementDTO(
    String code,
    String label,
    String description,
    String icon,
    String category,
    String categoryLabel,
    String categoryIcon,
    String rewardTitle,
    int currentProgress,
    int goalValue,
    boolean unlocked,
    String unlockedAt,
    boolean hidden
) {}
