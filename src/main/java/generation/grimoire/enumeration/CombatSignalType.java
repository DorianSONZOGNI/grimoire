package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum CombatSignalType {
    MOB_PING("Signal Ennemi", "Signal tactique sur un monstre", "swords"),
    HERO_PING("Signal Héros", "Demande d'assistance pour un héros", "shield"),
    EMOTE("Émote", "Expression d'émotion ou de communication", "mood");

    private final String label;
    private final String description;
    private final String icon;

    CombatSignalType(String label, String description, String icon) {
        this.label = label;
        this.description = description;
        this.icon = icon;
    }

    public String getName() {
        return name();
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }

    public String getIcon() {
        return icon;
    }

    @JsonCreator
    public static CombatSignalType fromJson(JsonNode node) {
        if (node == null) return null;
        if (node.isTextual()) {
            return CombatSignalType.valueOf(node.asText());
        }
        if (node.has("name")) {
            return CombatSignalType.valueOf(node.get("name").asText());
        }
        return null;
    }
}
