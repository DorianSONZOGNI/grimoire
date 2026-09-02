package generation.grimoire.service.pve;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.EventSubType;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.SalleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class CombatRoomServiceProgressionTest {

    @Mock
    private PersonnageRepository personnageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private AnomalieRepository anomalieRepository;
    @Mock
    private SalleRepository salleRepository;
    @Mock
    private SpellAvailabilityService spellAvailabilityService;
    
    @Mock
    private CombatTurnService combatTurnService;
    @Mock
    private DonjonRepository donjonRepository;
    @Mock
    private SpellRepository spellRepository;
    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private CombatRoomService combatRoomService;

    private CombatSession session;
    private Personnage player;
    private AppUser appUser;
    private Donjon mockDonjon;
    private Salle room1;
    private Salle room2;

    @BeforeEach
    void setUp() {
        appUser = new AppUser();
        appUser.setUsername("Tester");
        appUser.setMonnaie(100);

        player = new Personnage();
        player.setId(1L);
        player.setName("Hero");
        player.setUser(appUser);
        player.setHealthMax(200);
        player.setHealthCurrent(200);

        room1 = new Salle();
        room1.setId(1L);
        room1.setType(RoomType.EVENT);
        room1.setEventSubType(EventSubType.PIEGE);

        room2 = new Salle();
        room2.setId(2L);
        room2.setType(RoomType.COMBAT);

        mockDonjon = new Donjon();
        mockDonjon.setId(99L);
        mockDonjon.setSalles(List.of(room1, room2));

        List<Personnage> players = new ArrayList<>();
        players.add(player);

        session = new CombatSession("test-session", mockDonjon, players);
        session.setCurrentRoom(room1);
    }
    @Test
    void testProceedToNextRoom_Normal() {
        // Room 1 has no trap damage set, so it shouldn't damage.
        // It should just load room 2.

        // When handleRoomStart runs for room2, it might need the salleRepository
        when(salleRepository.findById(2L)).thenReturn(java.util.Optional.of(room2));

        combatRoomService.proceedToNextRoom(session);

        assertThat(session.getCurrentRoomIndex()).isEqualTo(1);
        assertThat(session.getCurrentRoom()).isEqualTo(room2);
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void testProceedToNextRoom_EndOfDungeon() {
        // Mock a dungeon with only 1 room
        mockDonjon.setSalles(List.of(room1));
        session = new CombatSession("test-session", mockDonjon, List.of(player));
        session.setCurrentRoom(room1);

        // Mock user/personnage saving at the end of dungeon
        when(userRepository.save(any(AppUser.class))).thenReturn(appUser);
        when(personnageRepository.save(any(Personnage.class))).thenReturn(player);

        combatRoomService.proceedToNextRoom(session);

        assertThat(session.isFinished()).isTrue();
        assertThat(session.getCombatLog())
                .anyMatch(log -> log.contains("terminÃ© le donjon") || log.contains("termin"));
    }

    @Test
    void testProceedToNextRoom_TrapNotCompleted_TakesDamage() {
        room1.setTrapDamageHpFixed(50);

        when(salleRepository.findById(2L)).thenReturn(java.util.Optional.of(room2));

        combatRoomService.proceedToNextRoom(session);

        // Player took 50 trap damage
        assertThat(player.getHealthCurrent()).isEqualTo(150);
        assertThat(session.getCurrentRoomIndex()).isEqualTo(1);
    }

    @Test
    void testUseRope_TrapCompleted_NoDamageOnProceed() {
        room1.setTrapHasRopeOption(true);
        room1.setTrapDamageHpFixed(50);

        Equipment rope = new Equipment();
        rope.setId(15L);
        rope.setName("Corde");
        rope.setConsumableCategory(generation.grimoire.enumeration.ConsumableCategory.CORDE);
        session.getActiveConsumables().add(rope);

        // 1. Use rope
        combatRoomService.useRope(session, 15L);

        assertThat(session.getActiveConsumables()).isEmpty();
        assertThat(session.isRoomEventCompleted()).isTrue();
        verify(equipmentRepository, times(1)).delete(rope);

        // 2. Proceed to next room
        when(salleRepository.findById(2L)).thenReturn(java.util.Optional.of(room2));
        combatRoomService.proceedToNextRoom(session);

        // Player took NO damage because trap was bypassed by rope!
        assertThat(player.getHealthCurrent()).isEqualTo(200);
        assertThat(session.getCurrentRoomIndex()).isEqualTo(1);
    }

    @Test
    void testOpenStrangeDoor_ReturnsSession() {
        room1.setType(RoomType.EVENT);
        room1.setEventSubType(EventSubType.PORTE_ETRANGE);
        room1.setDoorOutcomes("[]"); // Empty outcome for simplicity

        combatRoomService.openStrangeDoor(session);

        assertThat(session.isRoomEventCompleted()).isTrue();
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("illusion"));
    }
}
