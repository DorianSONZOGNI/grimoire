package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum MonsterType {
    NORMAL("Normal", "Pas de passif", "pets", "#94a3b8"),
    DEMON("Démon", "10% des dégâts infligés sont aussi appliqués en brut", "rib_cage", "#ef4444"),
    REPTILE("Reptile", "15% de réduction des dégâts physiques subis", "bug_report", "#10b981"),
    MORT_VIVANT("Mort-vivant", "Régénère 5% de ses PV max à chaque début de tour", "skull", "#94a3b8"),
    HYBRIDE("Hybride", "Dégâts = (Force + Puissance) × 1.2, répartis moitié physique moitié magique", "merge_type", "#3b82f6"),
    VAMPIRE("Vampire", "20% de vol de vie sur les dégâts infligés", "water_drop", "#e11d48"),
    ECTOPLASME("Ectoplasme", "Ses attaques appliquent un débuff de résistance magique (-5 rés pendant 3 tours)", "blur_on", "#a855f7"),
    EPINE("Épine", "Renvoie 10% des dégâts Phy/Mag reçus", "traffic", "#fbbf24");

    private final String label;
    private final String description;
    private final String icon;
    private final String color;

    MonsterType(String label, String description, String icon, String color) {
        this.label = label;
        this.description = description;
        this.icon = icon;
        this.color = color;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public String getIcon() { return icon; }
    public String getColor() { return color; }

    @com.fasterxml.jackson.annotation.JsonCreator
    public static MonsterType fromNode(com.fasterxml.jackson.databind.JsonNode node) {
        if (node.isObject()) {
            return MonsterType.valueOf(node.get("name").asText());
        }
        return MonsterType.valueOf(node.asText());
    }
}


