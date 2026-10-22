package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.enumeration.MonsterBehavior;
import generation.grimoire.model.pve.ActiveMonster;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import generation.grimoire.repository.pve.SalleRepository;
import generation.grimoire.service.PassiveDispatcher;
import generation.grimoire.service.SpellService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.model.pve.InitiativeEntry;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CombatTurnServiceTest {

    @Mock
    private PersonnageRepository personnageRepository;
    @Mock
    private DonjonRepository donjonRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SpellRepository spellRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private SpellService spellService;
    @Mock
    private PassiveDispatcher passiveDispatcher;
    @Mock
    private AnomalieRepository anomalieRepository;
    @Mock
    private SalleRepository salleRepository;
    @Mock
    private MonstreRepository monstreRepository;
    
    @Mock
    private SpellAvailabilityService spellAvailabilityService;
    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private CombatTurnService combatTurnService;

    private CombatSession session;
    private Personnage player1;
    private Personnage player2;
    private ActiveMonster activeMonster;

    @BeforeEach
    void setUp() {
        player1 = new Personnage();
        player1.setId(1L);
        player1.setName("Hero1");
        player1.setHealthMax(100);
        player1.setHealthCurrent(100);
        player1.setManaMax(100);
        player1.setManaCurrent(100);
        player1.setResistance(10);

        player2 = new Personnage();
        player2.setId(2L);
        player2.setName("Hero2");
        player2.setHealthMax(100);
        player2.setHealthCurrent(100);
        player2.setManaMax(200);
        player2.setManaCurrent(200);
        player2.setResistance(5);

        List<Personnage> players = new ArrayList<>(List.of(player1, player2));
        Donjon mockDonjon = new Donjon();
        mockDonjon.setId(99L);
        Salle combatRoom = new Salle();
        combatRoom.setType(RoomType.COMBAT);
        mockDonjon.setSalles(new ArrayList<>(List.of(combatRoom)));
        session = new CombatSession("test-session", mockDonjon, players);
        session.loadRoom(0);

        Monstre baseMonster = new Monstre();
        baseMonster.setName("Goblin");
        baseMonster.setHealthMax(100);
        baseMonster.setManaMax(100);

        activeMonster = new ActiveMonster(baseMonster);
    }

    @Test
    void testResolveMonsterTarget_Normal() {
        activeMonster.getBase().setBehavior(MonsterBehavior.NORMAL);
        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.NORMAL,
                session.getPlayers(), session);
        assertThat(target).isIn(player1, player2);
    }

    @Test
    void testResolveMonsterTarget_Assassin() {
        activeMonster.getBase().setBehavior(MonsterBehavior.ASSASSIN);
        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.ASSASSIN,
                session.getPlayers(), session);
        assertThat(target).isEqualTo(player2);
    }

    @Test
    void testResolveMonsterTarget_Corrupteur() {
        activeMonster.getBase().setBehavior(MonsterBehavior.CORRUPTEUR);
        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.CORRUPTEUR,
                session.getPlayers(), session);
        assertThat(target).isEqualTo(player2);
    }

    @Test
    void testResolveMonsterTarget_Predateur() {
        activeMonster.setLockedTargetId(player1.getId());
        activeMonster.getBase().setBehavior(MonsterBehavior.PREDATEUR);
        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.PREDATEUR,
                session.getPlayers(), session);
        assertThat(target).isEqualTo(player1);
    }

    @Test
    void testResolveMonsterTarget_LeaderObedience() {
        activeMonster.setLeaderForcedTargetId(player2.getId());
        activeMonster.getBase().setBehavior(MonsterBehavior.NORMAL);
        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.NORMAL,
                session.getPlayers(), session);
        assertThat(target).isEqualTo(player2);
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("obéit au Leader"));
    }

    @Test
    void testResolveMonsterTarget_Brutal() {
        activeMonster.getBase().setBehavior(MonsterBehavior.BRUTAL);
        player1.setHealthMax(500);
        player2.setHealthMax(100);
        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.BRUTAL,
                session.getPlayers(), session);
        assertThat(target).isEqualTo(player2);
    }

    @Test
    void testResolveMonsterTarget_Leader() {
        activeMonster.getBase().setBehavior(MonsterBehavior.LEADER);

        Monstre minionBase = new Monstre();
        minionBase.setName("Minion");
        minionBase.setHealthMax(100);
        ActiveMonster ally = new ActiveMonster(minionBase);
        ally.getAsPersonnage().setHealthCurrent(100);

        session.getEnemies().add(activeMonster);
        session.getEnemies().add(ally);

        Personnage target = combatTurnService.resolveMonsterTarget(activeMonster, MonsterBehavior.LEADER,
                session.getPlayers(), session);

        assertThat(target).isIn(player1, player2);
        assertThat(ally.getLeaderForcedTargetId()).isEqualTo(target.getId());
    }

    @Test
    void testProcessNextTurn_ChannelingTurn2_TicksChannelingAndEmitsLog() {
        session.getTurnOrder().clear();
        session.getTurnOrder().add(new InitiativeEntry(true, 0, 10, 5, 0));
        session.setCurrentTurnIndex(0);

        Spell channeledSpell = new Spell();
        channeledSpell.setId(10L);
        channeledSpell.setNom("Rayon Céleste");
        channeledSpell.setChannelingDuration(3);

        player1.setRemainingChannelingTurns(2);
        player1.setChanneledSpell(channeledSpell);
        player1.setStartedChannelingThisTurn(false);

        combatTurnService.endTurn(session);

        verify(spellService).tickChanneling(eq(player1), any(), any(), any(), any(), any());
        assertThat(session.getCombatLog()).anyMatch(log -> log.contains("Hero1 canalise Rayon Céleste ! (Tour 2)"));
    }

    @Test
    void testProcessNextTurn_ChannelingTurn1_DoesNotTickChanneling() {
        session.getTurnOrder().clear();
        session.getTurnOrder().add(new InitiativeEntry(true, 0, 10, 5, 0));
        session.setCurrentTurnIndex(0);

        Spell channeledSpell = new Spell();
        channeledSpell.setId(10L);
        channeledSpell.setNom("Rayon Céleste");
        channeledSpell.setChannelingDuration(3);

        player1.setRemainingChannelingTurns(2);
        player1.setChanneledSpell(channeledSpell);
        player1.setStartedChannelingThisTurn(true);

        combatTurnService.endTurn(session);

        verify(spellService, never()).tickChanneling(any(), any(), any(), any(), any(), any());
        assertThat(session.getCombatLog()).noneMatch(log -> log.contains("canalise"));
    }
}