package generation.grimoire.service.pve;

import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.pve.*;
import generation.grimoire.enumeration.AnomalieCategory;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.enumeration.SpiritualiteType;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class HuntingQuestServiceTest {

    @Mock
    private HuntingQuestRepository questRepository;

    @Mock
    private HuntingQuestEntryRepository entryRepository;

    @Mock
    private DonjonRepository donjonRepository;

    @Mock
    private DungeonRunStatRepository runStatRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AnomalieRepository anomalieRepository;

    @InjectMocks
    private HuntingQuestService huntingQuestService;

    private static final ZoneId ZONE = ZoneId.of("Europe/Paris");

    private Donjon dungeonDaily;
    private Donjon dungeonWeekly;
    private HuntingQuest activeDailyQuest;
    private HuntingQuest activeWeeklyQuest;
    private AppUser testUser;

    @BeforeEach
    void setUp() {
        dungeonDaily = new Donjon();
        dungeonDaily.setId(10L);
        dungeonDaily.setName("Donjon des Gobelins");
        dungeonDaily.setRecommendedLevel(2);
        dungeonDaily.setRequiredSecret("Secret du Chaos");
        dungeonDaily.setRequiredSecretLevel(1);
        Salle salle1 = new Salle();
        salle1.setType(RoomType.COMBAT);
        Salle salle2 = new Salle();
        salle2.setType(RoomType.BOSS);
        dungeonDaily.setSalles(new ArrayList<>(List.of(salle1, salle2)));

        dungeonWeekly = new Donjon();
        dungeonWeekly.setId(20L);
        dungeonWeekly.setName("Donjon des Abysses");
        dungeonWeekly.setRecommendedLevel(5);
        dungeonWeekly.setRequiredSecret("Secret des Abysses");
        dungeonWeekly.setRequiredSecretLevel(2);
        Salle sWeekly = new Salle();
        sWeekly.setType(RoomType.BOSS);
        dungeonWeekly.setSalles(new ArrayList<>(List.of(sWeekly)));

        activeDailyQuest = new HuntingQuest();
        activeDailyQuest.setId(100L);
        activeDailyQuest.setType("DAILY");
        activeDailyQuest.setDungeonId(10L);
        activeDailyQuest.setDungeonName("Donjon des Gobelins");
        activeDailyQuest.setDungeonLevel(2);
        activeDailyQuest.setDungeonRoomCount(2);
        activeDailyQuest.setRequiredSecret("Secret du Chaos");
        activeDailyQuest.setRequiredSecretLevel(1);
        activeDailyQuest.setStartDate(LocalDate.now(ZONE));
        activeDailyQuest.setEndDate(LocalDate.now(ZONE).plusDays(1));
        activeDailyQuest.setActive(true);
        activeDailyQuest.setDailyChallengeDuo("HEADHUNTER");

        activeWeeklyQuest = new HuntingQuest();
        activeWeeklyQuest.setId(200L);
        activeWeeklyQuest.setType("WEEKLY");
        activeWeeklyQuest.setDungeonId(20L);
        activeWeeklyQuest.setDungeonName("Donjon des Abysses");
        activeWeeklyQuest.setDungeonLevel(5);
        activeWeeklyQuest.setDungeonRoomCount(1);
        activeWeeklyQuest.setRequiredSecret("Secret des Abysses");
        activeWeeklyQuest.setRequiredSecretLevel(2);
        activeWeeklyQuest.setStartDate(LocalDate.now(ZONE));
        activeWeeklyQuest.setEndDate(LocalDate.now(ZONE).plusWeeks(1));
        activeWeeklyQuest.setActive(true);
        activeWeeklyQuest.setRewardAnomalieId(500L);

        testUser = new AppUser();
        testUser.setId(1L);
        testUser.setUsername("player1");
        testUser.setMonnaie(50.0);
        testUser.setDiscoveredItems(new HashSet<>());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Rotation Tests
    // ═══════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Rotation Tests")
    class RotationTests {

        @Test
        @DisplayName("rotateDailyQuest: should deactivate previous daily, select dungeon <= lvl 2 and save quest")
        void rotateDailyQuest_shouldDeactivatePreviousAndSaveNewQuest() {
            HuntingQuest oldQuest = new HuntingQuest();
            oldQuest.setId(99L);
            oldQuest.setType("DAILY");
            oldQuest.setActive(true);

            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(oldQuest));
            when(donjonRepository.findAll()).thenReturn(List.of(dungeonDaily));
            when(runStatRepository.findAll()).thenReturn(List.of());

            huntingQuestService.rotateDailyQuest();

            assertThat(oldQuest.isActive()).isFalse();
            verify(questRepository).save(oldQuest);

            ArgumentCaptor<HuntingQuest> captor = ArgumentCaptor.forClass(HuntingQuest.class);
            verify(questRepository, times(2)).save(captor.capture());
            HuntingQuest saved = captor.getValue();

            assertThat(saved.getType()).isEqualTo("DAILY");
            assertThat(saved.getDungeonId()).isEqualTo(dungeonDaily.getId());
            assertThat(saved.getDungeonName()).isEqualTo(dungeonDaily.getName());
            assertThat(saved.getDungeonLevel()).isEqualTo(2);
            assertThat(saved.getDungeonRoomCount()).isEqualTo(2);
            assertThat(saved.isActive()).isTrue();
            assertThat(saved.getDailyChallengeDuo()).isIn("HEADHUNTER", "SURGEON", "LONER", "IMPATIENT");
        }

        @Test
        @DisplayName("rotateDailyQuest: should return early if no dungeons <= level 2")
        void rotateDailyQuest_shouldReturnEarlyWhenNoEligibleDungeon() {
            Donjon highLvl = new Donjon();
            highLvl.setId(30L);
            highLvl.setRecommendedLevel(5);

            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.empty());
            when(donjonRepository.findAll()).thenReturn(List.of(highLvl));

            huntingQuestService.rotateDailyQuest();

            verify(questRepository, never()).save(any());
        }

        @Test
        @DisplayName("rotateDailyQuest: weighted selection selects dungeon inversely proportional to run counts")
        void rotateDailyQuest_weightedSelection() {
            Donjon d1 = new Donjon();
            d1.setId(1L);
            d1.setRecommendedLevel(1);
            d1.setSalles(new ArrayList<>());

            Donjon d2 = new Donjon();
            d2.setId(2L);
            d2.setRecommendedLevel(1);
            d2.setSalles(new ArrayList<>());

            DungeonRunStat stat1 = new DungeonRunStat();
            stat1.setDungeonId(1L);

            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.empty());
            when(donjonRepository.findAll()).thenReturn(List.of(d1, d2));
            when(runStatRepository.findAll()).thenReturn(List.of(stat1));

            huntingQuestService.rotateDailyQuest();

            verify(questRepository).save(any(HuntingQuest.class));
        }

        @Test
        @DisplayName("rotateWeeklyQuest: should deactivate previous weekly, filter eligible dungeons, pick anomaly and save")
        void rotateWeeklyQuest_shouldDeactivatePreviousAndSaveNewQuest() {
            HuntingQuest oldQuest = new HuntingQuest();
            oldQuest.setId(199L);
            oldQuest.setType("WEEKLY");
            oldQuest.setActive(true);

            Anomalie template = new Anomalie();
            template.setId(500L);
            template.setName("Relique Abyssale");
            template.setLevel(2);
            template.setSpiritualite(SpiritualiteType.TENEBRES);
            template.setTemplate(true);

            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.of(oldQuest));
            when(donjonRepository.findAll()).thenReturn(List.of(dungeonWeekly));
            when(anomalieRepository.findByIsTemplateTrue()).thenReturn(List.of(template));

            huntingQuestService.rotateWeeklyQuest();

            assertThat(oldQuest.isActive()).isFalse();
            verify(questRepository).save(oldQuest);

            ArgumentCaptor<HuntingQuest> captor = ArgumentCaptor.forClass(HuntingQuest.class);
            verify(questRepository, times(2)).save(captor.capture());
            HuntingQuest saved = captor.getValue();

            assertThat(saved.getType()).isEqualTo("WEEKLY");
            assertThat(saved.getDungeonId()).isEqualTo(dungeonWeekly.getId());
            assertThat(saved.getRewardAnomalieId()).isEqualTo(500L);
            assertThat(saved.isActive()).isTrue();
        }

        @Test
        @DisplayName("rotateWeeklyQuest: should return early if no eligible dungeons")
        void rotateWeeklyQuest_shouldReturnEarlyWhenNoEligibleDungeon() {
            Donjon notEligible = new Donjon();
            notEligible.setId(25L);
            notEligible.setRequiredSecretLevel(1); // < 2
            notEligible.setRequiredSecret("Secret du Destin");
            notEligible.setSalles(new ArrayList<>());

            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(donjonRepository.findAll()).thenReturn(List.of(notEligible));

            huntingQuestService.rotateWeeklyQuest();

            verify(questRepository, never()).save(any());
        }

        @Test
        @DisplayName("rotateWeeklyQuest: fallback to any level when exact level not found for same spirituality")
        void rotateWeeklyQuest_fallbackSpiritualite() {
            Anomalie fallbackAnomaly = new Anomalie();
            fallbackAnomaly.setId(501L);
            fallbackAnomaly.setLevel(4); // different from dungeon's requiredSecretLevel 2
            fallbackAnomaly.setSpiritualite(SpiritualiteType.TENEBRES);
            fallbackAnomaly.setTemplate(true);

            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(donjonRepository.findAll()).thenReturn(List.of(dungeonWeekly));
            when(anomalieRepository.findByIsTemplateTrue()).thenReturn(List.of(fallbackAnomaly));

            huntingQuestService.rotateWeeklyQuest();

            ArgumentCaptor<HuntingQuest> captor = ArgumentCaptor.forClass(HuntingQuest.class);
            verify(questRepository).save(captor.capture());
            assertThat(captor.getValue().getRewardAnomalieId()).isEqualTo(501L);
        }

        @Test
        @DisplayName("rotateWeeklyQuest: fallback to any spirituality when no matching spirituality found")
        void rotateWeeklyQuest_fallbackLevelOnly() {
            Anomalie fallbackAnomaly = new Anomalie();
            fallbackAnomaly.setId(502L);
            fallbackAnomaly.setLevel(2); // matches level 2
            fallbackAnomaly.setSpiritualite(SpiritualiteType.DESTRUCTION);
            fallbackAnomaly.setTemplate(true);

            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(donjonRepository.findAll()).thenReturn(List.of(dungeonWeekly));
            when(anomalieRepository.findByIsTemplateTrue()).thenReturn(List.of(fallbackAnomaly));

            huntingQuestService.rotateWeeklyQuest();

            ArgumentCaptor<HuntingQuest> captor = ArgumentCaptor.forClass(HuntingQuest.class);
            verify(questRepository).save(captor.capture());
            assertThat(captor.getValue().getRewardAnomalieId()).isEqualTo(502L);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PostConstruct Fixes Tests
    // ═══════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("PostConstruct Fixes Tests")
    class PostConstructFixesTests {

        @Test
        @DisplayName("fixActiveWeeklyQuest: should link anomaly template when matching found")
        void fixActiveWeeklyQuest_shouldLinkAnomaly() {
            HuntingQuest weekly = new HuntingQuest();
            weekly.setId(201L);
            weekly.setRequiredSecret("Secret du Chaos");
            weekly.setRequiredSecretLevel(2);

            Anomalie template = new Anomalie();
            template.setId(600L);
            template.setLevel(2);
            template.setSpiritualite(SpiritualiteType.DESTRUCTION);
            template.setName("Orbe du Chaos");
            template.setTemplate(true);

            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.of(weekly));
            when(anomalieRepository.findByIsTemplateTrue()).thenReturn(List.of(template));

            huntingQuestService.fixActiveWeeklyQuest();

            assertThat(weekly.getRewardAnomalieId()).isEqualTo(600L);
            verify(questRepository).save(weekly);
        }

        @Test
        @DisplayName("fixActiveDailyQuest: should assign daily challenge duo if null")
        void fixActiveDailyQuest_shouldAssignDuoWhenNull() {
            HuntingQuest daily = new HuntingQuest();
            daily.setId(101L);
            daily.setDailyChallengeDuo(null);

            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(daily));

            huntingQuestService.fixActiveDailyQuest();

            assertThat(daily.getDailyChallengeDuo()).isNotNull();
            assertThat(daily.getDailyChallengeDuo()).isIn("HEADHUNTER", "SURGEON", "LONER", "IMPATIENT");
            verify(questRepository).save(daily);
        }

        @Test
        @DisplayName("fixActiveDailyQuest: should not overwrite if duo already set")
        void fixActiveDailyQuest_shouldNotOverwriteWhenAlreadySet() {
            HuntingQuest daily = new HuntingQuest();
            daily.setId(101L);
            daily.setDailyChallengeDuo("SURGEON");

            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(daily));

            huntingQuestService.fixActiveDailyQuest();

            assertThat(daily.getDailyChallengeDuo()).isEqualTo("SURGEON");
            verify(questRepository, never()).save(any());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Record Completion Tests
    // ═══════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Record Completion Tests")
    class RecordCompletionTests {

        @Test
        @DisplayName("recordCompletion: should update daily entry and mark challenges completed")
        void recordCompletion_dailyWithChallenges() {
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(activeDailyQuest));
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(entryRepository.findByQuestIdAndAccountName(activeDailyQuest.getId(), "player1"))
                    .thenReturn(Optional.empty());

            CombatSession session = mock(CombatSession.class);
            when(session.isHeadhunterChall1Failed()).thenReturn(false); // c1 succeeded
            when(session.isHeadhunterChall2Failed()).thenReturn(true);  // c2 failed

            huntingQuestService.recordCompletion(10L, "player1", 12, session);

            ArgumentCaptor<HuntingQuestEntry> captor = ArgumentCaptor.forClass(HuntingQuestEntry.class);
            verify(entryRepository).save(captor.capture());
            HuntingQuestEntry saved = captor.getValue();

            assertThat(saved.getCompletionCount()).isEqualTo(1);
            assertThat(saved.isChallenge1Completed()).isTrue();
            assertThat(saved.isChallenge2Completed()).isFalse();
            assertThat(saved.getFirstCompletionTime()).isNotNull();
        }

        @Test
        @DisplayName("recordCompletion: SURGEON challenge duo evaluation")
        void recordCompletion_dailySurgeonChallenges() {
            activeDailyQuest.setDailyChallengeDuo("SURGEON");
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(activeDailyQuest));
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(entryRepository.findByQuestIdAndAccountName(activeDailyQuest.getId(), "player1"))
                    .thenReturn(Optional.empty());

            CombatSession session = mock(CombatSession.class);
            when(session.isSurgeonChall1Failed()).thenReturn(false);
            when(session.isSurgeonChall2Failed()).thenReturn(false);

            huntingQuestService.recordCompletion(10L, "player1", 8, session);

            ArgumentCaptor<HuntingQuestEntry> captor = ArgumentCaptor.forClass(HuntingQuestEntry.class);
            verify(entryRepository).save(captor.capture());
            assertThat(captor.getValue().isChallenge1Completed()).isTrue();
            assertThat(captor.getValue().isChallenge2Completed()).isTrue();
        }

        @Test
        @DisplayName("recordCompletion: LONER challenge duo evaluation")
        void recordCompletion_dailyLonerChallenges() {
            activeDailyQuest.setDailyChallengeDuo("LONER");
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(activeDailyQuest));
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(entryRepository.findByQuestIdAndAccountName(activeDailyQuest.getId(), "player1"))
                    .thenReturn(Optional.empty());

            CombatSession session = mock(CombatSession.class);
            when(session.isLonerChall1Failed()).thenReturn(false);
            when(session.isLonerChall2Failed()).thenReturn(true);

            huntingQuestService.recordCompletion(10L, "player1", 8, session);

            ArgumentCaptor<HuntingQuestEntry> captor = ArgumentCaptor.forClass(HuntingQuestEntry.class);
            verify(entryRepository).save(captor.capture());
            assertThat(captor.getValue().isChallenge1Completed()).isTrue();
            assertThat(captor.getValue().isChallenge2Completed()).isFalse();
        }

        @Test
        @DisplayName("recordCompletion: IMPATIENT challenge duo evaluation")
        void recordCompletion_dailyImpatientChallenges() {
            activeDailyQuest.setDailyChallengeDuo("IMPATIENT");
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(activeDailyQuest));
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());
            when(entryRepository.findByQuestIdAndAccountName(activeDailyQuest.getId(), "player1"))
                    .thenReturn(Optional.empty());

            CombatSession session = mock(CombatSession.class);
            when(session.isImpatientChall1Failed()).thenReturn(true);
            when(session.isImpatientChall2Failed()).thenReturn(false);

            huntingQuestService.recordCompletion(10L, "player1", 8, session);

            ArgumentCaptor<HuntingQuestEntry> captor = ArgumentCaptor.forClass(HuntingQuestEntry.class);
            verify(entryRepository).save(captor.capture());
            assertThat(captor.getValue().isChallenge1Completed()).isFalse();
            assertThat(captor.getValue().isChallenge2Completed()).isTrue();
        }

        @Test
        @DisplayName("recordCompletion: weekly quest records bestTurnCount and updates ranks")
        void recordCompletion_weeklyQuestUpdatesBestTurnsAndRanks() {
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.empty());
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.of(activeWeeklyQuest));

            HuntingQuestEntry existingEntry = new HuntingQuestEntry();
            existingEntry.setQuest(activeWeeklyQuest);
            existingEntry.setAccountName("player1");
            existingEntry.setCompletionCount(1);
            existingEntry.setBestTurnCount(15);
            existingEntry.setFirstCompletionTime(Instant.now().minusSeconds(100));

            HuntingQuestEntry otherEntry = new HuntingQuestEntry();
            otherEntry.setQuest(activeWeeklyQuest);
            otherEntry.setAccountName("player2");
            otherEntry.setCompletionCount(1);
            otherEntry.setBestTurnCount(12);
            otherEntry.setFirstCompletionTime(Instant.now().minusSeconds(200));

            when(entryRepository.findByQuestIdAndAccountName(activeWeeklyQuest.getId(), "player1"))
                    .thenReturn(Optional.of(existingEntry));
            when(entryRepository.findByQuestId(activeWeeklyQuest.getId()))
                    .thenReturn(new ArrayList<>(List.of(existingEntry, otherEntry)));

            // Better run: 10 turns < 15 turns
            huntingQuestService.recordCompletion(20L, "player1", 10, null);

            assertThat(existingEntry.getBestTurnCount()).isEqualTo(10);
            assertThat(existingEntry.getCompletionCount()).isEqualTo(2);

            verify(entryRepository).saveAll(argThat(list -> {
                List<HuntingQuestEntry> entries = (List<HuntingQuestEntry>) list;
                // player1 has 10 turns (rank 1), player2 has 12 turns (rank 2)
                return entries.stream().anyMatch(e -> e.getAccountName().equals("player1") && e.getRank() == 1)
                        && entries.stream().anyMatch(e -> e.getAccountName().equals("player2") && e.getRank() == 2);
            }));
        }

        @Test
        @DisplayName("recordCompletion: weekly quest does not overwrite bestTurnCount if worse")
        void recordCompletion_weeklyQuestDoesNotOverwriteWorseScore() {
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.empty());
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.of(activeWeeklyQuest));

            HuntingQuestEntry existingEntry = new HuntingQuestEntry();
            existingEntry.setQuest(activeWeeklyQuest);
            existingEntry.setAccountName("player1");
            existingEntry.setCompletionCount(1);
            existingEntry.setBestTurnCount(10);
            Instant originalTime = Instant.now().minusSeconds(100);
            existingEntry.setFirstCompletionTime(originalTime);

            when(entryRepository.findByQuestIdAndAccountName(activeWeeklyQuest.getId(), "player1"))
                    .thenReturn(Optional.of(existingEntry));
            when(entryRepository.findByQuestId(activeWeeklyQuest.getId()))
                    .thenReturn(new ArrayList<>(List.of(existingEntry)));

            // Worse run: 18 turns > 10 turns
            huntingQuestService.recordCompletion(20L, "player1", 18, null);

            assertThat(existingEntry.getBestTurnCount()).isEqualTo(10);
            assertThat(existingEntry.getCompletionCount()).isEqualTo(2);
            assertThat(existingEntry.getFirstCompletionTime()).isEqualTo(originalTime);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Claim Reward Tests
    // ═══════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Claim Reward Tests")
    class ClaimRewardTests {

        @Test
        @DisplayName("claimReward: throws if entry not found")
        void claimReward_throwsWhenEntryNotFound() {
            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "BRONZE"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Pas d'entrée trouvée pour cette quête.");
        }

        @Test
        @DisplayName("claimReward: throws if weekly already claimed")
        void claimReward_throwsWhenWeeklyAlreadyClaimed() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeWeeklyQuest);
            entry.setRewardClaimed(true);

            when(entryRepository.findByQuestIdAndAccountName(200L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(200L, "player1", "WEEKLY"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Récompense déjà récupérée.");
        }

        @Test
        @DisplayName("claimReward (DAILY): throws if quest expired and inactive")
        void claimReward_dailyThrowsWhenExpired() {
            activeDailyQuest.setActive(false);
            activeDailyQuest.setEndDate(LocalDate.now(ZONE).minusDays(1));

            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "BRONZE"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("La quête journalière a expiré.");
        }

        @Test
        @DisplayName("claimReward (DAILY BRONZE): throws if completionCount == 0")
        void claimReward_dailyBronzeThrowsWhenNotCompleted() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setCompletionCount(0);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "BRONZE"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Vous n'avez pas terminé le donjon.");
        }

        @Test
        @DisplayName("claimReward (DAILY BRONZE): success awards base gold")
        void claimReward_dailyBronzeSuccess() {
            // baseGold = dungeonLevel(2) * max(1, secretLevel(1)) * roomCount(2) = 4
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setCompletionCount(1);
            entry.setRewardBronzeClaimed(false);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));
            when(userRepository.findByUsername("player1")).thenReturn(Optional.of(testUser));

            String result = huntingQuestService.claimReward(100L, "player1", "BRONZE");

            assertThat(result).contains("4 pièces d'or récupérées !");
            assertThat(testUser.getMonnaie()).isEqualTo(54.0);
            assertThat(entry.isRewardBronzeClaimed()).isTrue();
            verify(userRepository).save(testUser);
            verify(entryRepository).save(entry);
        }

        @Test
        @DisplayName("claimReward (DAILY SILVER): throws if already claimed")
        void claimReward_dailySilverThrowsWhenAlreadyClaimed() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setRewardSilverClaimed(true);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "SILVER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Récompense Argent déjà récupérée.");
        }

        @Test
        @DisplayName("claimReward (DAILY SILVER): throws if less than 1 challenge completed")
        void claimReward_dailySilverThrowsWhenNoChallenges() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setChallenge1Completed(false);
            entry.setChallenge2Completed(false);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "SILVER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Vous n'avez pas réussi au moins 1 challenge.");
        }

        @Test
        @DisplayName("claimReward (DAILY SILVER): success awards 2x base gold")
        void claimReward_dailySilverSuccess() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setChallenge1Completed(true);
            entry.setChallenge2Completed(false);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));
            when(userRepository.findByUsername("player1")).thenReturn(Optional.of(testUser));

            // baseGold = 4, silver = baseGold * 2 = 8
            String result = huntingQuestService.claimReward(100L, "player1", "SILVER");

            assertThat(result).contains("8 pièces d'or récupérées !");
            assertThat(testUser.getMonnaie()).isEqualTo(58.0);
            assertThat(entry.isRewardSilverClaimed()).isTrue();
        }

        @Test
        @DisplayName("claimReward (DAILY GOLD): throws if less than 2 challenges completed")
        void claimReward_dailyGoldThrowsWhenNotAllChallenges() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setChallenge1Completed(true);
            entry.setChallenge2Completed(false);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "GOLD"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Vous n'avez pas réussi les 2 challenges.");
        }

        @Test
        @DisplayName("claimReward (DAILY GOLD): success awards 3x base gold and sets rewardClaimed if all claimed")
        void claimReward_dailyGoldSuccess() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);
            entry.setChallenge1Completed(true);
            entry.setChallenge2Completed(true);
            entry.setRewardBronzeClaimed(true);
            entry.setRewardSilverClaimed(true);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));
            when(userRepository.findByUsername("player1")).thenReturn(Optional.of(testUser));

            // baseGold = 4, gold = baseGold * 3 = 12
            String result = huntingQuestService.claimReward(100L, "player1", "GOLD");

            assertThat(result).contains("12 pièces d'or récupérées !");
            assertThat(testUser.getMonnaie()).isEqualTo(62.0);
            assertThat(entry.isRewardGoldClaimed()).isTrue();
            assertThat(entry.isRewardClaimed()).isTrue();
        }

        @Test
        @DisplayName("claimReward (DAILY): throws if unknown tier")
        void claimReward_dailyThrowsWhenUnknownTier() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeDailyQuest);

            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(100L, "player1", "PLATINUM"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Tier inconnu: PLATINUM");
        }

        @Test
        @DisplayName("claimReward (WEEKLY): throws if user not in top 20%")
        void claimReward_weeklyThrowsWhenNotInTop20() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeWeeklyQuest);
            entry.setRank(3); // Rank 3

            HuntingQuestEntry e1 = new HuntingQuestEntry();
            HuntingQuestEntry e2 = new HuntingQuestEntry();
            // 2 entries total -> top 20% of 2 is ceil(0.4) = 1. Threshold is 1. Rank 3 > 1.
            when(entryRepository.findByQuestIdAndAccountName(200L, "player1")).thenReturn(Optional.of(entry));
            when(entryRepository.findByQuestIdOrderByBestTurnCountAsc(200L)).thenReturn(List.of(e1, e2));

            assertThatThrownBy(() -> huntingQuestService.claimReward(200L, "player1", "WEEKLY"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Vous n'êtes pas dans le top 20%");
        }

        @Test
        @DisplayName("claimReward (WEEKLY): throws if claim period expired (endDate + 1 week < now)")
        void claimReward_weeklyThrowsWhenPeriodExpired() {
            activeWeeklyQuest.setEndDate(LocalDate.now(ZONE).minusWeeks(2));

            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeWeeklyQuest);
            entry.setRank(1);

            when(entryRepository.findByQuestIdAndAccountName(200L, "player1")).thenReturn(Optional.of(entry));
            when(entryRepository.findByQuestIdOrderByBestTurnCountAsc(200L)).thenReturn(List.of(entry));

            assertThatThrownBy(() -> huntingQuestService.claimReward(200L, "player1", "WEEKLY"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("La période de récupération a expiré.");
        }

        @Test
        @DisplayName("claimReward (WEEKLY): success clones anomaly and adds to user inventory")
        void claimReward_weeklySuccess() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setQuest(activeWeeklyQuest);
            entry.setRank(1);

            Anomalie template = new Anomalie();
            template.setId(500L);
            template.setName("Relique Abyssale");
            template.setSpiritualite(SpiritualiteType.TENEBRES);
            template.setCategory(AnomalieCategory.ORBE);
            template.setDescription("Une puissante relique");
            template.setLevel(2);
            template.setMagicObject(true);
            template.setTemplate(true);

            when(entryRepository.findByQuestIdAndAccountName(200L, "player1")).thenReturn(Optional.of(entry));
            when(entryRepository.findByQuestIdOrderByBestTurnCountAsc(200L)).thenReturn(List.of(entry));
            when(anomalieRepository.findById(500L)).thenReturn(Optional.of(template));
            when(userRepository.findByUsername("player1")).thenReturn(Optional.of(testUser));

            String result = huntingQuestService.claimReward(200L, "player1", "WEEKLY");

            assertThat(result).contains("Anomalie \"Relique Abyssale\" (Niv.2) récupérée !");
            assertThat(entry.isRewardClaimed()).isTrue();
            assertThat(testUser.getDiscoveredItems()).contains("Relique Abyssale");

            ArgumentCaptor<Anomalie> anomalieCaptor = ArgumentCaptor.forClass(Anomalie.class);
            verify(anomalieRepository).save(anomalieCaptor.capture());
            Anomalie savedReward = anomalieCaptor.getValue();

            assertThat(savedReward.isTemplate()).isFalse();
            assertThat(savedReward.getOwnerUsername()).isEqualTo("player1");
            assertThat(savedReward.getUser()).isEqualTo(testUser);
            assertThat(savedReward.getName()).isEqualTo("Relique Abyssale");

            verify(userRepository).save(testUser);
            verify(entryRepository).save(entry);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Data Retrieval Tests
    // ═══════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Data Retrieval Tests")
    class DataRetrievalTests {

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("getDailyQuestData: returns quest, leaderboard, reward and myEntry")
        void getDailyQuestData_returnsCompleteMap() {
            HuntingQuestEntry entry = new HuntingQuestEntry();
            entry.setId(10L);
            entry.setQuest(activeDailyQuest);
            entry.setAccountName("player1");
            entry.setCompletionCount(1);
            entry.setChallenge1Completed(true);
            entry.setChallenge2Completed(false);

            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.of(activeDailyQuest));
            when(questRepository.findById(100L)).thenReturn(Optional.of(activeDailyQuest));
            when(entryRepository.findByQuestId(100L)).thenReturn(new ArrayList<>(List.of(entry)));
            when(entryRepository.findByQuestIdAndAccountName(100L, "player1")).thenReturn(Optional.of(entry));

            Map<String, Object> data = huntingQuestService.getDailyQuestData("player1");

            assertThat(data).containsKey("quest");
            assertThat(data).containsKey("leaderboard");
            assertThat(data).containsKey("reward");
            assertThat(data).containsKey("myEntry");

            Map<String, Object> myEntryMap = (Map<String, Object>) data.get("myEntry");
            assertThat(myEntryMap.get("accountName")).isEqualTo("player1");
            assertThat(myEntryMap.get("challenge1Completed")).isEqualTo(true);
        }

        @Test
        @DisplayName("getDailyQuestData: returns empty map if no active daily")
        void getDailyQuestData_returnsEmptyWhenNoQuest() {
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.empty());

            Map<String, Object> data = huntingQuestService.getDailyQuestData("player1");

            assertThat(data).isEmpty();
        }

        @Test
        @DisplayName("getWeeklyQuestData: returns quest, leaderboard, threshold, and previous quest if available")
        void getWeeklyQuestData_returnsCompleteMapWithPrevious() {
            HuntingQuest prevWeekly = new HuntingQuest();
            prevWeekly.setId(190L);
            prevWeekly.setType("WEEKLY");
            prevWeekly.setDungeonId(20L);
            prevWeekly.setDungeonName("Donjon des Abysses");
            prevWeekly.setStartDate(LocalDate.now(ZONE).minusWeeks(2));
            prevWeekly.setEndDate(LocalDate.now(ZONE).minusDays(2)); // endDate + 1 week > now
            prevWeekly.setActive(false);

            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.of(activeWeeklyQuest));
            when(questRepository.findById(200L)).thenReturn(Optional.of(activeWeeklyQuest));
            when(entryRepository.findByQuestId(200L)).thenReturn(new ArrayList<>());
            when(entryRepository.findByQuestIdOrderByBestTurnCountAsc(200L)).thenReturn(List.of());
            when(anomalieRepository.findById(500L)).thenReturn(Optional.empty());

            when(questRepository.findFirstByTypeAndActiveFalseOrderByEndDateDesc("WEEKLY"))
                    .thenReturn(Optional.of(prevWeekly));
            when(questRepository.findById(190L)).thenReturn(Optional.of(prevWeekly));
            when(entryRepository.findByQuestId(190L)).thenReturn(new ArrayList<>());
            when(entryRepository.findByQuestIdOrderByBestTurnCountAsc(190L)).thenReturn(List.of());

            Map<String, Object> data = huntingQuestService.getWeeklyQuestData("player1");

            assertThat(data).containsKey("quest");
            assertThat(data).containsKey("leaderboard");
            assertThat(data).containsKey("top20Threshold");
            assertThat(data).containsKey("previous");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Lifecycle & Expiration Tests
    // ═══════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Lifecycle & Expiration Tests")
    class LifecycleAndExpirationTests {

        @Test
        @DisplayName("expireOldQuests: deactivates expired quests")
        void expireOldQuests_deactivatesPastQuests() {
            HuntingQuest expired = new HuntingQuest();
            expired.setId(50L);
            expired.setActive(true);
            expired.setDungeonName("Ancien Donjon");
            expired.setType("DAILY");

            when(questRepository.findByActiveTrueAndEndDateBefore(any(LocalDate.class)))
                    .thenReturn(List.of(expired));

            huntingQuestService.expireOldQuests();

            assertThat(expired.isActive()).isFalse();
            verify(questRepository).save(expired);
        }

        @Test
        @DisplayName("ensureQuestsExist: triggers rotations when no active quests")
        void ensureQuestsExist_rotatesWhenMissing() {
            when(questRepository.findByActiveTrueAndEndDateBefore(any(LocalDate.class)))
                    .thenReturn(List.of());
            when(questRepository.findByTypeAndActiveTrue("DAILY")).thenReturn(Optional.empty());
            when(questRepository.findByTypeAndActiveTrue("WEEKLY")).thenReturn(Optional.empty());

            when(donjonRepository.findAll()).thenReturn(List.of(dungeonDaily, dungeonWeekly));
            when(runStatRepository.findAll()).thenReturn(List.of());
            when(anomalieRepository.findByIsTemplateTrue()).thenReturn(List.of());

            huntingQuestService.ensureQuestsExist();

            // Rotations called
            verify(questRepository, atLeast(2)).save(any(HuntingQuest.class));
        }
    }
}
