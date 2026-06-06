package generation.grimoire.model.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Monstre;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CombatSession {
    private String sessionId;
    private Long dungeonId;
    private Personnage player;
    private Monstre enemyBase;
    
    private int enemyCurrentHp;
    private int enemyMaxHp;
    
    private int turnNumber = 1;
    private boolean isFinished = false;
    private boolean playerWon = false;
    
    private List<String> combatLog = new ArrayList<>();

    public CombatSession(String sessionId, Long dungeonId, Personnage player, Monstre enemyBase) {
        this.sessionId = sessionId;
        this.dungeonId = dungeonId;
        this.player = player;
        this.enemyBase = enemyBase;
        
        this.enemyMaxHp = enemyBase.getHealthMax();
        this.enemyCurrentHp = this.enemyMaxHp;
    }
    
    public void addLog(String message) {
        this.combatLog.add(message);
    }
}
