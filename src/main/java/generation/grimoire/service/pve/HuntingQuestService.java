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

        List<Donjon> allDungeons = donjonRepository.findAll().stream()
                .filter(d -> d.getRecommendedLevel() <= 2)
                .collect(java.util.stream.Collectors.toList());
        if (allDungeons.isEmpty())
            return;

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
                .filter(d -> d.getRequiredSecretLevel() >= 2)
                .filter(d -> d.getRequiredSecret() != null && !d.getRequiredSecret().isBlank())
                .filter(d -> d.getSalles().stream().anyMatch(s -> s.getType() == RoomType.BOSS))
                .collect(Collectors.toList());

        if (eligible.isEmpty())
            return;

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

        // --- Tirage de l'Anomalie récompense ---
        String secret = selected.getRequiredSecret();
        generation.grimoire.enumeration.SpiritualiteType mappedSpiri = mapSecretToSpiritualite(secret);

        List<Anomalie> templates = new ArrayList<>();
        if (mappedSpiri != null) {
            templates = anomalieRepository.findByIsTemplateTrue().stream()
                    .filter(a -> a.getLevel() == selected.getRequiredSecretLevel())
                    .filter(a -> a.getSpiritualite() == mappedSpiri)
                    .collect(Collectors.toList());
        }

        if (templates.isEmpty()) {
            templates = anomalieRepository.findByIsTemplateTrue().stream()
                    .filter(a -> a.getLevel() == selected.getRequiredSecretLevel())
                    .collect(Collectors.toList());
        }
        if (!templates.isEmpty()) {
            Anomalie template = templates.get(new Random().nextInt(templates.size()));
            quest.setRewardAnomalieId(template.getId());
        }
        // ---------------------------------------

        questRepository.save(quest);

        System.out.println("[HuntingQuest] Weekly quest rotated: " + selected.getName());
    }

    private generation.grimoire.enumeration.SpiritualiteType mapSecretToSpiritualite(String secret) {
        if (secret == null)
            return null;
        return switch (secret) {
            case "Secret du Chaos" -> generation.grimoire.enumeration.SpiritualiteType.DESTRUCTION;
            case "Secret de l'Abondance" -> generation.grimoire.enumeration.SpiritualiteType.CREATION;
            case "Secret de la Préservation" -> generation.grimoire.enumeration.SpiritualiteType.CONSOLIDATION;
            case "Secret de la Sérénité" -> generation.grimoire.enumeration.SpiritualiteType.SURETE;
            case "Secret de la Chasse" -> generation.grimoire.enumeration.SpiritualiteType.TRAHISON;
            case "Secret du Carnage" -> generation.grimoire.enumeration.SpiritualiteType.VIOLENCE;
            case "Secret de la Joie" -> generation.grimoire.enumeration.SpiritualiteType.CONVICTION;
            case "Secret du Savoir" -> generation.grimoire.enumeration.SpiritualiteType.RAISON;
            case "Secret du Destin" -> generation.grimoire.enumeration.SpiritualiteType.KARMA;
            case "Secret de l'Éther" -> generation.grimoire.enumeration.SpiritualiteType.ESPRIT;
            case "Secret des Abysses" -> generation.grimoire.enumeration.SpiritualiteType.TENEBRES;
            default -> null;
        };
    }

    /**
     * Sélectionne un donjon avec une pondération inversement proportionnelle
     * au nombre de runs. Moins un donjon a été joué → plus de poids.
     */
    @jakarta.annotation.PostConstruct
    public void fixActiveWeeklyQuest() {
        questRepository.findByTypeAndActiveTrue("WEEKLY").stream().findFirst().ifPresent(quest -> {
            generation.grimoire.enumeration.SpiritualiteType mappedSpiri = mapSecretToSpiritualite(
                    quest.getRequiredSecret());
            if (mappedSpiri != null) {
                anomalieRepository.findByIsTemplateTrue().stream()
                        .filter(a -> a.getLevel() == quest.getRequiredSecretLevel())
                        .filter(a -> a.getSpiritualite() == mappedSpiri)
                        .findFirst()
                        .ifPresent(a -> {
                            quest.setRewardAnomalieId(a.getId());
                            questRepository.save(quest);
                            System.out.println("[Fix] Updated active weekly quest anomaly to: " + a.getName());
                        });
            }
        });
    }

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
    public void recordCompletion(Long dungeonId, String accountName, int totalTurns, generation.grimoire.model.pve.CombatSession session) {
        // Vérifier la quête daily
        questRepository.findByTypeAndActiveTrue("DAILY").ifPresent(quest -> {
            if (quest.getDungeonId().equals(dungeonId)) {
                HuntingQuestEntry entry = entryRepository.findByQuestIdAndAccountName(quest.getId(), accountName).orElse(new HuntingQuestEntry());
                entry.setQuest(quest);
                entry.setAccountName(accountName);
                entry.setCompletionCount(entry.getCompletionCount() + 1);
                
                if (entry.getFirstCompletionTime() == null) {
                    entry.setFirstCompletionTime(Instant.now());
                }

                // Check challenges based on duo
                if (quest.getDailyChallengeDuo() != null && session != null) {
                    boolean c1Failed = false;
                    boolean c2Failed = false;
                    switch (quest.getDailyChallengeDuo()) {
                        case "HEADHUNTER":
                            c1Failed = session.isHeadhunterChall1Failed();
                            c2Failed = session.isHeadhunterChall2Failed();
                            break;
                        case "SURGEON":
                            c1Failed = session.isSurgeonChall1Failed();
                            c2Failed = session.isSurgeonChall2Failed();
                            break;
                        case "LONER":
                            c1Failed = session.isLonerChall1Failed();
                            c2Failed = session.isLonerChall2Failed();
                            break;
                        case "IMPATIENT":
                            c1Failed = session.isImpatientChall1Failed();
                            c2Failed = session.isImpatientChall2Failed();
                            break;
                    }
                    boolean c1Run = !c1Failed;
                    boolean c2Run = !c2Failed;
                    int currentChalls = (c1Run ? 1 : 0) + (c2Run ? 1 : 0);
                    int prevChalls = (entry.isChallenge1Completed() ? 1 : 0) + (entry.isChallenge2Completed() ? 1 : 0);
                    
                    if (currentChalls == 2) {
                        entry.setChallenge1Completed(true);
                        entry.setChallenge2Completed(true);
                    } else if (currentChalls == 1 && prevChalls < 2) {
                        if (prevChalls == 0) {
                            entry.setChallenge1Completed(c1Run);
                            entry.setChallenge2Completed(c2Run);
                        }
                    }
                }

                entryRepository.save(entry);
            }
        });

        // Vérifier la quête weekly — classement par meilleur nombre de tours
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

                // Enregistrer le meilleur score (moins de tours = mieux)
                if (entry.getBestTurnCount() == null || totalTurns < entry.getBestTurnCount()) {
                    entry.setBestTurnCount(totalTurns);
                    // Mettre à jour le timestamp quand on améliore son score
                    entry.setFirstCompletionTime(Instant.now());
                } else if (entry.getFirstCompletionTime() == null) {
                    entry.setFirstCompletionTime(Instant.now());
                }

                entryRepository.save(entry);
                recalculateWeeklyRanks(quest.getId());
            }
        });
    }



    private void recalculateWeeklyRanks(Long questId) {
        // Classement par nombre de tours ASC, puis timestamp ASC comme départage
        List<HuntingQuestEntry> ranked = entryRepository.findByQuestIdOrderByBestTurnCountAsc(questId);
        for (int i = 0; i < ranked.size(); i++) {
            ranked.get(i).setRank(i + 1);
        }
        entryRepository.saveAll(ranked);

        // Les joueurs sans bestTurnCount (jamais terminé) → rank = 0
        List<HuntingQuestEntry> all = entryRepository.findByQuestId(questId);
        for (HuntingQuestEntry e : all) {
            if (e.getBestTurnCount() == null && e.getRank() != 0) {
                e.setRank(0);
                entryRepository.save(e);
            }
        }
    }

    /** Calcule le seuil top 20% pour une quête weekly */
    private int getTop20Threshold(Long questId) {
        List<HuntingQuestEntry> ranked = entryRepository.findByQuestIdOrderByBestTurnCountAsc(questId);
        if (ranked.isEmpty()) return 0;
        return Math.max(1, (int) Math.ceil(ranked.size() * 0.2));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Récupération des récompenses
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public String claimReward(Long questId, String username, String tier) {
        HuntingQuestEntry entry = entryRepository.findByQuestIdAndAccountName(questId, username)
                .orElseThrow(() -> new IllegalArgumentException("Pas d'entrée trouvée pour cette quête."));

        HuntingQuest quest = entry.getQuest();
        if ("WEEKLY".equals(quest.getType()) && entry.isRewardClaimed()) {
            throw new IllegalStateException("Récompense déjà récupérée.");
        }

        // Vérifier éligibilité
        if ("DAILY".equals(quest.getType())) {
            if (!quest.isActive() && quest.getEndDate().isBefore(java.time.LocalDate.now(ZONE))) {
                throw new IllegalStateException("La quête journalière a expiré.");
            }

            int baseGold = quest.getDungeonLevel() * Math.max(1, quest.getRequiredSecretLevel()) * quest.getDungeonRoomCount();
            int goldToGive = 0;

            if ("BRONZE".equalsIgnoreCase(tier)) {
                if (entry.isRewardBronzeClaimed()) throw new IllegalStateException("Récompense Bronze déjà récupérée.");
                if (entry.getCompletionCount() == 0) throw new IllegalStateException("Vous n'avez pas terminé le donjon.");
                goldToGive = baseGold;
                entry.setRewardBronzeClaimed(true);
            } else if ("SILVER".equalsIgnoreCase(tier)) {
                if (entry.isRewardSilverClaimed()) throw new IllegalStateException("Récompense Argent déjà récupérée.");
                int completedChalls = (entry.isChallenge1Completed() ? 1 : 0) + (entry.isChallenge2Completed() ? 1 : 0);
                if (completedChalls < 1) throw new IllegalStateException("Vous n'avez pas réussi au moins 1 challenge.");
                
                goldToGive = (int) (baseGold * 2.00); 
                entry.setRewardSilverClaimed(true);
            } else if ("GOLD".equalsIgnoreCase(tier)) {
                if (entry.isRewardGoldClaimed()) throw new IllegalStateException("Récompense Or déjà récupérée.");
                int completedChalls = (entry.isChallenge1Completed() ? 1 : 0) + (entry.isChallenge2Completed() ? 1 : 0);
                if (completedChalls < 2) throw new IllegalStateException("Vous n'avez pas réussi les 2 challenges.");
                
                goldToGive = (int) (baseGold * 3.00);
                entry.setRewardGoldClaimed(true);
            } else {
                throw new IllegalStateException("Tier inconnu: " + tier);
            }

            AppUser user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));
            user.setMonnaie(user.getMonnaie() + goldToGive);
            userRepository.save(user);

            // Si tout est claim, on peut set rewardClaimed à true pour simplifier
            if (entry.isRewardBronzeClaimed() && entry.isRewardSilverClaimed() && entry.isRewardGoldClaimed()) {
                entry.setRewardClaimed(true);
            }

            entryRepository.save(entry);

            return goldToGive + " pièces d'or récupérées !";
        } else if ("WEEKLY".equals(quest.getType())) {
            int threshold = getTop20Threshold(quest.getId());
            if (entry.getRank() < 1 || entry.getRank() > threshold) {
                throw new IllegalStateException("Vous n'êtes pas dans le top 20% (top " + threshold + ").");
            }
            // Vérifier que la quête weekly est récupérable (fin + 7 jours max)
            if (quest.getEndDate().plusWeeks(1).isBefore(LocalDate.now(ZONE))) {
                throw new IllegalStateException("La période de récupération a expiré.");
            }

            Anomalie template = null;
            if (quest.getRewardAnomalieId() != null) {
                template = anomalieRepository.findById(quest.getRewardAnomalieId().longValue()).orElse(null);
            }

            if (template == null) {
                // Fallback si la quête n'avait pas d'anomalie pré-tirée (ou introuvable)
                String secret = quest.getRequiredSecret();
                List<Anomalie> templates = anomalieRepository.findByIsTemplateTrue().stream()
                        .filter(a -> a.getLevel() >= 2)
                        .filter(a -> a.getSpiritualite() != null && a.getSpiritualite().name().equalsIgnoreCase(secret))
                        .collect(Collectors.toList());

                if (templates.isEmpty()) {
                    templates = anomalieRepository.findByIsTemplateTrue().stream()
                            .filter(a -> a.getLevel() >= 2)
                            .collect(Collectors.toList());
                }

                if (templates.isEmpty()) {
                    throw new IllegalStateException("Aucune anomalie disponible comme récompense.");
                }

                template = templates.get(new Random().nextInt(templates.size()));
            }
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
            user.getDiscoveredItems().add(reward.getName());
            userRepository.save(user);

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

            int threshold = getTop20Threshold(quest.getId());
            long totalParticipants = entryRepository.findByQuestIdOrderByBestTurnCountAsc(quest.getId()).size();
            result.put("top20Threshold", threshold);
            result.put("totalParticipants", totalParticipants);

            if (quest.getRewardAnomalieId() != null) {
                anomalieRepository.findById(quest.getRewardAnomalieId().longValue())
                        .ifPresent(a -> result.put("rewardAnomalie", anomalieToMap(a)));
            } else {
                result.put("reward", "Anomalie Niv.2+ correspondant au secret du donjon");
            }

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

                int prevThreshold = getTop20Threshold(prev.getId());
                long prevTotal = entryRepository.findByQuestIdOrderByBestTurnCountAsc(prev.getId()).size();
                prevData.put("top20Threshold", prevThreshold);
                prevData.put("totalParticipants", prevTotal);

                if (prev.getRewardAnomalieId() != null) {
                    anomalieRepository.findById(prev.getRewardAnomalieId().longValue())
                            .ifPresent(a -> prevData.put("rewardAnomalie", anomalieToMap(a)));
                } else {
                    prevData.put("reward", "Anomalie Niv.2+ correspondant au secret du donjon");
                }

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
        if (questId == null)
            return List.of();
        // Récupérer toutes les entrées triées
        HuntingQuest quest = questRepository.findById(questId).orElse(null);
        if (quest == null)
            return List.of();

        List<HuntingQuestEntry> entries;
        if ("DAILY".equals(quest.getType())) {
            entries = entryRepository.findByQuestIdOrderByFirstCompletionTimeAsc(questId);
        } else {
            entries = entryRepository.findByQuestIdOrderByBestTurnCountAsc(questId);
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
        m.put("dailyChallengeDuo", q.getDailyChallengeDuo());
        return m;
    }

    private Map<String, Object> entryToMap(HuntingQuestEntry e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("accountName", e.getAccountName());
        m.put("completionCount", e.getCompletionCount());
        m.put("bestTurnCount", e.getBestTurnCount());
        m.put("firstCompletionTime", e.getFirstCompletionTime() != null ? e.getFirstCompletionTime().toString() : null);
        m.put("rank", e.getRank());
        m.put("rewardClaimed", e.isRewardClaimed());
        m.put("challenge1Completed", e.isChallenge1Completed());
        m.put("challenge2Completed", e.isChallenge2Completed());
        m.put("rewardBronzeClaimed", e.isRewardBronzeClaimed());
        m.put("rewardSilverClaimed", e.isRewardSilverClaimed());
        m.put("rewardGoldClaimed", e.isRewardGoldClaimed());
        return m;
    }

    private Map<String, Object> computeDailyRewardInfo(HuntingQuest quest) {
        int baseGold = quest.getDungeonLevel() * Math.max(1, quest.getRequiredSecretLevel()) * quest.getDungeonRoomCount();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("1st", baseGold + 100);
        m.put("2nd", baseGold + 50);
        m.put("3rd", baseGold + 25);
        m.put("other", (baseGold + 25) / 2);
        m.put("base", baseGold);
        return m;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Init au boot
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public void ensureQuestsExist() {
        expireOldQuests();
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

    private Map<String, Object> anomalieToMap(Anomalie anomalie) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", anomalie.getName());
        map.put("spiritualite", anomalie.getSpiritualite() != null ? anomalie.getSpiritualite().name() : null);
        map.put("category", anomalie.getCategory() != null ? anomalie.getCategory().name() : null);
        map.put("description", anomalie.getDescription());
        map.put("level", anomalie.getLevel());
        map.put("magicObject", anomalie.isMagicObject());
        return map;
    }
}
