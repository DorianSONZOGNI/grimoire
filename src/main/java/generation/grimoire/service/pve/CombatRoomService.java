package generation.grimoire.service.pve;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.model.pve.ActiveMonster;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.auth.UserRepository;

import generation.grimoire.repository.pve.MonstreRepository;
import generation.grimoire.repository.pve.SalleRepository;
import generation.grimoire.service.PersonnageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Logique d'interaction avec les salles hors-combat :
 * coffres, altérations, marchands, portes étranges, consommables, cordes.
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class CombatRoomService {

    private final PersonnageService personnageService;

    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;
    private final AnomalieRepository anomalieRepository;
    private final SalleRepository salleRepository;
    private final MonstreRepository monstreRepository;
    private final ObjectMapper objectMapper;
    private final CombatTurnService combatTurnService;
    private final SpellAvailabilityService spellAvailabilityService;
    private final HuntingQuestService huntingQuestService;

    void handleRoomStart(CombatSession session) {
        if (session.getCurrentRoom() == null)
            return;

        // Reset le timer de tour pour éviter qu'il ne continue de tourner hors combat
        session.setTurnStartTime(null);

        // Re-fetch la salle pour éviter les LazyInitializationException
        generation.grimoire.entity.pve.Salle freshSalle = salleRepository
                .findById(java.util.Objects.requireNonNull(session.getCurrentRoom().getId()))
                .orElse(session.getCurrentRoom());

        if (freshSalle.getMonsters() != null)
            freshSalle.getMonsters().size();
        if (freshSalle.getLootTable() != null)
            freshSalle.getLootTable().size();

        session.setCurrentRoom(freshSalle);
        session.setRoomExpAccumulated(0);
        session.setRoomGoldAccumulated(0);

        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.COMBAT
                || session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
            session.getEnemies().clear();

            if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
                loadChallenges(session, session.getCurrentRoom().getChallenges());
            } else {
                if (session.getActiveChallenges() == null)
                    session.setActiveChallenges(new ArrayList<>());
                session.getActiveChallenges().clear();
            }

            if (session.getCurrentRoom().getMonsters() != null) {
                for (generation.grimoire.entity.pve.Monstre m : session.getCurrentRoom().getMonsters()) {
                    ActiveMonster am = new ActiveMonster(m);

                    if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
                        applyBossGlobalBuffs(am, session.getCurrentRoom());
                    }

                    session.getEnemies().add(am);
                }
            }
            if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
                session.addLog("Vous entrez dans une salle de BOSS ! Préparez-vous à un affrontement mortel.");
            } else {
                session.addLog("Vous entrez dans une salle de combat ! Préparez-vous.");
            }
            session.setTurnNumber(1);
            for (Personnage p : session.getPlayers()) {
                p.setBanalSpellCastThisTurn(false);
                p.setInstantSpellCastThisTurn(false);
            }
            combatTurnService.rollInitiative(session);
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.TREASURE) {
            session.getEnemies().clear();
            session.addLog("Vous trouvez un trésor !");
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT) {
            session.getEnemies().clear();
            session.addLog("Événement : " + session.getCurrentRoom().getEventText());

            if (session.getCurrentRoom().getEventSubType() == generation.grimoire.enumeration.EventSubType.RENCONTRE) {
                if (session.getCurrentRoom().getLootTable() != null) {
                    java.util.List<LootEntry> lootTable = session.getCurrentRoom().getLootTable();
                    for (int i = 0; i < lootTable.size(); i++) {
                        LootEntry entry = lootTable.get(i);
                        if (Math.random() * 100 < entry.getProbability()) {
                            session.getAvailableMerchantItems().add(i);
                        }
                    }
                }
            }
        }
    }

    private void applyBossGlobalBuffs(ActiveMonster am, generation.grimoire.entity.pve.Salle room) {
        Personnage p = am.getAsPersonnage();
        String globalBuffsJson = room.getGlobalBuffs();
        if (globalBuffsJson == null || globalBuffsJson.trim().isEmpty()) {
            return;
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode buffsNode = mapper.readTree(globalBuffsJson);
            if (buffsNode.isArray()) {
                for (JsonNode buffNode : buffsNode) {
                    String bType = buffNode.path("type").asText();
                    int bVal = buffNode.path("value").asInt(0);
                    int bDur = buffNode.path("duration").asInt(0);

                    if ("HP_PCT".equals(bType)) {
                        int bonusHp = (int) (p.getHealthMax() * (bVal / 100.0));
                        p.setHealthMax(p.getHealthMax() + bonusHp);
                        p.setHealthCurrent(p.getHealthCurrent() + bonusHp);
                        p.getPassiveStates().put("BOSS_BUFF_HP", bVal);
                    } else if ("SHIELD_PCT".equals(bType)) {
                        int shieldAmt = (int) (p.getHealthMax() * (bVal / 100.0));
                        p.addShield(shieldAmt, bDur > 0 ? bDur : -1, "Buff Global Boss");
                        p.getPassiveStates().put("BOSS_BUFF_SHIELD", bVal);
                    } else if ("ARMOR_FLAT".equals(bType)) {
                        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                        eff.setStatAffected(generation.grimoire.enumeration.StatType.ARMURE);
                        eff.setFlatValue(bVal);
                        eff.setDuration(bDur > 0 ? bDur : -1);
                        p.getActiveBuffs().add(eff);
                        p.getPassiveStates().put("BOSS_BUFF_ARMOR", bVal);
                    } else if ("RESIST_FLAT".equals(bType)) {
                        generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                        eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                        eff.setFlatValue(bVal);
                        eff.setDuration(bDur > 0 ? bDur : -1);
                        p.getActiveBuffs().add(eff);
                        p.getPassiveStates().put("BOSS_BUFF_RESIST", bVal);
                    } else if ("BURN_ON_HIT".equals(bType)) {
                        p.getPassiveStates().put("BURN_ON_HIT", bVal);
                        p.getPassiveStates().put("BURN_ON_HIT_DURATION", bDur > 0 ? bDur : 3);
                        p.getPassiveStates().put("BOSS_BUFF_BURN", bVal);
                    } else if ("POISON_ON_HIT".equals(bType)) {
                        p.getPassiveStates().put("POISON_ON_HIT", bVal);
                        p.getPassiveStates().put("POISON_ON_HIT_DURATION", bDur > 0 ? bDur : 3);
                        p.getPassiveStates().put("BOSS_BUFF_POISON", bVal);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadChallenges(CombatSession session, String challengesJson) {
        if (session.getActiveChallenges() == null)
            session.setActiveChallenges(new ArrayList<>());
        session.getActiveChallenges().clear();
        if (challengesJson == null || challengesJson.trim().isEmpty())
            return;
        try {
            JsonNode challengesNode = objectMapper.readTree(challengesJson);
            if (challengesNode.isArray()) {
                for (JsonNode challNode : challengesNode) {
                    generation.grimoire.model.pve.Challenge chall = new generation.grimoire.model.pve.Challenge();
                    chall.setType(challNode.path("type").asText(""));
                    chall.setValue(challNode.path("value").asInt(0));
                    chall.setRewardType(challNode.path("rewardType").asText(""));
                    chall.setRewardValue(challNode.path("rewardValue").asInt(0));
                    chall.setFailed(false);
                    session.getActiveChallenges().add(chall);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Immediate evaluation for MAX_HEROES
        evaluateMaxHeroesChallenge(session);
    }

    private void evaluateMaxHeroesChallenge(CombatSession session) {
        int heroCount = session.getPlayers() != null ? session.getPlayers().size() : 0;
        for (generation.grimoire.model.pve.Challenge c : session.getActiveChallenges()) {
            if ("MAX_HEROES".equals(c.getType())) {
                if (heroCount > c.getValue()) {
                    c.setFailed(true);
                    session.addLog(
                            "❌ Challenge échoué (Max " + c.getValue() + " Héros) : L'équipe est trop nombreuse.");
                } else {
                    session.addLog("✅ Challenge en cours : Terminer avec " + c.getValue() + " héros ou moins.");
                }
            } else if ("MAX_HP_LOSS_PCT".equals(c.getType())) {
                session.addLog("✅ Challenge en cours : Ne perdre aucun héros en dessous de " + (100 - c.getValue())
                        + "% de ses PV.");
            } else if ("MIN_HP_LOSS_PCT".equals(c.getType())) {
                session.addLog(
                        "✅ Challenge en cours : Finir le combat avec moins de " + (100 - c.getValue()) + "% PV.");
            }
        }
    }

    CombatSession openChest(CombatSession session) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.TREASURE) {
            throw new RuntimeException("Ce n'est pas une salle de trésor !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("Le coffre a déjà été ouvert.");
        }

        int baseGold = session.getCurrentRoom().getTreasureGold();
        int baseExp = session.getCurrentRoom().getTreasureExp();
        
        List<Personnage> activePlayers = session.getPlayers().stream()
                .filter(session::isEligibleForRewards).collect(java.util.stream.Collectors.toList());
        int expPerHero = baseExp / Math.max(1, activePlayers.size());

        java.util.Map<String, generation.grimoire.model.pve.RoomInteractionChoice> choices = session.getPlayerRoomChoices();
        if (choices == null) choices = new java.util.HashMap<>();

        // Group processing by user
        java.util.Map<String, List<Personnage>> heroesByUser = new java.util.HashMap<>();
        for (Personnage p : activePlayers) {
            AppUser u = p.getUser();
            if (u != null && u.getUsername() != null) {
                heroesByUser.computeIfAbsent(u.getUsername(), k -> new ArrayList<>()).add(p);
            }
        }

        for (java.util.Map.Entry<String, List<Personnage>> userEntry : heroesByUser.entrySet()) {
            String username = userEntry.getKey();
            List<Personnage> userHeroes = userEntry.getValue();
            AppUser u = userHeroes.get(0).getUser();
            
            generation.grimoire.model.pve.RoomInteractionChoice choice = choices.get(username);
            if (choice == null) {
                continue;
            }

            boolean useKey = "OPEN_KEY".equals(choice.getActionType());
            double extraLootPercent = 0.0;

            if (useKey) {
                Equipment key = null;
                for (Equipment eq : session.getActiveConsumables()) {
                    if (eq.getId().equals(choice.getItemId()) && eq.getConsumableCategory() == generation.grimoire.enumeration.ConsumableCategory.CLE) {
                        key = eq;
                        break;
                    }
                }
                if (key == null) {
                    session.logInteractionResult(username, "La clé a déjà été utilisée, ouverture simple du coffre.");
                    useKey = false;
                    extraLootPercent = 0.0;
                } else {
                    extraLootPercent = key.getSpecialEffectValue() > 0 ? key.getSpecialEffectValue() : 10.0;
                    session.getActiveConsumables().remove(key);
                    equipmentRepository.delete(key);
                    session.logInteractionResult(username, "Vous utilisez " + key.getName() + " (+ " + extraLootPercent + "% proba).");
                }
            }

            // Give XP
            int totalActualExp = 0;
            for (Personnage p : userHeroes) {
                int actualExp = expPerHero;
                if (!u.getCompletedDungeons().contains(session.getDungeonId())) {
                    actualExp *= 2;
                }
                p.setExperience(p.getExperience() + actualExp);
                personnageService.save(p);
                totalActualExp += actualExp;
            }
            
            // Give Gold
            u.setMonnaie(u.getMonnaie() + baseGold);
            userRepository.save(u);
            session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + baseGold);

            session.logInteractionResult(username, "Vous trouvez " + baseGold + " Or et gagnez " + totalActualExp + " XP.");

            // Loot
            java.util.Random rnd = new java.util.Random();
            if (session.getCurrentRoom().getLootTable() != null) {
                for (LootEntry entry : session.getCurrentRoom().getLootTable()) {
                    double roll = rnd.nextDouble() * 100.0;
                    double proba = entry.getProbability() + extraLootPercent;
                    if (roll <= proba) {
                        if (entry.getEquipment() != null) {
                            Equipment template = entry.getEquipment();
                            Equipment clone = new Equipment();
                            clone.copyStatsFrom(template);
                            clone.setTemplate(false);
                            clone.setUser(u);
                            clone.setOwnerUsername(username);
                            equipmentRepository.save(clone);
                            u.getDiscoveredItems().add(clone.getName());
                            
                            if (clone.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE) {
                                // Add to session consumables
                                double currentWeight = session.getActiveConsumables().stream()
                                    .filter(java.util.Objects::nonNull).mapToDouble(e -> e.calculateWeight()).sum();
                                double maxWeight = 10.0 + 5.0 * session.getPlayers().size();
                                if (currentWeight + clone.calculateWeight() <= maxWeight) {
                                    session.getActiveConsumables().add(clone);
                                    session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (ajouté à l'équipe).");
                                } else {
                                    session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (coffre fort).");
                                }
                            } else {
                                session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (ajouté à l'inventaire).");
                            }
                        } else if (entry.getSpecialItemName() != null && !entry.getSpecialItemName().trim().isEmpty()) {
                            Anomalie template = anomalieRepository.findFirstByNameAndIsTemplateTrueOrderByIdAsc(entry.getSpecialItemName());
                            if (template != null) {
                                Anomalie clone = new Anomalie();
                                clone.setName(template.getName());
                                clone.setDescription(template.getDescription());
                                clone.setSpiritualite(template.getSpiritualite());
                                clone.setCategory(template.getCategory());
                                clone.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                                clone.setMagicObject(template.isMagicObject());
                                clone.setTemplate(false);
                                clone.setOwnerUsername(username);
                                clone.setUser(u);
                                anomalieRepository.save(clone);
                                u.getDiscoveredItems().add(clone.getName());
                                session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (ajouté à l'inventaire).");
                            }
                        }
                    }
                }
            }
        }
        
        session.setRoomEventCompleted(true);
        session.addLog("Le groupe a fouillé le trésor.");
        return session;
    }

    CombatSession acceptAlteration(CombatSession session) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.EVENT ||
                session.getCurrentRoom().getEventSubType() != generation.grimoire.enumeration.EventSubType.ALTERATION) {
            throw new RuntimeException("Ce n'est pas une salle d'altération !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("L'événement a déjà été résolu.");
        }

        generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
        String altType = room.getAlterationType() != null ? room.getAlterationType() : "VIE_XP";
        java.util.Map<String, generation.grimoire.model.pve.RoomInteractionChoice> choices = session.getPlayerRoomChoices();
        if (choices == null) choices = new java.util.HashMap<>();

        // Group processing by user
        List<Personnage> activePlayers = session.getPlayers().stream()
                .filter(session::isEligibleForRewards).collect(java.util.stream.Collectors.toList());

        java.util.Map<String, List<Personnage>> heroesByUser = new java.util.HashMap<>();
        for (Personnage p : activePlayers) {
            AppUser u = p.getUser();
            if (u != null && u.getUsername() != null) {
                heroesByUser.computeIfAbsent(u.getUsername(), k -> new ArrayList<>()).add(p);
            }
        }

        for (java.util.Map.Entry<String, List<Personnage>> userEntry : heroesByUser.entrySet()) {
            String username = userEntry.getKey();
            List<Personnage> userHeroes = userEntry.getValue();
            AppUser u = userHeroes.get(0).getUser();
            
            generation.grimoire.model.pve.RoomInteractionChoice choice = choices.get(username);
            if (choice == null || "PASS".equals(choice.getActionType())) {
                session.logInteractionResult(username, "Vous avez passé votre chemin.");
                continue;
            }

            if ("VIE_XP".equals(altType)) {
                int effect = room.getAlterationHpAmount();
                int expEffect = room.getAlterationExpAmount();

                boolean allHeroesReady = true;
                for (Personnage p : userHeroes) {
                    boolean hasEnoughHp = !(effect < 0 && p.getHealthCurrent() <= -effect);
                    boolean hasEnoughXp = !(expEffect < 0 && p.getExperience() < -expEffect);
                    if (!hasEnoughHp || !hasEnoughXp) {
                        allHeroesReady = false;
                        session.logInteractionResult(username, "Prérequis insuffisants pour l'altération sur " + p.getName() + ".");
                    }
                }

                if (allHeroesReady) {
                    for (Personnage p : userHeroes) {
                        if (effect > 0)
                            p.heal(effect);
                        else if (effect < 0)
                            p.takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);

                        p.setExperience(p.getExperience() + expEffect);
                        if (p.getExperience() < 0)
                            p.setExperience(0);

                        personnageService.save(p);

                        String rewardType = room.getAlterationRewardType();
                        if ("SPIRITUAL_XP".equals(rewardType)) {
                            int spXp = room.getAlterationSpiritualXpReward();
                            if (spXp != 0) {
                                p.setSpiritualiteExperience(Math.max(0, p.getSpiritualiteExperience() + spXp));
                                personnageService.save(p);
                            }
                        }
                    }

                    session.logInteractionResult(username, "Effet appliqué : " + (effect >= 0 ? "+" : "") + effect + " PV et " + (expEffect >= 0 ? "+" : "") + expEffect + " XP.");

                    String rewardType = room.getAlterationRewardType();
                    if ("SPIRITUAL_XP".equals(rewardType)) {
                        int spXp = room.getAlterationSpiritualXpReward();
                        if (spXp > 0) {
                            session.logInteractionResult(username, "L'altération vous accorde " + spXp + " XP de Spiritualité.");
                        } else if (spXp < 0) {
                            session.logInteractionResult(username, "L'altération vous retire " + Math.abs(spXp) + " XP de Spiritualité.");
                        }
                    }

                    if ("SPECIAL_ITEM".equals(rewardType)) {
                        String itemReward = room.getAlterationSpecialItemReward();
                        if (itemReward != null && !itemReward.isEmpty()) {
                            java.util.List<Anomalie> templates = anomalieRepository.findByName(itemReward);
                            if (!templates.isEmpty()) {
                                Anomalie template = templates.get(0);
                                Anomalie clone = new Anomalie();
                                clone.setName(template.getName());
                                clone.setDescription(template.getDescription());
                                clone.setSpiritualite(template.getSpiritualite());
                                clone.setCategory(template.getCategory());
                                clone.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                                clone.setMagicObject(template.isMagicObject());
                                clone.setTemplate(false);
                                clone.setOwnerUsername(username);
                                clone.setUser(u);
                                anomalieRepository.save(clone);
                                session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (Item Spécial) !");
                            }
                        }
                    }
                }
            } else if ("ITEM".equals(altType)) {
                String reqItem = room.getAlterationRequiredItem();
                java.util.List<Anomalie> anomalies = anomalieRepository.findByOwnerUsername(username);
                Anomalie toConsume = anomalies.stream()
                        .filter(a -> reqItem != null && reqItem.equals(a.getName()))
                        .findFirst()
                        .orElse(null);

                if (toConsume == null) {
                    session.logInteractionResult(username, "Vous ne possédez pas l'item requis : " + reqItem + ".");
                    continue;
                }

                consumeAnomalie(u, toConsume);
                session.logInteractionResult(username, "Vous avez sacrifié l'item : " + reqItem + " !");

                String rewardType = room.getAlterationRewardType();
                if ("SPIRITUAL_XP".equals(rewardType)) {
                    int spXp = room.getAlterationSpiritualXpReward();
                    if (spXp != 0) {
                        for (Personnage p : userHeroes) {
                            p.setSpiritualiteExperience(Math.max(0, p.getSpiritualiteExperience() + spXp));
                            personnageService.save(p);
                        }
                        if (spXp > 0) {
                            session.logInteractionResult(username, "L'altération vous accorde " + spXp + " XP de Spiritualité.");
                        } else {
                            session.logInteractionResult(username, "L'altération vous retire " + Math.abs(spXp) + " XP de Spiritualité.");
                        }
                    }
                } else if ("SPECIAL_ITEM".equals(rewardType)) {
                    String itemReward = room.getAlterationSpecialItemReward();
                    if (itemReward != null && !itemReward.isEmpty()) {
                        java.util.List<Anomalie> templates = anomalieRepository.findByName(itemReward);
                        if (!templates.isEmpty()) {
                            Anomalie template = templates.get(0);
                            Anomalie clone = new Anomalie();
                            clone.setName(template.getName());
                            clone.setDescription(template.getDescription());
                            clone.setSpiritualite(template.getSpiritualite());
                            clone.setCategory(template.getCategory());
                            clone.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                            clone.setMagicObject(template.isMagicObject());
                            clone.setTemplate(false);
                            clone.setOwnerUsername(username);
                            clone.setUser(u);
                            anomalieRepository.save(clone);
                            session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (Item Spécial) !");
                        }
                    }
                }
            } else if ("AUTEL".equals(altType)) {
                if (!"SACRIFICE".equals(choice.getActionType()) || choice.getItemId() == null) {
                    session.logInteractionResult(username, "Vous avez ignoré l'autel.");
                    continue;
                }

                long itemId = choice.getItemId();
                Anomalie toDestroy = anomalieRepository.findById(itemId).orElse(null);
                if (toDestroy == null || !u.getUsername().equals(toDestroy.getOwnerUsername())) {
                    session.logInteractionResult(username, "Anomalie introuvable !");
                    continue;
                }

                String reqSp = room.getAltarRequiredSpirituality();
                if (reqSp != null && toDestroy.getSpiritualite() != null
                        && !toDestroy.getSpiritualite().name().equals(reqSp)) {
                    session.logInteractionResult(username, "L'autel réclame une offrande de spiritualité " + reqSp + ".");
                    continue;
                }

                String anomalyName = toDestroy.getName();
                consumeAnomalie(u, toDestroy);
                session.logInteractionResult(username, "Vous avez sacrifié l'anomalie : " + anomalyName + ".");

                String rewardType = room.getAltarRewardType();
                int rewardValue = room.getAltarRewardValue();
                int level = toDestroy.getLevel() != null ? toDestroy.getLevel() : 1;
                double multiplier = level == 1 ? 1.0 : (level == 2 ? 1.6 : 2.4);

                if ("GOLD".equals(rewardType)) {
                    int multipliedValue = (int) Math.round(rewardValue * multiplier);
                    u.setMonnaie(u.getMonnaie() + multipliedValue);
                    userRepository.save(u);
                    session.logInteractionResult(username, "L'autel vous a offert " + multipliedValue + " Or !");
                } else if ("XP".equals(rewardType)) {
                    int multipliedValue = (int) Math.round(rewardValue * multiplier);
                    for (Personnage p : userHeroes) {
                        p.setSpiritualiteExperience(p.getSpiritualiteExperience() + multipliedValue);
                        personnageService.save(p);
                    }
                    session.logInteractionResult(username, "L'autel vous a accordé " + multipliedValue + " XP de Spiritualité.");
                } else if ("ITEM".equals(rewardType)) {
                    Equipment template = room.getAltarRewardEquipment();
                    double rarityMultiplier = 1.0;
                    if (template != null && template.getRarity() != null) {
                        switch (template.getRarity().name()) {
                            case "COMMUN": rarityMultiplier = 1.5; break;
                            case "INHABITUEL": rarityMultiplier = 1.3; break;
                            case "RARE": rarityMultiplier = 1.15; break;
                            case "MYTHIQUE": rarityMultiplier = 1.0; break;
                            case "EPIQUE": rarityMultiplier = 0.85; break;
                            case "LEGENDAIRE": rarityMultiplier = 0.70; break;
                            case "RELIQUE": rarityMultiplier = 0.55; break;
                            case "MAUDIT": rarityMultiplier = 0.40; break;
                        }
                    }
                    
                    int baseChance = (int) Math.round(90 - 65 * Math.exp(-0.64 * (level - 1)));
                    int chance = (int) Math.round(baseChance * rarityMultiplier);
                    if (chance > 100) chance = 100;
                    if (chance < 1) chance = 1;

                    boolean success = new java.util.Random().nextInt(100) < chance;

                    if (success) {
                        if (template != null) {
                            Equipment clone = new Equipment();
                            clone.copyStatsFrom(template);
                            clone.setTemplate(false);
                            clone.setUser(u);
                            clone.setOwnerUsername(username);
                            equipmentRepository.save(clone);

                            if (clone.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE) {
                                double currentWeight = session.getActiveConsumables().stream()
                                        .filter(java.util.Objects::nonNull).mapToDouble(e -> e.calculateWeight()).sum();
                                double maxWeight = 10.0 + 5.0 * session.getPlayers().size();

                                if (currentWeight + clone.calculateWeight() <= maxWeight) {
                                    session.getActiveConsumables().add(clone);
                                    session.logInteractionResult(username, "L'autel a offert l'équipement : " + template.getName() + " (ajouté au groupe).");
                                } else {
                                    session.logInteractionResult(username, "L'autel a offert l'équipement : " + template.getName() + " (envoyé au coffre).");
                                }
                            } else {
                                u.getDiscoveredItems().add(clone.getName());
                                session.logInteractionResult(username, "Objet trouvé : " + clone.getName() + " (Autel) !");
                            }
                        }
                    } else {
                        session.logInteractionResult(username, "L'autel a consumé votre offrande sans vous accorder d'équipement...");
                    }
                }
            }
        }

        session.setRoomEventCompleted(true);
        session.addLog("Le groupe a fait ses choix face à l'événement.");
        return session;
    }

    CombatSession useRope(CombatSession session) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.EVENT ||
                session.getCurrentRoom().getEventSubType() != generation.grimoire.enumeration.EventSubType.PIEGE) {
            throw new RuntimeException("Ce n'est pas un piège !");
        }
        if (!session.getCurrentRoom().isTrapHasRopeOption()) {
            throw new RuntimeException("Vous ne pouvez pas utiliser de corde ici.");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("L'événement a déjà été résolu.");
        }

        generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
        int hpPct = room.getTrapDamageHpPct() != null ? room.getTrapDamageHpPct() : 0;
        int manaPct = room.getTrapDamageManaPct() != null ? room.getTrapDamageManaPct() : 0;
        int hpFixed = room.getTrapDamageHpFixed() != null ? room.getTrapDamageHpFixed() : 0;
        int manaFixed = room.getTrapDamageManaFixed() != null ? room.getTrapDamageManaFixed() : 0;

        if (hpPct == 0 && manaPct == 0 && hpFixed == 0 && manaFixed == 0 && room.getTrapAmount() > 0) {
            if ("PV".equals(room.getTrapType())) hpFixed = room.getTrapAmount();
            else if ("MANA".equals(room.getTrapType())) manaFixed = room.getTrapAmount();
        }

        java.util.Map<String, generation.grimoire.model.pve.RoomInteractionChoice> choices = session.getPlayerRoomChoices();
        if (choices == null) choices = new java.util.HashMap<>();

        // Traiter chaque joueur
        for (Personnage p : session.getPlayers()) {
            if (p.getHealthCurrent() <= 0 || !session.isEligibleForRewards(p)) continue;
            AppUser u = p.getUser();
            if (u == null) continue;
            String username = u.getUsername();

            generation.grimoire.model.pve.RoomInteractionChoice choice = choices.get(username);
            boolean avoided = false;

            if (choice != null && "ROPE".equals(choice.getActionType())) {
                // Auto-select the heaviest rope (by baseWeight desc)
                Equipment rope = null;
                for (Equipment eq : session.getActiveConsumables()) {
                    if (eq.getConsumableCategory() == generation.grimoire.enumeration.ConsumableCategory.CORDE) {
                        if (rope == null || eq.getBaseWeight() > rope.getBaseWeight()) {
                            rope = eq;
                        }
                    }
                }
                if (rope != null) {
                    session.getActiveConsumables().remove(rope);
                    equipmentRepository.delete(rope);
                    session.logInteractionResult(username, "Vous utilisez " + rope.getName() + " pour éviter le piège !");
                    avoided = true;
                } else {
                    session.logInteractionResult(username, "Corde introuvable ! Le piège se déclenche...");
                }
            }

            if (!avoided) {
                int hpDmg = hpFixed + (int) (p.getHealthMax() * (hpPct / 100.0));
                int manaDmg = manaFixed + (int) (p.getManaMax() * (manaPct / 100.0));

                if (hpDmg > 0) p.takeDamage(hpDmg, generation.grimoire.enumeration.DamageType.BRUT);
                if (manaDmg > 0) p.setManaCurrent(Math.max(0, p.getManaCurrent() - manaDmg));

                String log = "Vos héros tombent dans un piège !";
                if (hpDmg > 0) log += " -" + hpDmg + " PV.";
                if (manaDmg > 0) log += " -" + manaDmg + " Mana.";
                session.logInteractionResult(username, log);
            }
        }

        session.setRoomEventCompleted(true);
        session.addLog("Le groupe a fait face au piège.");
        return session;
    }

    CombatSession consumeItem(CombatSession session, Long consumableId, Long targetCharacterId, String username) {
        Equipment clickedConsumable = null;
        for (Equipment eq : session.getActiveConsumables()) {
            if (eq.getId().equals(consumableId)) {
                clickedConsumable = eq;
                break;
            }
        }
        if (clickedConsumable == null)
            throw new RuntimeException("Consommable non trouvé dans le combat");

        // Prioritize consuming an item with the same name owned by the current user
        Equipment toConsume = null;
        for (Equipment eq : session.getActiveConsumables()) {
            if (eq.getName().equals(clickedConsumable.getName()) &&
                    username.equals(eq.getOwnerUsername())) {
                toConsume = eq;
                break;
            }
        }
        if (toConsume == null) {
            List<Equipment> userEquipments = equipmentRepository.findByOwnerUsername(username);
            for (Equipment eq : userEquipments) {
                if (eq.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE
                        && eq.getName().equals(clickedConsumable.getName())) {
                    toConsume = eq;
                    break;
                }
            }
        }
        if (toConsume == null) {
            toConsume = clickedConsumable;
        }

        Personnage target = null;
        for (Personnage p : session.getPlayers()) {
            if (p.getId().equals(targetCharacterId)) {
                target = p;
                break;
            }
        }
        if (target == null)
            throw new RuntimeException("Cible introuvable");

        String itemName = toConsume.getName();
        if (toConsume.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE) {
            if (target.getHealthCurrent() <= 0) {
                throw new RuntimeException("Impossible d'utiliser un consommable sur un personnage mort.");
            }

            int healHp = toConsume.getBonusHealthMax();
            healHp += (int) (target.getHealthMax() * (toConsume.getConsumableHpPercent() / 100.0));
            healHp += (int) ((target.getHealthMax() - target.getHealthCurrent())
                    * (toConsume.getConsumableMissingHpPercent() / 100.0));

            int healMana = toConsume.getBonusManaMax();
            healMana += (int) (target.getManaMax() * (toConsume.getConsumableManaPercent() / 100.0));
            healMana += (int) ((target.getManaMax() - target.getManaCurrent())
                    * (toConsume.getConsumableMissingManaPercent() / 100.0));

            if (healHp > 0) {
                target.setHealthCurrent(Math.min(target.getHealthMax(), target.getHealthCurrent() + healHp));
                session.addLog("🍔 " + target.getName() + " consomme " + itemName + " et récupère " + healHp + " PV.");
            }
            if (healMana > 0) {
                target.setManaCurrent(Math.min(target.getManaMax(), target.getManaCurrent() + healMana));
                session.addLog(
                        "🧪 " + target.getName() + " consomme " + itemName + " et récupère " + healMana + " Mana.");
            }
            if (healHp == 0 && healMana == 0) {
                session.addLog(
                        "🎒 " + target.getName() + " consomme " + itemName + " mais cela n'a aucun effet de soin.");
            }
        } else {
            throw new RuntimeException("Cet objet n'est pas un consommable.");
        }

        session.getActiveConsumables().remove(clickedConsumable);
        if (toConsume != clickedConsumable) {
            session.getActiveConsumables().remove(toConsume);
        }
        personnageService.save(target);
        equipmentRepository.delete(toConsume);
        return session;
    }

    CombatSession deleteConsumable(CombatSession session, Long consumableId) {
        Equipment toDelete = null;
        for (Equipment eq : session.getActiveConsumables()) {
            if (eq.getId().equals(consumableId)) {
                toDelete = eq;
                break;
            }
        }
        if (toDelete == null)
            throw new RuntimeException("Consommable non trouvé dans le combat");

        session.getActiveConsumables().remove(toDelete);
        equipmentRepository.delete(toDelete);
        session.addLog("🗑️ Un objet a été détruit (" + toDelete.getName() + ").");
        return session;
    }

    CombatSession buyMerchantItem(CombatSession session, int lootIndex, Long characterId) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.EVENT || session
                .getCurrentRoom().getEventSubType() != generation.grimoire.enumeration.EventSubType.RENCONTRE) {
            throw new RuntimeException("Pas dans une salle de rencontre.");
        }

        List<LootEntry> lootTable = session.getCurrentRoom().getLootTable();
        if (lootTable == null || lootIndex < 0 || lootIndex >= lootTable.size()) {
            throw new RuntimeException("Objet introuvable.");
        }
        if (session.getPurchasedMerchantItems().contains(lootIndex)) {
            throw new RuntimeException("Objet déjà acheté.");
        }
        if (session.getAvailableMerchantItems() != null && !session.getAvailableMerchantItems().contains(lootIndex)) {
            throw new RuntimeException("Objet non disponible dans cette boutique.");
        }
        LootEntry entry = lootTable.get(lootIndex);

        Personnage acheteur = null;
        for (Personnage p : session.getPlayers()) {
            if (p.getId().equals(characterId)) {
                acheteur = p;
                break;
            }
        }
        if (acheteur == null) {
            throw new RuntimeException("Personnage introuvable dans ce combat.");
        }

        // Check price
        int goldPrice = entry.getPriceGold() != null ? entry.getPriceGold() : 0;
        String specialItemPriceName = entry.getPriceSpecialItemName();

        AppUser user = acheteur.getUser();
        if (goldPrice > 0) {
            if (user == null || user.getMonnaie() < goldPrice) {
                throw new RuntimeException("Pas assez d'or.");
            }
        }

        if (specialItemPriceName != null && !specialItemPriceName.trim().isEmpty()
                && !specialItemPriceName.trim().equalsIgnoreCase("null")) {
            if (user != null) {
                List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());
                Anomalie toDestroy = userAnomalies.stream()
                        .filter(a -> a.getName().equals(specialItemPriceName))
                        .findFirst()
                        .orElse(null);
                if (toDestroy == null) {
                    throw new RuntimeException(
                            "Vous ne possédez pas l'item spécial dans l'inventaire global : " + specialItemPriceName);
                }
                consumeAnomalie(user, toDestroy);
            }
        }

        // Deduct price
        if (goldPrice > 0 && user != null) {
            user.setMonnaie(user.getMonnaie() - goldPrice);
            userRepository.save(user);
        }
        if (specialItemPriceName != null && !specialItemPriceName.trim().isEmpty()
                && !specialItemPriceName.trim().equalsIgnoreCase("null")) {
            acheteur.removeSpecialItem(specialItemPriceName, 1);
        }

        // Give item
        if (entry.getSpecialItemName() != null && !entry.getSpecialItemName().trim().isEmpty()
                && !entry.getSpecialItemName().trim().equalsIgnoreCase("null")) {
            String itemName = entry.getSpecialItemName();
            acheteur.addSpecialItem(itemName, 1);

            if (user != null) {
                Anomalie template = anomalieRepository.findFirstByNameAndIsTemplateTrueOrderByIdAsc(itemName);
                if (template != null) {
                    Anomalie newAnomaly = new Anomalie();
                    newAnomaly.setName(template.getName());
                    newAnomaly.setDescription(template.getDescription());
                    newAnomaly.setSpiritualite(template.getSpiritualite());
                    newAnomaly.setCategory(template.getCategory());
                    newAnomaly.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                    newAnomaly.setMagicObject(template.isMagicObject());
                    newAnomaly.setOwnerUsername(user.getUsername());
                    newAnomaly.setUser(user);
                    anomalieRepository.save(newAnomaly);
                    user.getDiscoveredItems().add(newAnomaly.getName());
                }
            }

            session.addLog(acheteur.getName() + " a acheté " + itemName + ".");
        } else if (entry.getEquipment() != null) {
            Equipment clone = new Equipment();
            Equipment template = entry.getEquipment();
            clone.copyStatsFrom(template);
            clone.setUser(user);

            equipmentRepository.save(clone);

            if (clone.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE) {
                double currentWeight = session.getActiveConsumables().stream()
                        .filter(java.util.Objects::nonNull)
                        .mapToDouble(e -> e.calculateWeight())
                        .sum();
                double maxWeight = 10.0 + 5.0 * session.getPlayers().size();

                if (currentWeight + clone.calculateWeight() <= maxWeight) {
                    session.getActiveConsumables().add(clone);
                    session.addLog(acheteur.getName() + " a acheté " + clone.getName()
                            + " et l'a ajouté à l'inventaire du groupe.");
                } else {
                    session.addLog(acheteur.getName() + " a acheté " + clone.getName()
                            + ", envoyé au coffre (poids max atteint).");
                }
            } else {
                session.addLog(acheteur.getName() + " a acheté " + clone.getName() + ".");
            }
        }

        session.getPurchasedMerchantItems().add(lootIndex);
        personnageService.save(acheteur);
        return session;
    }

    /**
     * Avance vers la salle suivante du donjon. Gère les pièges non-résolus.
     * Retourne true si le donjon est terminé (session.isFinished()).
     */
    CombatSession proceedToNextRoom(CombatSession session) {
        // If current room was event with unresolved trap, apply it
        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT
                && !session.isRoomEventCompleted()) {
            generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
            generation.grimoire.enumeration.EventSubType subType = room.getEventSubType();

            if (subType == generation.grimoire.enumeration.EventSubType.ALTERATION) {
                // Ignored by player
            } else if (subType == generation.grimoire.enumeration.EventSubType.PIEGE) {
                int hpPct = room.getTrapDamageHpPct() != null ? room.getTrapDamageHpPct() : 0;
                int manaPct = room.getTrapDamageManaPct() != null ? room.getTrapDamageManaPct() : 0;
                int hpFixed = room.getTrapDamageHpFixed() != null ? room.getTrapDamageHpFixed() : 0;
                int manaFixed = room.getTrapDamageManaFixed() != null ? room.getTrapDamageManaFixed() : 0;

                // Fallback for old rooms
                if (hpPct == 0 && manaPct == 0 && hpFixed == 0 && manaFixed == 0 && room.getTrapAmount() > 0) {
                    if ("PV".equals(room.getTrapType()))
                        hpFixed = room.getTrapAmount();
                    else if ("MANA".equals(room.getTrapType()))
                        manaFixed = room.getTrapAmount();
                }

                for (Personnage p : session.getPlayers()) {
                    if (p.getHealthCurrent() > 0) {
                        int hpDmg = hpFixed + (int) (p.getHealthMax() * (hpPct / 100.0));
                        int manaDmg = manaFixed + (int) (p.getManaMax() * (manaPct / 100.0));

                        if (hpDmg > 0)
                            p.takeDamage(hpDmg, generation.grimoire.enumeration.DamageType.BRUT);
                        if (manaDmg > 0)
                            p.setManaCurrent(Math.max(0, p.getManaCurrent() - manaDmg));
                    }
                }

                String log = "Vos héros tombent dans un piège !";
                if (hpPct > 0 || hpFixed > 0)
                    log += " Ils perdent des PV.";
                if (manaPct > 0 || manaFixed > 0)
                    log += " Ils perdent du Mana.";
                session.addLog(log);
            } else {
                // Generic fallback
                int effect = room.getEventEffectAmount();
                for (Personnage p : session.getPlayers()) {
                    if (p.getHealthCurrent() <= 0)
                        continue;
                    if (effect > 0) {
                        p.heal(effect);
                    } else if (effect < 0) {
                        p.takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);
                    }
                }
                if (effect > 0)
                    session.addLog("Vos héros sont soignés de " + effect + " PV.");
                else if (effect < 0)
                    session.addLog("Vos héros subissent " + (-effect) + " dégâts !");
            }
        }
        session.loadRoom(session.getCurrentRoomIndex() + 1);
        handleRoomStart(session);

        if (session.isFinished()) {
            combatTurnService.recordOutcome(session, generation.grimoire.enumeration.DungeonOutcome.VICTORY);
            session.addLog("Félicitations, vous avez terminé le donjon !");

            // Hook Tableau de Chasse — enregistrer la victoire pour chaque joueur
            try {
                java.util.Set<String> recorded = new java.util.HashSet<>();
                for (generation.grimoire.entity.personnage.Personnage p : session.getPlayers()) {
                    String owner = p.getOwnerUsername();
                    if (owner != null && recorded.add(owner)) {
                        huntingQuestService.recordCompletion(session.getDungeonId(), owner);
                    }
                }
            } catch (Exception e) {
                System.err.println("[HuntingQuest] Erreur enregistrement complétion: " + e.getMessage());
            }

            if (!session.getPlayers().isEmpty()) {
                java.util.Set<AppUser> uniqueUsers = session.getPlayers().stream()
                        .filter(java.util.Objects::nonNull)
                        .map(p -> p.getUser())
                        .filter(java.util.Objects::nonNull)
                        .collect(java.util.stream.Collectors.toSet());

                boolean anyFirstClear = false;
                for (AppUser user : uniqueUsers) {
                    if (!user.getCompletedDungeons().contains(session.getDungeonId())) {
                        user.getCompletedDungeons().add(session.getDungeonId());
                        anyFirstClear = true;
                    }
                    userRepository.save(user);
                }

                if (anyFirstClear) {
                    session.addLog("🎉 Félicitations, vous avez terminé ce donjon pour la première fois !");
                }

                for (generation.grimoire.entity.personnage.Personnage p : session.getPlayers()) {
                    personnageService.save(java.util.Objects.requireNonNull(p));
                }
            }
        }

        spellAvailabilityService.compute(session);
        return session;
    }

    CombatSession openStrangeDoor(CombatSession session) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.EVENT ||
                session.getCurrentRoom()
                        .getEventSubType() != generation.grimoire.enumeration.EventSubType.PORTE_ETRANGE) {
            throw new RuntimeException("Ce n'est pas une Porte Étrange !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("La porte a déjà été passée.");
        }

        generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
        String json = room.getDoorOutcomes();
        if (json == null || json.isEmpty() || "[]".equals(json)) {
            session.addLog("La porte était une simple illusion... Rien ne se passe.");
            session.setRoomEventCompleted(true);
            spellAvailabilityService.compute(session);
            return session;
        }

        try {
            JsonNode outcomesNode = objectMapper.readTree(json);
            if (!outcomesNode.isArray() || outcomesNode.size() == 0) {
                session.addLog("La porte était une simple illusion... Rien ne se passe.");
                session.setRoomEventCompleted(true);
                spellAvailabilityService.compute(session);
                return session;
            }

            int totalProb = 0;
            for (JsonNode outcome : outcomesNode) {
                totalProb += outcome.path("probability").asInt(0);
            }

            if (totalProb <= 0) {
                session.addLog("La porte est bloquée à jamais.");
                session.setRoomEventCompleted(true);
                spellAvailabilityService.compute(session);
                return session;
            }

            java.util.Random rnd = new java.util.Random();
            int roll = rnd.nextInt(totalProb);
            int currentSum = 0;
            JsonNode selectedOutcome = null;

            for (JsonNode outcome : outcomesNode) {
                currentSum += outcome.path("probability").asInt(0);
                if (roll < currentSum) {
                    selectedOutcome = outcome;
                    break;
                }
            }

            if (selectedOutcome == null)
                selectedOutcome = outcomesNode.get(0);

            String type = selectedOutcome.path("type").asText("");

            if ("BOSS".equals(type)) {
                room.setType(generation.grimoire.enumeration.RoomType.BOSS);
                room.setEventSubType(null);
                room.setBossRewardGold(selectedOutcome.path("bossRewardGold").asInt(0));
                room.setBossRewardSpiritualXp(selectedOutcome.path("bossRewardSpiritualXp").asInt(0));

                JsonNode challengesNode = selectedOutcome.path("challenges");
                if (!challengesNode.isMissingNode() && challengesNode.isArray() && challengesNode.size() > 0) {
                    loadChallenges(session, challengesNode.toString());
                } else {
                    if (session.getActiveChallenges() == null)
                        session.setActiveChallenges(new ArrayList<>());
                    session.getActiveChallenges().clear();
                }

                if (room.getMonsters() == null) {
                    room.setMonsters(new ArrayList<>());
                } else {
                    room.getMonsters().clear();
                }

                JsonNode monstersNode = selectedOutcome.path("monsters");
                if (monstersNode.isArray()) {
                    for (JsonNode mIdNode : monstersNode) {
                        Long mId = mIdNode.asLong();
                        generation.grimoire.entity.pve.Monstre m = monstreRepository.findById(mId).orElse(null);
                        if (m != null)
                            room.getMonsters().add(m);
                    }
                }

                session.getEnemies().clear();
                for (generation.grimoire.entity.pve.Monstre m : room.getMonsters()) {
                    ActiveMonster am = new ActiveMonster(m);
                    session.getEnemies().add(am);
                }

                session.setTurnNumber(1);
                for (Personnage p : session.getPlayers()) {
                    p.setBanalSpellCastThisTurn(false);
                    p.setInstantSpellCastThisTurn(false);
                }
                combatTurnService.rollInitiative(session);

                // Apply global buffs
                JsonNode buffsNode = selectedOutcome.path("globalBuffs");
                if (buffsNode.isArray() && !session.getEnemies().isEmpty()) {
                    for (JsonNode buffNode : buffsNode) {
                        String bType = buffNode.path("type").asText();
                        int bVal = buffNode.path("value").asInt(0);
                        int bDur = buffNode.path("duration").asInt(0);

                        for (ActiveMonster am : session.getEnemies()) {
                            if ("HP_PCT".equals(bType)) {
                                int bonus = (int) (am.getMaxHp() * (bVal / 100.0));
                                am.setMaxHp(am.getMaxHp() + bonus);
                                am.getAsPersonnage().setHealthCurrent(am.getAsPersonnage().getHealthCurrent() + bonus);
                                am.getAsPersonnage().getPassiveStates().put("BOSS_BUFF_HP", bVal);
                            } else if ("SHIELD_PCT".equals(bType)) {
                                int shieldAmt = (int) (am.getMaxHp() * (bVal / 100.0));
                                am.getAsPersonnage().addShield(shieldAmt, bDur > 0 ? bDur : -1, "Buff Global");
                                am.getAsPersonnage().getPassiveStates().put("BOSS_BUFF_SHIELD", bVal);
                            } else if ("ARMOR_FLAT".equals(bType)) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.ARMURE);
                                eff.setFlatValue(bVal);
                                eff.setDuration(bDur > 0 ? bDur : -1);
                                am.getAsPersonnage().getActiveBuffs().add(eff);
                                am.getAsPersonnage().getPassiveStates().put("BOSS_BUFF_ARMOR", bVal);
                            } else if ("RESIST_FLAT".equals(bType)) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                                eff.setFlatValue(bVal);
                                eff.setDuration(bDur > 0 ? bDur : -1);
                                am.getAsPersonnage().getActiveBuffs().add(eff);
                                am.getAsPersonnage().getPassiveStates().put("BOSS_BUFF_RESIST", bVal);
                            } else if ("BURN_ON_HIT".equals(bType)) {
                                am.getAsPersonnage().setPassiveState("BURN_ON_HIT", bVal);
                                am.getAsPersonnage().setPassiveState("BURN_ON_HIT_DURATION", bDur > 0 ? bDur : 3);
                                am.getAsPersonnage().getPassiveStates().put("BOSS_BUFF_BURN", bVal);
                            } else if ("POISON_ON_HIT".equals(bType)) {
                                am.getAsPersonnage().setPassiveState("POISON_ON_HIT", bVal);
                                am.getAsPersonnage().setPassiveState("POISON_ON_HIT_DURATION", bDur > 0 ? bDur : 3);
                                am.getAsPersonnage().getPassiveStates().put("BOSS_BUFF_POISON", bVal);
                            }
                        }
                    }
                }

                session.addLog("Vous avez ouvert la porte... Un puissant Boss vous attend !");
            } else if ("ITEM".equals(type)) {
                session.addLog("Vous avez ouvert la porte et trouvé de l'équipement !");
                room.setType(generation.grimoire.enumeration.RoomType.TREASURE);
                room.setEventSubType(null);
                room.setTreasureGold(0);
                room.setTreasureExp(0);
            } else if ("AUTEL".equals(type)) {
                session.addLog("Vous avez ouvert la porte... Un autel sacrificiel s'y trouve.");
                room.setEventSubType(generation.grimoire.enumeration.EventSubType.ALTERATION);
                room.setAlterationType("AUTEL");
                String spirituality = selectedOutcome.path("altarSpirituality").asText("TENEBRES");
                room.setAltarRequiredSpirituality(spirituality);
                String rewardType = selectedOutcome.path("altarRewardType").asText("GOLD");
                room.setAltarRewardType(rewardType);
                int rewardValue = selectedOutcome.path("altarRewardValue").asInt(100);
                room.setAltarRewardValue(rewardValue);
                if ("ITEM".equals(rewardType)) {
                    Equipment eq = equipmentRepository.findById((long) rewardValue).orElse(null);
                    room.setAltarRewardEquipment(eq);
                }
                room.setEventText("Un autel mystique (" + spirituality + ") réclame une offrande magique.");
                room.setLootTable(null);
            } else if ("TRESOR".equals(type)) {
                long anomalieId = selectedOutcome.path("treasureAnomalieId").asLong(0);
                String anomalyName = null;

                if (anomalieId > 0) {
                    Anomalie template = anomalieRepository.findById(anomalieId).orElse(null);
                    if (template != null) {
                        anomalyName = template.getName();
                        java.util.Set<String> rewardedUsernames = new java.util.HashSet<>();
                        for (Personnage p : session.getPlayers()) {
                            if (!session.isEligibleForRewards(p))
                                continue;
                            AppUser user = p.getUser();
                            if (user != null && !rewardedUsernames.contains(user.getUsername())) {
                                rewardedUsernames.add(user.getUsername());
                                Anomalie clone = new Anomalie();
                                clone.setName(template.getName());
                                clone.setDescription(template.getDescription());
                                clone.setSpiritualite(template.getSpiritualite());
                                clone.setCategory(template.getCategory());
                                clone.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                                clone.setMagicObject(template.isMagicObject());
                                clone.setTemplate(false);
                                clone.setOwnerUsername(user.getUsername());
                                clone.setUser(user);
                                anomalieRepository.save(clone);
                                user.getDiscoveredItems().add(clone.getName());
                                session.logInteractionResult(user.getUsername(), "Objet trouvé : " + anomalyName + " (ajouté à l'inventaire).");
                            }
                        }
                    }
                }

                if (anomalyName != null) {
                    session.addLog("Derrière la porte, vous découvrez l'anomalie : " + anomalyName + " !");
                    room.setEventText("Derrière la porte, vous découvrez l'anomalie : " + anomalyName + " !");
                } else {
                    session.addLog("Vous avez ouvert la porte... mais le trésor a disparu.");
                    room.setEventText("Vous avez ouvert la porte... mais le trésor a disparu.");
                }
                session.setRoomEventCompleted(true);
            } else if ("PIEGE".equals(type)) {
                session.addLog("Vous avez ouvert la porte... et déclenché un piège mortel !");
                room.setEventSubType(generation.grimoire.enumeration.EventSubType.PIEGE);
                room.setEventText("Vous avez ouvert la porte... et déclenché un piège mortel !");
                room.setTrapType(selectedOutcome.path("trapType").asText("PV"));
                room.setTrapAmount(selectedOutcome.path("trapAmount").asInt(0));
                room.setTrapHasRopeOption(selectedOutcome.path("trapHasRopeOption").asBoolean(false));
                room.setTrapDamageHpPct(selectedOutcome.path("trapDamageHpPct").asInt(0));
                room.setTrapDamageManaPct(selectedOutcome.path("trapDamageManaPct").asInt(0));
                room.setLootTable(null);
                room.setTrapDamageHpFixed(selectedOutcome.path("trapDamageHpFixed").asInt(0));
                room.setTrapDamageManaFixed(selectedOutcome.path("trapDamageManaFixed").asInt(0));
            } else {
                session.addLog("Vous avez ouvert la porte... Il n'y a absolument rien derrière.");
                room.setEventText("Vous avez ouvert la porte... Il n'y a absolument rien derrière.");
                session.setRoomEventCompleted(true);
            }

        } catch (Exception e) {
            e.printStackTrace();
            session.addLog("La porte refuse de s'ouvrir.");
            session.setRoomEventCompleted(true);
        }

        spellAvailabilityService.compute(session);
        return session;
    }

    @Transactional
    CombatSession addConsumableByName(CombatSession session, String itemName, String username) {
        List<Equipment> userEquipments = equipmentRepository.findByOwnerUsername(username);
        Equipment targetEquipment = null;
        for (Equipment eq : userEquipments) {
            if (eq.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE
                    && eq.getName().trim().equalsIgnoreCase(itemName.trim())) {
                boolean isActive = session.getActiveConsumables().stream()
                        .filter(java.util.Objects::nonNull)
                        .anyMatch(activeEq -> activeEq.getId() != null && activeEq.getId().equals(eq.getId()));
                if (!isActive) {
                    targetEquipment = eq;
                    break;
                }
            }
        }

        if (targetEquipment == null) {
            throw new RuntimeException("Aucun consommable nommé '" + itemName + "' n'est disponible dans le coffre.");
        }

        double currentWeight = session.getActiveConsumables().stream()
                .filter(java.util.Objects::nonNull)
                .mapToDouble(e -> e.calculateWeight())
                .sum();
        double maxWeight = 10.0 + 5.0 * session.getPlayers().size();

        if (currentWeight + targetEquipment.calculateWeight() > maxWeight) {
            throw new RuntimeException("Pas assez de place dans l'inventaire du groupe (poids maximum atteint).");
        }

        // Initialize lazy collection
        if (targetEquipment.getPriceAnomalies() != null) {
            targetEquipment.getPriceAnomalies().size();
        }

        session.getActiveConsumables().add(targetEquipment);

        String searchStr = "Vous avez trouvé un objet : " + targetEquipment.getName()
                + " (envoyé au coffre, choix manuel).";
        for (int i = 0; i < session.getCombatLog().size(); i++) {
            if (session.getCombatLog().get(i).equals(searchStr)) {
                session.getCombatLog().set(i, "Vous avez trouvé un objet : " + targetEquipment.getName()
                        + " et il a été ajouté à l'inventaire du groupe.");
                break;
            }
        }

        return session;
    }

    private void consumeAnomalie(AppUser user, Anomalie toDestroy) {
        if (toDestroy == null)
            return;
        if (user != null && "ADMIN".equals(user.getRole())) {
            long count = anomalieRepository.findByOwnerUsername(user.getUsername()).stream()
                    .filter(a -> toDestroy.getName() != null && toDestroy.getName().equals(a.getName()))
                    .count();
            if (count <= 1) {
                return; // L'admin garde toujours le dernier exemplaire
            }
        }
        anomalieRepository.delete(toDestroy);
    }
}
