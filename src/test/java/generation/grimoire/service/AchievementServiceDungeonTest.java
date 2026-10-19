package generation.grimoire.service;

import generation.grimoire.entity.achievement.UserAchievement;
import generation.grimoire.entity.achievement.UserStatistics;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.enumeration.AchievementType;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AlchemyRecipeRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.ShopUpgradeConfigRepository;
import generation.grimoire.repository.UserAchievementRepository;
import generation.grimoire.repository.UserStatisticsRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class AchievementServiceDungeonTest {

    @Mock
    private UserAchievementRepository userAchievementRepository;
    @Mock
    private UserStatisticsRepository userStatisticsRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AlchemyRecipeRepository alchemyRecipeRepository;
    @Mock
    private ShopUpgradeConfigRepository shopUpgradeConfigRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private DonjonRepository donjonRepository;

    @InjectMocks
    private AchievementService achievementService;

    private AppUser user;
    private Map<AchievementType, UserAchievement> userAchievementMap;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        user.setUsername("TestHero");
        user.setCompletedDungeons(new HashSet<>());
        user.setUnlockedTitles(new HashSet<>());

        userAchievementMap = new HashMap<>();

        lenient().when(userAchievementRepository.findByUserIdAndAchievement(any(), any()))
                .thenAnswer(invocation -> {
                    AchievementType type = invocation.getArgument(1);
                    return Optional.ofNullable(userAchievementMap.get(type));
                });

        lenient().when(userAchievementRepository.save(any(UserAchievement.class)))
                .thenAnswer(invocation -> {
                    UserAchievement ua = invocation.getArgument(0);
                    userAchievementMap.put(ua.getAchievement(), ua);
                    return ua;
                });

        lenient().when(userStatisticsRepository.findByUser_Id(any()))
                .thenReturn(Optional.of(new UserStatistics(user)));
    }

    private Donjon createDonjon(Long id, String name, String requiredSecret, int requiredSecretLevel) {
        Donjon d = new Donjon();
        d.setId(id);
        d.setName(name);
        d.setRequiredSecret(requiredSecret);
        d.setRequiredSecretLevel(requiredSecretLevel);
        return d;
    }

    @Test
    void testFreeDungeons_WhenAllCompleted_UnlocksAchievementAndTitle() {
        Donjon free1 = createDonjon(1L, "Donjon Libre 1", null, 1);
        Donjon free2 = createDonjon(2L, "Donjon Libre 2", "   ", 1);
        Donjon secret1 = createDonjon(3L, "Donjon Chaos", "Secret du Chaos", 1);

        when(donjonRepository.findAll()).thenReturn(List.of(free1, free2, secret1));

        user.getCompletedDungeons().add(1L);
        user.getCompletedDungeons().add(2L);

        achievementService.syncDungeonProgression(user);

        UserAchievement ua = userAchievementMap.get(AchievementType.DONJONS_LIBRES);
        assertNotNull(ua);
        assertTrue(ua.isUnlocked());
        assertEquals(2, ua.getCurrentProgress());
        assertTrue(user.getUnlockedTitles().contains("L'Explorateur"));
        assertEquals("L'Explorateur", user.getActiveTitle());
        verify(userRepository, atLeastOnce()).save(user);
    }

    @Test
    void testFreeDungeons_WhenPartiallyCompleted_DoesNotUnlock() {
        Donjon free1 = createDonjon(1L, "Donjon Libre 1", null, 1);
        Donjon free2 = createDonjon(2L, "Donjon Libre 2", null, 1);

        when(donjonRepository.findAll()).thenReturn(List.of(free1, free2));

        user.getCompletedDungeons().add(1L);

        achievementService.syncDungeonProgression(user);

        UserAchievement ua = userAchievementMap.get(AchievementType.DONJONS_LIBRES);
        assertNotNull(ua);
        assertFalse(ua.isUnlocked());
        assertEquals(1, ua.getCurrentProgress());
        assertFalse(user.getUnlockedTitles().contains("L'Explorateur"));
    }

    @Test
    void testSecretLevel1AndLevel2AndLevel3_WhenCompleted_UnlocksAllThree() {
        Donjon chaosLvl1 = createDonjon(10L, "Chaos 1", "Secret du Chaos", 1);
        Donjon chaosLvl2 = createDonjon(11L, "Chaos 2", "Secret du Chaos", 2);
        Donjon chaosLvl3 = createDonjon(12L, "Chaos 3", "Secret du Chaos", 3);

        when(donjonRepository.findAll()).thenReturn(List.of(chaosLvl1, chaosLvl2, chaosLvl3));

        user.getCompletedDungeons().add(10L);
        user.getCompletedDungeons().add(11L);
        user.getCompletedDungeons().add(12L);

        achievementService.syncDungeonProgression(user);

        UserAchievement ua1 = userAchievementMap.get(AchievementType.SECRET_CHAOS_1);
        assertNotNull(ua1);
        assertTrue(ua1.isUnlocked());
        assertEquals(1, ua1.getCurrentProgress());
        assertTrue(user.getUnlockedTitles().contains(AchievementType.SECRET_CHAOS_1.getRewardTitle()));

        UserAchievement ua2 = userAchievementMap.get(AchievementType.SECRET_CHAOS_2);
        assertNotNull(ua2);
        assertTrue(ua2.isUnlocked());
        assertEquals(1, ua2.getCurrentProgress());
        assertTrue(user.getUnlockedTitles().contains(AchievementType.SECRET_CHAOS_2.getRewardTitle()));

        UserAchievement ua3 = userAchievementMap.get(AchievementType.SECRET_CHAOS_3);
        assertNotNull(ua3);
        assertTrue(ua3.isUnlocked());
        assertEquals(1, ua3.getCurrentProgress());
        assertTrue(user.getUnlockedTitles().contains(AchievementType.SECRET_CHAOS_3.getRewardTitle()));
    }

    @Test
    void testSecretWithZeroDungeons_RemainsLocked() {
        when(donjonRepository.findAll()).thenReturn(Collections.emptyList());

        achievementService.syncDungeonProgression(user);

        for (AchievementType t : List.of(AchievementType.SECRET_CHAOS_1, AchievementType.SECRET_CHAOS_2, AchievementType.SECRET_CHAOS_3)) {
            UserAchievement ua = userAchievementMap.get(t);
            if (ua != null) {
                assertFalse(ua.isUnlocked());
                assertEquals(0, ua.getCurrentProgress());
            }
        }
    }

    @Test
    void testSecretNameNormalization_MatchesWithAccentsAndQuotes() {
        Donjon d = createDonjon(20L, "Dédale de l'Ether", "Secret de l'Ether", 1);
        when(donjonRepository.findAll()).thenReturn(List.of(d));

        user.getCompletedDungeons().add(20L);

        achievementService.syncDungeonProgression(user);

        UserAchievement ua = userAchievementMap.get(AchievementType.SECRET_ETHER_1);
        assertNotNull(ua);
        assertTrue(ua.isUnlocked());
        assertEquals(1, ua.getCurrentProgress());
        assertTrue(user.getUnlockedTitles().contains(AchievementType.SECRET_ETHER_1.getRewardTitle()));
    }

    @Test
    void testSyncRetroactive_TriggersDungeonProgression() {
        Donjon free = createDonjon(1L, "Donjon Libre", null, 1);
        when(donjonRepository.findAll()).thenReturn(List.of(free));

        user.getCompletedDungeons().add(1L);

        achievementService.syncRetroactive(user);

        UserAchievement ua = userAchievementMap.get(AchievementType.DONJONS_LIBRES);
        assertNotNull(ua);
        assertTrue(ua.isUnlocked());
    }

    @Test
    void testOnDungeonVictory_TriggersDungeonProgression() {
        Donjon free = createDonjon(1L, "Donjon Libre", null, 1);
        when(donjonRepository.findAll()).thenReturn(List.of(free));

        user.getCompletedDungeons().add(1L);

        CombatSession session = new CombatSession("test-session", free, Collections.emptyList());
        session.setDungeonId(1L);

        achievementService.onDungeonVictory(user, session);

        UserAchievement ua = userAchievementMap.get(AchievementType.DONJONS_LIBRES);
        assertNotNull(ua);
        assertTrue(ua.isUnlocked());
    }
}
