package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.EquipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Façade publique du système de combat PvE.
 * <p>
 * Gère le cycle de vie des sessions (ConcurrentHashMap en mémoire)
 * et délègue la logique métier aux sous-services :
 * <ul>
 *     <li>{@link CombatRoomService} — interactions salles (coffre, altération, marchand, porte étrange)</li>
 *     <li>{@link CombatTurnService} — tours, initiative, IA monstres, mort, fuite</li>
 *     <li>{@link CombatActionService} — exécution actions joueur</li>
 *     <li>{@link SpellAvailabilityService} — calcul disponibilité sorts</li>
 * </ul>
 * L'API publique (signatures de méthodes) est inchangée pour les appelants
 * (CombatController, MultiCombatService, CombatInterceptor, CombatTimeoutScheduler).
 */
@Service
@Transactional
@RequiredArgsConstructor
public class CombatService {

    private final PersonnageRepository personnageRepository;
    private final DonjonRepository donjonRepository;
    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;

    // Sub-services
    private final CombatRoomService combatRoomService;
    private final CombatTurnService combatTurnService;
    private final CombatActionService combatActionService;
    private final SpellAvailabilityService spellAvailabilityService;

    // Injected lazily to avoid circular dependency with MultiCombatService
    @Setter
    @Autowired(required = false)
    private CombatEventEmitter combatEventEmitter;

    // In-memory combat sessions
    private final Map<String, CombatSession> activeSessions = new ConcurrentHashMap<>();

    // ═══════════════════════════════════════════════════════════════════════
    // Session lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    public CombatSession startCombat(@NonNull List<Long> characterIds, @NonNull Long dungeonId,
            List<Long> consumableIds, String username) {
        if (characterIds.isEmpty())
            throw new RuntimeException("Aucun personnage sélectionné");

        List<Personnage> players = new ArrayList<>();
        java.util.Set<Long> usedVoies = new java.util.HashSet<>();
        for (Long characterId : characterIds) {
            Personnage p = personnageRepository.findById(java.util.Objects.requireNonNull(characterId))
                    .orElseThrow(() -> new RuntimeException("Personnage introuvable"));
            if (p.getUser() == null || !p.getUser().getUsername().equals(username)) {
                throw new RuntimeException("Non autorisé");
            }
            if (p.getVoie() != null && p.getVoie().getId() != null) {
                if (!usedVoies.add(p.getVoie().getId())) {
                    throw new RuntimeException("Vous ne pouvez pas jouer deux fois la même voie (" + p.getVoie().getNom() + ") dans le même donjon.");
                }
            }
            p.clearBuffs();
            p.setUsedCheatDeath(false);
            p.setHealthCurrent(p.getTotalHealthMax());
            p.setManaCurrent(p.getTotalManaMax());

            // Force initialization of equipments
            if (p.getEquipments() != null) {
                p.getEquipments().size();
            }

            players.add(p);
        }

        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));

        AppUser account = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Check required secret
        if (d.getRequiredSecret() != null && !d.getRequiredSecret().trim().isEmpty()) {
            if (!account.getUnlockedSecrets().containsKey(d.getRequiredSecret())) {
                throw new RuntimeException("Vous n'avez pas débloqué le secret requis pour ce donjon.");
            }
        }

        // Check unlock cost
        if (d.getUnlockCostGold() > 0 && !account.getUnlockedDungeons().contains(d.getId())) {
            throw new RuntimeException("Ce donjon doit être débloqué avant d'y entrer.");
        }

        // Check and deduct entry cost
        if (d.getEntryCostGold() > 0) {
            if (account.getMonnaie() < d.getEntryCostGold()) {
                throw new RuntimeException(
                        "Pas assez d'or pour entrer dans ce donjon (Requis : " + d.getEntryCostGold() + " Or).");
            }
            account.setMonnaie(account.getMonnaie() - d.getEntryCostGold());
            userRepository.save(account);
        }

        if (d.getSalles() == null || d.getSalles().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucune salle.");
        }

        // Validate character level
        for (Personnage p : players) {
            if (p.getVoieLevel() < d.getRecommendedLevel()) {
                throw new RuntimeException("Le personnage " + p.getName() + " (Niv." + p.getVoieLevel()
                        + ") n'a pas le niveau requis (" + d.getRecommendedLevel() + ") pour ce donjon.");
            }
        }

        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, d, players);
        session.setFirstClear(!account.getCompletedDungeons().contains(d.getId()));

        if (consumableIds != null && !consumableIds.isEmpty()) {
            for (Long cid : consumableIds) {
                if (cid != null) {
                    equipmentRepository.findById(cid).ifPresent(eq -> {
                        String ownerStr = eq.getOwnerUsername();
                        if (ownerStr == null && eq.getUser() != null) {
                            ownerStr = eq.getUser().getUsername();
                        }
                        if (ownerStr != null && ownerStr.equals(username)) {
                            session.getActiveConsumables().add(eq);
                        }
                    });
                }
            }
        }

        double totalWeight = session.getActiveConsumables().stream()
                .filter(java.util.Objects::nonNull)
                .mapToDouble(e -> e.calculateWeight())
                .sum();
        totalWeight = Math.round(totalWeight * 10.0) / 10.0;
        double maxWeight = 10.0 + 5.0 * players.size();
        if (totalWeight > maxWeight) {
            throw new IllegalArgumentException(
                    "Le poids total des objets d\u00e9passe la limite autoris\u00e9e (" + maxWeight + ").");
        }

        combatRoomService.handleRoomStart(session);

        activeSessions.put(sessionId, session);
        spellAvailabilityService.compute(session);
        return session;
    }

    /**
     * Variante multi-joueurs de startCombat.
     * Les personnages sont validés selon leur owner réel (host ou guest).
     */
    public CombatSession startMultiCombat(@NonNull List<Long> characterIds,
            @NonNull Long dungeonId,
            List<Long> consumableIds,
            String hostUsername,
            String guestUsername) {
        if (characterIds.isEmpty())
            throw new RuntimeException("Aucun personnage sélectionné");

        List<Personnage> players = new ArrayList<>();
        java.util.Map<String, java.util.Set<Long>> userVoies = new java.util.HashMap<>();
        userVoies.put(hostUsername, new java.util.HashSet<>());
        userVoies.put(guestUsername, new java.util.HashSet<>());

        for (Long characterId : characterIds) {
            Personnage p = personnageRepository.findById(java.util.Objects.requireNonNull(characterId))
                    .orElseThrow(() -> new RuntimeException("Personnage introuvable"));
            String owner = p.getUser() != null ? p.getUser().getUsername() : null;
            if (!hostUsername.equals(owner) && !guestUsername.equals(owner)) {
                throw new RuntimeException("Non autorisé : personnage " + p.getName());
            }
            if (p.getVoie() != null && p.getVoie().getId() != null) {
                if (!userVoies.get(owner).add(p.getVoie().getId())) {
                    throw new RuntimeException("Le joueur " + owner + " ne peut pas jouer deux fois la même voie (" + p.getVoie().getNom() + ") dans le même donjon.");
                }
            }
            p.clearBuffs();
            p.setUsedCheatDeath(false);
            p.setHealthCurrent(p.getTotalHealthMax());
            p.setManaCurrent(p.getTotalManaMax());

            // Force initialization of equipments for the detached in-memory session
            if (p.getEquipments() != null) {
                p.getEquipments().size();
            }

            players.add(p);
        }

        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));

        AppUser hostAccount = userRepository.findByUsername(hostUsername)
                .orElseThrow(() -> new RuntimeException("Utilisateur hôte introuvable"));
        AppUser guestAccount = userRepository.findByUsername(guestUsername)
                .orElseThrow(() -> new RuntimeException("Utilisateur guest introuvable"));

        if (d.getRequiredSecret() != null && !d.getRequiredSecret().trim().isEmpty()) {
            Integer hostSecretLevel = hostAccount.getUnlockedSecrets().get(d.getRequiredSecret());
            if (hostSecretLevel == null || hostSecretLevel < d.getRequiredSecretLevel()) {
                throw new RuntimeException("L'hôte n'a pas débloqué le secret requis ou son niveau est insuffisant.");
            }
            Integer guestSecretLevel = guestAccount.getUnlockedSecrets().get(d.getRequiredSecret());
            if (guestSecretLevel == null || guestSecretLevel < d.getRequiredSecretLevel()) {
                throw new RuntimeException("Le guest n'a pas débloqué le secret requis ou son niveau est insuffisant.");
            }
        }

        if (d.getUnlockCostGold() > 0) {
            if (!hostAccount.getUnlockedDungeons().contains(d.getId())) {
                throw new RuntimeException("Ce donjon doit être débloqué par l'hôte avant d'y entrer.");
            }
            if (!guestAccount.getUnlockedDungeons().contains(d.getId())) {
                throw new RuntimeException("Le guest doit avoir débloqué ce donjon au préalable.");
            }
        }

        if (d.getEntryCostGold() > 0) {
            if (hostAccount.getMonnaie() < d.getEntryCostGold()) {
                throw new RuntimeException("L'hôte n'a pas assez d'or (Requis : " + d.getEntryCostGold() + " Or).");
            }
            hostAccount.setMonnaie(hostAccount.getMonnaie() - d.getEntryCostGold());
            userRepository.save(hostAccount);
        }

        if (d.getSalles() == null || d.getSalles().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucune salle.");
        }

        for (Personnage p : players) {
            if (p.getVoieLevel() < d.getRecommendedLevel()) {
                throw new RuntimeException("Le personnage " + p.getName() + " (Niv." + p.getVoieLevel()
                        + ") n'a pas le niveau requis (" + d.getRecommendedLevel() + ").");
            }
        }

        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, d, players);
        boolean hostFirstClear = !hostAccount.getCompletedDungeons().contains(d.getId());
        boolean guestFirstClear = !guestAccount.getCompletedDungeons().contains(d.getId());
        session.setFirstClear(hostFirstClear || guestFirstClear);

        if (consumableIds != null && !consumableIds.isEmpty()) {
            for (Long cid : consumableIds) {
                if (cid != null) {
                    equipmentRepository.findById(cid).ifPresent(eq -> {
                        String ownerStr = eq.getOwnerUsername();
                        if (ownerStr == null && eq.getUser() != null)
                            ownerStr = eq.getUser().getUsername();
                        if (hostUsername.equals(ownerStr) || guestUsername.equals(ownerStr)) {
                            session.getActiveConsumables().add(eq);
                        }
                    });
                }
            }
        }

        double totalWeight = session.getActiveConsumables().stream()
                .filter(java.util.Objects::nonNull)
                .mapToDouble(e -> e.calculateWeight())
                .sum();
        totalWeight = Math.round(totalWeight * 10.0) / 10.0;
        double maxWeight = 10.0 + 5.0 * players.size();
        if (totalWeight > maxWeight) {
            throw new IllegalArgumentException(
                    "Le poids total des objets dépasse la limite autorisée (" + maxWeight + ").");
        }

        combatRoomService.handleRoomStart(session);
        activeSessions.put(sessionId, session);
        spellAvailabilityService.compute(session);
        return session;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Session queries
    // ═══════════════════════════════════════════════════════════════════════

    public CombatSession getSession(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session != null) {
            session.setLastActivity(java.time.Instant.now());
        }
        return session;
    }

    public CombatSession resumeCombat(String sessionId) {
        CombatSession session = getSession(sessionId);
        if (session != null) {
            session.setReloadCount(session.getReloadCount() + 1);
        }
        return session;
    }

    public Map<String, CombatSession> getActiveSessions() {
        return activeSessions;
    }

    /** Broadcast SSE si la session est multi (appelé depuis CombatController). */
    public void broadcastIfMulti(CombatSession session) {
        if (session != null && session.isMulti() && combatEventEmitter != null) {
            combatEventEmitter.broadcast(session.getSessionId(), session);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Combat actions — delegates to sub-services
    // ═══════════════════════════════════════════════════════════════════════

    public CombatSession executeAction(String sessionId, Long spellId, Integer targetIndex, Integer allyTargetIndex,
            Integer choiceKey) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        combatActionService.executePlayerAction(session, spellId, targetIndex, allyTargetIndex, choiceKey);
        try {
            combatTurnService.checkDeaths(session);
        } catch (Exception e) {
            // Errors in checkDeaths should not block the response
        }
        try {
            spellAvailabilityService.compute(session);
        } catch (Exception e) {
            // Errors in computeSpellAvailability should not block the response
        }
        return session;
    }

    public CombatSession endTurn(String sessionId) {
        return endTurn(sessionId, false);
    }

    public CombatSession endTurn(String sessionId, boolean isTimeout) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        Personnage p = session.getActivePlayer();
        if (p != null && !isTimeout) {
            session.increasePlayerTurnTimeLimit(p.getId(), 30000);
        }

        return combatTurnService.endTurn(session);
    }

    public CombatSession processNextAutoTurn(String sessionId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
        return combatTurnService.processNextAutoTurn(session);
    }

    public void fleeCombat(String sessionId, String username) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return;
        combatTurnService.fleeCombat(session, username);
        if (session.isFinished()) {
            activeSessions.remove(sessionId);
        }
    }

    /** Called by CombatTimeoutScheduler — applies flee penalties without recording a FLEE stat (TIMEOUT already recorded). */
    public void fleeCombatTimeout(String sessionId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return;
        combatTurnService.fleeCombatNoStat(session);
        if (session.isFinished()) {
            activeSessions.remove(sessionId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Room interactions — delegates to CombatRoomService
    // ═══════════════════════════════════════════════════════════════════════

    private void handleChoice(CombatSession session, String username, generation.grimoire.model.pve.RoomInteractionChoice choice) {
        if (session.getPlayerRoomChoices() == null) {
            session.setPlayerRoomChoices(new java.util.HashMap<>());
        }
        generation.grimoire.model.pve.RoomInteractionChoice existing = session.getPlayerRoomChoices().get(username);
        if (existing != null && existing.getActionType().equals(choice.getActionType())) {
            // Deselect
            session.getPlayerRoomChoices().remove(username);
        } else {
            session.getPlayerRoomChoices().put(username, choice);
        }
    }

    private boolean isEveryoneReady(CombatSession session) {
        java.util.Set<String> activeUsers = new java.util.HashSet<>();
        for (Personnage p : session.getPlayers()) {
            if (session.isEligibleForRewards(p) && p.getHealthCurrent() > 0) {
                if (p.getOwnerUsername() != null) {
                    activeUsers.add(p.getOwnerUsername());
                }
            }
        }
        return session.getPlayerRoomChoices() != null && 
               session.getPlayerRoomChoices().keySet().containsAll(activeUsers);
    }

    public CombatSession openChest(String sessionId, Long equipmentId, String username, String actionType) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        if (session.isMulti()) {
            handleChoice(session, username, new generation.grimoire.model.pve.RoomInteractionChoice(actionType, equipmentId));
            if (!isEveryoneReady(session)) return session;
        } else {
            handleChoice(session, username, new generation.grimoire.model.pve.RoomInteractionChoice(actionType, equipmentId));
        }

        return combatRoomService.openChest(session);
    }

    public CombatSession acceptAlteration(String sessionId, Long anomalyId, Long characterId, String username, String actionType) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        if (session.isMulti()) {
            handleChoice(session, username, new generation.grimoire.model.pve.RoomInteractionChoice(actionType, anomalyId));
            if (!isEveryoneReady(session)) return session;
        } else {
            handleChoice(session, username, new generation.grimoire.model.pve.RoomInteractionChoice(actionType, anomalyId));
        }

        return combatRoomService.acceptAlteration(session);
    }

    public CombatSession useRope(String sessionId, Long equipmentId, String username, String actionType) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        if (session.isMulti()) {
            // Check disagreement before recording: if another player already chose a different actionType, reject
            java.util.Map<String, generation.grimoire.model.pve.RoomInteractionChoice> choices = session.getPlayerRoomChoices();
            if (choices != null && !choices.isEmpty()) {
                // Find the actionType already chosen by other players
                for (var entry : choices.entrySet()) {
                    if (!entry.getKey().equals(username)) {
                        String otherAction = entry.getValue().getActionType();
                        if (!otherAction.equals(actionType)) {
                            throw new RuntimeException("Vous devez vous mettre d'accord avec votre allié !");
                        }
                    }
                }
            }
            handleChoice(session, username, new generation.grimoire.model.pve.RoomInteractionChoice(actionType, equipmentId));
            broadcastIfMulti(session);
            if (!isEveryoneReady(session)) return session;
        } else {
            handleChoice(session, username, new generation.grimoire.model.pve.RoomInteractionChoice(actionType, equipmentId));
        }

        // All agreed — execute the chosen action
        if ("ACCEPT".equals(actionType)) {
            // "Subir le piège" — apply trap damage via proceedToNextRoom
            CombatSession result = combatRoomService.proceedToNextRoom(session);
            if (session.isFinished()) {
                activeSessions.remove(sessionId);
            }
            return result;
        }
        return combatRoomService.useRope(session);
    }

    public CombatSession consumeItem(String sessionId, Long consumableId, Long targetCharacterId, String username) {
        CombatSession session = getSession(sessionId);
        if (session == null)
            throw new RuntimeException("Session introuvable");
        return combatRoomService.consumeItem(session, consumableId, targetCharacterId, username);
    }

    public CombatSession deleteConsumable(String sessionId, Long consumableId) {
        CombatSession session = getSession(sessionId);
        if (session == null)
            throw new RuntimeException("Session introuvable");
        return combatRoomService.deleteConsumable(session, consumableId);
    }

    public CombatSession buyMerchantItem(String sessionId, int lootIndex, Long characterId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished()) {
            throw new RuntimeException("Session introuvable ou terminée.");
        }
        return combatRoomService.buyMerchantItem(session, lootIndex, characterId);
    }

    public CombatSession proceedToNextRoom(String sessionId, String username) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        if (session.isMulti()) {
            if (session.getReadyForNextRoomUsers().contains(username)) {
                session.getReadyForNextRoomUsers().remove(username);
                return session;
            }
            session.getReadyForNextRoomUsers().add(username);
            
            java.util.Set<String> activeUsers = new java.util.HashSet<>();
            for (Personnage p : session.getPlayers()) {
                if (session.isEligibleForRewards(p) && p.getHealthCurrent() > 0) {
                    if (p.getOwnerUsername() != null) {
                        activeUsers.add(p.getOwnerUsername());
                    }
                }
            }
            if (!session.getReadyForNextRoomUsers().containsAll(activeUsers)) {
                return session;
            }
            session.getReadyForNextRoomUsers().clear();
        }

        CombatSession result = combatRoomService.proceedToNextRoom(session);
        if (session.isFinished()) {
            activeSessions.remove(sessionId);
        }
        return result;
    }

    public CombatSession openStrangeDoor(String sessionId, String username) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;

        if (session.isMulti()) {
            if (session.getReadyForNextRoomUsers().contains(username)) {
                session.getReadyForNextRoomUsers().remove(username);
                return session;
            }
            session.getReadyForNextRoomUsers().add(username);
            
            java.util.Set<String> activeUsers = new java.util.HashSet<>();
            for (Personnage p : session.getPlayers()) {
                if (session.isEligibleForRewards(p) && p.getHealthCurrent() > 0) {
                    if (p.getOwnerUsername() != null) {
                        activeUsers.add(p.getOwnerUsername());
                    }
                }
            }
            if (!session.getReadyForNextRoomUsers().containsAll(activeUsers)) {
                return session;
            }
            session.getReadyForNextRoomUsers().clear();
        }

        return combatRoomService.openStrangeDoor(session);
    }

    @Transactional
    public CombatSession addConsumableByName(String sessionId, String itemName, String username) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished()) {
            throw new RuntimeException("Session introuvable ou terminée.");
        }
        return combatRoomService.addConsumableByName(session, itemName, username);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Scheduled — multiplayer timeout
    // ═══════════════════════════════════════════════════════════════════════

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 1000)
    public void checkMultiplayerTimeouts() {
        long now = System.currentTimeMillis();
        for (CombatSession session : activeSessions.values()) {
            if (session.isMulti() && !session.isFinished()) {
                Long start = session.getTurnStartTime();
                if (start != null) {
                    Personnage p = session.getActivePlayer();
                    if (p != null) {
                        long maxTurnTime = session.getCurrentTurnTimeLimit();
                        if ((now - start) > maxTurnTime) {
                            session.addLog("⏳ Le temps imparti pour " + p.getName() + " s'est écoulé ! Son tour passe automatiquement.");
                            session.reducePlayerTurnTimeLimit(p.getId(), 30000);
                            endTurn(session.getSessionId(), true);
                            broadcastIfMulti(session);
                        }
                    }
                }
            }
        }
    }
}
