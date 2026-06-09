package generation.grimoire.model.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.entity.Spell;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class CombatSession {
    private String sessionId;
    private Long dungeonId;
    private Donjon donjon;
    private Personnage player;
    
    private int currentRoomIndex = 0;
    private Salle currentRoom;
    
    private List<Spell> availableSpells = new ArrayList<>();

    // Valid only if currentRoom is COMBAT
    private List<ActiveMonster> enemies = new ArrayList<>();
    
    private int turnNumber = 1;
    private boolean isFinished = false;
    private boolean playerWon = false;
    
    private int totalGoldAccumulated = 0;
    private int totalExpAccumulated = 0;
    
    private List<String> combatLog = new ArrayList<>();

    public CombatSession(String sessionId, Donjon donjon, Personnage player) {
        this.sessionId = sessionId;
        this.dungeonId = donjon.getId();
        this.donjon = donjon;
        this.player = player;
        
        loadRoom(0);
    }
    
    public void loadRoom(int index) {
        this.currentRoomIndex = index;
        if (donjon.getSalles() != null && index < donjon.getSalles().size()) {
            this.currentRoom = donjon.getSalles().get(index);
            
            if (this.currentRoom.getType() == generation.grimoire.enumeration.RoomType.COMBAT) {
                this.enemies = this.currentRoom.getMonsters().stream()
                    .map(m -> new ActiveMonster(m))
                    .collect(Collectors.toList());
            } else {
                this.enemies.clear();
            }
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
        return enemies.stream().allMatch(ActiveMonster::isDead);
    }
}
