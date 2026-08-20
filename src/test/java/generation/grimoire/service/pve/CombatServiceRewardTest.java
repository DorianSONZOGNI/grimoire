package generation.grimoire.service.pve;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.model.pve.ActiveMonster;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CombatServiceRewardTest {

    @Mock
    private PersonnageRepository personnageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private AnomalieRepository anomalieRepository;

    @InjectMocks
    private CombatService combatService;

    private CombatSession session;
    private Personnage player;
    private AppUser appUser;
    private ActiveMonster activeMonster;
    private Salle room;

    @BeforeEach
    void setUp() {
        appUser = new AppUser();
        appUser.setUsername("Tester");
        appUser.setMonnaie(100);

        player = new Personnage();
        player.setId(1L);
        player.setName("Hero");
        player.setUser(appUser);
        player.setExperience(500);
        player.setVoieLevel(2); // penalty = 30
        player.setHealthMax(200);
        player.setHealthCurrent(200);

        Monstre baseMonster = new Monstre();
        baseMonster.setName("Goblin");
        baseMonster.setHealthMax(100);
        baseMonster.setRewardExp(50);
        baseMonster.setRewardGold(20);

        activeMonster = new ActiveMonster(baseMonster);

        room = new Salle();
        room.setId(1L);
        room.setType(RoomType.COMBAT);
        room.setTreasureGold(150);
        room.setTreasureExp(100);

        Donjon mockDonjon = new Donjon();
        mockDonjon.setId(99L);
        mockDonjon.setSalles(List.of(room));

        List<Personnage> players = new ArrayList<>();
        players.add(player);

        session = new CombatSession("test-session", mockDonjon, players);
        session.setCurrentRoom(room);
        session.getEnemies().add(activeMonster);

        combatService.getActiveSessions().put("test-session", session);
    }

    @Test
    void testCheckDeaths_MonsterKO() throws Exception {
        // Mock save
        when(personnageRepository.save(any(Personnage.class))).thenReturn(player);
        when(userRepository.save(any(AppUser.class))).thenReturn(appUser);

        // Kill monster
        activeMonster.getAsPersonnage().setHealthCurrent(0);

        // Access private checkDeaths via reflection
        java.lang.reflect.Method checkDeaths = CombatService.class.getDeclaredMethod("checkDeaths", CombatSession.class);
        checkDeaths.setAccessible(true);
        checkDeaths.invoke(combatService, session);

        // Assertions
        assertThat(activeMonster.getMaxHp()).isEqualTo(0); // Mark as processed
        assertThat(player.getExperience()).isEqualTo(550); // 500 + 50
        assertThat(appUser.getMonnaie()).isEqualTo(120); // 100 + 20
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("Combat termin"));
        
        verify(personnageRepository, times(1)).save(player);
        verify(userRepository, times(1)).save(appUser);
    }

    @Test
    void testCheckDeaths_PlayerKO() throws Exception {
        // Player dies
        player.setHealthCurrent(0);

        when(personnageRepository.findById(1L)).thenReturn(Optional.of(player));
        when(personnageRepository.save(any(Personnage.class))).thenReturn(player);

        java.lang.reflect.Method checkDeaths = CombatService.class.getDeclaredMethod("checkDeaths", CombatSession.class);
        checkDeaths.setAccessible(true);
        checkDeaths.invoke(combatService, session);

        // Penalty for level 3 (500 xp) is 80.
        assertThat(player.getExperience()).isEqualTo(420); // 500 - 80
        assertThat(session.getPenalizedDeadPlayers()).contains(1L);

        // Test calling it twice does not apply penalty twice
        checkDeaths.invoke(combatService, session);
        assertThat(player.getExperience()).isEqualTo(420); 
    }

    @Test
    void testOpenChest_NoKey() {
        room.setType(RoomType.TREASURE);
        
        when(personnageRepository.save(any(Personnage.class))).thenReturn(player);
        when(userRepository.save(any(AppUser.class))).thenReturn(appUser);

        combatService.openChest("test-session", false);

        assertThat(player.getExperience()).isEqualTo(600); // 500 + 100 exp from chest
        assertThat(appUser.getMonnaie()).isEqualTo(250); // 100 + 150 gold from chest
        assertThat(session.isRoomEventCompleted()).isTrue();
    }

    @Test
    void testOpenChest_WithKey() {
        room.setType(RoomType.TREASURE);
        LootEntry entry = new LootEntry();
        entry.setProbability(50.0);
        Equipment templateEq = new Equipment();
        templateEq.setName("LootedSword");
        entry.setEquipment(templateEq);
        room.setLootTable(List.of(entry));

        Equipment key = new Equipment();
        key.setName("Clé");
        session.getActiveConsumables().add(key);

        when(personnageRepository.save(any(Personnage.class))).thenReturn(player);
        when(userRepository.save(any(AppUser.class))).thenReturn(appUser);

        combatService.openChest("test-session", true);

        // Key removed
        assertThat(session.getActiveConsumables()).isEmpty();
        verify(equipmentRepository, times(1)).delete(key);

        assertThat(player.getExperience()).isEqualTo(600);
        assertThat(session.isRoomEventCompleted()).isTrue();
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("+10% de chance"));
    }
}
