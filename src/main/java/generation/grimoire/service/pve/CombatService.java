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
import generation.grimoire.service.SpellService;
import generation.grimoire.service.PassiveDispatcher;
import generation.grimoire.entity.Spell;
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
    private final SpellService spellService;
    private final PassiveDispatcher passiveDispatcher;
    
    // In-memory combat sessions
    private final Map<String, CombatSession> activeSessions = new ConcurrentHashMap<>();

    public CombatSession startCombat(@NonNull Long characterId, @NonNull Long dungeonId, String username) {
        Personnage p = personnageRepository.findById(characterId).orElseThrow(() -> new RuntimeException("Personnage introuvable"));
        
        if (p.getUser() == null || !p.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Non autorisé");
        }
        
        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));
        
        if (d.getSalles() == null || d.getSalles().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucune salle.");
        }
        
        p.clearBuffs();
        p.setHealthCurrent(p.getTotalHealthMax());
        p.setManaCurrent(p.getTotalManaMax());
        
        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, d, p);
        
        List<Spell> validSpells = new ArrayList<>();
        System.out.println("DEBUG COMBAT START - Player: " + p.getName() + ", Voie: " + (p.getVoie() != null ? p.getVoie().getId() : "null") + ", Spirit: " + (p.getSpiritualite() != null ? p.getSpiritualite().getId() : "null"));
        for (Spell s : spellRepository.findAll()) {
            String castError = p.canCast(s);
            System.out.println("DEBUG SPELL: " + s.getNom() + ", S.Voie: " + (s.getVoie() != null ? s.getVoie().getId() : "null") + ", S.Spirit: " + (s.getSpiritualite() != null ? s.getSpiritualite().getId() : "null") + ", canCast=" + castError);
            if (castError == null) {
                validSpells.add(s);
            }
        }
        session.setAvailableSpells(validSpells);
        
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
        
        computeSpellAvailability(session);
        return session;
    }

    public CombatSession executeAction(String sessionId, Long spellId, Integer targetIndex, Integer choiceKey) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null) throw new RuntimeException("Session introuvable");
        if (session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }
        
        Personnage p = session.getPlayer();
        
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
                
                final Personnage finalTarget = target;
                session.addLog(p.getName() + " lance " + spellToCast.getNom() + " !");
                captureLogs(session, () -> {
                    spellService.castSpellGroup(spellToCast, p, finalTarget, p, allAllies, allEnemies, choiceKey);
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
        }
        
        computeSpellAvailability(session);
        return session;
    }

    public CombatSession endTurn(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null) throw new RuntimeException("Session introuvable");
        if (session.isFinished()) return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }
        
        Personnage p = session.getPlayer();
        session.addLog("--- FIN DU TOUR " + session.getTurnNumber() + " ---");
        
        // Monsters turn
        captureLogs(session, () -> {
            for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
                if (!m.isDead() && p.getHealthCurrent() > 0) {
                    int monsterDmg = m.getBase().getStrength();
                    int initialHp = p.getHealthCurrent();
                    System.out.println(m.getBase().getName() + " vous attaque et inflige " + monsterDmg + " dégâts physiques initiaux.");
                    p.takeDamage(monsterDmg, generation.grimoire.enumeration.DamageType.PHYSIC);
                    
                    if (p.getHealthCurrent() <= 0) {
                        session.setFinished(true);
                        session.setPlayerWon(false);
                        System.out.println(p.getName() + " a été vaincu...");
                    }
                }
            }
        });
        
        if (session.isFinished()) {
            computeSpellAvailability(session);
            return session;
        }
        // Start next turn for everyone (ticks DoTs/HoTs)
        captureLogs(session, () -> {
            if (p.getRemainingChannelingTurns() > 0) {
                Personnage channelingTarget = p.getChannelingTarget();
                if (channelingTarget == null && !session.getEnemies().isEmpty()) {
                    channelingTarget = session.getEnemies().get(0).getAsPersonnage();
                }
                spellService.tickChanneling(p, channelingTarget, p.getChannelingChoiceKey());
            }

            spellService.startTurn(p);
            for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
                if (!m.isDead()) {
                    spellService.startTurn(m.getAsPersonnage());
                }
            }
        });
        
        if (p.getHealthCurrent() <= 0) {
            session.setFinished(true);
            session.setPlayerWon(false);
            session.addLog("Vous êtes tombé au combat (effets de début de tour).");
            computeSpellAvailability(session);
            return session;
        }

        session.setTurnNumber(session.getTurnNumber() + 1);
        session.addLog("--- TOUR " + session.getTurnNumber() + " ---");
        computeSpellAvailability(session);
        return session;
    }

    /**
     * Calcule la disponibilité de chaque sort pour le joueur à l'état actuel du combat.
     * Reproduit la logique de validation de SpellService.castSpellGroup() en mode lecture seule.
     */
    private void computeSpellAvailability(CombatSession session) {
        List<SpellAvailability> result = new ArrayList<>();
        Personnage p = session.getPlayer();

        // Rendre System.out silencieux pendant ce calcul pour éviter le spam des passifs
        java.io.PrintStream originalOut = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.OutputStream() {
                public void write(int b) {}
            }));
            
            for (Spell spell : session.getAvailableSpells()) {
                SpellAvailability avail = checkSpellAvailability(spell, p);
                result.add(avail);
            }
        } finally {
            System.setOut(originalOut);
        }

        session.setSpellAvailability(result);
    }

    private SpellAvailability checkSpellAvailability(Spell spell, Personnage p) {
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
