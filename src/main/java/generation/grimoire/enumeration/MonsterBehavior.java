package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum MonsterBehavior {
    NORMAL("Normal", "Cible aléatoire", "casino", "#94a3b8"),
    PREDATEUR("Prédateur", "Attaque toujours la même cible tant qu'elle est vivante", "my_location", "#f59e0b"),
    CORRUPTEUR("Corrupteur", "Cible le joueur avec le plus de Mana restant et lui retire 5% de son mana actuel", "bolt", "#8b5cf6"),
    LEADER("Leader", "Force tous les alliés monstres à attaquer la même cible", "military_tech", "#fcd34d"),
    ASSASSIN("Assassin", "Cible le joueur avec le moins de Résistance", "visibility", "#ef4444"),
    BRUTAL("Brutal", "Dégâts bruts (ignore armure/résistance)", "local_fire_department", "#9ca3af"),
    TRANSCENDANT("Transcendant", "Attaque toutes les cibles adverses à la fois", "flare", "#fbbf24"),
    SADIQUE("Sadique", "Attaque la cible qui a le moins de PV actuels", "background_replace", "#ef4444");

    private final String label;
    private final String description;
    private final String icon;
    private final String color;

    MonsterBehavior(String label, String description, String icon, String color) {
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

    @com.fasterxml.jackson.annotation.JsonCreator
    public static MonsterBehavior fromNode(com.fasterxml.jackson.databind.JsonNode node) {
        if (node.isObject()) {
            return MonsterBehavior.valueOf(node.get("name").asText());
        }
        return MonsterBehavior.valueOf(node.asText());
    }
}
