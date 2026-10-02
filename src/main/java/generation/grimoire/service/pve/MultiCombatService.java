package generation.grimoire.service.pve;

import generation.grimoire.model.pve.MultiCombatSession;
import generation.grimoire.model.pve.CombatSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.dto.pve.LobbyInfoDTO;
import generation.grimoire.dto.pve.HostHeroInfoDTO;
import generation.grimoire.entity.pve.Donjon;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MultiCombatService {

    private final CombatService combatService;
    private final CombatEventEmitter eventEmitter;
    private final DonjonRepository donjonRepository;
    private final PersonnageRepository personnageRepository;
    private final generation.grimoire.repository.EquipmentRepository equipmentRepository;

    /** multiSessionId → MultiCombatSession */
    private final Map<String, MultiCombatSession> lobbies = new ConcurrentHashMap<>();

    // ─────────────────────────────────────────────────────────────────────────
    // Création du lobby par l'hôte
    // ─────────────────────────────────────────────────────────────────────────

    public MultiCombatSession createLobby(String hostUsername,
                                          List<Long> hostCharacterIds,
                                          Long dungeonId,
                                          List<Long> consumableIds) {
        if (hostCharacterIds == null || hostCharacterIds.isEmpty()) {
            throw new IllegalArgumentException("Sélectionnez au moins un personnage.");
        }

        String uuid = UUID.randomUUID().toString();
        String shortCode = uuid.replace("-", "").substring(0, 6).toUpperCase();

        MultiCombatSession lobby = new MultiCombatSession();
        lobby.setMultiSessionId(uuid);
        lobby.setShortCode(shortCode);
        lobby.setHostUsername(hostUsername);
        lobby.setHostCharacterIds(new ArrayList<>(hostCharacterIds));
        lobby.setDungeonId(dungeonId);
        lobby.setConsumableIds(consumableIds != null ? new ArrayList<>(consumableIds) : new ArrayList<>());
        lobby.setStatus(MultiCombatSession.Status.WAITING);

        lobbies.put(uuid, lobby);
        log.info("[MultiCombat] Lobby créé: {} (code: {}) par {}", uuid, shortCode, hostUsername);
        return lobby;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Jonction par le joueur 2
    // ─────────────────────────────────────────────────────────────────────────

    public CombatSession joinLobby(String multiSessionId,
                                   String guestUsername,
                                   List<Long> guestCharacterIds,
                                   List<Long> guestConsumableIds) {
        MultiCombatSession lobby = getOrThrow(multiSessionId);

        if (lobby.getStatus() != MultiCombatSession.Status.WAITING) {
            throw new IllegalStateException("Ce lobby n'accepte plus de joueurs.");
        }
        if (lobby.getHostUsername().equals(guestUsername)) {
            throw new IllegalArgumentException("Vous ne pouvez pas rejoindre votre propre lobby.");
        }
        if (guestCharacterIds == null || guestCharacterIds.isEmpty()) {
            throw new IllegalArgumentException("Sélectionnez au moins un personnage.");
        }

        // Merge des personnages : hôte en premier, guest ensuite
        List<Long> allCharIds = new ArrayList<>(lobby.getHostCharacterIds());
        allCharIds.addAll(guestCharacterIds);

        // Merge des consommables hôte + guest
        List<Long> allConsumables = new ArrayList<>(lobby.getConsumableIds());
        List<Long> guestConsIds = guestConsumableIds != null ? guestConsumableIds : new ArrayList<>();
        allConsumables.addAll(guestConsIds);
        lobby.setGuestConsumableIds(new ArrayList<>(guestConsIds));

        Long dungeonId = lobby.getDungeonId();
        if (dungeonId == null) {
            throw new IllegalStateException("Donjon non défini pour ce lobby.");
        }
        
        // Démarrer le vrai combat — validé sous le username de l'hôte d'abord
        // La validation par owner est faite dans CombatService pour chaque perso individuellement
        CombatSession combatSession = combatService.startMultiCombat(
                allCharIds, dungeonId, allConsumables,
                lobby.getHostUsername(), guestUsername);

        combatSession.setMulti(true);
        combatSession.setMultiSessionId(multiSessionId);

        // Mettre à jour le lobby
        lobby.setGuestUsername(guestUsername);
        lobby.setGuestCharacterIds(new ArrayList<>(guestCharacterIds));
        lobby.setCombatSessionId(combatSession.getSessionId());
        lobby.setStatus(MultiCombatSession.Status.ACTIVE);
        lobby.setLastActivity(Instant.now());

        log.info("[MultiCombat] {} a rejoint le lobby {} — session combat: {}",
                guestUsername, multiSessionId, combatSession.getSessionId());

        // Notifier l'hôte via SSE (il poll le multiSessionId)
        eventEmitter.broadcastEvent(multiSessionId, "lobby-ready", lobby);

        return combatSession;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lecture
    // ─────────────────────────────────────────────────────────────────────────

    public MultiCombatSession getMultiSession(String multiSessionId) {
        return lobbies.get(multiSessionId);
    }

    public MultiCombatSession getByShortCode(String shortCode) {
        return lobbies.values().stream()
                .filter(l -> l.getShortCode().equalsIgnoreCase(shortCode))
                .filter(l -> l.getStatus() == MultiCombatSession.Status.WAITING)
                .findFirst()
                .orElse(null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Annulation par l'hôte
    // ─────────────────────────────────────────────────────────────────────────

    public void cancelLobby(String multiSessionId, String username) {
        MultiCombatSession lobby = getOrThrow(multiSessionId);
        if (!lobby.getHostUsername().equals(username)) {
            throw new SecurityException("Seul l'hôte peut annuler le lobby.");
        }
        lobby.setStatus(MultiCombatSession.Status.CANCELLED);
        eventEmitter.broadcastEvent(multiSessionId, "lobby-cancelled", lobby);
        log.info("[MultiCombat] Lobby {} annulé par {}", multiSessionId, username);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private MultiCombatSession getOrThrow(String multiSessionId) {
        MultiCombatSession lobby = lobbies.get(multiSessionId);
        if (lobby == null) throw new IllegalArgumentException("Lobby introuvable : " + multiSessionId);
        return lobby;
    }

    // ────────────────────────────────────────────────────
    // Mise à jour en temps réel de l'état provisoire de l'allié
    // ────────────────────────────────────────────────────

    /**
     * L'allié met à jour ses héros / consomables provisoirement.
     * L'hôte reçoit un event SSE "guest-update".
     */
    public void updateGuestState(String multiSessionId, String guestUsername,
                                 List<Long> charIds, List<Long> consumableIds) {
        MultiCombatSession lobby = getOrThrow(multiSessionId);
        if (lobby.getStatus() != MultiCombatSession.Status.WAITING) {
            throw new IllegalStateException("Ce lobby n'est plus en attente.");
        }
        lobby.setPendingGuestCharacterIds(charIds != null ? new ArrayList<>(charIds) : new ArrayList<>());
        lobby.setPendingGuestConsumableIds(consumableIds != null ? new ArrayList<>(consumableIds) : new ArrayList<>());

        // Enrichir le payload avec les noms des héros
        List<Map<String, Object>> heroInfos = new ArrayList<>();
        if (charIds != null) {
            charIds.forEach(cid -> {
                if (cid == null) return;
                Personnage p = personnageRepository.findById(cid).orElse(null);
                if (p != null) {
                    Map<String, Object> hInfo = new java.util.HashMap<>();
                    hInfo.put("id", cid);
                    hInfo.put("name", p.getName());
                    hInfo.put("level", p.getVoieLevel());
                    hInfo.put("healthMax", p.getHealthMax());
                    if (p.getVoie() != null) {
                        hInfo.put("voieName", p.getVoie().getNom());
                    }
                    if (p.getSpiritualite() != null) {
                        hInfo.put("spiritualiteName", p.getSpiritualite().getNom());
                    }
                    heroInfos.add(hInfo);
                }
            });
        }

        // Enrichir le payload avec les noms des consomables (groupés par nom)
        Map<String, generation.grimoire.entity.Equipment> eqMap = new java.util.HashMap<>();
        Map<String, Long> consomablesGrouped = new java.util.LinkedHashMap<>();
        if (consumableIds != null) {
            consumableIds.forEach(eid -> {
                if (eid == null) return;
                generation.grimoire.entity.Equipment eq =
                        equipmentRepository.findById(eid).orElse(null);
                if (eq != null) {
                    consomablesGrouped.merge(eq.getName(), 1L, (a, b) -> a + b);
                    eqMap.putIfAbsent(eq.getName(), eq);
                }
            });
        }
        List<Map<String, Object>> consInfos = new ArrayList<>();
        consomablesGrouped.forEach((name, count) -> {
            Map<String, Object> cInfo = new java.util.HashMap<>();
            cInfo.put("name", name);
            cInfo.put("count", count);
            generation.grimoire.entity.Equipment eq = eqMap.get(name);
            if (eq != null && eq.getConsumableCategory() != null) {
                cInfo.put("category", eq.getConsumableCategory().name());
            }
            consInfos.add(cInfo);
        });

        // Broadcaster l'état à l'hôte
        eventEmitter.broadcastEvent(multiSessionId, "guest-update", Map.of(
                "pendingGuestCharacterIds", lobby.getPendingGuestCharacterIds(),
                "pendingGuestConsumableIds", lobby.getPendingGuestConsumableIds(),
                "guestHeroInfos", heroInfos,
                "guestConsomableInfos", consInfos
        ));
        log.debug("[MultiCombat] guest-update lobby={} chars={} consos={}",
                multiSessionId, charIds, consumableIds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Récupération des informations du lobby
    // ─────────────────────────────────────────────────────────────────────────

    public LobbyInfoDTO getLobbyInfo(String shortCode) {
        MultiCombatSession lobby = getByShortCode(shortCode);
        if (lobby == null || lobby.getStatus() != MultiCombatSession.Status.WAITING) {
            return null;
        }

        Long dungeonId = lobby.getDungeonId();
        if (dungeonId == null) {
            return null;
        }
        Donjon donjon = donjonRepository.findById(dungeonId).orElse(null);
        if (donjon == null) {
            return null;
        }

        int maxHeroes = donjon.getMaxHeroes();
        int hostCount = lobby.getHostCharacterIds() != null ? lobby.getHostCharacterIds().size() : 0;
        int availableSlots = Math.max(0, maxHeroes - hostCount);

        List<HostHeroInfoDTO> hostHeroInfos = new ArrayList<>();
        if (lobby.getHostCharacterIds() != null) {
            for (Long cid : lobby.getHostCharacterIds()) {
                if (cid == null) continue;
                Personnage p = personnageRepository.findById(cid).orElse(null);
                if (p != null) {
                    HostHeroInfoDTO hdto = new HostHeroInfoDTO();
                    hdto.setName(p.getName());
                    hdto.setLevel(p.getVoieLevel());
                    hdto.setVoieName(p.getVoie() != null ? p.getVoie().getNom() : null);
                    hdto.setSpiritualiteName(p.getSpiritualite() != null ? p.getSpiritualite().getNom() : null);
                    hdto.setHealthMax(p.getHealthMax());
                    hostHeroInfos.add(hdto);
                }
            }
        }

        return new LobbyInfoDTO(
                lobby.getShortCode(),
                lobby.getHostUsername(),
                donjon.getName(),
                donjon.getRecommendedLevel(),
                maxHeroes,
                hostCount,
                availableSlots,
                donjon.getId(),
                donjon.getRequiredSecret(),
                donjon.getRequiredSecretLevel(),
                (int) donjon.getUnlockCostGold(),
                hostHeroInfos
        );
    }
}
