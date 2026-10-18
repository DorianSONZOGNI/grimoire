package generation.grimoire.service;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PersonnageServiceTest {

    @Mock
    private PersonnageRepository personnageRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PersonnageService personnageService;

    private Personnage dummyPersonnage;

    @BeforeEach
    void setUp() {
        dummyPersonnage = new Personnage();
        dummyPersonnage.setId(1L);
        dummyPersonnage.setName("Hero");
    }

    @Test
    void findByIdOrThrow_shouldReturnPersonnage_whenExists() {
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(dummyPersonnage));

        Personnage result = personnageService.findByIdOrThrow(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(personnageRepository).findById(1L);
    }

    @Test
    void findByIdOrThrow_shouldThrowEntityNotFoundException_whenNotExists() {
        when(personnageRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personnageService.findByIdOrThrow(99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Personnage non trouvé : 99");

        verify(personnageRepository).findById(99L);
    }

    @Test
    void findAll_shouldReturnListOfPersonnages() {
        when(personnageRepository.findAll()).thenReturn(List.of(dummyPersonnage));

        List<Personnage> result = personnageService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Hero");
        verify(personnageRepository).findAll();
    }

    @Test
    @DisplayName("findByUserUsername returns list from repository")
    void findByUserUsername_shouldReturnList() {
        when(personnageRepository.findByUser_Username("alice")).thenReturn(List.of(dummyPersonnage));

        List<Personnage> result = personnageService.findByUserUsername("alice");

        assertThat(result).hasSize(1);
        verify(personnageRepository).findByUser_Username("alice");
    }

    @Test
    void save_shouldReturnSavedPersonnage() {
        when(personnageRepository.save(any(Personnage.class))).thenReturn(dummyPersonnage);

        Personnage result = personnageService.save(dummyPersonnage);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Hero");
        verify(personnageRepository).save(dummyPersonnage);
    }

    @Test
    @DisplayName("save updates user unlocked Voie and Spiritualite levels if character has higher levels")
    void save_shouldUpdateUserUnlockedLevelsWhenHigher() {
        AppUser user = new AppUser();
        user.setUsername("alice");
        user.setUnlockedVoieLevels(new HashMap<>());
        user.setUnlockedSpiritualiteLevels(new HashMap<>());

        Voie voie = new Voie();
        voie.setId(10L);
        Spiritualite spirit = new Spiritualite();
        spirit.setId(20L);

        dummyPersonnage.setUser(user);
        dummyPersonnage.setVoie(voie);
        dummyPersonnage.setVoieLevel(3);
        dummyPersonnage.setSpiritualite(spirit);
        dummyPersonnage.setSpiritualiteLevel(2);

        when(personnageRepository.save(dummyPersonnage)).thenReturn(dummyPersonnage);

        personnageService.save(dummyPersonnage);

        assertThat(user.getUnlockedVoieLevels()).containsEntry(10L, 3);
        assertThat(user.getUnlockedSpiritualiteLevels()).containsEntry(20L, 2);
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("save does not update user unlocked levels if already higher or equal")
    void save_shouldNotUpdateUserLevelsWhenLowerOrEqual() {
        AppUser user = new AppUser();
        user.setUsername("alice");
        user.setUnlockedVoieLevels(new HashMap<>());
        user.getUnlockedVoieLevels().put(10L, 4);

        Voie voie = new Voie();
        voie.setId(10L);

        dummyPersonnage.setUser(user);
        dummyPersonnage.setVoie(voie);
        dummyPersonnage.setVoieLevel(2); // lower than 4

        when(personnageRepository.save(dummyPersonnage)).thenReturn(dummyPersonnage);

        personnageService.save(dummyPersonnage);

        verify(userRepository, never()).save(user);
    }

    @Test
    void deleteById_shouldDelegateToRepository() {
        Personnage mockP = new Personnage();
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(mockP));
        when(equipmentRepository.findByPersonnageId(1L)).thenReturn(java.util.Collections.emptyList());
        doNothing().when(personnageRepository).delete(mockP);

        personnageService.deleteById(1L);

        verify(personnageRepository).delete(mockP);
    }

    @Test
    @DisplayName("deleteById unlinks equipment before deleting character")
    void deleteById_shouldUnlinkEquipments() {
        Personnage mockP = new Personnage();
        mockP.setId(1L);
        Equipment eq = new Equipment();
        eq.setId(10L);
        eq.setPersonnage(mockP);

        when(personnageRepository.findById(1L)).thenReturn(Optional.of(mockP));
        when(equipmentRepository.findByPersonnageId(1L)).thenReturn(List.of(eq));

        personnageService.deleteById(1L);

        assertThat(eq.getPersonnage()).isNull();
        verify(equipmentRepository).save(eq);
        verify(personnageRepository).delete(mockP);
    }

    @Test
    @DisplayName("deleteById does nothing if character not found")
    void deleteById_notFound_doesNothing() {
        when(personnageRepository.findById(99L)).thenReturn(Optional.empty());

        personnageService.deleteById(99L);

        verify(personnageRepository, never()).delete(any());
    }

    @Test
    void existsById_shouldReturnTrue_whenExists() {
        when(personnageRepository.existsById(1L)).thenReturn(true);

        boolean result = personnageService.existsById(1L);

        assertThat(result).isTrue();
        verify(personnageRepository).existsById(1L);
    }

    @Test
    void existsById_shouldReturnFalse_whenNotExists() {
        when(personnageRepository.existsById(99L)).thenReturn(false);

        boolean result = personnageService.existsById(99L);

        assertThat(result).isFalse();
        verify(personnageRepository).existsById(99L);
    }

    // ── isEligibleForCatchupXp ──────────────────────────────────

    private CombatSession createSession(List<Personnage> players) {
        Donjon donjon = new Donjon();
        donjon.setId(1L);
        donjon.setName("Test Dungeon");
        donjon.setSalles(List.of(new Salle()));
        return new CombatSession("test-session", donjon, players);
    }

    @Test
    @DisplayName("isEligibleForCatchupXp returns false when session or character is null")
    void isEligibleForCatchupXp_nullSessionOrPlayer_returnsFalse() {
        CombatSession session = createSession(List.of(dummyPersonnage));
        assertThat(personnageService.isEligibleForCatchupXp(null, session)).isFalse();
        assertThat(personnageService.isEligibleForCatchupXp(dummyPersonnage, null)).isFalse();
    }

    @Test
    @DisplayName("isEligibleForCatchupXp returns false when any player in session is level 5 or above")
    void isEligibleForCatchupXp_playerLevel5OrAbove_returnsFalse() {
        Personnage highLevelFighter = new Personnage();
        highLevelFighter.setVoieLevel(5);
        CombatSession session = createSession(List.of(dummyPersonnage, highLevelFighter));

        boolean eligible = personnageService.isEligibleForCatchupXp(dummyPersonnage, session);
        assertThat(eligible).isFalse();
    }

    @Test
    @DisplayName("isEligibleForCatchupXp returns false when user is null or username is null")
    void isEligibleForCatchupXp_nullUser_returnsFalse() {
        CombatSession session = createSession(List.of(dummyPersonnage));
        dummyPersonnage.setUser(null);

        boolean eligible = personnageService.isEligibleForCatchupXp(dummyPersonnage, session);
        assertThat(eligible).isFalse();
    }

    @Test
    @DisplayName("isEligibleForCatchupXp returns false when account has less than 2 higher level characters")
    void isEligibleForCatchupXp_lessThan2HigherCharacters_returnsFalse() {
        dummyPersonnage.setVoieLevel(1);
        CombatSession session = createSession(List.of(dummyPersonnage));

        AppUser user = new AppUser();
        user.setUsername("alice");
        dummyPersonnage.setUser(user);

        Personnage other1 = new Personnage();
        other1.setVoieLevel(2); // 1 higher
        Personnage other2 = new Personnage();
        other2.setVoieLevel(1); // same level

        when(personnageRepository.findByUser_Username("alice")).thenReturn(List.of(dummyPersonnage, other1, other2));

        boolean eligible = personnageService.isEligibleForCatchupXp(dummyPersonnage, session);
        assertThat(eligible).isFalse();
    }

    @Test
    @DisplayName("isEligibleForCatchupXp returns true when account has 2 or more higher level characters")
    void isEligibleForCatchupXp_twoOrMoreHigherCharacters_returnsTrue() {
        dummyPersonnage.setVoieLevel(1);
        CombatSession session = createSession(List.of(dummyPersonnage));

        AppUser user = new AppUser();
        user.setUsername("alice");
        dummyPersonnage.setUser(user);

        Personnage other1 = new Personnage();
        other1.setVoieLevel(3);
        Personnage other2 = new Personnage();
        other2.setVoieLevel(4);

        when(personnageRepository.findByUser_Username("alice")).thenReturn(List.of(dummyPersonnage, other1, other2));

        boolean eligible = personnageService.isEligibleForCatchupXp(dummyPersonnage, session);
        assertThat(eligible).isTrue();
    }
}
