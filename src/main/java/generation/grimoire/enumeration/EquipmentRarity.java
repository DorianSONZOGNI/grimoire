package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.JsonNode;

public enum EquipmentRarity {
    COMMUN("Commun", "rarity-commun"),
    INHABITUEL("Inhabituel", "rarity-inhabituel"),
    RARE("Rare", "rarity-rare"),
    MYTHIQUE("Mythique", "rarity-mythique"),
    LEGENDAIRE("Légendaire", "rarity-legendaire"),
    EPIQUE("Épique", "rarity-epique"),
    RELIQUE("Relique", "rarity-relique"),
    MAUDIT("Maudit", "rarity-maudit");

    private final String label;
    private final String cssClass;

    EquipmentRarity(String label, String cssClass) {
        this.label = label;
        this.cssClass = cssClass;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getCssClass() { return cssClass; }

    @JsonCreator
    public static EquipmentRarity fromNode(JsonNode node) {
        if (node.isObject()) {
            return EquipmentRarity.valueOf(node.get("name").asText());
        }
        return EquipmentRarity.valueOf(node.asText());
    }
}


