package generation.grimoire.service.pve;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.entity.spell.type.effect.DamageFixedEffect;
import generation.grimoire.entity.spell.type.effect.HealFixedEffect;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.model.pve.ActiveMonster;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.InitiativeEntry;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.service.SpellService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CombatActionServiceTest {

    @Mock
    private SpellRepository spellRepository;

    @Mock
    private SpellService spellService;

    @InjectMocks
    private CombatActionService combatActionService;

    private CombatSession session;
    private Personnage player;
    private Salle combatRoom;
    private ActiveMonster monster1;
    private ActiveMonster monster2;

    @BeforeEach
    void setUp() {
        player = new Personnage();
        player.setId(1L);
        player.setName("Héros");
        player.setHealthMax(100);
        player.setHealthCurrent(100);

        combatRoom = new Salle();
        combatRoom.setType(RoomType.COMBAT);

        Donjon donjon = new Donjon();
        donjon.setId(10L);
        donjon.setName("Donjon Test");
        donjon.setSalles(new ArrayList<>(List.of(combatRoom)));

        session = new CombatSession("test-session", donjon, new ArrayList<>(List.of(player)));
        session.setCurrentRoom(combatRoom);

        // Initiative tournée vers le joueur (index 0)
        session.setTurnOrder(new ArrayList<>(List.of(new InitiativeEntry(true, 0, 10, 10, 0))));
        session.setCurrentTurnIndex(0);

        Monstre m1 = new Monstre();
        m1.setName("Gobelin");
        m1.setHealthMax(50);
        monster1 = new ActiveMonster(m1);

        Monstre m2 = new Monstre();
        m2.setName("Orque");
        m2.setHealthMax(80);
        monster2 = new ActiveMonster(m2);

        session.setEnemies(new ArrayList<>(List.of(monster1, monster2)));
    }

    @ParameterizedTest
    @EnumSource(value = RoomType.class, names = {"EVENT", "TREASURE"})
    @DisplayName("Doit lever une exception si la salle n'est ni COMBAT ni BOSS")
    void executePlayerAction_throwsException_whenRoomTypeIsNotCombatOrBoss(RoomType nonCombatRoomType) {
        combatRoom.setType(nonCombatRoomType);

        assertThatThrownBy(() -> combatActionService.executePlayerAction(session, 1L, 0, null, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Ce n'est pas une salle de combat !");

        verifyNoInteractions(spellRepository, spellService);
    }

    @Test
    @DisplayName("Doit autoriser l'action lorsque la salle est de type BOSS")
    void executePlayerAction_allowsExecution_whenRoomTypeIsBoss() {
        combatRoom.setType(RoomType.BOSS);

        Spell spell = new Spell();
        spell.setId(100L);
        spell.setNom("Frappe Héroïque");
        DamageFixedEffect effect = new DamageFixedEffect();
        effect.setEffectTarget(EffectTarget.TARGET);
        spell.addEffect(effect);

        when(spellRepository.findById(100L)).thenReturn(Optional.of(spell));

        combatActionService.executePlayerAction(session, 100L, 0, null, null);

        verify(spellService).castSpellGroup(eq(spell), eq(player), eq(monster1.getAsPersonnage()), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Doit retourner immédiatement sans appel aux services si le joueur actif est null (turnOrder vide)")
    void executePlayerAction_returnsEarly_whenActivePlayerIsNull_dueToEmptyTurnOrder() {
        session.setTurnOrder(new ArrayList<>());

        combatActionService.executePlayerAction(session, 1L, 0, null, null);

        verifyNoInteractions(spellRepository, spellService);
    }

    @Test
    @DisplayName("Doit retourner immédiatement sans appel aux services si le tour actuel n'est pas un joueur")
    void executePlayerAction_returnsEarly_whenCurrentTurnIsNotPlayer() {
        session.setTurnOrder(new ArrayList<>(List.of(new InitiativeEntry(false, 0, 10, 10, 0))));
        session.setCurrentTurnIndex(0);

        combatActionService.executePlayerAction(session, 1L, 0, null, null);

        verifyNoInteractions(spellRepository, spellService);
    }

    @Test
    @DisplayName("Doit résoudre la cible vers l'ennemi indexé lorsque le sort contient un effet TARGET")
    void executePlayerAction_resolvesTargetToIndexedEnemy_whenEffectTargetIsTARGET() {
        Spell spell = new Spell();
        spell.setId(10L);
        spell.setNom("Boule de Feu");

        DamageFixedEffect effect = new DamageFixedEffect();
        effect.setEffectTarget(EffectTarget.TARGET);
        spell.addEffect(effect);

        when(spellRepository.findById(10L)).thenReturn(Optional.of(spell));

        combatActionService.executePlayerAction(session, 10L, 1, null, null);

        ArgumentCaptor<Personnage> targetCaptor = ArgumentCaptor.forClass(Personnage.class);
        verify(spellService).castSpellGroup(
                eq(spell),
                eq(player),
                targetCaptor.capture(),
                any(),
                any(),
                any(),
                any()
        );

        assertThat(targetCaptor.getValue()).isEqualTo(monster2.getAsPersonnage());
    }

    @Test
    @DisplayName("Doit résoudre la cible vers le joueur lorsque le sort contient un effet ALLY")
    void executePlayerAction_resolvesTargetToPlayer_whenEffectTargetIsALLY() {
        Spell healSpell = new Spell();
        healSpell.setId(20L);
        healSpell.setNom("Soin Spirituel");

        HealFixedEffect effect = new HealFixedEffect();
        effect.setEffectTarget(EffectTarget.ALLY);
        healSpell.addEffect(effect);

        when(spellRepository.findById(20L)).thenReturn(Optional.of(healSpell));

        combatActionService.executePlayerAction(session, 20L, null, null, null);

        ArgumentCaptor<Personnage> targetCaptor = ArgumentCaptor.forClass(Personnage.class);
        ArgumentCaptor<Personnage> allyTargetCaptor = ArgumentCaptor.forClass(Personnage.class);

        verify(spellService).castSpellGroup(
                eq(healSpell),
                eq(player),
                targetCaptor.capture(),
                allyTargetCaptor.capture(),
                any(),
                any(),
                any()
        );

        // La cible principale est résolue vers le joueur lui-même
        assertThat(targetCaptor.getValue()).isEqualTo(player);
        // Et allyTarget est annulé car joueur unique (allyTargetId == p.getId())
        assertThat(allyTargetCaptor.getValue()).isNull();
    }

    @Test
    @DisplayName("Doit résoudre la cible vers le joueur et allyTarget vers l'allié choisi en cas de multi-joueurs")
    void executePlayerAction_resolvesAllyTarget_whenMultiplayer() {
        Personnage ally = new Personnage();
        ally.setId(2L);
        ally.setName("Compagnon");
        ally.setHealthMax(100);
        ally.setHealthCurrent(100);
        session.getPlayers().add(ally);

        Spell buffSpell = new Spell();
        buffSpell.setId(30L);
        buffSpell.setNom("Bouclier Divin");

        HealFixedEffect effect = new HealFixedEffect();
        effect.setEffectTarget(EffectTarget.ALLY);
        buffSpell.addEffect(effect);

        when(spellRepository.findById(30L)).thenReturn(Optional.of(buffSpell));

        // Ciblage allié explicite sur index 1 (le compagnon)
        combatActionService.executePlayerAction(session, 30L, null, 1, null);

        ArgumentCaptor<Personnage> targetCaptor = ArgumentCaptor.forClass(Personnage.class);
        ArgumentCaptor<Personnage> allyTargetCaptor = ArgumentCaptor.forClass(Personnage.class);

        verify(spellService).castSpellGroup(
                eq(buffSpell),
                eq(player),
                targetCaptor.capture(),
                allyTargetCaptor.capture(),
                any(),
                any(),
                any()
        );

        assertThat(targetCaptor.getValue()).isEqualTo(player);
        assertThat(allyTargetCaptor.getValue()).isEqualTo(ally);
    }
}
