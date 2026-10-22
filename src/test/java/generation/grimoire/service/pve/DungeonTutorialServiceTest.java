package generation.grimoire.service.pve;

import generation.grimoire.dto.pve.DonjonSummaryDTO;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.repository.pve.DonjonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class DungeonTutorialServiceTest {

    @Mock
    private DonjonRepository donjonRepository;

    @InjectMocks
    private DungeonTutorialService tutorialService;

    private List<Donjon> mockFreeDungeons;
    private List<DonjonSummaryDTO> mockSummaries;

    @BeforeEach
    void setUp() {
        mockFreeDungeons = new ArrayList<>();
        mockSummaries = new ArrayList<>();

        for (int i = 0; i < 10; i++) {
            Long id = (long) (100 + i);
            int lvl = i < 6 ? 1 : (i < 9 ? 2 : 5);

            Donjon d = new Donjon();
            d.setId(id);
            d.setName("Donjon " + i);
            d.setDisplayOrder(i);
            d.setRecommendedLevel(lvl);
            mockFreeDungeons.add(d);

            DonjonSummaryDTO s = new DonjonSummaryDTO();
            s.setId(id);
            s.setName("Donjon " + i);
            s.setDisplayOrder(i);
            s.setRecommendedLevel(lvl);
            mockSummaries.add(s);
        }

        when(donjonRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(mockFreeDungeons);
    }

    private AppUser createUser(Long... completedDungeonIds) {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setUsername("hero");
        user.setCompletedDungeons(new HashSet<>(Arrays.asList(completedDungeonIds)));
        return user;
    }

    @Test
    void shouldReturnOnlyFirstDungeon_whenNewAccountHasZeroWins() {
        AppUser user = createUser();

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        assertThat(visible).hasSize(1);
        assertThat(visible.get(0).getId()).isEqualTo(100L);
        assertThat(visible.get(0).isBypassLevelRequirement()).isFalse();

        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(0))).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(1))).isFalse();
        assertThat(tutorialService.isLevelBypassed(user, 106L)).isFalse();
    }

    @Test
    void shouldReturnFirstThreeDungeons_whenAccountWonFirstDungeon() {
        AppUser user = createUser(100L);

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        assertThat(visible).hasSize(3);
        assertThat(visible).extracting(DonjonSummaryDTO::getId).containsExactly(100L, 101L, 102L);
        assertThat(visible).allMatch(d -> !d.isBypassLevelRequirement());

        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(0))).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(1))).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(2))).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(3))).isFalse();
    }

    @Test
    void shouldStayInStage1_whenOnlyWonFirstAndSecondDungeon() {
        AppUser user = createUser(100L, 101L);

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        assertThat(visible).hasSize(3);
        assertThat(visible).extracting(DonjonSummaryDTO::getId).containsExactly(100L, 101L, 102L);
    }

    @Test
    void shouldReturnFirstSixDungeons_whenAccountWonAllThreeVisible() {
        AppUser user = createUser(100L, 101L, 102L);

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        assertThat(visible).hasSize(6);
        assertThat(visible).extracting(DonjonSummaryDTO::getId).containsExactly(100L, 101L, 102L, 103L, 104L, 105L);
        assertThat(visible).allMatch(d -> !d.isBypassLevelRequirement());

        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(5))).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(6))).isFalse();
    }

    @Test
    void shouldReturnFirstNineDungeonsWithLevelBypass_whenAccountWonAllSixVisible() {
        AppUser user = createUser(100L, 101L, 102L, 103L, 104L, 105L);

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        assertThat(visible).hasSize(9);
        assertThat(visible).extracting(DonjonSummaryDTO::getId)
                .containsExactly(100L, 101L, 102L, 103L, 104L, 105L, 106L, 107L, 108L);

        // Level bypass only on 106, 107, 108
        for (DonjonSummaryDTO d : visible) {
            if (d.getId() >= 106L && d.getId() <= 108L) {
                assertThat(d.isBypassLevelRequirement()).isTrue();
            } else {
                assertThat(d.isBypassLevelRequirement()).isFalse();
            }
        }

        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(8))).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(9))).isFalse();

        assertThat(tutorialService.isLevelBypassed(user, 106L)).isTrue();
        assertThat(tutorialService.isLevelBypassed(user, 107L)).isTrue();
        assertThat(tutorialService.isLevelBypassed(user, 108L)).isTrue();
        assertThat(tutorialService.isLevelBypassed(user, 105L)).isFalse();
    }

    @Test
    void shouldKeepLevelBypassInStage3_afterWinningSevenOrEightDungeons() {
        AppUser user = createUser(100L, 101L, 102L, 103L, 104L, 105L, 106L);

        assertThat(tutorialService.isLevelBypassed(user, 107L)).isTrue();
        assertThat(tutorialService.isLevelBypassed(user, 108L)).isTrue();

        AppUser user2 = createUser(100L, 101L, 102L, 103L, 104L, 105L, 106L, 107L);
        assertThat(tutorialService.isLevelBypassed(user2, 108L)).isTrue();
    }

    @Test
    void shouldCompleteTutorialAndRemoveAllConstraints_whenAccountWonAllNine() {
        AppUser user = createUser(100L, 101L, 102L, 103L, 104L, 105L, 106L, 107L, 108L);

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        assertThat(visible).hasSize(10);
        assertThat(visible).allMatch(d -> !d.isBypassLevelRequirement());

        assertThat(tutorialService.isTutorialCompleted(user, mockFreeDungeons)).isTrue();
        assertThat(tutorialService.isDungeonAccessible(user, mockFreeDungeons.get(9))).isTrue();
        assertThat(tutorialService.isLevelBypassed(user, 106L)).isFalse();
    }

    @Test
    void shouldPreserveSecretDungeonsRegardlessOfTutorialStage() {
        DonjonSummaryDTO secretSummary = new DonjonSummaryDTO();
        secretSummary.setId(999L);
        secretSummary.setName("Secret Dungeon");
        secretSummary.setRequiredSecret("Secret du feu");
        mockSummaries.add(secretSummary);

        AppUser user = createUser(); // Stage 0

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);

        // 1 free dungeon + 1 secret dungeon
        assertThat(visible).hasSize(2);
        assertThat(visible).extracting(DonjonSummaryDTO::getId).containsExactly(100L, 999L);
    }

    @Test
    void shouldBypassTutorial_forLegacyAccountHavingCompletedHigherFreeDungeon() {
        AppUser user = createUser(109L); // Completed 10th dungeon (displayOrder 9)

        assertThat(tutorialService.isTutorialCompleted(user, mockFreeDungeons)).isTrue();

        List<DonjonSummaryDTO> visible = tutorialService.applyTutorialRules(mockSummaries, user);
        assertThat(visible).hasSize(10);
    }
}
