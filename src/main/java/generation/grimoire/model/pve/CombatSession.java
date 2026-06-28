package generation.grimoire.model.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.entity.Spell;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.time.Instant;

@Data
public class CombatSession {
    private String sessionId;
    private Long dungeonId;
    private Donjon donjon;
    private List<Personnage> players = new ArrayList<>();
    private List<generation.grimoire.entity.Equipment> activeConsumables = new ArrayList<>();

    // Initiative Queue
    private List<InitiativeEntry> turnOrder = new ArrayList<>();
    private int currentTurnIndex = 0;

    private int currentRoomIndex = 0;
    private Salle currentRoom;

    private List<Spell> availableSpells = new ArrayList<>();

    /** Disponibilité de chaque sort (grisage côté frontend) */
    private List<SpellAvailability> spellAvailability = new ArrayList<>();

    // Valid only if currentRoom is COMBAT
    private List<ActiveMonster> enemies = new ArrayList<>();

    private int turnNumber = 1;
    private boolean isFinished = false;
    private boolean playerWon = false;
    private boolean roomEventCompleted = false;

    // Track players who died and already lost XP
    private java.util.Set<Long> penalizedDeadPlayers = new java.util.HashSet<>();
    private Set<Integer> purchasedMerchantItems = new HashSet<>();

    private int totalGoldAccumulated = 0;
    private int totalGoldLostOnDefeat = 0;
    private int totalExpAccumulated = 0;
    private int bossBonusSpiritualXp = 0; // XP Spiritualité bonus boss (total distribué)
    private int bossBonusGold = 0; // Or bonus boss

    private List<String> combatLog = new ArrayList<>();

    private int reloadCount = 0;
    private Instant lastActivity = Instant.now();

    public CombatSession(String sessionId, Donjon donjon, List<Personnage> players) {
        this.sessionId = sessionId;
        this.dungeonId = donjon.getId();
        this.donjon = donjon;
        this.players = players;

        loadRoom(0);
    }

    public Personnage getActivePlayer() {
        if (turnOrder.isEmpty() || currentTurnIndex >= turnOrder.size())
            return null;
        InitiativeEntry current = turnOrder.get(currentTurnIndex);
        if (current.isPlayer() && current.getIndex() >= 0 && current.getIndex() < players.size()) {
            return players.get(current.getIndex());
        }
        return null;
    }

    public ActiveMonster getActiveEnemy() {
        if (turnOrder.isEmpty() || currentTurnIndex >= turnOrder.size())
            return null;
        InitiativeEntry current = turnOrder.get(currentTurnIndex);
        if (!current.isPlayer() && current.getIndex() >= 0 && current.getIndex() < enemies.size()) {
            return enemies.get(current.getIndex());
        }
        return null;
    }

    public void advanceTurnIndex() {
        currentTurnIndex++;
    }

    public boolean isRoundFinished() {
        return currentTurnIndex >= turnOrder.size();
    }

    public boolean areAllPlayersDead() {
        return players.stream().allMatch(p -> p.getHealthCurrent() <= 0);
    }

    public void loadRoom(int index) {
        this.currentRoomIndex = index;
        this.roomEventCompleted = false;
        this.purchasedMerchantItems.clear();
        if (donjon.getSalles() != null && index < donjon.getSalles().size()) {
            this.currentRoom = donjon.getSalles().get(index);
            // On laisse handleRoomStart gérer les ennemis et la re-fetch de la salle
        } else {
            // End of dungeon
            this.isFinished = true;
            this.playerWon = true;
        }
    }

    public void addLog(String message) {
        this.combatLog.add(message);
    }

    public boolean areAllEnemiesDead() {
        return enemies.stream().allMatch(monster -> monster != null && monster.isDead());
    }
}
