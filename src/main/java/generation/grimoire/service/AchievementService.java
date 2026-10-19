package generation.grimoire.service;

import generation.grimoire.dto.achievement.AchievementDTO;
import generation.grimoire.dto.achievement.UserAchievementsResponseDTO;
import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.entity.achievement.UserAchievement;
import generation.grimoire.entity.achievement.UserCustomAchievement;
import generation.grimoire.entity.achievement.UserStatistics;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.AchievementType;
import generation.grimoire.enumeration.EquipmentRarity;
import generation.grimoire.enumeration.RecipeRewardType;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AlchemyRecipeRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.ShopUpgradeConfigRepository;
import generation.grimoire.repository.UserAchievementRepository;
import generation.grimoire.repository.UserCustomAchievementRepository;
import generation.grimoire.repository.UserStatisticsRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class AchievementService {

    private final UserAchievementRepository userAchievementRepository;
    private final UserStatisticsRepository userStatisticsRepository;
    private final UserRepository userRepository;
    private final AlchemyRecipeRepository alchemyRecipeRepository;
    private final ShopUpgradeConfigRepository shopUpgradeConfigRepository;
    private final EquipmentRepository equipmentRepository;
    private final DonjonRepository donjonRepository;
    private final UserCustomAchievementRepository userCustomAchievementRepository;

    public AchievementService(UserAchievementRepository userAchievementRepository,
                              UserStatisticsRepository userStatisticsRepository,
                              UserRepository userRepository,
                              AlchemyRecipeRepository alchemyRecipeRepository,
                              ShopUpgradeConfigRepository shopUpgradeConfigRepository,
                              EquipmentRepository equipmentRepository,
                              DonjonRepository donjonRepository,
                              generation.grimoire.repository.UserCustomAchievementRepository userCustomAchievementRepository) {
        this.userAchievementRepository = userAchievementRepository;
        this.userStatisticsRepository = userStatisticsRepository;
        this.userRepository = userRepository;
        this.alchemyRecipeRepository = alchemyRecipeRepository;
        this.shopUpgradeConfigRepository = shopUpgradeConfigRepository;
        this.equipmentRepository = equipmentRepository;
        this.donjonRepository = donjonRepository;
        this.userCustomAchievementRepository = userCustomAchievementRepository;
    }

    @Transactional
    public UserStatistics getOrCreateStats(AppUser user) {
        return userStatisticsRepository.findByUser_Id(user.getId())
                .orElseGet(() -> userStatisticsRepository.save(new UserStatistics(user)));
    }

    @Transactional
    public UserAchievement getOrCreateAchievement(AppUser user, AchievementType type) {
        return userAchievementRepository.findByUserIdAndAchievement(user.getId(), type)
                .orElseGet(() -> userAchievementRepository.save(new UserAchievement(user, type)));
    }

    @Transactional
    public boolean unlock(AppUser user, AchievementType type) {
        if (user == null || type == null) return false;
        UserAchievement ua = getOrCreateAchievement(user, type);
        if (ua.isUnlocked()) return false;

        ua.setUnlocked(true);
        ua.setUnlockedAt(Instant.now());
        if (type.getGoalValue() > 0) {
            ua.setCurrentProgress(Math.max(ua.getCurrentProgress(), type.getGoalValue()));
        } else if (ua.getCurrentProgress() <= 0) {
            ua.setCurrentProgress(1);
        }
        userAchievementRepository.save(ua);

        if (type.getRewardTitle() != null && !type.getRewardTitle().isBlank()) {
            if (user.getUnlockedTitles() == null) {
                user.setUnlockedTitles(new HashSet<>());
            }
            user.getUnlockedTitles().add(type.getRewardTitle());
            if (user.getActiveTitle() == null || user.getActiveTitle().isBlank()) {
                user.setActiveTitle(type.getRewardTitle());
            }
            userRepository.save(user);
        }
        return true;
    }

    @Transactional
    public void setProgress(AppUser user, AchievementType type, int progress, int goal) {
        if (user == null || type == null) return;
        UserAchievement ua = getOrCreateAchievement(user, type);
        ua.setCurrentProgress(progress);
        if (progress >= goal && goal > 0 && !ua.isUnlocked()) {
            unlock(user, type);
        } else {
            userAchievementRepository.save(ua);
        }
    }

    @Transactional
    public void syncRetroactive(AppUser user) {
        if (user == null) return;
        UserStatistics stats = getOrCreateStats(user);

        // 1. MAITRE_DE_LA_VERITE (11 secrets au niveau 3)
        Map<String, Integer> secrets = user.getUnlockedSecrets();
        int secretsLvl3 = 0;
        if (secrets != null) {
            for (Integer lvl : secrets.values()) {
                if (lvl != null && lvl >= 3) {
                    secretsLvl3++;
                }
            }
        }
        setProgress(user, AchievementType.MAITRE_DE_LA_VERITE, secretsLvl3, 11);

        // 2. RECETTES ALCHIMIE
        List<AlchemyRecipe> allRecipes = alchemyRecipeRepository.findAll();
        Set<Long> seen = user.getSeenAlchemyRecipes() != null ? user.getSeenAlchemyRecipes() : Collections.emptySet();

        int totalConsumables = 0;
        int seenConsumables = 0;
        int totalEquipments = 0;
        int seenEquipments = 0;
        int totalAnomalies = 0;
        int seenAnomalies = 0;

        for (AlchemyRecipe r : allRecipes) {
            if (r.getRewardType() == RecipeRewardType.GIVE_CONSUMABLE) {
                totalConsumables++;
                if (seen.contains(r.getId())) seenConsumables++;
            } else if (r.getRewardType() == RecipeRewardType.GIVE_EQUIPMENT) {
                totalEquipments++;
                if (seen.contains(r.getId())) seenEquipments++;
            } else if (r.getRewardType() == RecipeRewardType.GIVE_ANOMALY || r.getRewardType() == RecipeRewardType.UPGRADE_ANOMALY) {
                totalAnomalies++;
                if (seen.contains(r.getId())) seenAnomalies++;
            }
        }

        if (totalConsumables > 0) {
            setProgress(user, AchievementType.GRAND_GOURMET, seenConsumables, totalConsumables);
        }
        if (totalEquipments > 0) {
            setProgress(user, AchievementType.COLLECTIONNEUR, seenEquipments, totalEquipments);
        }
        if (totalAnomalies > 0) {
            setProgress(user, AchievementType.MYSTICISME, seenAnomalies, totalAnomalies);
        }

        // 3. FORTUNE & ÉCONOMIE
        int currentGold = (int) user.getMonnaie();
        setProgress(user, AchievementType.CERCUEIL_DORE, Math.min(10000, currentGold), 10000);

        int maxShopLevel = shopUpgradeConfigRepository.findAll().stream()
                .mapToInt(c -> c.getTargetLevel())
                .max().orElse(4);
        setProgress(user, AchievementType.CLIENT_FIDELE, user.getShopLevel() >= maxShopLevel ? 1 : 0, 1);

        // 4. STATS COMPTEURS
        setProgress(user, AchievementType.COURAGE_FUYONS, stats.getFleeCount(), 10);
        setProgress(user, AchievementType.GRAND_TRANSMUTATEUR, stats.getTransmutationsCount(), 50);
        setProgress(user, AchievementType.PILLEUR_INSATIABLE, stats.getChestsOpenedCount(), 100);
        setProgress(user, AchievementType.ZERO_DECHET, stats.getEquipmentsRecycledCount(), 50);
        setProgress(user, AchievementType.CLIENT_VIP, (int) Math.min(5000, stats.getGoldSpentInShop()), 5000);

        boolean hasCursedItem = equipmentRepository.findByUser_Username(user.getUsername()).stream()
                .anyMatch(e -> e.getRarity() == generation.grimoire.enumeration.EquipmentRarity.MAUDIT);
        if (hasCursedItem) {
            unlock(user, AchievementType.MALEDICTION);
        }

        // 5. PROGRESSION DES DONJONS (Donjons libres & Secrets)
        syncDungeonProgression(user);
    }

    private String normalizeSecretName(String s) {
        if (s == null) return "";
        String normalized = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.replace('’', '\'');
        return normalized.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private boolean isSameSecret(String s1, String s2) {
        if (s1 == null || s2 == null) return false;
        return normalizeSecretName(s1).equals(normalizeSecretName(s2));
    }

    @Transactional
    public void syncDungeonProgression(AppUser user) {
        if (user == null) return;
        List<Donjon> allDonjons = donjonRepository.findAll();
        Set<Long> completedIds = user.getCompletedDungeons() != null ? user.getCompletedDungeons() : Collections.emptySet();

        for (AchievementType type : AchievementType.values()) {
            if (type.isFreeDungeons()) {
                List<Donjon> freeDonjons = allDonjons.stream()
                        .filter(d -> d.getRequiredSecret() == null || d.getRequiredSecret().trim().isEmpty())
                        .toList();
                int total = freeDonjons.size();
                int progress = (int) freeDonjons.stream()
                        .filter(d -> completedIds.contains(d.getId()))
                        .count();
                UserAchievement ua = getOrCreateAchievement(user, type);
                if (total > 0 && progress >= total) {
                    ua.setCurrentProgress(progress);
                    if (!ua.isUnlocked()) {
                        unlock(user, type);
                    } else {
                        userAchievementRepository.save(ua);
                    }
                } else if (!ua.isUnlocked()) {
                    ua.setCurrentProgress(progress);
                    userAchievementRepository.save(ua);
                }
            } else if (type.getRequiredSecret() != null && !type.getRequiredSecret().isBlank()) {
                int reqLevel = type.getRequiredSecretLevel();
                List<Donjon> secretDonjons = allDonjons.stream()
                        .filter(d -> isSameSecret(d.getRequiredSecret(), type.getRequiredSecret())
                                && (d.getRequiredSecretLevel() <= 0 ? 1 : d.getRequiredSecretLevel()) == reqLevel)
                        .toList();
                int total = secretDonjons.size();
                int progress = (int) secretDonjons.stream()
                        .filter(d -> completedIds.contains(d.getId()))
                        .count();
                UserAchievement ua = getOrCreateAchievement(user, type);
                if (total > 0 && progress >= total) {
                    ua.setCurrentProgress(progress);
                    if (!ua.isUnlocked()) {
                        unlock(user, type);
                    } else {
                        userAchievementRepository.save(ua);
                    }
                } else if (!ua.isUnlocked()) {
                    ua.setCurrentProgress(progress);
                    userAchievementRepository.save(ua);
                }
            }
        }
    }

    @Transactional
    public UserAchievementsResponseDTO getAchievementsResponse(AppUser user) {
        syncRetroactive(user);

        List<UserAchievement> userAchievements = userAchievementRepository.findByUserId(user.getId());
        Map<AchievementType, UserAchievement> map = new EnumMap<>(AchievementType.class);
        for (UserAchievement ua : userAchievements) {
            map.put(ua.getAchievement(), ua);
        }

        List<AchievementDTO> dtoList = new ArrayList<>();
        int totalUnlocked = 0;

        List<AlchemyRecipe> allRecipes = alchemyRecipeRepository.findAll();
        int totalConsumables = (int) allRecipes.stream().filter(r -> r.getRewardType() == RecipeRewardType.GIVE_CONSUMABLE).count();
        int totalEquipments = (int) allRecipes.stream().filter(r -> r.getRewardType() == RecipeRewardType.GIVE_EQUIPMENT).count();
        int totalAnomalies = (int) allRecipes.stream().filter(r -> r.getRewardType() == RecipeRewardType.GIVE_ANOMALY || r.getRewardType() == RecipeRewardType.UPGRADE_ANOMALY).count();
        List<Donjon> allDonjons = donjonRepository.findAll();

        for (AchievementType type : AchievementType.values()) {
            UserAchievement ua = map.get(type);
            boolean isUnlocked = ua != null && ua.isUnlocked();
            int progress = ua != null ? ua.getCurrentProgress() : 0;
            String unlockedAt = (ua != null && ua.getUnlockedAt() != null) ? ua.getUnlockedAt().toString() : null;

            if (isUnlocked) totalUnlocked++;

            int effectiveGoal = type.getGoalValue();
            if (type == AchievementType.GRAND_GOURMET) effectiveGoal = Math.max(1, totalConsumables);
            if (type == AchievementType.COLLECTIONNEUR) effectiveGoal = Math.max(1, totalEquipments);
            if (type == AchievementType.MYSTICISME) effectiveGoal = Math.max(1, totalAnomalies);
            if (type.isFreeDungeons()) {
                long count = allDonjons.stream()
                        .filter(d -> d.getRequiredSecret() == null || d.getRequiredSecret().trim().isEmpty())
                        .count();
                effectiveGoal = (int) Math.max(1, count);
            } else if (type.getRequiredSecret() != null && !type.getRequiredSecret().isBlank()) {
                int reqLevel = type.getRequiredSecretLevel();
                long count = allDonjons.stream()
                        .filter(d -> isSameSecret(d.getRequiredSecret(), type.getRequiredSecret())
                                && (d.getRequiredSecretLevel() <= 0 ? 1 : d.getRequiredSecretLevel()) == reqLevel)
                        .count();
                effectiveGoal = (int) Math.max(1, count);
            }

            if (type.isHidden() && !isUnlocked) {
                dtoList.add(new AchievementDTO(
                        type.getCode(),
                        "???",
                        "Ce haut-fait est un mystère scellé...",
                        "lock",
                        type.getCategory().name(),
                        type.getCategory().getLabel(),
                        type.getCategory().getIcon(),
                        "???",
                        0,
                        effectiveGoal,
                        false,
                        null,
                        true
                ));
            } else {
                dtoList.add(new AchievementDTO(
                        type.getCode(),
                        type.getLabel(),
                        type.getDescription(),
                        type.getIcon(),
                        type.getCategory().name(),
                        type.getCategory().getLabel(),
                        type.getCategory().getIcon(),
                        type.getRewardTitle(),
                        progress,
                        effectiveGoal,
                        isUnlocked,
                        unlockedAt,
                        type.isHidden()
                ));
            }
        }

        // === SUCCÈS PERSONNALISÉS (PVE ADMIN / SALLES & BOSS SECRETS) ===
        record CustomAchieveMeta(String title, String description, String icon, String rewardTitle) {}
        Map<String, CustomAchieveMeta> configuredCustoms = new LinkedHashMap<>();

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        for (Donjon d : allDonjons) {
            if (d.getSalles() == null) continue;
            for (generation.grimoire.entity.pve.Salle s : d.getSalles()) {
                if (s.getCustomAchievementTitle() != null && !s.getCustomAchievementTitle().isBlank()) {
                    String title = s.getCustomAchievementTitle().trim();
                    configuredCustoms.putIfAbsent(title, new CustomAchieveMeta(
                            title,
                            s.getCustomAchievementDesc(),
                            s.getCustomAchievementIcon(),
                            s.getCustomAchievementRewardTitle()
                    ));
                }
                if (s.getEventSubType() == generation.grimoire.enumeration.EventSubType.PORTE_ETRANGE && s.getDoorOutcomes() != null) {
                    try {
                        com.fasterxml.jackson.databind.JsonNode outcomes = mapper.readTree(s.getDoorOutcomes());
                        if (outcomes.isArray()) {
                            for (com.fasterxml.jackson.databind.JsonNode outcome : outcomes) {
                                if (outcome.hasNonNull("customAchievementTitle") && !outcome.path("customAchievementTitle").asText().isBlank()) {
                                    String title = outcome.path("customAchievementTitle").asText().trim();
                                    configuredCustoms.putIfAbsent(title, new CustomAchieveMeta(
                                            title,
                                            outcome.path("customAchievementDesc").asText(null),
                                            outcome.path("customAchievementIcon").asText("emoji_events"),
                                            outcome.path("customAchievementRewardTitle").asText(null)
                                    ));
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        List<generation.grimoire.entity.achievement.UserCustomAchievement> userCustoms = userCustomAchievementRepository.findByUser_Id(user.getId());
        Set<String> unlockedCustomTitles = new HashSet<>();
        for (generation.grimoire.entity.achievement.UserCustomAchievement uca : userCustoms) {
            unlockedCustomTitles.add(uca.getTitle());
            dtoList.add(new AchievementDTO(
                    "CUSTOM_" + uca.getId(),
                    uca.getTitle(),
                    uca.getDescription(),
                    uca.getIcon() != null && !uca.getIcon().isBlank() ? uca.getIcon() : "emoji_events",
                    "COMBAT",
                    "Combat & Donjons",
                    "swords",
                    uca.getRewardTitle(),
                    1,
                    1,
                    true,
                    uca.getUnlockedAt() != null ? uca.getUnlockedAt().toString() : null,
                    true
            ));
            totalUnlocked++;
        }

        for (CustomAchieveMeta meta : configuredCustoms.values()) {
            if (!unlockedCustomTitles.contains(meta.title())) {
                dtoList.add(new AchievementDTO(
                        "CUSTOM_LOCKED_" + Math.abs(meta.title().hashCode()),
                        "???",
                        "Ce haut-fait est un mystère scellé...",
                        "lock",
                        "COMBAT",
                        "Combat & Donjons",
                        "swords",
                        "???",
                        0,
                        1,
                        false,
                        null,
                        true
                ));
            }
        }

        int totalCustomsCount = configuredCustoms.size();
        for (String unlockedTitle : unlockedCustomTitles) {
            if (!configuredCustoms.containsKey(unlockedTitle)) {
                totalCustomsCount++;
            }
        }

        return new UserAchievementsResponseDTO(
                dtoList,
                user.getActiveTitle(),
                user.getUnlockedTitles() != null ? user.getUnlockedTitles() : Collections.emptySet(),
                totalUnlocked,
                AchievementType.values().length + totalCustomsCount
        );
    }

    // === HOOKS D'ÉVÉNEMENTS ===

    @Transactional
    public void onFlee(AppUser user) {
        if (user == null) return;
        UserStatistics stats = getOrCreateStats(user);
        stats.setFleeCount(stats.getFleeCount() + 1);
        userStatisticsRepository.save(stats);
        setProgress(user, AchievementType.COURAGE_FUYONS, stats.getFleeCount(), 10);
    }

    @Transactional
    public void onTransmutation(AppUser user) {
        if (user == null) return;
        UserStatistics stats = getOrCreateStats(user);
        stats.setTransmutationsCount(stats.getTransmutationsCount() + 1);
        userStatisticsRepository.save(stats);
        setProgress(user, AchievementType.GRAND_TRANSMUTATEUR, stats.getTransmutationsCount(), 50);
        syncRetroactive(user);
    }

    @Transactional
    public void onChestOpened(AppUser user) {
        if (user == null) return;
        UserStatistics stats = getOrCreateStats(user);
        stats.setChestsOpenedCount(stats.getChestsOpenedCount() + 1);
        userStatisticsRepository.save(stats);
        setProgress(user, AchievementType.PILLEUR_INSATIABLE, stats.getChestsOpenedCount(), 100);
    }

    @Transactional
    public void onMythicDrop(AppUser user) {
        if (user == null) return;
        unlock(user, AchievementType.BENI_DES_DIEUX);
    }

    @Transactional
    public void onEquipmentRecycled(AppUser user, int count) {
        if (user == null || count <= 0) return;
        UserStatistics stats = getOrCreateStats(user);
        stats.setEquipmentsRecycledCount(stats.getEquipmentsRecycledCount() + count);
        userStatisticsRepository.save(stats);
        setProgress(user, AchievementType.ZERO_DECHET, stats.getEquipmentsRecycledCount(), 50);
    }

    @Transactional
    public void onGoldSpentInShop(AppUser user, double amount) {
        if (user == null || amount <= 0) return;
        UserStatistics stats = getOrCreateStats(user);
        stats.setGoldSpentInShop(stats.getGoldSpentInShop() + amount);
        userStatisticsRepository.save(stats);
        setProgress(user, AchievementType.CLIENT_VIP, (int) Math.min(5000, stats.getGoldSpentInShop()), 5000);
    }

    @Transactional
    public void onShopUpgraded(AppUser user, int newLevel) {
        if (user == null) return;
        int maxShopLevel = shopUpgradeConfigRepository.findAll().stream()
                .mapToInt(c -> c.getTargetLevel())
                .max().orElse(4);
        if (newLevel >= maxShopLevel) {
            unlock(user, AchievementType.CLIENT_FIDELE);
        }
    }

    @Transactional
    public void onGoldChanged(AppUser user) {
        if (user == null) return;
        if (user.getMonnaie() >= 10000) {
            unlock(user, AchievementType.CERCUEIL_DORE);
        }
    }

    @Transactional
    public void onCursedDrop(AppUser user) {
        if (user == null) return;
        unlock(user, AchievementType.MALEDICTION);
    }

    @Transactional
    public void onCombatDefeatTurn1(AppUser user) {
        if (user == null) return;
        unlock(user, AchievementType.POINT_FORT_TROP_FAIBLE);
    }

    @Transactional
    public void onCombatRoomVictory(AppUser user, List<Personnage> team) {
        if (user == null || team == null) return;
        for (Personnage p : team) {
            if (p.getHealthCurrent() > 0 && p.getTotalHealthMax() > 0) {
                double hpRatio = (double) p.getHealthCurrent() / p.getTotalHealthMax();
                if (hpRatio <= 0.03) {
                    unlock(user, AchievementType.MIRACULE);
                    break;
                }
            }
        }
    }

    @Transactional
    public void onDungeonVictory(AppUser user, CombatSession session) {
        if (user == null || session == null) return;

        // 1. POINT_FAIBLE_TROP_FORT : aucun héros n'a jamais perdu plus de 5% HP max (ou HP finaux >= 95%)
        if (!session.isLostMoreThan5PercentHp()) {
            boolean allAbove95 = true;
            for (Personnage p : session.getPlayers()) {
                if (p.getTotalHealthMax() > 0 && (double) p.getHealthCurrent() / p.getTotalHealthMax() < 0.95) {
                    allAbove95 = false;
                    break;
                }
            }
            if (allAbove95) {
                unlock(user, AchievementType.POINT_FAIBLE_TROP_FORT);
            }
        }

        // 2. TUEUR_DE_GEANTS : boss secret de niveau 3 avec héros niveau 3 max
        if (session.getDonjonSecret() != null && session.getDonjonSecretLevel() >= 3) {
            boolean allLevel3OrLess = session.getPlayers().stream()
                    .allMatch(p -> p.getVoieLevel() <= 3);
            if (allLevel3OrLess && !session.getPlayers().isEmpty()) {
                unlock(user, AchievementType.TUEUR_DE_GEANTS);
            }
        }

        // 3. SET_PARFAIT : héros avec 4 pièces légendaires
        for (Personnage p : session.getPlayers()) {
            if (p.getEquipments() != null) {
                long legendaryCount = p.getEquipments().stream()
                        .filter(e -> e.getRarity() == EquipmentRarity.LEGENDAIRE)
                        .count();
                if (legendaryCount >= 4) {
                    unlock(user, AchievementType.SET_PARFAIT);
                    break;
                }
            }
        }

        // 4. Progression des donjons (Libres & Secrets)
        syncDungeonProgression(user);
    }

    @Transactional
    public boolean unlockCustomAchievement(AppUser user, String title, String description, String icon, String rewardTitle) {
        if (user == null || title == null || title.isBlank()) return false;
        String cleanTitle = title.trim();
        if (userCustomAchievementRepository.existsByUser_IdAndTitle(user.getId(), cleanTitle)) {
            return false;
        }

        UserCustomAchievement uca = new UserCustomAchievement(
                user,
                cleanTitle,
                description,
                (icon != null && !icon.isBlank()) ? icon.trim() : "emoji_events",
                (rewardTitle != null && !rewardTitle.isBlank()) ? rewardTitle.trim() : null
        );
        userCustomAchievementRepository.save(uca);

        if (rewardTitle != null && !rewardTitle.isBlank()) {
            String cleanReward = rewardTitle.trim();
            if (user.getUnlockedTitles() == null) {
                user.setUnlockedTitles(new HashSet<>());
            }
            user.getUnlockedTitles().add(cleanReward);
            if (user.getActiveTitle() == null || user.getActiveTitle().isBlank()) {
                user.setActiveTitle(cleanReward);
            }
            userRepository.save(user);
        }
        return true;
    }

    @Transactional
    public void checkAndUnlockCustomAchievement(AppUser user, Salle room, CombatSession session) {
        if (user == null || room == null) return;
        String title = room.getCustomAchievementTitle();
        if (title == null || title.isBlank()) return;

        boolean unlocked = unlockCustomAchievement(
                user,
                title,
                room.getCustomAchievementDesc(),
                room.getCustomAchievementIcon(),
                room.getCustomAchievementRewardTitle()
        );

        if (unlocked && session != null) {
            session.addLog("🏆 Succès secret débloqué : " + title.trim() + " !");
            if (room.getCustomAchievementRewardTitle() != null && !room.getCustomAchievementRewardTitle().isBlank()) {
                session.addLog("👑 Titre débloqué : « " + room.getCustomAchievementRewardTitle().trim() + " » !");
            }
        }
    }

    @Transactional
    public void setActiveTitle(AppUser user, String title) {
        if (user == null) return;
        if (title == null || title.isBlank() || title.equals("NONE")) {
            user.setActiveTitle(null);
            userRepository.save(user);
            return;
        }
        if (user.getUnlockedTitles() != null && user.getUnlockedTitles().contains(title)) {
            user.setActiveTitle(title);
            userRepository.save(user);
        } else {
            throw new IllegalArgumentException("Titre non débloqué ou invalide : " + title);
        }
    }
}
