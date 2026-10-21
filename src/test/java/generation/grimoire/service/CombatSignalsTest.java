package generation.grimoire.service.pve;

import generation.grimoire.dto.pve.CombatSignalDTO;
import generation.grimoire.dto.pve.CombatSignalRequest;
import generation.grimoire.dto.pve.CombatSignalsConfigDTO;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.CombatSignalAction;
import generation.grimoire.enumeration.CombatSignalType;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.service.pve.CombatEventEmitter;
import generation.grimoire.service.pve.CombatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CombatSignalsTest {

    private CombatService combatService;
    private CombatEventEmitter combatEventEmitter;

    @BeforeEach
    void setUp() {
        combatEventEmitter = Mockito.mock(CombatEventEmitter.class);
        combatService = new CombatService(
                Mockito.mock(generation.grimoire.service.PersonnageService.class),
                Mockito.mock(generation.grimoire.repository.PersonnageRepository.class),
                Mockito.mock(generation.grimoire.repository.pve.DonjonRepository.class),
                Mockito.mock(generation.grimoire.repository.auth.UserRepository.class),
                Mockito.mock(generation.grimoire.repository.EquipmentRepository.class),
                Mockito.mock(generation.grimoire.repository.pve.HuntingQuestRepository.class),
                Mockito.mock(generation.grimoire.service.pve.CombatRoomService.class),
                Mockito.mock(generation.grimoire.service.pve.CombatTurnService.class),
                Mockito.mock(generation.grimoire.service.pve.CombatActionService.class),
                Mockito.mock(generation.grimoire.service.pve.SpellAvailabilityService.class),
                Mockito.mock(generation.grimoire.service.pve.DungeonTutorialService.class)
        );
        combatService.setCombatEventEmitter(combatEventEmitter);
    }

    @Test
    void testSignalsConfigPartition() {
        CombatSignalsConfigDTO config = combatService.getSignalsConfig();
        assertNotNull(config);
        assertNotNull(config.mobActions());
        assertNotNull(config.heroActions());
        assertNotNull(config.emoteActions());

        assertTrue(config.mobActions().contains(CombatSignalAction.ATTACK));
        assertTrue(config.mobActions().contains(CombatSignalAction.FEAR));
        assertTrue(config.mobActions().contains(CombatSignalAction.IGNORE));

        assertTrue(config.heroActions().contains(CombatSignalAction.HEAL));
        assertTrue(config.heroActions().contains(CombatSignalAction.SHIELD));
        assertTrue(config.heroActions().contains(CombatSignalAction.BUFF));

        assertTrue(config.emoteActions().contains(CombatSignalAction.HAPPY));
        assertTrue(config.emoteActions().contains(CombatSignalAction.SAD));
        assertTrue(config.emoteActions().contains(CombatSignalAction.ANGRY));
        assertTrue(config.emoteActions().contains(CombatSignalAction.GG));
    }

    @Test
    void testSendSignalOnHero() {
        Donjon donjon = new Donjon();
        donjon.setId(1L);
        donjon.setName("Donjon Test");
        Salle s = new Salle();
        s.setType(RoomType.COMBAT);
        donjon.setSalles(List.of(s));

        Personnage p1 = new Personnage();
        p1.setId(10L);
        p1.setName("Arthur");

        CombatSession session = new CombatSession("test-session-1", donjon, List.of(p1));
        combatService.getActiveSessions().put("test-session-1", session);

        CombatSignalRequest req = new CombatSignalRequest(CombatSignalAction.HEAL, 0, null);
        CombatSignalDTO dto = combatService.sendSignal("test-session-1", "Merlin", req);

        assertNotNull(dto);
        assertEquals(CombatSignalType.HERO_PING, dto.type());
        assertEquals(CombatSignalAction.HEAL, dto.action());
        assertEquals("Arthur", dto.targetName());
        assertTrue(dto.formattedMessage().contains("Merlin demande des soins pour Arthur"));
        assertTrue(session.getCombatLog().contains(dto.formattedMessage()));

        Mockito.verify(combatEventEmitter).broadcastEvent(Mockito.eq("test-session-1"), Mockito.eq("combat-signal"), Mockito.any());
    }

    @Test
    void testSendEmote() {
        Donjon donjon = new Donjon();
        donjon.setId(1L);
        donjon.setName("Donjon Test");
        Salle s = new Salle();
        s.setType(RoomType.COMBAT);
        donjon.setSalles(List.of(s));

        CombatSession session = new CombatSession("test-session-2", donjon, List.of());
        combatService.getActiveSessions().put("test-session-2", session);

        CombatSignalRequest req = new CombatSignalRequest(CombatSignalAction.HAPPY, null, null);
        CombatSignalDTO dto = combatService.sendSignal("test-session-2", "Dorian", req);

        assertNotNull(dto);
        assertEquals(CombatSignalType.EMOTE, dto.type());
        assertEquals(CombatSignalAction.HAPPY, dto.action());
        assertTrue(dto.formattedMessage().contains("Dorian : 😊 Content"));
        assertTrue(session.getCombatLog().contains(dto.formattedMessage()));
    }
}
