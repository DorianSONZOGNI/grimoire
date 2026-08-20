package generation.grimoire.model.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CombatSessionTest {

    @Test
    void shouldInitializeCombatSession() {
        Donjon donjon = new Donjon();
        donjon.setId(1L);
        donjon.setName("Test Dungeon");
        donjon.setRequiredSecret("secret");
        donjon.setRequiredSecretLevel(5);
        donjon.setRecommendedLevel(10);
        
        Salle salle1 = new Salle();
        Salle salle2 = new Salle();
        donjon.setSalles(List.of(salle1, salle2));

        Personnage p1 = new Personnage();
        Personnage p2 = new Personnage();
        List<Personnage> players = List.of(p1, p2);

        CombatSession session = new CombatSession("session1", donjon, players);

        assertThat(session.getSessionId()).isEqualTo("session1");
        assertThat(session.getDungeonId()).isEqualTo(1L);
        assertThat(session.getDonjonName()).isEqualTo("Test Dungeon");
        assertThat(session.getDonjonSecret()).isEqualTo("secret");
        assertThat(session.getDonjonSecretLevel()).isEqualTo(5);
        assertThat(session.getDonjonLevel()).isEqualTo(10);
        assertThat(session.getTotalRooms()).isEqualTo(2);
        assertThat(session.getPlayers()).hasSize(2);
        assertThat(session.getCurrentRoomIndex()).isEqualTo(0);
        assertThat(session.getCurrentRoom()).isEqualTo(salle1);
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void shouldHandleActivePlayerAndEnemy() {
        CombatSession session = new CombatSession("session1", new Donjon(), new ArrayList<>());
        
        Personnage player = new Personnage();
        session.getPlayers().add(player);
        
        ActiveMonster enemy = new ActiveMonster(new generation.grimoire.entity.pve.Monstre());
        session.getEnemies().add(enemy);
        
        session.getTurnOrder().add(new InitiativeEntry(true, 0, 10, 5, 0));
        session.getTurnOrder().add(new InitiativeEntry(false, 0, 8, 4, 0));
        
        assertThat(session.getActivePlayer()).isEqualTo(player);
        assertThat(session.getActiveEnemy()).isNull();
        
        session.advanceTurnIndex();
        
        assertThat(session.getActivePlayer()).isNull();
        assertThat(session.getActiveEnemy()).isEqualTo(enemy);
        
        session.advanceTurnIndex();
        assertThat(session.isRoundFinished()).isTrue();
    }

    @Test
    void shouldCheckIfAllPlayersDead() {
        CombatSession session = new CombatSession("session1", new Donjon(), new ArrayList<>());
        Personnage p1 = new Personnage();
        p1.setHealthCurrent(0);
        Personnage p2 = new Personnage();
        p2.setHealthCurrent(0);
        session.getPlayers().add(p1);
        session.getPlayers().add(p2);
        
        assertThat(session.areAllPlayersDead()).isTrue();
        
        p1.setHealthMax(100);
        p1.setHealthCurrent(10);
        assertThat(session.areAllPlayersDead()).isFalse();
    }

    @Test
    void shouldCheckIfAllEnemiesDead() {
        CombatSession session = new CombatSession("session1", new Donjon(), new ArrayList<>());
        ActiveMonster m1 = new ActiveMonster(new generation.grimoire.entity.pve.Monstre());
        m1.setMaxHp(100);
        m1.takeDamage(100);
        session.getEnemies().add(m1);
        
        assertThat(session.areAllEnemiesDead()).isTrue();
        
        ActiveMonster m2 = new ActiveMonster(new generation.grimoire.entity.pve.Monstre());
        m2.setMaxHp(100);
        m2.getAsPersonnage().setHealthCurrent(100);
        session.getEnemies().add(m2);
        
        assertThat(session.areAllEnemiesDead()).isFalse();
    }

    @Test
    void shouldLoadRoomAndFinishDungeon() {
        Donjon donjon = new Donjon();
        donjon.setSalles(List.of(new Salle()));
        CombatSession session = new CombatSession("session1", donjon, new ArrayList<>());
        
        assertThat(session.getCurrentRoomIndex()).isEqualTo(0);
        assertThat(session.isFinished()).isFalse();
        
        session.loadRoom(1); // Out of bounds -> end of dungeon
        
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlayerWon()).isTrue();
    }
}
