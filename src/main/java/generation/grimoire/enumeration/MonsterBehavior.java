package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum MonsterBehavior {
    NORMAL("Normal", "Cible aléatoire", "casino"),
    PREDATEUR("Prédateur", "Attaque toujours la même cible tant qu'elle est vivante", "my_location"),
    CORRUPTEUR("Corrupteur", "Cible le joueur avec le plus de Mana restant et lui retire 5% de son mana actuel",
            "bolt"),
    LEADER("Leader", "Force tous les alliés monstres à attaquer la même cible", "military_tech"),
    ASSASSIN("Assassin", "Cible le joueur avec le moins de Résistance", "visibility"),
    BRUTAL("Brutal", "Dégâts bruts (ignore armure/résistance)", "local_fire_department"),
    TRANSCENDANT("Transcendant", "Attaque toutes les cibles adverses à la fois", "flare");

    private final String label;
    private final String description;
    private final String icon;

    MonsterBehavior(String label, String description, String icon) {
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

    @com.fasterxml.jackson.annotation.JsonCreator
    public static MonsterBehavior fromNode(com.fasterxml.jackson.databind.JsonNode node) {
        if (node.isObject()) {
            return MonsterBehavior.valueOf(node.get("name").asText());
        }
        return MonsterBehavior.valueOf(node.asText());
    }
}
