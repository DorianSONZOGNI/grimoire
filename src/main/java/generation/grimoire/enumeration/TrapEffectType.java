package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum TrapEffectType {
    CUSTOM("Classique", "Dégâts directs PV et/ou Mana configurables", "warning", "#94a3b8"),
    FOSSE_A_PIEUX("Fosse à Pieux", "Malus de Vitesse au prochain combat", "altitude", "#ef4444"),
    NEUROTOXINE("Neurotoxine", "Infecte le groupe avec un poison virulent infligeant des dégâts sur la durée", "science", "#10b981"),
    PLUIE_ACIDE("Pluie d'acide", "Vapeurs corrosives rongeant l'Armure et la Résistance magique", "water_damage", "#84cc16"),
    RUPTURE_ARCANIQUE("Rupture arcanique", "Brûle le Mana des héros et réduit leur Résistance magique", "water_drop", "#06b6d4"),
    FUMEE_AVEUGLANTE("Fumée aveuglante", "Éclats aveuglants réduisant le Critique, la Force et la Puissance", "visibility_off", "#a855f7"),
    MALEDICTION_DESESPERANTE("Malédiction désespérante", "Accable les héros d'un malus sur tous leurs dégâts infligés", "heart_broken", "#ec4899"),
    MALEDICTION_MORTELLE("Malédiction mortelle", "Rend les chairs vulnérables : tous les dégâts reçus sont amplifiés", "skull", "#f43f5e"),
    MALEDICTION_SOLITUDE("Malédiction de solitude", "Bloque l'entraide : malus sévère sur les soins et boucliers reçus", "person_off", "#fb923c"),
    FOURNAISE("Fournaise", "Vague de chaleur brûlante infligeant Brûlure et réduisant l'Armure", "local_fire_department", "#f97316");

    private final String label;
    private final String description;
    private final String icon;
    private final String color;

    TrapEffectType(String label, String description, String icon, String color) {
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
    public static TrapEffectType fromNode(com.fasterxml.jackson.databind.JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isObject() && node.has("name")) {
            return TrapEffectType.valueOf(node.get("name").asText());
        }
        return TrapEffectType.valueOf(node.asText());
    }
}
