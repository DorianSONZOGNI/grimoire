package generation.grimoire.scheduler;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.DungeonRunStat;
import generation.grimoire.enumeration.DungeonOutcome;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.pve.DungeonRunStatRepository;
import generation.grimoire.service.pve.CombatService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CombatTimeoutScheduler {

    private final CombatService combatService;
    private final DungeonRunStatRepository dungeonRunStatRepository;

    @Scheduled(fixedRate = 60000)
    public void checkAndTimeoutCombats() {
        Instant threshold = Instant.now().minus(10, ChronoUnit.MINUTES);

        for (Map.Entry<String, CombatSession> entry : combatService.getActiveSessions().entrySet()) {
            CombatSession session = entry.getValue();

            if (session.getLastActivity().isBefore(threshold)) {
                // Record TIMEOUT stat before applying flee penalties
                try {
                    int runNumber = dungeonRunStatRepository.findMaxRunNumberByDungeonId(session.getDungeonId()) + 1;
                    for (Personnage p : session.getPlayers()) {
                        DungeonRunStat stat = new DungeonRunStat();
                        stat.setDungeonId(session.getDungeonId());
                        stat.setDungeonName(session.getDonjonName());
                        
                        if (session.hasFled(p)) {
                            stat.setOutcome(DungeonOutcome.FLEE);
                        } else {
                            stat.setOutcome(DungeonOutcome.TIMEOUT);
                        }

                        stat.setVoieName(p.getVoie() != null ? p.getVoie().getNom() : null);
                        stat.setSpiritualiteName(p.getSpiritualite() != null ? p.getSpiritualite().getNom() : null);
                        stat.setHeroLevel(p.getVoieLevel());
                        stat.setMulti(session.isMulti());
                        stat.setRunNumber(runNumber);
                        stat.setDead(p.getHealthCurrent() <= 0);
                        stat.setTimestamp(Instant.now());
                        stat.setAccountName(p.getOwnerUsername());
                        dungeonRunStatRepository.save(stat);
                    }
                } catch (Exception e) {
                    System.err.println("[DungeonStats] Erreur enregistrement timeout: " + e.getMessage());
                }

                // Apply actual flee penalties
                try {
                    combatService.fleeCombatTimeout(session.getSessionId());
                } catch (Exception e) {
                    System.err.println("Error applying flee penalties for timed out session " + session.getSessionId()
                            + ": " + e.getMessage());
                }

                // Ensure it is marked as finished
                session.setFinished(true);
                session.setPlayerWon(false);

                // Remove from memory
                combatService.getActiveSessions().remove(session.getSessionId());

                System.out.println(
                        "CombatSession " + session.getSessionId() + " timed out due to inactivity and was fled.");
            }
        }
    }
}

