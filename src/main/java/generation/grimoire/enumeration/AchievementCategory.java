package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;

@Getter
@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum AchievementCategory {
    COMBAT("Combat & Donjons", "swords"),
    ALCHEMY("Alchimie & Secrets", "science"),
    LOOT("Coffres & Loots", "inventory_2"),
    ECONOMY("Fortune & Économie", "payments"),
    HIDDEN("Mystères & Cachés", "lock");

    private final String label;
    private final String icon;

    AchievementCategory(String label, String icon) {
        this.label = label;
        this.icon = icon;
    }

    public String getName() {
        return name();
    }
}
