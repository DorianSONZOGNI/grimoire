package generation.grimoire.scheduler;

import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CombatTimeoutSchedulerTest {

    @Mock
    private CombatService combatService;

    @InjectMocks
    private CombatTimeoutScheduler scheduler;

    private Map<String, CombatSession> activeSessions;
    private CombatSession recentSession;
    private CombatSession oldSession;

    @BeforeEach
    void setUp() {
        activeSessions = new ConcurrentHashMap<>();
        
        recentSession = mock(CombatSession.class);
        lenient().when(recentSession.getSessionId()).thenReturn("session-recent");
        lenient().when(recentSession.getLastActivity()).thenReturn(Instant.now().minus(5, ChronoUnit.MINUTES));

        oldSession = mock(CombatSession.class);
        lenient().when(oldSession.getSessionId()).thenReturn("session-old");
        lenient().when(oldSession.getLastActivity()).thenReturn(Instant.now().minus(15, ChronoUnit.MINUTES));

        lenient().when(combatService.getActiveSessions()).thenReturn(activeSessions);
    }

    @Test
    void shouldTimeoutOldSessionsAndKeepRecentOnes() {
        activeSessions.put("session-recent", recentSession);
        activeSessions.put("session-old", oldSession);

        scheduler.checkAndTimeoutCombats();

        // Verify recent session is kept
        assertThat(activeSessions).containsEntry("session-recent", recentSession);
        verify(combatService, never()).fleeCombat(eq("session-recent"), any());

        // Verify old session is removed and fled
        assertThat(activeSessions).doesNotContainKey("session-old");
        verify(combatService).fleeCombat("session-old", null);
        verify(oldSession).setFinished(true);
        verify(oldSession).setPlayerWon(false);
    }

    @Test
    void shouldHandleExceptionDuringFleeCombatAndStillRemoveSession() {
        activeSessions.put("session-old", oldSession);

        doThrow(new RuntimeException("Test Exception")).when(combatService).fleeCombat("session-old", null);

        scheduler.checkAndTimeoutCombats();

        // Verify old session is still removed despite the exception
        assertThat(activeSessions).doesNotContainKey("session-old");
        verify(combatService).fleeCombat("session-old", null);
        verify(oldSession).setFinished(true);
        verify(oldSession).setPlayerWon(false);
    }
}
