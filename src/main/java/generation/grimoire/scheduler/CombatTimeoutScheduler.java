package generation.grimoire.scheduler;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatService;
import generation.grimoire.repository.PersonnageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Iterator;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CombatTimeoutScheduler {

    private final CombatService combatService;
    private final PersonnageRepository personnageRepository;

    @Scheduled(fixedRate = 60000)
    public void checkAndTimeoutCombats() {
        Instant threshold = Instant.now().minus(2, ChronoUnit.HOURS);

        for (Map.Entry<String, CombatSession> entry : combatService.getActiveSessions().entrySet()) {
            CombatSession session = entry.getValue();

            if (session.getLastActivity().isBefore(threshold)) {
                // Apply actual flee penalties
                try {
                    combatService.fleeCombat(session.getSessionId());
                } catch (Exception e) {
                    System.err.println("Error applying flee penalties for timed out session " + session.getSessionId() + ": " + e.getMessage());
                }
                
                // Ensure it is marked as finished
                session.setFinished(true);
                session.setPlayerWon(false);
                
                // Remove from memory
                combatService.getActiveSessions().remove(session.getSessionId());
                
                System.out.println("CombatSession " + session.getSessionId() + " timed out due to inactivity and was fled.");
            }
        }
    }
}
