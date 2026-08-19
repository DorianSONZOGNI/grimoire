package generation.grimoire.service.pve;

import com.fasterxml.jackson.databind.ObjectMapper;
import generation.grimoire.model.pve.CombatSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
@RequiredArgsConstructor
public class CombatEventEmitter {

    private final ObjectMapper objectMapper;

    /** sessionId → liste des clients SSE abonnés */
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * Crée un SseEmitter pour le sessionId donné et l'enregistre.
     * Le client recevra toutes les mises à jour de cette session.
     */
    public SseEmitter subscribe(String sessionId) {
        SseEmitter emitter = new SseEmitter(300_000L); // timeout 5 min

        emitters.computeIfAbsent(sessionId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> remove(sessionId, emitter));
        emitter.onTimeout(() -> remove(sessionId, emitter));
        emitter.onError(e -> remove(sessionId, emitter));

        return emitter;
    }

    /**
     * Diffuse la session mise à jour à tous les clients abonnés.
     * Les emitters morts sont automatiquement retirés.
     */
    public void broadcast(String sessionId, CombatSession session) {
        List<SseEmitter> list = emitters.get(sessionId);
        if (list == null || list.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(session);
        } catch (IOException e) {
            log.error("SSE serialization error for session {}", sessionId, e);
            return;
        }

        List<SseEmitter> dead = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name("combat-update")
                        .data(Objects.requireNonNull(json)));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        list.removeAll(dead);
    }

    /**
     * Broadcast un événement nommé custom (ex: "lobby-ready", "session-ended").
     */
    public void broadcastEvent(String sessionId, String eventName, Object payload) {
        List<SseEmitter> list = emitters.get(sessionId);
        if (list == null || list.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            log.error("SSE serialization error for event {} / session {}", eventName, sessionId, e);
            return;
        }

        List<SseEmitter> dead = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(Objects.requireNonNull(eventName)).data(Objects.requireNonNull(json)));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        list.removeAll(dead);
    }

    /** Retire un emitter spécifique (déconnexion, timeout). */
    public void remove(String sessionId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(sessionId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) emitters.remove(sessionId);
        }
    }

    /** Ferme et retire tous les emitters d'une session (fin de combat). */
    public void closeAll(String sessionId) {
        List<SseEmitter> list = emitters.remove(sessionId);
        if (list != null) {
            list.forEach(e -> {
                try { e.complete(); } catch (Exception ignored) {}
            });
        }
    }
}
