package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;

@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum CombatSignalAction {
    // Pings sur Monstre
    ATTACK("Attaquer", "Attaquer cette cible en priorité", "swords", "⚔️", "#ef4444", CombatSignalType.MOB_PING),
    FEAR("Danger", "Attention danger / menace sur cette cible", "warning", "⚠️", "#f59e0b", CombatSignalType.MOB_PING),

    // Pings sur Héros
    HEAL("Soin", "Demande de soins d'urgence", "favorite", "💚", "#10b981", CombatSignalType.HERO_PING),
    SHIELD("Bouclier", "Demande d'un bouclier de protection", "shield", "🛡️", "#38bdf8", CombatSignalType.HERO_PING),
    BUFF("Renfort", "Demande d'un bonus ou amélioration", "auto_awesome", "✨", "#c084fc", CombatSignalType.HERO_PING),

    // Émotes générales
    HAPPY("Content", "Exprime la joie", "sentiment_very_satisfied", "😊", "#22c55e", CombatSignalType.EMOTE),
    SAD("Triste", "Exprime la tristesse", "sentiment_dissatisfied", "😢", "#38bdf8", CombatSignalType.EMOTE),
    ANGRY("Colère", "Exprime la frustration ou colère", "sentiment_very_dissatisfied", "😡", "#ef4444", CombatSignalType.EMOTE),
    GG("Bien joué", "Félicite l'allié", "emoji_events", "👏", "#eab308", CombatSignalType.EMOTE),
    HELLO("Salut", "Salue l'autre joueur", "waving_hand", "👋", "#38bdf8", CombatSignalType.EMOTE),
    THINKING("Réflexion", "Indique qu'on réfléchit à sa stratégie", "psychology", "🤔", "#a855f7", CombatSignalType.EMOTE),
    SURPRISED("Panique", "Au secours ou panique", "sentiment_worried", "😱", "#f97316", CombatSignalType.EMOTE),
    THANKS("Merci", "Remercie l'autre joueur", "volunteer_activism", "🙏", "#ec4899", CombatSignalType.EMOTE);

    private final String label;
    private final String description;
    private final String icon;
    private final String badge;
    private final String color;
    private final CombatSignalType type;

    CombatSignalAction(String label, String description, String icon, String badge, String color, CombatSignalType type) {
        this.label = label;
        this.description = description;
        this.icon = icon;
        this.badge = badge;
        this.color = color;
        this.type = type;
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

    public String getBadge() {
        return badge;
    }

    public String getColor() {
        return color;
    }

    public CombatSignalType getType() {
        return type;
    }

    @JsonCreator
    public static CombatSignalAction fromJson(JsonNode node) {
        if (node == null) return null;
        if (node.isTextual()) {
            return CombatSignalAction.valueOf(node.asText());
        }
        if (node.has("name")) {
            return CombatSignalAction.valueOf(node.get("name").asText());
        }
        return null;
    }
}
