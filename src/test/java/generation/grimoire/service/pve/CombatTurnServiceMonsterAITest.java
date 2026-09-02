package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.enumeration.MonsterBehavior;
import generation.grimoire.enumeration.MonsterType;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.model.pve.ActiveMonster;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.InitiativeEntry;
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

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class CombatTurnServiceMonsterAITest {

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
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Mock
    private SpellAvailabilityService spellAvailabilityService;

    @InjectMocks
    private CombatTurnService combatTurnService;

    private CombatSession session;
    private Personnage player;
    private ActiveMonster activeMonster;
    private Monstre baseMonster;

    @BeforeEach
    void setUp() {
        player = new Personnage();
        player.setId(1L);
        player.setName("Hero");
        player.setHealthMax(200);
        player.setHealthCurrent(200);
        player.setManaMax(100);
        player.setManaCurrent(100);
        player.setResistance(10);
        player.setArmor(10);

        baseMonster = new Monstre();
        baseMonster.setName("Goblin");
        baseMonster.setHealthMax(100);
        baseMonster.setManaMax(100);
        baseMonster.setBehavior(MonsterBehavior.NORMAL);
        baseMonster.setMonsterType(MonsterType.NORMAL);
        baseMonster.setStrength(10);
        baseMonster.setPower(5);

        activeMonster = new ActiveMonster(baseMonster);

        Salle room = new Salle();
        room.setId(1L);
        room.setType(RoomType.COMBAT);

        Donjon mockDonjon = new Donjon();
        mockDonjon.setId(99L);
        mockDonjon.setSalles(List.of(room));

        List<Personnage> players = new ArrayList<>();
        players.add(player);

        session = new CombatSession("test-session", mockDonjon, players);
        session.setCurrentRoom(room);
        session.getEnemies().add(activeMonster);

        // Define a turn order where it's the monster's turn (index 0 in enemies list)
        session.getTurnOrder().add(new InitiativeEntry(false, 0, 15, 10, 50));
        session.setCurrentTurnIndex(0);
    }
    @Test
    void testMonsterBehaviorBrutal_DealsRawDamage() {
        baseMonster.setBehavior(MonsterBehavior.BRUTAL);
        baseMonster.setStrength(15);
        baseMonster.setPower(10);

        // Before attack: HP = 200
        combatTurnService.processNextAutoTurn(session);

        // Brutal applies (str + pwr) as raw damage, ignoring armor/resistance
        // Total = 25 raw damage. Hero HP should be 200 - 25 = 175
        assertThat(player.getHealthCurrent()).isEqualTo(175);
    }

    @Test
    void testMonsterBehaviorCorrupteur_DrainsMana() {
        baseMonster.setBehavior(MonsterBehavior.CORRUPTEUR);
        player.setManaCurrent(100);

        combatTurnService.processNextAutoTurn(session);
        session.getCombatLog().forEach(System.err::println);

        // Corrupteur drains 5% of max mana/current mana (actually logic says
        // "targetPlayer.getManaCurrent() * 0.05")
        // 100 * 0.05 = 5. Mana should be 95.
        assertThat(player.getManaCurrent()).isEqualTo(95);
    }

    @Test
    void testMonsterOnHitEffects_BurnAndPoison() {
        // We set passive state on the monster's Personnage representation to simulate
        // Boss Buffs
        activeMonster.getAsPersonnage().setPassiveState("BURN_ON_HIT", 10);
        activeMonster.getAsPersonnage().setPassiveState("POISON_ON_HIT", 5);

        combatTurnService.processNextAutoTurn(session);

        // Hero should now have a BURN and POISON DamageOverTimeEffect
        List<DamageOverTimeEffect> dots = player.getActiveDamageOverTimeEffects();
        assertThat(dots).hasSize(2);

        boolean hasBurn = dots.stream()
                .anyMatch(dot -> dot.getBurn() != null && dot.getBurn() && dot.getFixedDamagePerTick() == 10);
        boolean hasPoison = dots.stream()
                .anyMatch(dot -> dot.getPoison() != null && dot.getPoison() && dot.getFixedDamagePerTick() == 5);

        assertThat(hasBurn).isTrue();
        assertThat(hasPoison).isTrue();
    }

    @Test
    void testMonsterTypeMortVivant_RegensAtTurnStart() {
        baseMonster.setMonsterType(MonsterType.MORT_VIVANT);
        baseMonster.setHealthMax(200);
        activeMonster = new ActiveMonster(baseMonster); // re-init to take new health max
        activeMonster.getAsPersonnage().setHealthCurrent(100);
        session.getEnemies().clear();
        session.getEnemies().add(activeMonster);

        combatTurnService.processNextAutoTurn(session);

        // 5% of 200 is 10. Current HP should become 110.
        assertThat(activeMonster.getAsPersonnage().getHealthCurrent()).isEqualTo(110);
    }

    @Test
    void testMonsterDeadAtStartOfTurn_NoAttack() {
        activeMonster.setMaxHp(100);
        activeMonster.getAsPersonnage().setHealthCurrent(0);

        combatTurnService.processNextAutoTurn(session);

        // The monster was already dead, so it should be skipped. It does not attack.
        assertThat(player.getHealthCurrent()).isEqualTo(200);
        assertThat(session.getCombatLog()).isEmpty();
    }
}
