package generation.grimoire.service.pve;

import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.HuntingQuestRepository;
import generation.grimoire.service.PersonnageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CombatServiceTutorialTest {

    @Mock
    private PersonnageService personnageService;
    @Mock
    private PersonnageRepository personnageRepository;
    @Mock
    private DonjonRepository donjonRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private HuntingQuestRepository questRepository;
    @Mock
    private CombatRoomService combatRoomService;
    @Mock
    private CombatTurnService combatTurnService;
    @Mock
    private CombatActionService combatActionService;
    @Mock
    private SpellAvailabilityService spellAvailabilityService;
    @Mock
    private DungeonTutorialService dungeonTutorialService;

    @InjectMocks
    private CombatService combatService;

    private AppUser user;
    private Personnage hero;
    private Donjon donjonLvl2;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        user.setUsername("heroUser");

        hero = new Personnage();
        hero.setId(10L);
        hero.setName("Aventurier");
        hero.setVoieLevel(1);
        hero.setUser(user);

        donjonLvl2 = new Donjon();
        donjonLvl2.setId(47L);
        donjonLvl2.setName("Grotte hantée");
        donjonLvl2.setRecommendedLevel(2);
        Salle salle = new Salle();
        salle.setId(1L);
        donjonLvl2.setSalles(List.of(salle));

        when(userRepository.findByUsername("heroUser")).thenReturn(Optional.of(user));
        when(personnageRepository.findById(10L)).thenReturn(Optional.of(hero));
        when(donjonRepository.findById(47L)).thenReturn(Optional.of(donjonLvl2));
    }

    @Test
    void shouldBlockCombat_whenDungeonNotAccessibleInTutorial() {
        when(dungeonTutorialService.isDungeonAccessible(user, donjonLvl2)).thenReturn(false);

        assertThatThrownBy(() -> combatService.startCombat(List.of(10L), 47L, Collections.emptyList(), "heroUser"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Ce donjon n'est pas encore accessible");
    }

    @Test
    void shouldBlockCombat_whenHeroLevelTooLowAndBypassFalse() {
        when(dungeonTutorialService.isDungeonAccessible(user, donjonLvl2)).thenReturn(true);
        when(dungeonTutorialService.isLevelBypassed(user, 47L)).thenReturn(false);

        assertThatThrownBy(() -> combatService.startCombat(List.of(10L), 47L, Collections.emptyList(), "heroUser"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("n'a pas le niveau requis (2) pour ce donjon");
    }

    @Test
    void shouldAllowCombat_whenHeroLevel1EntersLevel2DungeonWithBypassTrue() {
        when(dungeonTutorialService.isDungeonAccessible(user, donjonLvl2)).thenReturn(true);
        when(dungeonTutorialService.isLevelBypassed(user, 47L)).thenReturn(true);

        CombatSession session = combatService.startCombat(List.of(10L), 47L, Collections.emptyList(), "heroUser");

        assertThat(session).isNotNull();
        assertThat(session.getDungeonId()).isEqualTo(47L);
        assertThat(session.getPlayers()).hasSize(1);
    }
}
