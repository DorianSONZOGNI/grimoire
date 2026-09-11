package generation.grimoire.scheduler;

import generation.grimoire.service.pve.HuntingQuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class HuntingQuestScheduler {

    private final HuntingQuestService huntingQuestService;

    /** Au démarrage de l'app, s'assurer qu'on a des quêtes actives */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            huntingQuestService.ensureQuestsExist();
        } catch (Exception e) {
            System.err.println("[HuntingQuestScheduler] Erreur init: " + e.getMessage());
        }
    }

    /** Tous les jours à minuit (Europe/Paris) → rotation daily */
    @Scheduled(cron = "0 0 0 * * *", zone = "Europe/Paris")
    public void rotateDailyQuest() {
        try {
            huntingQuestService.expireOldQuests();
            huntingQuestService.rotateDailyQuest();
        } catch (Exception e) {
            System.err.println("[HuntingQuestScheduler] Erreur rotation daily: " + e.getMessage());
        }
    }

    /** Tous les lundis à minuit (Europe/Paris) → rotation weekly */
    @Scheduled(cron = "0 0 0 * * MON", zone = "Europe/Paris")
    public void rotateWeeklyQuest() {
        try {
            huntingQuestService.expireOldQuests();
            huntingQuestService.rotateWeeklyQuest();
        } catch (Exception e) {
            System.err.println("[HuntingQuestScheduler] Erreur rotation weekly: " + e.getMessage());
        }
    }
}
