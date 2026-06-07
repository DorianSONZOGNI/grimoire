package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.service.SpellService;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.auth.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class CombatService {

    private final PersonnageRepository personnageRepository;
    private final DonjonRepository donjonRepository;
    private final UserRepository userRepository;
    private final SpellRepository spellRepository;
    private final SpellService spellService;
    
    // In-memory combat sessions
    private final Map<String, CombatSession> activeSessions = new ConcurrentHashMap<>();

    public CombatSession startCombat(Long characterId, Long dungeonId, String username) {
        Personnage p = personnageRepository.findById(characterId).orElseThrow(() -> new RuntimeException("Personnage introuvable"));
        
        if (p.getUser() == null || !p.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Non autorisé");
        }
        
        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));
        
        if (d.getSalles() == null || d.getSalles().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucune salle.");
        }
        
        p.setHealthCurrent(p.getHealthMax());
        p.setManaCurrent(p.getManaMax());
        p.clearBuffs();
        
        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, d, p);
        
        List<Spell> validSpells = new ArrayList<>();
        for (Spell s : spellRepository.findAll()) {
            if (p.canCast(s) == null) {
                validSpells.add(s);
            }
        }
        session.setAvailableSpells(validSpells);
        
        handleRoomStart(session);
        
        activeSessions.put(sessionId, session);
        return session;
    }

    public CombatSession getSession(String sessionId) {
        return activeSessions.get(sessionId);
    }
    
    private void handleRoomStart(CombatSession session) {
        if (session.getCurrentRoom() == null) return;
        
        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.COMBAT) {
            session.addLog("Vous entrez dans une salle de combat ! Préparez-vous.");
            spellService.startTurn(session.getPlayer());
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.TREASURE) {
            session.addLog("Vous trouvez un trésor !");
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT) {
            session.addLog("Événement : " + session.getCurrentRoom().getEventText());
        }
    }

    public CombatSession proceedToNextRoom(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished()) return session;
        
        // If current room was treasure or event, apply it now before moving
        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.TREASURE) {
            int gold = session.getCurrentRoom().getTreasureGold();
            int exp = session.getCurrentRoom().getTreasureExp();
            session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + gold);
            session.setTotalExpAccumulated(session.getTotalExpAccumulated() + exp);
            session.addLog("Vous avez ramassé " + gold + " Or et " + exp + " XP.");
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT) {
            int effect = session.getCurrentRoom().getEventEffectAmount();
            if (effect > 0) {
                session.getPlayer().heal(effect);
                session.addLog("Vous êtes soigné de " + effect + " PV.");
            } else if (effect < 0) {
                session.getPlayer().takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);
                session.addLog("Vous subissez " + (-effect) + " dégâts !");
            }
        }
        session.loadRoom(session.getCurrentRoomIndex() + 1);
        handleRoomStart(session);
        
        if (session.isFinished()) {
            session.addLog("Félicitations, vous avez terminé le donjon !");
            Personnage p = session.getPlayer();
            AppUser user = p.getUser();
            if (user != null) {
                user.setMonnaie(user.getMonnaie() + session.getTotalGoldAccumulated());
                userRepository.save(user);
            }
            personnageRepository.save(p);
        }
        
        return session;
    }

    public CombatSession executeTurn(String sessionId, Long spellId, Integer targetIndex, Integer choiceKey) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null) throw new RuntimeException("Session introuvable");
        if (session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }
        
        Personnage p = session.getPlayer();
        session.addLog("--- TOUR " + session.getTurnNumber() + " ---");
        
        // Player Action
        if (spellId != null) {
            Spell spellToCast = spellRepository.findById(spellId).orElse(null);
            if (spellToCast != null) {
                // Find target
                Personnage target = null;
                boolean targetsEnemy = spellToCast.getEffects().stream().anyMatch(e -> e.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.TARGET);
                boolean targetsAlly = spellToCast.getEffects().stream().anyMatch(e -> e.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.ALLY);
                
                if (targetsEnemy && targetIndex != null && targetIndex >= 0 && targetIndex < session.getEnemies().size()) {
                    target = session.getEnemies().get(targetIndex).getAsPersonnage();
                } else if (targetsAlly) {
                    target = p; // In PvE, ally is usually the player themselves if no companions
                } else {
                    target = p; // Default fallback, spellService logic resolves ALL_ENEMIES etc anyway
                }
                
                List<Personnage> allEnemies = session.getEnemies().stream().map(generation.grimoire.model.pve.ActiveMonster::getAsPersonnage).toList();
                List<Personnage> allAllies = List.of(p);
                
                spellService.castSpellGroup(spellToCast, p, target, p, allAllies, allEnemies, choiceKey);
                session.addLog(p.getName() + " lance " + spellToCast.getNom() + " !");
            }
        } else if (targetIndex != null && targetIndex >= 0 && targetIndex < session.getEnemies().size()) {
            generation.grimoire.model.pve.ActiveMonster targetMonster = session.getEnemies().get(targetIndex);
            if (!targetMonster.isDead()) {
                int playerDmg = p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH);
                int damageDone = Math.max(1, playerDmg - targetMonster.getBase().getArmor());
                targetMonster.takeDamage(damageDone);
                session.addLog(p.getName() + " attaque " + targetMonster.getBase().getName() + " et inflige " + damageDone + " dégâts !");
            }
        }
        
        // Check dead enemies
        for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
            if (m.isDead() && m.getCurrentHp() == 0 && m.getMaxHp() > 0) {
                // We set maxHp to 0 to prevent re-awarding exp/gold next turn, hacky but works for now
                m.setMaxHp(0); 
                session.addLog(m.getBase().getName() + " est mort !");
                session.setTotalExpAccumulated(session.getTotalExpAccumulated() + m.getBase().getRewardExp());
                session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + m.getBase().getRewardGold());
            }
        }
        
        if (session.areAllEnemiesDead()) {
            session.addLog("Combat terminé, vous avez vaincu tous les monstres !");
            return session;
        }
        
        // Monsters turn
        for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
            if (!m.isDead()) {
                int monsterDmg = m.getBase().getStrength();
                int initialHp = p.getHealthCurrent();
                p.takeDamage(monsterDmg, generation.grimoire.enumeration.DamageType.PHYSIC);
                int finalHp = p.getHealthCurrent();
                int damageTaken = initialHp - finalHp;
                session.addLog(m.getBase().getName() + " vous attaque et inflige " + damageTaken + " dégâts !");
                
                if (p.getHealthCurrent() <= 0) {
                    session.setFinished(true);
                    session.setPlayerWon(false);
                    session.addLog(p.getName() + " a été vaincu...");
                    return session;
                }
            }
        }
        // Start next turn for everyone (ticks DoTs/HoTs)
        spellService.startTurn(p);
        for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
            if (!m.isDead()) {
                spellService.startTurn(m.getAsPersonnage());
            }
        }
        
        if (p.getHealthCurrent() <= 0) {
            session.setFinished(true);
            session.setPlayerWon(false);
            session.addLog("Vous êtes tombé au combat (effets de début de tour).");
            return session;
        }

        session.setTurnNumber(session.getTurnNumber() + 1);
        return session;
    }
}
