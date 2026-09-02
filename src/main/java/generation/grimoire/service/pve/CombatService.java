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
        for (Long characterId : characterIds) {
            Personnage p = personnageRepository.findById(java.util.Objects.requireNonNull(characterId))
                    .orElseThrow(() -> new RuntimeException("Personnage introuvable"));
            if (p.getUser() == null || !p.getUser().getUsername().equals(username)) {
                throw new RuntimeException("Non autorisé");
            }
            p.clearBuffs();
            p.setHealthCurrent(p.getTotalHealthMax());
            p.setManaCurrent(p.getTotalManaMax());
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
        for (Long characterId : characterIds) {
            Personnage p = personnageRepository.findById(java.util.Objects.requireNonNull(characterId))
                    .orElseThrow(() -> new RuntimeException("Personnage introuvable"));
            String owner = p.getUser() != null ? p.getUser().getUsername() : null;
            if (!hostUsername.equals(owner) && !guestUsername.equals(owner)) {
                throw new RuntimeException("Non autorisé : personnage " + p.getName());
            }
            p.clearBuffs();
            p.setHealthCurrent(p.getTotalHealthMax());
            p.setManaCurrent(p.getTotalManaMax());
            players.add(p);
        }

        Donjon d = donjonRepository.findById(dungeonId).orElseThrow(() -> new RuntimeException("Donjon introuvable"));

        AppUser hostAccount = userRepository.findByUsername(hostUsername)
                .orElseThrow(() -> new RuntimeException("Utilisateur hôte introuvable"));
        AppUser guestAccount = userRepository.findByUsername(guestUsername)
                .orElseThrow(() -> new RuntimeException("Utilisateur guest introuvable"));

        if (d.getRequiredSecret() != null && !d.getRequiredSecret().trim().isEmpty()) {
            if (!hostAccount.getUnlockedSecrets().containsKey(d.getRequiredSecret())) {
                throw new RuntimeException("L'hôte n'a pas débloqué le secret requis.");
            }
            if (!guestAccount.getUnlockedSecrets().containsKey(d.getRequiredSecret())) {
                throw new RuntimeException("Le guest n'a pas débloqué le secret requis.");
            }
        }

        if (d.getUnlockCostGold() > 0 && !hostAccount.getUnlockedDungeons().contains(d.getId())) {
            throw new RuntimeException("Ce donjon doit être débloqué par l'hôte avant d'y entrer.");
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
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
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

    // ═══════════════════════════════════════════════════════════════════════
    // Room interactions — delegates to CombatRoomService
    // ═══════════════════════════════════════════════════════════════════════

    public CombatSession openChest(String sessionId, Long equipmentId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
        return combatRoomService.openChest(session, equipmentId);
    }

    public CombatSession acceptAlteration(String sessionId, Long anomalyId, Long characterId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
        return combatRoomService.acceptAlteration(session, anomalyId, characterId);
    }

    public CombatSession useRope(String sessionId, Long equipmentId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
        return combatRoomService.useRope(session, equipmentId);
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

    public CombatSession proceedToNextRoom(String sessionId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
        CombatSession result = combatRoomService.proceedToNextRoom(session);
        if (session.isFinished()) {
            activeSessions.remove(sessionId);
        }
        return result;
    }

    public CombatSession openStrangeDoor(String sessionId) {
        CombatSession session = getSession(sessionId);
        if (session == null || session.isFinished())
            return session;
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
                if (start != null && (now - start) > 90000) {
                    Personnage p = session.getActivePlayer();
                    if (p != null) {
                        session.addLog("⏳ Le temps imparti pour " + p.getName() + " s'est écoulé ! Son tour passe automatiquement.");
                        endTurn(session.getSessionId());
                        broadcastIfMulti(session);
                    }
                }
            }
        }
    }
}
