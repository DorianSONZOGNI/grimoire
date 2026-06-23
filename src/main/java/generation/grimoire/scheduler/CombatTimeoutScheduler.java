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

        Iterator<Map.Entry<String, CombatSession>> iterator = combatService.getActiveSessions().entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, CombatSession> entry = iterator.next();
            CombatSession session = entry.getValue();

            if (session.getLastActivity().isBefore(threshold)) {
                // Apply defeat penalties
                session.getPlayers().forEach(p -> {
                    p.setHealthCurrent(0);
                    // Add other defeat logic if needed (XP loss, etc.)
                    personnageRepository.save(p);
                });
                
                session.setFinished(true);
                session.setPlayerWon(false);
                
                // Remove from memory
                iterator.remove();
                
                System.out.println("CombatSession " + session.getSessionId() + " timed out due to inactivity.");
            }
        }
    }
}
