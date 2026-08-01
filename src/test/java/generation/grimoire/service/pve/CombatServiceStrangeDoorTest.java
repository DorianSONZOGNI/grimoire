package generation.grimoire.service.pve;

import com.fasterxml.jackson.databind.ObjectMapper;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.enumeration.EventSubType;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CombatServiceStrangeDoorTest {

    @Mock
    private AnomalieRepository anomalieRepository;

    @Mock
    private MonstreRepository monstreRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private generation.grimoire.repository.SpellRepository spellRepository;

    @InjectMocks
    private CombatService combatService;

    private CombatSession session;
    private Salle room;
    private ObjectMapper realMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        Personnage player = new Personnage();
        player.setHealthMax(100);
        player.setHealthCurrent(100);
        player.setManaMax(100);
        player.setManaCurrent(100);
        player.setResistance(10);

        AppUser user = new AppUser();
        user.setUsername("testUser");
        player.setUser(user);

        room = new Salle();
        room.setType(RoomType.EVENT);
        room.setEventSubType(EventSubType.PORTE_ETRANGE);

        generation.grimoire.entity.pve.Donjon mockDonjon = new generation.grimoire.entity.pve.Donjon();
        mockDonjon.setId(99L);
        mockDonjon.setSalles(new ArrayList<>(List.of(room)));
        session = new CombatSession("test-session", mockDonjon, new ArrayList<>(List.of(player)));
        session.setCurrentRoom(room);

        combatService.getActiveSessions().put("test-session", session);
    }

    @Test
    void testOpenStrangeDoor_NullJson() {
        room.setDoorOutcomes(null);
        combatService.openStrangeDoor("test-session");
        assertThat(session.isRoomEventCompleted()).isTrue();
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("Rien ne se passe"));
    }

    @Test
    void testOpenStrangeDoor_EmptyArrayJson() throws Exception {
        room.setDoorOutcomes("[]");

        combatService.openStrangeDoor("test-session");
        assertThat(session.isRoomEventCompleted()).isTrue();
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("Rien ne se passe"));
    }

    @Test
    void testOpenStrangeDoor_Boss() throws Exception {
        String json = "[{\"type\":\"BOSS\",\"probability\":100,\"bossRewardGold\":50,\"monsters\":[]}]";
        room.setDoorOutcomes(json);
        when(objectMapper.readTree(anyString()))
                .thenAnswer(invocation -> realMapper.readTree((String) invocation.getArgument(0)));

        combatService.openStrangeDoor("test-session");

        assertThat(room.getType()).isEqualTo(RoomType.BOSS);
        assertThat(room.getBossRewardGold()).isEqualTo(50);
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("Un puissant Boss vous attend"));
    }

    @Test
    void testOpenStrangeDoor_Tresor() throws Exception {
        String json = "[{\"type\":\"TRESOR\",\"probability\":100,\"treasureAnomalieId\":1}]";
        room.setDoorOutcomes(json);
        when(objectMapper.readTree(anyString()))
                .thenAnswer(invocation -> realMapper.readTree((String) invocation.getArgument(0)));
                
        generation.grimoire.entity.Anomalie fakeAnomalie = new generation.grimoire.entity.Anomalie();
        fakeAnomalie.setId(1L);
        fakeAnomalie.setName("Cœur de Démon");
        fakeAnomalie.setSpiritualite(generation.grimoire.enumeration.SpiritualiteType.TENEBRES);
        when(anomalieRepository.findById(1L)).thenReturn(java.util.Optional.of(fakeAnomalie));

        combatService.openStrangeDoor("test-session");

        assertThat(session.getCurrentRoom().getType()).isEqualTo(generation.grimoire.enumeration.RoomType.EVENT);
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("découvrez l'anomalie : Cœur de Démon"));
    }

    @Test
    void testOpenStrangeDoor_Piege() throws Exception {
        String json = "[{\"type\":\"PIEGE\",\"probability\":100,\"trapType\":\"PV\",\"trapAmount\":15}]";
        room.setDoorOutcomes(json);
        when(objectMapper.readTree(anyString()))
                .thenAnswer(invocation -> realMapper.readTree((String) invocation.getArgument(0)));

        combatService.openStrangeDoor("test-session");

        assertThat(room.getEventSubType()).isEqualTo(EventSubType.PIEGE);
        assertThat(room.getTrapType()).isEqualTo("PV");
        assertThat(room.getTrapAmount()).isEqualTo(15);
    }

    @Test
    void testOpenStrangeDoor_Rien() throws Exception {
        String json = "[{\"type\":\"RIEN\",\"probability\":100}]";
        room.setDoorOutcomes(json);
        when(objectMapper.readTree(anyString()))
                .thenAnswer(invocation -> realMapper.readTree((String) invocation.getArgument(0)));

        combatService.openStrangeDoor("test-session");

        assertThat(session.isRoomEventCompleted()).isTrue();
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("absolument rien"));
    }

    @Test
    void testOpenStrangeDoor_ZeroProbability_ReturnsBlocked() throws Exception {
        String json = "[{\"type\":\"BOSS\",\"probability\":0}]";
        room.setDoorOutcomes(json);
        when(objectMapper.readTree(anyString()))
                .thenAnswer(invocation -> realMapper.readTree((String) invocation.getArgument(0)));

        combatService.openStrangeDoor("test-session");

        assertThat(session.isRoomEventCompleted()).isTrue();
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("bloquée à jamais"));
    }
}
