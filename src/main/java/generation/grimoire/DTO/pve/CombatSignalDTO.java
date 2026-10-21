package generation.grimoire.dto.pve;

import generation.grimoire.enumeration.CombatSignalAction;
import generation.grimoire.enumeration.CombatSignalType;
import java.util.UUID;

public record CombatSignalDTO(
    String id,
    String senderUsername,
    CombatSignalAction action,
    CombatSignalType type,
    Integer targetIndex,
    String targetName,
    String formattedMessage,
    long timestamp
) {
    public static CombatSignalDTO of(String senderUsername, CombatSignalAction action, Integer targetIndex, String targetName) {
        String id = UUID.randomUUID().toString();
        CombatSignalType type = action != null ? action.getType() : CombatSignalType.EMOTE;
        String msg = buildMessage(senderUsername, action, targetName);
        return new CombatSignalDTO(id, senderUsername, action, type, targetIndex, targetName, msg, System.currentTimeMillis());
    }

    private static String buildMessage(String sender, CombatSignalAction action, String target) {
        String user = (sender != null && !sender.isBlank()) ? sender : "Joueur";
        if (action == null) return user + " a envoyé un signal.";
        return switch (action) {
            case ATTACK -> "⚔️ " + user + " cible " + (target != null ? target : "l'ennemi") + " : Attaquez !";
            case FEAR -> "⚠️ " + user + " signale un danger sur " + (target != null ? target : "l'ennemi") + " !";
            case HEAL -> "💚 " + user + " demande des soins pour " + (target != null ? target : "un allié") + " !";
            case SHIELD -> "🛡️ " + user + " demande un bouclier pour " + (target != null ? target : "un allié") + " !";
            case BUFF -> "✨ " + user + " demande des renforts pour " + (target != null ? target : "un allié") + " !";
            case HAPPY -> user + " : 😊 Content";
            case SAD -> user + " : 😢 Triste";
            case ANGRY -> user + " : 😡 En colère";
            case GG -> user + " : 👏 Bien joué !";
            case HELLO -> user + " : 👋 Salut !";
            case THINKING -> user + " : 🤔 En réflexion...";
            case SURPRISED -> user + " : 😱 Au secours !";
            case THANKS -> user + " : 🙏 Merci !";
        };
    }
}
