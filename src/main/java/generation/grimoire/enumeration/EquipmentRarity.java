package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.JsonNode;

public enum EquipmentRarity {
    COMMUN("Commun", "rarity-commun", "#94a3b8"),
    INHABITUEL("Inhabituel", "rarity-inhabituel", "#22c55e"),
    RARE("Rare", "rarity-rare", "#3b82f6"),
    MYTHIQUE("Mythique", "rarity-mythique", "#f97316"),
    LEGENDAIRE("Légendaire", "rarity-legendaire", "#eab308"),
    EPIQUE("Épique", "rarity-epique", "#a855f7"),
    RELIQUE("Relique", "rarity-relique", "#ef4444"),
    MAUDIT("Maudit", "rarity-maudit", "#7f1d1d");

    private final String label;
    private final String cssClass;
    private final String color;

    EquipmentRarity(String label, String cssClass, String color) {
        this.label = label;
        this.cssClass = cssClass;
        this.color = color;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getCssClass() { return cssClass; }
    public String getColor() { return color; }

    @JsonCreator
    public static EquipmentRarity fromNode(JsonNode node) {
        if (node.isObject()) {
            return EquipmentRarity.valueOf(node.get("name").asText());
        }
        return EquipmentRarity.valueOf(node.asText());
    }
}


