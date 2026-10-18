package generation.grimoire.scheduler;

import generation.grimoire.service.pve.HuntingQuestService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HuntingQuestSchedulerTest {

    @Mock
    private HuntingQuestService huntingQuestService;

    @InjectMocks
    private HuntingQuestScheduler scheduler;

    @Nested
    @DisplayName("Tests onStartup")
    class OnStartupTests {

        @Test
        @DisplayName("onStartup doit appeler ensureQuestsExist")
        void shouldCallEnsureQuestsExist() {
            scheduler.onStartup();

            verify(huntingQuestService, times(1)).ensureQuestsExist();
            verifyNoMoreInteractions(huntingQuestService);
        }

        @Test
        @DisplayName("onStartup doit intercepter les exceptions sans crasher")
        void shouldCatchExceptionWithoutCrashing() {
            doThrow(new RuntimeException("DB error")).when(huntingQuestService).ensureQuestsExist();

            assertDoesNotThrow(() -> scheduler.onStartup());

            verify(huntingQuestService, times(1)).ensureQuestsExist();
        }
    }

    @Nested
    @DisplayName("Tests rotateDailyQuest")
    class RotateDailyQuestTests {

        @Test
        @DisplayName("rotateDailyQuest doit appeler expireOldQuests puis rotateDailyQuest")
        void shouldExpireOldQuestsThenRotateDailyQuest() {
            scheduler.rotateDailyQuest();

            InOrder inOrder = inOrder(huntingQuestService);
            inOrder.verify(huntingQuestService).expireOldQuests();
            inOrder.verify(huntingQuestService).rotateDailyQuest();
            verifyNoMoreInteractions(huntingQuestService);
        }

        @Test
        @DisplayName("rotateDailyQuest doit intercepter l'exception sur expireOldQuests sans crasher")
        void shouldCatchExceptionWhenExpireOldQuestsFails() {
            doThrow(new RuntimeException("Expire error")).when(huntingQuestService).expireOldQuests();

            assertDoesNotThrow(() -> scheduler.rotateDailyQuest());

            verify(huntingQuestService, times(1)).expireOldQuests();
            verify(huntingQuestService, never()).rotateDailyQuest();
        }

        @Test
        @DisplayName("rotateDailyQuest doit intercepter l'exception sur rotateDailyQuest sans crasher")
        void shouldCatchExceptionWhenRotateDailyQuestFails() {
            doThrow(new RuntimeException("Rotate daily error")).when(huntingQuestService).rotateDailyQuest();

            assertDoesNotThrow(() -> scheduler.rotateDailyQuest());

            verify(huntingQuestService, times(1)).expireOldQuests();
            verify(huntingQuestService, times(1)).rotateDailyQuest();
        }
    }

    @Nested
    @DisplayName("Tests rotateWeeklyQuest")
    class RotateWeeklyQuestTests {

        @Test
        @DisplayName("rotateWeeklyQuest doit appeler expireOldQuests puis rotateWeeklyQuest")
        void shouldExpireOldQuestsThenRotateWeeklyQuest() {
            scheduler.rotateWeeklyQuest();

            InOrder inOrder = inOrder(huntingQuestService);
            inOrder.verify(huntingQuestService).expireOldQuests();
            inOrder.verify(huntingQuestService).rotateWeeklyQuest();
            verifyNoMoreInteractions(huntingQuestService);
        }

        @Test
        @DisplayName("rotateWeeklyQuest doit intercepter l'exception sur expireOldQuests sans crasher")
        void shouldCatchExceptionWhenExpireOldQuestsFails() {
            doThrow(new RuntimeException("Expire error")).when(huntingQuestService).expireOldQuests();

            assertDoesNotThrow(() -> scheduler.rotateWeeklyQuest());

            verify(huntingQuestService, times(1)).expireOldQuests();
            verify(huntingQuestService, never()).rotateWeeklyQuest();
        }

        @Test
        @DisplayName("rotateWeeklyQuest doit intercepter l'exception sur rotateWeeklyQuest sans crasher")
        void shouldCatchExceptionWhenRotateWeeklyQuestFails() {
            doThrow(new RuntimeException("Rotate weekly error")).when(huntingQuestService).rotateWeeklyQuest();

            assertDoesNotThrow(() -> scheduler.rotateWeeklyQuest());

            verify(huntingQuestService, times(1)).expireOldQuests();
            verify(huntingQuestService, times(1)).rotateWeeklyQuest();
        }
    }
}
