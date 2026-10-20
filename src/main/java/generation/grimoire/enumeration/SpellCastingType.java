package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum SpellCastingType {
    INSTANTANE("Instantané", "Ne consomme pas le tour de jeu. Peut être lancé avant une action banale ou pendant la plupart des canalisations.", "bolt", "#fbbf24"),
    BANAL("Banal", "Action qui consomme le tour de jeu.", "hourglass_empty", "#60a5fa"),
    CANALISE("Canalisé", "Action qui s'exécute sur plusieurs tours. Empêche les actions banales durant sa canalisation.", "cyclone", "#a855f7");

    private final String label;
    private final String description;
    private final String icon;
    private final String color;

    SpellCastingType(String label, String description, String icon, String color) {
        this.label = label;
        this.description = description;
        this.icon = icon;
        this.color = color;
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

    public String getColor() {
        return color;
    }

    @JsonCreator
    public static SpellCastingType fromNode(JsonNode node) {
        if (node == null || node.isNull()) {
            return BANAL;
        }
        String text = node.isObject() && node.has("name") ? node.get("name").asText() : node.asText();
        for (SpellCastingType type : values()) {
            if (type.name().equalsIgnoreCase(text)) {
                return type;
            }
        }
        return BANAL;
    }

    @Override
    public String toString() {
        return label;
    }
}

