package generation.grimoire.config;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class CombatInterceptor implements HandlerInterceptor {

    private final CombatService combatService;

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) throws Exception {
        String uri = request.getRequestURI();

        // Exclude specific URIs
        if (uri.startsWith("/api/combat/") || uri.startsWith("/api/pve/combat/") || uri.startsWith("/api/auth/") || uri.startsWith("/css/")
                || uri.startsWith("/js/") || uri.startsWith("/images/") || uri.startsWith("/styles/") || uri.equals("/combat.html") || uri.equals("/error") || uri.startsWith("/api/anomalies/")) {
            return true;
        }

        // Check if user is in combat
        String username = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : null;
        if (username != null) {
            for (Map.Entry<String, CombatSession> entry : combatService.getActiveSessions().entrySet()) {
                CombatSession session = entry.getValue();
                boolean inCombat = session.getPlayers().stream()
                        .anyMatch(p -> p.getUser() != null && username.equals(p.getUser().getUsername()));

                if (inCombat && !session.isFinished()) {
                    if (uri.startsWith("/api/")) {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Vous êtes en combat, action interdite.");
                        return false;
                    } else {
                        response.sendRedirect("/combat.html"); // Replace with actual combat view URL
                        return false;
                    }
                }
            }
        }

        return true;
    }
}
