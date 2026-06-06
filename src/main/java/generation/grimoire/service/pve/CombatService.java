package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class CombatService {

    private final PersonnageRepository personnageRepository;
    private final DonjonRepository donjonRepository;
    
    // In-memory combat sessions
    private final Map<String, CombatSession> activeSessions = new ConcurrentHashMap<>();

    public CombatSession startCombat(Long characterId, Long dungeonId, String username) {
        Personnage p = personnageRepository.findById(characterId).orElseThrow(() -> new RuntimeException("Personnage introuvable"));
        
        // Security check
        if (p.getUser() == null || !p.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Non autorisé");
        }
        
        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));
        
        if (d.getMonsters() == null || d.getMonsters().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucun monstre.");
        }
        
        // Simple iteration: 1st monster
        Monstre m = d.getMonsters().get(0);
        
        // Setup character health
        p.setHealthCurrent(p.getHealthMax());
        p.setManaCurrent(p.getManaMax());
        p.clearBuffs();
        
        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, dungeonId, p, m);
        session.addLog("Le combat commence contre " + m.getName() + " !");
        
        activeSessions.put(sessionId, session);
        return session;
    }

    public CombatSession getSession(String sessionId) {
        return activeSessions.get(sessionId);
    }

    public CombatSession executeTurn(String sessionId, Long spellId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null) throw new RuntimeException("Session introuvable");
        if (session.isFinished()) return session;
        
        Personnage p = session.getPlayer();
        Monstre m = session.getEnemyBase();
        
        session.addLog("--- TOUR " + session.getTurnNumber() + " ---");
        
        // 1. Player's turn
        // For simplicity, instead of full spell execution (which requires target mapping),
        // we'll simulate a basic attack or a fixed spell damage for this iteration.
        // In a real implementation, we'd inject the SpellService and execute the spell.
        // Here we just use basic attack logic using Personnage's strength/power.
        
        int playerDmg = p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH);
        
        // If spellId is provided, let's pretend it's a basic attack or magical attack.
        // Since we don't have a target as Personnage (Monstre is not Personnage), 
        // we manually apply damage.
        
        int damageDone = Math.max(1, playerDmg - m.getArmor());
        session.setEnemyCurrentHp(Math.max(0, session.getEnemyCurrentHp() - damageDone));
        session.addLog(p.getName() + " attaque et inflige " + damageDone + " dégâts à " + m.getName() + " !");
        
        if (session.getEnemyCurrentHp() == 0) {
            session.setFinished(true);
            session.setPlayerWon(true);
            session.addLog(m.getName() + " est vaincu ! Vous avez gagné " + m.getRewardExp() + " XP et " + m.getRewardGold() + " Or.");
            // TODO: Give rewards to player
            return session;
        }
        
        // 2. Monster's turn
        int monsterDmg = m.getStrength();
        // Calculate reduction using Personnage's takeDamage
        // We use takeDamage directly to benefit from armor/shields
        int initialHp = p.getHealthCurrent();
        p.takeDamage(monsterDmg, generation.grimoire.enumeration.DamageType.PHYSIC);
        int finalHp = p.getHealthCurrent();
        int damageTaken = initialHp - finalHp;
        
        session.addLog(m.getName() + " attaque et inflige " + damageTaken + " dégâts à " + p.getName() + " !");
        
        if (p.getHealthCurrent() <= 0) {
            session.setFinished(true);
            session.setPlayerWon(false);
            session.addLog(p.getName() + " a été vaincu...");
            return session;
        }
        
        session.setTurnNumber(session.getTurnNumber() + 1);
        return session;
    }
}
