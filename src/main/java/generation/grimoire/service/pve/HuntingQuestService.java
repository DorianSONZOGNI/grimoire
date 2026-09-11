package generation.grimoire.service.pve;

import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.pve.*;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HuntingQuestService {

    private final HuntingQuestRepository questRepository;
    private final HuntingQuestEntryRepository entryRepository;
    private final DonjonRepository donjonRepository;
    private final DungeonRunStatRepository runStatRepository;
    private final UserRepository userRepository;
    private final AnomalieRepository anomalieRepository;

    private static final ZoneId ZONE = ZoneId.of("Europe/Paris");

    // ═══════════════════════════════════════════════════════════════════════
    // Rotation
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public void rotateDailyQuest() {
        // Désactiver l'ancienne quête daily
        questRepository.findByTypeAndActiveTrue("DAILY").ifPresent(old -> {
            old.setActive(false);
            questRepository.save(old);
        });

        List<Donjon> allDungeons = donjonRepository.findAll();
        if (allDungeons.isEmpty()) return;

        Donjon selected = selectDungeonWeighted(allDungeons);

        HuntingQuest quest = new HuntingQuest();
        quest.setType("DAILY");
        quest.setDungeonId(selected.getId());
        quest.setDungeonName(selected.getName());
        quest.setDungeonLevel(selected.getRecommendedLevel());
        quest.setDungeonRoomCount(selected.getSalles().size());
        quest.setRequiredSecret(selected.getRequiredSecret());
        quest.setRequiredSecretLevel(selected.getRequiredSecretLevel());
        quest.setStartDate(LocalDate.now(ZONE));
        quest.setEndDate(LocalDate.now(ZONE).plusDays(1));
        quest.setActive(true);
        questRepository.save(quest);

        System.out.println("[HuntingQuest] Daily quest rotated: " + selected.getName());
    }

    @Transactional
    public void rotateWeeklyQuest() {
        // Désactiver l'ancienne quête weekly
        questRepository.findByTypeAndActiveTrue("WEEKLY").ifPresent(old -> {
            old.setActive(false);
            questRepository.save(old);
        });

        List<Donjon> eligible = donjonRepository.findAll().stream()
                .filter(d -> d.getRecommendedLevel() >= 3)
                .filter(d -> d.getRequiredSecret() != null && !d.getRequiredSecret().isBlank())
                .filter(d -> d.getSalles().stream().anyMatch(s -> s.getType() == RoomType.BOSS))
                .collect(Collectors.toList());

        if (eligible.isEmpty()) return;

        Donjon selected = eligible.get(new Random().nextInt(eligible.size()));

        HuntingQuest quest = new HuntingQuest();
        quest.setType("WEEKLY");
        quest.setDungeonId(selected.getId());
        quest.setDungeonName(selected.getName());
        quest.setDungeonLevel(selected.getRecommendedLevel());
        quest.setDungeonRoomCount(selected.getSalles().size());
        quest.setRequiredSecret(selected.getRequiredSecret());
        quest.setRequiredSecretLevel(selected.getRequiredSecretLevel());
        quest.setStartDate(LocalDate.now(ZONE));
        quest.setEndDate(LocalDate.now(ZONE).plusWeeks(1));
        quest.setActive(true);
        questRepository.save(quest);

        System.out.println("[HuntingQuest] Weekly quest rotated: " + selected.getName());
    }

    /**
     * Sélectionne un donjon avec une pondération inversement proportionnelle
     * au nombre de runs. Moins un donjon a été joué → plus de poids.
     */
    private Donjon selectDungeonWeighted(List<Donjon> dungeons) {
        // Compter les runs par dungeon
        List<DungeonRunStat> allStats = runStatRepository.findAll();
        Map<Long, Long> runCounts = allStats.stream()
                .filter(stat -> stat.getDungeonId() != null)
                .collect(Collectors.groupingBy(stat -> stat.getDungeonId(), Collectors.counting()));

        long maxRuns = runCounts.values().stream().mapToLong(v -> v != null ? v : 0L).max().orElse(1);

        // Calculer le poids inverse : (maxRuns + 1 - count) pour chaque donjon
        List<Double> weights = new ArrayList<>();
        double totalWeight = 0;
        for (Donjon d : dungeons) {
            long count = runCounts.getOrDefault(d.getId(), 0L);
            double weight = maxRuns + 1 - count;
            weights.add(weight);
            totalWeight += weight;
        }

        // Tirage pondéré
        double roll = new Random().nextDouble() * totalWeight;
        double cumulative = 0;
        for (int i = 0; i < dungeons.size(); i++) {
            cumulative += weights.get(i);
            if (roll <= cumulative) {
                return dungeons.get(i);
            }
        }
        return dungeons.get(dungeons.size() - 1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Enregistrement des complétions (appelé quand un donjon est terminé)
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public void recordCompletion(Long dungeonId, String accountName) {
        // Vérifier la quête daily
        questRepository.findByTypeAndActiveTrue("DAILY").ifPresent(quest -> {
            if (quest.getDungeonId().equals(dungeonId)) {
                HuntingQuestEntry entry = entryRepository
                        .findByQuestIdAndAccountName(quest.getId(), accountName)
                        .orElse(null);

                if (entry == null) {
                    // Première complétion pour ce compte sur cette quête daily
                    entry = new HuntingQuestEntry();
                    entry.setQuest(quest);
                    entry.setAccountName(accountName);
                    entry.setCompletionCount(1);
                    entry.setFirstCompletionTime(Instant.now());
                    entryRepository.save(entry);
                    recalculateDailyRanks(quest.getId());
                }
                // Sinon, déjà fait → on ignore (une seule fois par compte)
            }
        });

        // Vérifier la quête weekly
        questRepository.findByTypeAndActiveTrue("WEEKLY").ifPresent(quest -> {
            if (quest.getDungeonId().equals(dungeonId)) {
                HuntingQuestEntry entry = entryRepository
                        .findByQuestIdAndAccountName(quest.getId(), accountName)
                        .orElseGet(() -> {
                            HuntingQuestEntry e = new HuntingQuestEntry();
                            e.setQuest(quest);
                            e.setAccountName(accountName);
                            e.setCompletionCount(0);
                            return e;
                        });

                entry.setCompletionCount(entry.getCompletionCount() + 1);
                if (entry.getFirstCompletionTime() == null) {
                    entry.setFirstCompletionTime(Instant.now());
                }
                entryRepository.save(entry);
                recalculateWeeklyRanks(quest.getId());
            }
        });
    }

    private void recalculateDailyRanks(Long questId) {
        List<HuntingQuestEntry> entries = entryRepository.findByQuestIdOrderByFirstCompletionTimeAsc(questId);
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1); // 1er arrivé = rang 1
        }
        entryRepository.saveAll(entries);
    }

    private void recalculateWeeklyRanks(Long questId) {
        List<HuntingQuestEntry> entries = entryRepository.findByQuestIdOrderByCompletionCountDesc(questId);
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }
        entryRepository.saveAll(entries);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Récupération des récompenses
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public String claimReward(Long questId, String username) {
        HuntingQuestEntry entry = entryRepository.findByQuestIdAndAccountName(questId, username)
                .orElseThrow(() -> new IllegalArgumentException("Pas d'entrée trouvée pour cette quête."));

        if (entry.isRewardClaimed()) {
            throw new IllegalStateException("Récompense déjà récupérée.");
        }

        HuntingQuest quest = entry.getQuest();

        // Vérifier éligibilité
        if ("DAILY".equals(quest.getType())) {
            if (entry.getRank() < 1 || entry.getRank() > 3) {
                throw new IllegalStateException("Vous n'êtes pas dans le top 3.");
            }
            // Vérifier que la quête daily est encore active ou date pas trop vieille
            if (!quest.isActive() && quest.getEndDate().isBefore(LocalDate.now(ZONE))) {
                throw new IllegalStateException("La quête journalière a expiré.");
            }

            int baseGold = 5 * quest.getDungeonRoomCount() * quest.getDungeonLevel();
            int bonusGold = switch (entry.getRank()) {
                case 1 -> 100;
                case 2 -> 50;
                case 3 -> 25;
                default -> 0;
            };
            int totalGold = baseGold + bonusGold;

            AppUser user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));
            user.setMonnaie(user.getMonnaie() + totalGold);
            userRepository.save(user);

            entry.setRewardClaimed(true);
            entryRepository.save(entry);

            return totalGold + " pièces d'or récupérées !";

        } else if ("WEEKLY".equals(quest.getType())) {
            if (entry.getRank() < 1 || entry.getRank() > 3) {
                throw new IllegalStateException("Vous n'êtes pas dans le top 3.");
            }
            // Vérifier que la quête weekly est récupérable (fin + 7 jours max)
            if (quest.getEndDate().plusWeeks(1).isBefore(LocalDate.now(ZONE))) {
                throw new IllegalStateException("La période de récupération a expiré.");
            }

            // Trouver une anomalie template correspondant au secret du donjon, niv 2+
            String secret = quest.getRequiredSecret();
            List<Anomalie> templates = anomalieRepository.findByIsTemplateTrue().stream()
                    .filter(a -> a.getLevel() >= 2)
                    .filter(a -> a.getSpiritualite() != null && a.getSpiritualite().name().equalsIgnoreCase(secret))
                    .collect(Collectors.toList());

            if (templates.isEmpty()) {
                // Fallback : toute anomalie template niv 2+
                templates = anomalieRepository.findByIsTemplateTrue().stream()
                        .filter(a -> a.getLevel() >= 2)
                        .collect(Collectors.toList());
            }

            if (templates.isEmpty()) {
                throw new IllegalStateException("Aucune anomalie disponible comme récompense.");
            }

            Anomalie template = templates.get(new Random().nextInt(templates.size()));
            AppUser user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

            // Dupliquer le template pour l'utilisateur
            Anomalie reward = new Anomalie();
            reward.setName(template.getName());
            reward.setSpiritualite(template.getSpiritualite());
            reward.setCategory(template.getCategory());
            reward.setDescription(template.getDescription());
            reward.setLevel(template.getLevel());
            reward.setMagicObject(template.isMagicObject());
            reward.setTemplate(false);
            reward.setOwnerUsername(username);
            reward.setUser(user);
            anomalieRepository.save(reward);

            entry.setRewardClaimed(true);
            entryRepository.save(entry);

            return "Anomalie \"" + reward.getName() + "\" (Niv." + reward.getLevel() + ") récupérée !";
        }

        throw new IllegalStateException("Type de quête inconnu.");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Lecture (pour l'API)
    // ═══════════════════════════════════════════════════════════════════════

    public Map<String, Object> getDailyQuestData(String username) {
        Map<String, Object> result = new HashMap<>();
        questRepository.findByTypeAndActiveTrue("DAILY").ifPresent(quest -> {
            result.put("quest", questToMap(quest));
            result.put("leaderboard", getLeaderboard(quest.getId()));
            result.put("reward", computeDailyRewardInfo(quest));
            if (username != null) {
                entryRepository.findByQuestIdAndAccountName(quest.getId(), username)
                        .ifPresent(e -> result.put("myEntry", entryToMap(e)));
            }
        });
        return result;
    }

    public Map<String, Object> getWeeklyQuestData(String username) {
        Map<String, Object> result = new HashMap<>();
        questRepository.findByTypeAndActiveTrue("WEEKLY").ifPresent(quest -> {
            result.put("quest", questToMap(quest));
            result.put("leaderboard", getLeaderboard(quest.getId()));
            result.put("reward", "Anomalie Niv.2+ correspondant au secret du donjon");
            if (username != null) {
                entryRepository.findByQuestIdAndAccountName(quest.getId(), username)
                        .ifPresent(e -> result.put("myEntry", entryToMap(e)));
            }
        });

        // Quête précédente récupérable
        questRepository.findFirstByTypeAndActiveFalseOrderByEndDateDesc("WEEKLY").ifPresent(prev -> {
            if (prev.getEndDate().plusWeeks(1).isAfter(LocalDate.now(ZONE))) {
                Map<String, Object> prevData = new HashMap<>();
                prevData.put("quest", questToMap(prev));
                prevData.put("leaderboard", getLeaderboard(prev.getId()));
                if (username != null) {
                    entryRepository.findByQuestIdAndAccountName(prev.getId(), username)
                            .ifPresent(e -> prevData.put("myEntry", entryToMap(e)));
                }
                result.put("previous", prevData);
            }
        });

        return result;
    }

    private List<Map<String, Object>> getLeaderboard(Long questId) {
        if (questId == null) return List.of();
        // Récupérer toutes les entrées triées
        HuntingQuest quest = questRepository.findById(questId).orElse(null);
        if (quest == null) return List.of();

        List<HuntingQuestEntry> entries;
        if ("DAILY".equals(quest.getType())) {
            entries = entryRepository.findByQuestIdOrderByFirstCompletionTimeAsc(questId);
        } else {
            entries = entryRepository.findByQuestIdOrderByCompletionCountDesc(questId);
        }

        return entries.stream().map(this::entryToMap).collect(Collectors.toList());
    }

    private Map<String, Object> questToMap(HuntingQuest q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("type", q.getType());
        m.put("dungeonId", q.getDungeonId());
        m.put("dungeonName", q.getDungeonName());
        m.put("dungeonLevel", q.getDungeonLevel());
        m.put("dungeonRoomCount", q.getDungeonRoomCount());
        m.put("requiredSecret", q.getRequiredSecret());
        m.put("requiredSecretLevel", q.getRequiredSecretLevel());
        m.put("startDate", q.getStartDate().toString());
        m.put("endDate", q.getEndDate().toString());
        m.put("active", q.isActive());
        return m;
    }

    private Map<String, Object> entryToMap(HuntingQuestEntry e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("accountName", e.getAccountName());
        m.put("completionCount", e.getCompletionCount());
        m.put("firstCompletionTime", e.getFirstCompletionTime() != null ? e.getFirstCompletionTime().toString() : null);
        m.put("rank", e.getRank());
        m.put("rewardClaimed", e.isRewardClaimed());
        return m;
    }

    private Map<String, Object> computeDailyRewardInfo(HuntingQuest quest) {
        int baseGold = 5 * quest.getDungeonRoomCount() * quest.getDungeonLevel();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("1st", baseGold + 100);
        m.put("2nd", baseGold + 50);
        m.put("3rd", baseGold + 25);
        m.put("base", baseGold);
        return m;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Init au boot
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public void ensureQuestsExist() {
        if (questRepository.findByTypeAndActiveTrue("DAILY").isEmpty()) {
            rotateDailyQuest();
        }
        if (questRepository.findByTypeAndActiveTrue("WEEKLY").isEmpty()) {
            rotateWeeklyQuest();
        }
    }

    /** Expire les quêtes dont la date de fin est passée */
    @Transactional
    public void expireOldQuests() {
        LocalDate today = LocalDate.now(ZONE);
        List<HuntingQuest> expired = questRepository.findByActiveTrueAndEndDateBefore(today);
        for (HuntingQuest q : expired) {
            q.setActive(false);
            questRepository.save(q);
            System.out.println("[HuntingQuest] Expired: " + q.getType() + " - " + q.getDungeonName());
        }
    }
}
