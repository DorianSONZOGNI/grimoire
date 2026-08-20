package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.JsonNode;

public enum EquipmentRarity {
    COMMUN("Commun",      "rarity-commun",      "#94a3b8", 1.0),
    INHABITUEL("Inhabituel","rarity-inhabituel",  "#22c55e", 1.5),
    RARE("Rare",           "rarity-rare",         "#3b82f6", 2.0),
    MYTHIQUE("Mythique",   "rarity-mythique",     "#f97316", 2.5),
    LEGENDAIRE("Légendaire","rarity-legendaire",   "#eab308", 3.0),
    EPIQUE("Épique",        "rarity-epique",       "#ef4444", 5.0),
    RELIQUE("Relique",     "rarity-relique",      "#a855f7", 6.0),
    MAUDIT("Maudit",      "rarity-maudit",       "#7f1d1d", 4.0);

    private final String label;
    private final String cssClass;
    private final String color;
    /** Multiplicateur de prix utilisé dans {@code Equipment.calculateShopPrice()}. */
    private final double shopMultiplier;

    EquipmentRarity(String label, String cssClass, String color, double shopMultiplier) {
        this.label = label;
        this.cssClass = cssClass;
        this.color = color;
        this.shopMultiplier = shopMultiplier;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getCssClass() { return cssClass; }
    public String getColor() { return color; }
    public double getShopMultiplier() { return shopMultiplier; }

    @JsonCreator
    public static EquipmentRarity fromNode(JsonNode node) {
        if (node.isObject()) {
            return EquipmentRarity.valueOf(node.get("name").asText());
        }
        return EquipmentRarity.valueOf(node.asText());
    }
}
