package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.SpellAvailability;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.service.SpellService;
import generation.grimoire.service.PassiveDispatcher;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.event.CastingTypeAdjustEvent;
import generation.grimoire.event.CanCastCheckEvent;
import generation.grimoire.event.SpellCostAdjustEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
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
    private final EquipmentRepository equipmentRepository;
    private final SpellService spellService;
    private final PassiveDispatcher passiveDispatcher;
    
    // In-memory combat sessions
    private final Map<String, CombatSession> activeSessions = new ConcurrentHashMap<>();

    public CombatSession startCombat(@NonNull List<Long> characterIds, @NonNull Long dungeonId, String username) {
        if (characterIds.isEmpty()) throw new RuntimeException("Aucun personnage sélectionné");

        List<Personnage> players = new ArrayList<>();
        for (Long characterId : characterIds) {
            Personnage p = personnageRepository.findById(java.util.Objects.requireNonNull(characterId)).orElseThrow(() -> new RuntimeException("Personnage introuvable"));
            if (p.getUser() == null || !p.getUser().getUsername().equals(username)) {
                throw new RuntimeException("Non autorisé");
            }
            p.clearBuffs();
            p.setHealthCurrent(p.getTotalHealthMax());
            p.setManaCurrent(p.getTotalManaMax());
            players.add(p);
        }
        
        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));
        
        if (d.getSalles() == null || d.getSalles().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucune salle.");
        }
        
        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, d, players);
        
        handleRoomStart(session);
        
        activeSessions.put(sessionId, session);
        computeSpellAvailability(session);
        return session;
    }

    public CombatSession getSession(String sessionId) {
        return activeSessions.get(sessionId);
    }
    
    private void handleRoomStart(CombatSession session) {
        if (session.getCurrentRoom() == null) return;
        
        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.COMBAT) {
            session.addLog("Vous entrez dans une salle de combat ! Préparez-vous.");
            session.setTurnNumber(1);
            for (Personnage p : session.getPlayers()) {
                p.setBanalSpellCastThisTurn(false);
                p.setInstantSpellCastThisTurn(false);
            }
            rollInitiative(session);
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.TREASURE) {
            session.addLog("Vous trouvez un trésor !");
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT) {
            session.addLog("Événement : " + session.getCurrentRoom().getEventText());
        }
    }

    public CombatSession openChest(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.TREASURE) {
            throw new RuntimeException("Ce n'est pas une salle de trésor !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("Le coffre a déjà été ouvert.");
        }

        int gold = session.getCurrentRoom().getTreasureGold();
        int exp = session.getCurrentRoom().getTreasureExp();
        session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + gold);
        
        int expPerHero = exp / Math.max(1, session.getPlayers().size());
        for(Personnage p : session.getPlayers()) {
            p.setExperience(p.getExperience() + expPerHero);
            personnageRepository.save(p);
        }
        
        AppUser user = null;
        if (!session.getPlayers().isEmpty()) {
            user = session.getPlayers().get(0).getUser();
            if (user != null && gold > 0) {
                user.setMonnaie(user.getMonnaie() + gold);
                userRepository.save(user);
            }
        }
        
        session.addLog("Vous avez ouvert le coffre ! Vous trouvez " + gold + " Or et chaque héros gagne " + expPerHero + " XP.");

        // Loot table
        java.util.Random rnd = new java.util.Random();
        if (session.getCurrentRoom().getLootTable() != null && user != null) {
            for (LootEntry entry : session.getCurrentRoom().getLootTable()) {
                double roll = rnd.nextDouble() * 100.0;
                if (roll <= entry.getProbability() && entry.getEquipment() != null) {
                    Equipment template = entry.getEquipment();
                    
                    // Clone it
                    Equipment clone = new Equipment();
                    clone.setName(template.getName());
                    clone.setSlot(template.getSlot());
                    clone.setBonusHealthMax(template.getBonusHealthMax());
                    clone.setBonusManaMax(template.getBonusManaMax());
                    clone.setBonusPower(template.getBonusPower());
                    clone.setBonusStrength(template.getBonusStrength());
                    clone.setBonusArmor(template.getBonusArmor());
                    clone.setBonusResistance(template.getBonusResistance());
                    clone.setBonusSpeed(template.getBonusSpeed());
                    clone.setBonusCrit(template.getBonusCrit());
                    clone.setRegenHealthPerTurn(template.getRegenHealthPerTurn());
                    clone.setRegenManaPerTurn(template.getRegenManaPerTurn());
                    clone.setRarity(template.getRarity());
                    clone.setSpecialEffect(template.getSpecialEffect());
                    clone.setSpecialEffectValue(template.getSpecialEffectValue());
                    
                    clone.setShopTemplate(false);
                    clone.setUser(user);
                    clone.setOwnerUsername(user.getUsername());
                    
                    equipmentRepository.save(clone);
                    
                    session.addLog("Vous avez trouvé un objet : " + template.getName() + " !");
                }
            }
        }
        
        session.setRoomEventCompleted(true);
        return session;
    }
    public CombatSession acceptAlteration(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.EVENT || 
            session.getCurrentRoom().getEventSubType() != generation.grimoire.enumeration.EventSubType.ALTERATION) {
            throw new RuntimeException("Ce n'est pas une salle d'altération !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("L'événement a déjà été résolu.");
        }

        generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
        String altType = room.getAlterationType() != null ? room.getAlterationType() : "VIE_XP";
        
        if ("VIE_XP".equals(altType)) {
            int effect = room.getAlterationHpAmount();
            int expEffect = room.getAlterationExpAmount();
            for (Personnage p : session.getPlayers()) {
                if (p.getHealthCurrent() <= 0) continue;
                if (effect > 0) p.heal(effect);
                else if (effect < 0) p.takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);
                
                if (expEffect != 0) {
                    p.setExperience(p.getExperience() + expEffect);
                }
                
                if ("SPIRITUAL_XP".equals(room.getAlterationRewardType())) {
                    int spXp = room.getAlterationSpiritualXpReward();
                    if (spXp > 0) p.setSpiritualiteExperience(p.getSpiritualiteExperience() + spXp);
                }
                
                personnageRepository.save(p);
            }
            
            if (effect > 0) session.addLog("Vos héros sont soignés de " + effect + " PV.");
            else if (effect < 0) session.addLog("Vos héros subissent " + (-effect) + " dégâts !");
            
            if (expEffect > 0) session.addLog("Vos héros gagnent " + expEffect + " XP.");
            else if (expEffect < 0) session.addLog("Vos héros perdent " + (-expEffect) + " XP !");
            
            if ("SPIRITUAL_XP".equals(room.getAlterationRewardType()) && room.getAlterationSpiritualXpReward() > 0) {
                session.addLog("Vos héros reçoivent " + room.getAlterationSpiritualXpReward() + " XP de Spiritualité !");
            } else if ("SPECIAL_ITEM".equals(room.getAlterationRewardType())) {
                session.addLog("Vous recevez l'Item Spécial : " + room.getAlterationSpecialItemReward() + " (à venir) !");
            }
            
        } else if ("ITEM".equals(altType)) {
            int spXp = room.getAlterationSpiritualXpReward();
            for (Personnage p : session.getPlayers()) {
                if (p.getHealthCurrent() <= 0) continue;
                // TODO: Verify player has the item and remove it (alterationRequiredItem)
                if (spXp > 0) {
                    p.setSpiritualiteExperience(p.getSpiritualiteExperience() + spXp);
                    personnageRepository.save(p);
                }
            }
            session.addLog("Vous avez donné " + room.getAlterationRequiredItem() + " !");
            if (spXp > 0) {
                session.addLog("Vos héros reçoivent " + spXp + " XP de Spiritualité en échange !");
            }
        }
        
        session.setRoomEventCompleted(true);
        return session;
    }

    public CombatSession proceedToNextRoom(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished()) return session;
        
        // If current room was treasure or event, apply it now before moving
        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT && !session.isRoomEventCompleted()) {
            generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
            generation.grimoire.enumeration.EventSubType subType = room.getEventSubType();
            
            if (subType == generation.grimoire.enumeration.EventSubType.ALTERATION) {
                // If it's an alteration and we proceed without having accepted it, the player ignored it. We do nothing.
            } else if (subType == generation.grimoire.enumeration.EventSubType.PIEGE) {
                int effect = room.getTrapAmount();
                if ("PV".equals(room.getTrapType())) {
                    for (Personnage p : session.getPlayers()) {
                        if (p.getHealthCurrent() > 0 && effect > 0) p.takeDamage(effect, generation.grimoire.enumeration.DamageType.BRUT);
                    }
                    session.addLog("Vos héros subissent " + effect + " dégâts du piège !");
                } else if ("MANA".equals(room.getTrapType())) {
                    for (Personnage p : session.getPlayers()) {
                        if (p.getHealthCurrent() > 0 && effect > 0) p.setManaCurrent(Math.max(0, p.getManaCurrent() - effect));
                    }
                    session.addLog("Vos héros perdent " + effect + " de Mana à cause du piège !");
                }
            } else {
                // Generic fallback
                int effect = room.getEventEffectAmount();
                for (Personnage p : session.getPlayers()) {
                    if (p.getHealthCurrent() <= 0) continue;
                    if (effect > 0) {
                        p.heal(effect);
                    } else if (effect < 0) {
                        p.takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);
                    }
                }
                if (effect > 0) session.addLog("Vos héros sont soignés de " + effect + " PV.");
                else if (effect < 0) session.addLog("Vos héros subissent " + (-effect) + " dégâts !");
            }
        }
        session.loadRoom(session.getCurrentRoomIndex() + 1);
        handleRoomStart(session);
        
        if (session.isFinished()) {
            session.addLog("Félicitations, vous avez terminé le donjon !");
            if (!session.getPlayers().isEmpty()) {
                generation.grimoire.entity.auth.AppUser user = session.getPlayers().get(0).getUser();
                if (user != null) {
                    // Les golds sont déjà ajoutés à la volée pendant checkDeaths, 
                    // mais pour les coffres au trésor, on ne les avait pas encore sauvegardés
                    // Sauf si on le fait aussi pour les coffres ! On va juste sauvegarder.
                    userRepository.save(user);
                }
                for (Personnage p : session.getPlayers()) {
                    personnageRepository.save(java.util.Objects.requireNonNull(p));
                }
            }
        }
        
        computeSpellAvailability(session);
        return session;
    }

    public CombatSession executeAction(String sessionId, Long spellId, Integer targetIndex, Integer allyTargetIndex, Integer choiceKey) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null) throw new RuntimeException("Session introuvable");
        if (session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }
        
        Personnage p = session.getActivePlayer();
        if (p == null) return session;
        
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
                
                Personnage allyTarget = p; // default
                if (targetsAlly) {
                    if (allyTargetIndex != null && allyTargetIndex >= 0 && allyTargetIndex < session.getPlayers().size()) {
                        allyTarget = session.getPlayers().get(allyTargetIndex);
                    } else {
                        // Find first valid ally other than caster
                        for (Personnage pl : session.getPlayers()) {
                            if (pl.getHealthCurrent() > 0 && pl != p) {
                                allyTarget = pl;
                                break;
                            }
                        }
                    }
                }
                
                List<Personnage> allEnemies = session.getEnemies().stream().map(generation.grimoire.model.pve.ActiveMonster::getAsPersonnage).toList();
                List<Personnage> allAllies = session.getPlayers().stream().filter(pl -> pl.getHealthCurrent() > 0).toList();
                
                final Personnage finalTarget = target;
                final Personnage finalAlly = allyTarget;
                session.addLog(p.getName() + " lance " + spellToCast.getNom() + " !");
                captureLogs(session, () -> {
                    spellService.castSpellGroup(spellToCast, p, finalTarget, finalAlly, allAllies, allEnemies, choiceKey);
                });
            }
        } else if (targetIndex != null && targetIndex >= 0 && targetIndex < session.getEnemies().size()) {
            if (p.isBanalSpellCastThisTurn()) {
                 session.addLog(p.getName() + " a déjà effectué une action majeure (sort banal ou attaque) ce tour-ci.");
                 computeSpellAvailability(session);
                 return session; // don't do attack
            }
            generation.grimoire.model.pve.ActiveMonster targetMonster = session.getEnemies().get(targetIndex);
            if (!targetMonster.isDead()) {
                p.setBanalSpellCastThisTurn(true);
                captureLogs(session, () -> {
                    int playerDmg = p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH);
                    int damageDone = Math.max(1, playerDmg - targetMonster.getBase().getArmor());
                    System.out.println(p.getName() + " attaque " + targetMonster.getBase().getName() + " et inflige " + damageDone + " dégâts !");
                    targetMonster.takeDamage(damageDone);
                });
            }
        }
        
        checkDeaths(session);
        
        computeSpellAvailability(session);
        return session;
    }

    private void checkDeaths(CombatSession session) {
        boolean allDeadBefore = session.areAllEnemiesDead();
        int xpDrop = 0;
        int goldDrop = 0;
        // Check dead enemies
        for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
            if (m.isDead() && m.getCurrentHp() <= 0 && m.getMaxHp() > 0) {
                // We set maxHp to 0 to prevent re-awarding exp/gold next turn, hacky but works for now
                m.setMaxHp(0); 
                session.addLog(m.getBase().getName() + " est mort !");
                xpDrop += m.getBase().getRewardExp();
                goldDrop += m.getBase().getRewardGold();
            }
        }
        
        if (xpDrop > 0 || goldDrop > 0) {
            session.setTotalExpAccumulated(session.getTotalExpAccumulated() + xpDrop);
            session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + goldDrop);
            
            int expPerHero = xpDrop / Math.max(1, session.getPlayers().size());
            for (Personnage p : session.getPlayers()) {
                p.setExperience(p.getExperience() + expPerHero);
                personnageRepository.save(p);
            }
            if (goldDrop > 0 && !session.getPlayers().isEmpty()) {
                generation.grimoire.entity.auth.AppUser user = session.getPlayers().get(0).getUser();
                if (user != null) {
                    user.setMonnaie(user.getMonnaie() + goldDrop);
                    userRepository.save(user);
                }
                session.addLog("Les monstres vaincus ont lâché " + goldDrop + " Or. Chaque héros reçoit " + expPerHero + " XP.");
            } else {
                session.addLog("Chaque héros reçoit " + expPerHero + " XP.");
            }
        }
        
        if (!allDeadBefore && session.areAllEnemiesDead()) {
            session.addLog("Combat terminé, vous avez vaincu tous les monstres !");
        }
    }

    public CombatSession endTurn(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null) throw new RuntimeException("Session introuvable");
        if (session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }
        
        Personnage p = session.getActivePlayer();
        
        if (p != null) {
            p.setBanalSpellCastThisTurn(false);
            p.setInstantSpellCastThisTurn(false);
            captureLogs(session, () -> {
                if (p.getRemainingChannelingTurns() > 0) {
                    Personnage channelingTarget = p.getChannelingTarget();
                    if (channelingTarget == null && !session.getEnemies().isEmpty()) {
                        channelingTarget = session.getEnemies().get(0).getAsPersonnage();
                    }
                    spellService.tickChanneling(p, channelingTarget, p.getChannelingChoiceKey());
                }
            });
        }
        session.advanceTurnIndex();
        advanceToNextLiveTurn(session);
        
        if (session.isRoundFinished() && !session.areAllEnemiesDead() && !session.areAllPlayersDead()) {
            session.setTurnNumber(session.getTurnNumber() + 1);
            rollInitiative(session);
        }
        
        computeSpellAvailability(session);
        return session;
    }

    public CombatSession processNextAutoTurn(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished()) return session;
        
        if (session.isRoundFinished()) {
            if (!session.areAllEnemiesDead() && !session.areAllPlayersDead()) {
                session.setTurnNumber(session.getTurnNumber() + 1);
                rollInitiative(session);
            }
            computeSpellAvailability(session);
            return session;
        }

        generation.grimoire.model.pve.InitiativeEntry current = session.getTurnOrder().get(session.getCurrentTurnIndex());
        
        // Safety: if the current turn is a player, we shouldn't auto-process! We just return.
        if (current.isPlayer()) {
            computeSpellAvailability(session);
            return session;
        }

        generation.grimoire.model.pve.ActiveMonster m = session.getEnemies().get(current.getIndex());
        if (!m.isDead()) {
            captureLogs(session, () -> {
                session.addLog("--- Tour de l'ennemi " + m.getBase().getName() + " ---");
                spellService.startTurn(m.getAsPersonnage());
                
                if (!m.isDead()) {
                    Personnage mp = m.getAsPersonnage();
                    if (mp.getRemainingChannelingTurns() > 0) {
                        Personnage cTarget = mp.getChannelingTarget();
                        if (cTarget == null && !session.getPlayers().isEmpty()) {
                            cTarget = session.getPlayers().get(0);
                        }
                        spellService.tickChanneling(mp, cTarget, mp.getChannelingChoiceKey());
                    } else {
                        List<Personnage> alivePlayers = session.getPlayers().stream().filter(pl -> pl.getHealthCurrent() > 0).toList();
                        if (!alivePlayers.isEmpty()) {
                            Personnage targetPlayer = alivePlayers.get(new java.util.Random().nextInt(alivePlayers.size()));
                            int monsterDmg = m.getBase().getStrength();
                            System.out.println(m.getBase().getName() + " attaque " + targetPlayer.getName() + " et inflige " + monsterDmg + " dégâts.");
                            targetPlayer.takeDamage(monsterDmg, generation.grimoire.enumeration.DamageType.PHYSIC);
                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a été vaincu...");
                            }
                        }
                    }
                } else {
                    session.addLog(m.getBase().getName() + " a succombé à ses blessures avant de pouvoir attaquer !");
                }
                checkDeaths(session);
            });
        }
        
        session.advanceTurnIndex();
        advanceToNextLiveTurn(session);
        
        if (session.areAllPlayersDead()) {
            session.setFinished(true);
            session.setPlayerWon(false);
            session.addLog("Toute l'équipe a été vaincue...");
        } else if (session.isRoundFinished() && !session.areAllEnemiesDead()) {
            session.setTurnNumber(session.getTurnNumber() + 1);
            rollInitiative(session);
        }
        
        computeSpellAvailability(session);
        return session;
    }

    private void rollInitiative(CombatSession session) {
        session.getTurnOrder().clear();
        session.setCurrentTurnIndex(0);
        java.util.Random rnd = new java.util.Random();
        
        for (int i = 0; i < session.getPlayers().size(); i++) {
            Personnage p = session.getPlayers().get(i);
            if (p.getHealthCurrent() > 0) {
                int speed = p.getEffectiveStat(generation.grimoire.enumeration.StatType.SPEED);
                int score = calculateInitiativeScore(speed, rnd);
                session.getTurnOrder().add(new generation.grimoire.model.pve.InitiativeEntry(true, i, score, speed, rnd.nextInt(100)));
            }
        }
        
        for (int i = 0; i < session.getEnemies().size(); i++) {
            generation.grimoire.model.pve.ActiveMonster m = session.getEnemies().get(i);
            if (!m.isDead()) {
                int speed = m.getBase().getSpeed();
                int score = calculateInitiativeScore(speed, rnd);
                session.getTurnOrder().add(new generation.grimoire.model.pve.InitiativeEntry(false, i, score, speed, rnd.nextInt(100)));
            }
        }
        
        session.getTurnOrder().sort((a, b) -> {
            if (a.getInitiativeScore() != b.getInitiativeScore()) {
                return Integer.compare(b.getInitiativeScore(), a.getInitiativeScore());
            }
            if (a.getSpeedStat() != b.getSpeedStat()) {
                return Integer.compare(b.getSpeedStat(), a.getSpeedStat());
            }
            return Integer.compare(b.getTieBreakerRoll(), a.getTieBreakerRoll());
        });
        
        session.addLog("--- NOUVEAU ROUND (Tour " + session.getTurnNumber() + ") ---");
        for (generation.grimoire.model.pve.InitiativeEntry e : session.getTurnOrder()) {
            String name = e.isPlayer() ? session.getPlayers().get(e.getIndex()).getName() : session.getEnemies().get(e.getIndex()).getBase().getName();
            session.addLog(name + " | Init: " + e.getInitiativeScore() + " (Vitesse: " + e.getSpeedStat() + ")");
        }
        
        advanceToNextLiveTurn(session);
    }
    
    private void advanceToNextLiveTurn(CombatSession session) {
        // Process dead entities and start player turn
        while (!session.isRoundFinished()) {
            generation.grimoire.model.pve.InitiativeEntry current = session.getTurnOrder().get(session.getCurrentTurnIndex());
            if (current.isPlayer() && session.getPlayers().get(current.getIndex()).getHealthCurrent() <= 0) {
                session.advanceTurnIndex();
            } else if (!current.isPlayer() && session.getEnemies().get(current.getIndex()).isDead()) {
                session.advanceTurnIndex();
            } else if (current.isPlayer()) {
                // It's a live player! Let's start their turn.
                Personnage p = session.getPlayers().get(current.getIndex());
                session.addLog("--- Tour de " + p.getName() + " ---");
                captureLogs(session, () -> {
                    spellService.startTurn(p);
                });
                
                if (p.getHealthCurrent() <= 0) {
                    session.addLog(p.getName() + " a succombé à ses blessures avant de pouvoir agir.");
                    session.advanceTurnIndex();
                    continue; // Skip this turn and check the next one
                }
                break;
            } else {
                // It's a live monster! Stop here, the frontend will call auto-turn
                break;
            }
        }
    }
    
    private int calculateInitiativeScore(int speed, java.util.Random rnd) {
        int baseRoll = rnd.nextInt(10) + 1;
        int flatBonus = Math.max(0, Math.min(speed, 5));
        int extraRoll = 0;
        if (speed > 5) {
            extraRoll = rnd.nextInt(speed - 5) + 1;
        }
        return baseRoll + flatBonus + extraRoll;
    }

    /**
     * Calcule la disponibilité de chaque sort pour le joueur à l'état actuel du combat.
     * Reproduit la logique de validation de SpellService.castSpellGroup() en mode lecture seule.
     */
    private void computeSpellAvailability(CombatSession session) {
        if (session.isFinished()) return;
        List<generation.grimoire.model.pve.SpellAvailability> avails = new ArrayList<>();
        Personnage p = session.getActivePlayer();
        
        if (p == null) {
            session.setAvailableSpells(new ArrayList<>());
            session.setSpellAvailability(avails);
            return;
        }

        // Update the list of available spells for this active player
        List<Spell> validSpells = new ArrayList<>();
        for (Spell s : spellRepository.findAll()) {
            if (p.canCast(s) == null) {
                validSpells.add(s);
            }
        }
        session.setAvailableSpells(validSpells);

        java.io.PrintStream originalOut = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.OutputStream() {
                public void write(int b) {}
            }));
            
            for (Spell spell : session.getAvailableSpells()) {
                SpellAvailability avail = checkSpellAvailability(spell, p);
                avails.add(avail);
            }
        } finally {
            System.setOut(originalOut);
        }

        session.setSpellAvailability(avails);
    }

    private SpellAvailability checkSpellAvailability(Spell spell, Personnage p) {
        String canCastError = p.canCast(spell);
        if (canCastError != null) {
            return SpellAvailability.blocked(spell.getId(), "CONDITION", canCastError);
        }

        // 1) Déterminer le type de casting effectif (avec passif Création)
        SpellCastingType cType = spell.getCastingType();
        if (cType == null) cType = SpellCastingType.BANAL;

        // Simuler CastingTypeAdjustEvent (Création: banal → instantané si 1er sort)
        CastingTypeAdjustEvent castingEvent = new CastingTypeAdjustEvent(p, p, spell, cType);
        passiveDispatcher.dispatch(p, spell, castingEvent);
        cType = castingEvent.getCurrentType();

        // 2) Vérifications des limites d'action du tour
        // Rule A: Si canalisation en cours
        if (p.getRemainingChannelingTurns() > 0) {
            if (cType != SpellCastingType.INSTANTANE) {
                return SpellAvailability.blocked(spell.getId(), "CHANNELING",
                        "Canalisation en cours : seuls les sorts instantanés sont autorisés");
            }
            if (!p.isAllowInstantDuringCurrentChanneling()) {
                return SpellAvailability.blocked(spell.getId(), "CHANNELING",
                        "Cette canalisation interdit les sorts instantanés");
            }
        }

        // Rule B: Si un sort banal ou une attaque a déjà été lancé ce tour
        if (p.isBanalSpellCastThisTurn()) {
            return SpellAvailability.blocked(spell.getId(), "ACTION_LIMIT",
                    "Action majeure déjà effectuée ce tour (les sorts instantanés doivent être lancés avant)");
        }

        // Rule C: Si un sort instantané a déjà été lancé ce tour
        if (cType == SpellCastingType.INSTANTANE && p.isInstantSpellCastThisTurn()) {
            return SpellAvailability.blocked(spell.getId(), "ACTION_LIMIT",
                    "Sort instantané déjà lancé ce tour");
        }

        // 3) Vérification des conditions de spiritualité (Esprit, Ténèbres, Karma)
        CanCastCheckEvent canCastEvent = new CanCastCheckEvent(p, p, spell);
        passiveDispatcher.dispatch(p, spell, canCastEvent);
        if (!canCastEvent.isAllowed()) {
            return SpellAvailability.blocked(spell.getId(), "CONDITION",
                    getConditionTooltip(p, spell));
        }

        // 4) Calcul des coûts ajustés (passifs Création, Consolidation, Destruction, Karma Harmonie)
        int actualManaCost = spell.getManaCost();
        if (spell.getPercentManaCost() > 0) {
            double manaBase = generation.grimoire.utils.StatCalculator.getSourceValue(
                    spell.getPercentManaCostSource() != null ? spell.getPercentManaCostSource()
                            : generation.grimoire.enumeration.Source.CASTER_MANA_MAX, p, p);
            actualManaCost += (int) (manaBase * spell.getPercentManaCost() / 100);
        }
        int actualHealCost = spell.getHealCost();
        if (spell.getPercentHealCost() > 0) {
            double healBase = generation.grimoire.utils.StatCalculator.getSourceValue(
                    spell.getPercentHealCostSource() != null ? spell.getPercentHealCostSource()
                            : generation.grimoire.enumeration.Source.CASTER_HEALTH_MAX, p, p);
            actualHealCost += (int) (healBase * spell.getPercentHealCost() / 100);
        }
        int actualHeatCost = spell.getHeatCost();
        if (spell.getPercentHeatCost() > 0) {
            actualHeatCost += (int) (100.0 * spell.getPercentHeatCost() / 100.0);
        }

        // Ajustement des coûts via les passifs (Création, Consolidation, Destruction, Karma)
        int[] costs = { actualManaCost, actualHealCost, actualHeatCost };
        SpellCostAdjustEvent costEvent = new SpellCostAdjustEvent(p, p, spell, costs);
        passiveDispatcher.dispatch(p, spell, costEvent);
        actualManaCost = costs[0];
        actualHealCost = costs[1];
        actualHeatCost = costs.length > 2 ? costs[2] : actualHeatCost;

        // 5) Vérification des ressources
        if (p.getManaCurrent() < actualManaCost) {
            return SpellAvailability.blocked(spell.getId(), "RESOURCE",
                    "Mana insuffisant (" + p.getManaCurrent() + "/" + actualManaCost + ")");
        }
        if (p.getHealthCurrent() < actualHealCost) {
            return SpellAvailability.blocked(spell.getId(), "RESOURCE",
                    "PV insuffisants (" + p.getHealthCurrent() + "/" + actualHealCost + ")");
        }
        int currentHeat = p.getPassiveState("destruction_heat", 0);
        if (currentHeat < actualHeatCost) {
            return SpellAvailability.blocked(spell.getId(), "RESOURCE",
                    "Chaleur insuffisante (" + currentHeat + "/" + actualHeatCost + ")");
        }

        return SpellAvailability.available(spell.getId());
    }

    /**
     * Génère un tooltip explicatif pour les conditions de spiritualité bloquantes.
     */
    private String getConditionTooltip(Personnage p, Spell spell) {
        if (p.getSpiritualite() != null && p.getSpiritualite().getNom() != null) {
            String spiritName = p.getSpiritualite().getNom().toLowerCase();
            if (spiritName.contains("esprit")) {
                return "Condition Esprit non remplie (≥ 20% PV ET Mana requis)";
            }
            if (spiritName.contains("ténèbres") || spiritName.contains("tenebres")) {
                return "Condition Ténèbres non remplie (≤ 80% PV ou Mana requis)";
            }
            if (spiritName.contains("karma")) {
                if (p.getPassiveState("karma_locked", 0) == 1) {
                    return "Karma verrouillé (corruption ou illumination)";
                }
            }
        }
        return "Condition de lancement non remplie";
    }

    private interface ActionBlock {
        void execute();
    }

    private void captureLogs(CombatSession session, ActionBlock block) {
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream originalOut = System.out;
        try {
            java.io.PrintStream ps = new java.io.PrintStream(baos, true, java.nio.charset.StandardCharsets.UTF_8);
            System.setOut(ps);
            block.execute();
            ps.flush();
        } catch (Exception e) {
            session.addLog("❌ Erreur interne : " + e.getMessage());
        } finally {
            System.setOut(originalOut);
        }
        
        String capturedLogs = baos.toString(java.nio.charset.StandardCharsets.UTF_8);
        for (String line : capturedLogs.split("\n")) {
            if (!line.trim().isEmpty()) {
                session.addLog(line.trim());
            }
        }
    }
}
