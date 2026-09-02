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
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import generation.grimoire.repository.pve.SalleRepository;
import lombok.RequiredArgsConstructor;
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
class CombatRoomService {

    private final PersonnageRepository personnageRepository;
    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;
    private final AnomalieRepository anomalieRepository;
    private final SalleRepository salleRepository;
    private final MonstreRepository monstreRepository;
    private final ObjectMapper objectMapper;
    private final CombatTurnService combatTurnService;
    private final SpellAvailabilityService spellAvailabilityService;

    void handleRoomStart(CombatSession session) {
        if (session.getCurrentRoom() == null)
            return;

        // Re-fetch la salle pour éviter les LazyInitializationException
        generation.grimoire.entity.pve.Salle freshSalle = salleRepository
                .findById(java.util.Objects.requireNonNull(session.getCurrentRoom().getId()))
                .orElse(session.getCurrentRoom());

        if (freshSalle.getMonsters() != null)
            freshSalle.getMonsters().size();
        if (freshSalle.getLootTable() != null)
            freshSalle.getLootTable().size();

        session.setCurrentRoom(freshSalle);

        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.COMBAT
                || session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
            session.getEnemies().clear();
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

    CombatSession openChest(CombatSession session, Long equipmentId) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.TREASURE) {
            throw new RuntimeException("Ce n'est pas une salle de trésor !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("Le coffre a déjà été ouvert.");
        }

        boolean useKey = (equipmentId != null);
        double extraLootPercent = 0.0;
        if (useKey) {
            Equipment key = null;
            for (Equipment eq : session.getActiveConsumables()) {
                if (eq.getId().equals(equipmentId) && eq.getConsumableCategory() == generation.grimoire.enumeration.ConsumableCategory.CLE) {
                    key = eq;
                    break;
                }
            }
            if (key == null) {
                throw new RuntimeException("L'équipe ne possède pas cette Clé !");
            }
            
            // Use specialEffectValue as percentage, default to 10 if 0 (backward compatibility)
            extraLootPercent = key.getSpecialEffectValue() > 0 ? key.getSpecialEffectValue() : 10.0;
            
            session.getActiveConsumables().remove(key);
            equipmentRepository.delete(key);
            session.addLog("Vous utilisez " + key.getName() + " pour ouvrir les compartiments secrets du coffre ! (+" + extraLootPercent + "% de chance de butin)");
        }

        int gold = session.getCurrentRoom().getTreasureGold();
        int exp = session.getCurrentRoom().getTreasureExp();
        session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + gold);

        List<Personnage> chestEligible = session.getPlayers().stream()
                .filter(session::isEligibleForRewards).collect(java.util.stream.Collectors.toList());
        int expPerHero = exp / Math.max(1, chestEligible.size());
        for (Personnage p : chestEligible) {
            p.setExperience(p.getExperience() + expPerHero);
            personnageRepository.save(p);
        }

        if (!chestEligible.isEmpty() && gold > 0) {
            for (Personnage p : chestEligible) {
                AppUser user = p.getUser();
                if (user != null) {
                    user.setMonnaie(user.getMonnaie() + gold);
                    userRepository.save(user);
                }
            }
        }

        session.addLog("Vous avez ouvert le coffre ! Vous trouvez " + gold + " Or et chaque héros gagne " + expPerHero
                + " XP.");

        // First pass: collect items
        double totalConsumablesWeight = 0.0;
        List<Equipment> lootedConsumables = new ArrayList<>();
        List<Equipment> lootedOthers = new ArrayList<>();

        java.util.Random rnd = new java.util.Random();
        if (session.getCurrentRoom().getLootTable() != null) {
            for (LootEntry entry : session.getCurrentRoom().getLootTable()) {
                double roll = rnd.nextDouble() * 100.0;
                double proba = entry.getProbability() + extraLootPercent;
                if (roll <= proba && entry.getEquipment() != null) {
                    java.util.Set<Long> rewardedUserIds = new java.util.HashSet<>();
                    for (Personnage p : session.getPlayers()) {
                        if (!session.isEligibleForRewards(p)) continue;
                        AppUser u = p.getUser();
                        if (u != null && !rewardedUserIds.contains(u.getId())) {
                            rewardedUserIds.add(u.getId());
                            Equipment template = entry.getEquipment();

                            Equipment clone = new Equipment();
                            clone.copyStatsFrom(template);

                            clone.setTemplate(false);
                            clone.setUser(u);
                            clone.setOwnerUsername(u.getUsername());

                            equipmentRepository.save(clone);

                            if (clone.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE) {
                                totalConsumablesWeight += clone.calculateWeight();
                                lootedConsumables.add(clone);
                            } else {
                                lootedOthers.add(clone);
                            }
                        }
                    }
                } else if (roll <= proba && entry.getSpecialItemName() != null
                        && !entry.getSpecialItemName().trim().isEmpty()) {
                    String anomalyName = entry.getSpecialItemName();
                    Anomalie template = anomalieRepository
                            .findFirstByNameAndIsTemplateTrueOrderByIdAsc(anomalyName);
                    if (template != null) {
                        java.util.Set<Long> rewardedUserIds = new java.util.HashSet<>();
                        for (Personnage p : session.getPlayers()) {
                            if (!session.isEligibleForRewards(p)) continue;
                            AppUser u = p.getUser();
                            if (u != null && !rewardedUserIds.contains(u.getId())) {
                                rewardedUserIds.add(u.getId());
                                Anomalie clone = new Anomalie();
                                clone.setName(template.getName());
                                clone.setDescription(template.getDescription());
                                clone.setSpiritualite(template.getSpiritualite());
                                clone.setCategory(template.getCategory());
                                clone.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                                clone.setMagicObject(template.isMagicObject());
                                clone.setTemplate(false);
                                clone.setOwnerUsername(u.getUsername());
                                clone.setUser(u);
                                anomalieRepository.save(clone);
                            }
                        }
                        session.addLog("Vous avez obtenu l'item : " + template.getName() + " !");
                    }
                }
            }
        }

        double currentWeight = session.getActiveConsumables().stream()
                .filter(java.util.Objects::nonNull)
                .mapToDouble(e -> e.calculateWeight())
                .sum();
        double maxWeight = 10.0 + 5.0 * session.getPlayers().size();

        boolean canFitAll = (currentWeight + totalConsumablesWeight) <= maxWeight;

        java.util.Set<String> displayedLootLogs = new java.util.HashSet<>();

        for (Equipment clone : lootedConsumables) {
            if (canFitAll) {
                session.getActiveConsumables().add(clone);
                String msg = "Vous avez trouvé un objet : " + clone.getName() + " et il a été ajouté à l'inventaire du groupe.";
                if (displayedLootLogs.add(msg)) session.addLog(msg);
            } else {
                String msg = "Vous avez trouvé un objet : " + clone.getName() + " (envoyé au coffre, choix manuel).";
                if (displayedLootLogs.add(msg)) session.addLog(msg);
            }
        }
        for (Equipment clone : lootedOthers) {
            String msg = "Vous avez trouvé un objet : " + clone.getName() + " !";
            if (displayedLootLogs.add(msg)) session.addLog(msg);
        }

        session.setRoomEventCompleted(true);
        return session;
    }

    CombatSession acceptAlteration(CombatSession session, Long anomalyId, Long characterId) {
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
            int eligibleCount = 0;

            for (Personnage p : session.getPlayers()) {
                if (p.getHealthCurrent() <= 0)
                    continue;
                if (!session.isEligibleForRewards(p))
                    continue;

                boolean hasEnoughHp = !(effect < 0 && p.getHealthCurrent() <= -effect);
                boolean hasEnoughXp = !(expEffect < 0 && p.getExperience() < -expEffect);

                if (hasEnoughHp && hasEnoughXp) {
                    eligibleCount++;
                    if (effect > 0)
                        p.heal(effect);
                    else if (effect < 0)
                        p.takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);

                    if (expEffect != 0) {
                        p.setExperience(p.getExperience() + expEffect);
                    }

                    String rewardTypeForP = room.getAlterationRewardType();
                    if ("SPECIAL_ITEM".equals(rewardTypeForP) && (room.getAlterationSpecialItemReward() == null
                            || room.getAlterationSpecialItemReward().trim().isEmpty())) {
                        rewardTypeForP = "SPIRITUAL_XP";
                    }
                    if ("SPIRITUAL_XP".equals(rewardTypeForP)) {
                        int spXp = room.getAlterationSpiritualXpReward();
                        if (spXp > 0)
                            p.setSpiritualiteExperience(p.getSpiritualiteExperience() + spXp);
                    }

                    personnageRepository.save(p);
                }
            }

            if (eligibleCount > 0) {
                boolean logged = false;
                if (effect > 0) {
                    session.addLog(eligibleCount + " héros sont soignés de " + effect + " PV.");
                    logged = true;
                } else if (effect < 0) {
                    session.addLog(eligibleCount + " héros sacrifient " + (-effect) + " PV.");
                    logged = true;
                }

                if (expEffect > 0) {
                    session.addLog(eligibleCount + " héros gagnent " + expEffect + " XP.");
                    logged = true;
                } else if (expEffect < 0) {
                    session.addLog(eligibleCount + " héros sacrifient " + (-expEffect) + " XP.");
                    logged = true;
                }

                String rewardType = room.getAlterationRewardType();
                if ("SPECIAL_ITEM".equals(rewardType) && (room.getAlterationSpecialItemReward() == null
                        || room.getAlterationSpecialItemReward().trim().isEmpty())) {
                    rewardType = "SPIRITUAL_XP";
                }

                if ("SPIRITUAL_XP".equals(rewardType) && room.getAlterationSpiritualXpReward() > 0) {
                    session.addLog(eligibleCount + " héros reçoivent " + room.getAlterationSpiritualXpReward()
                            + " XP de Spiritualité !");
                    logged = true;
                } else if ("SPECIAL_ITEM".equals(rewardType)) {
                    String itemName = room.getAlterationSpecialItemReward();
                    Anomalie template = anomalieRepository.findFirstByNameAndIsTemplateTrueOrderByIdAsc(itemName);
                    if (template != null && !session.getPlayers().isEmpty()) {
                        for (Personnage p : session.getPlayers()) {
                            if (!session.isEligibleForRewards(p)) continue;
                            AppUser user = p.getUser();
                            if (user != null) {
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
                            }
                        }
                        session.addLog("L'équipe reçoit l'Item Spécial : " + itemName + " !");
                        logged = true;
                    } else {
                        session.addLog("L'item spécial '" + itemName + "' n'est plus disponible.");
                        logged = true;
                    }
                }

                if (!logged) {
                    session.addLog("L'altération s'est produite, mais elle n'a eu aucun effet notable.");
                }
            } else {
                session.addLog("Aucun héros n'avait les ressources nécessaires pour l'altération.");
            }

        } else if ("ITEM".equals(altType)) {
            String requiredItemName = room.getAlterationRequiredItem();
            if (requiredItemName == null || requiredItemName.isEmpty()) {
                throw new RuntimeException("Aucun item requis pour cette altération.");
            }

            if (session.getPlayers().isEmpty()) {
                throw new RuntimeException("Aucun joueur dans la session.");
            }

            Personnage accepteur = null;
            if (characterId != null) {
                accepteur = session.getPlayers().stream().filter(p -> p.getId().equals(characterId)).findFirst()
                        .orElse(null);
            }
            if (accepteur == null) {
                accepteur = session.getPlayers().get(0);
            }

            AppUser user = accepteur.getUser();
            if (user == null) {
                throw new RuntimeException("Utilisateur inconnu.");
            }

            List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(user.getUsername());
            Anomalie toDestroy = userAnomalies.stream()
                    .filter(a -> a.getName().equals(requiredItemName))
                    .findFirst()
                    .orElse(null);

            if (toDestroy == null) {
                throw new RuntimeException("Vous ne possédez pas l'item spécial : " + requiredItemName);
            }

            consumeAnomalie(user, toDestroy);

            int spXp = room.getAlterationSpiritualXpReward();
            for (Personnage p : session.getPlayers()) {
                if (p.getHealthCurrent() <= 0)
                    continue;
                if (!session.isEligibleForRewards(p))
                    continue;
                if (spXp > 0) {
                    p.setSpiritualiteExperience(p.getSpiritualiteExperience() + spXp);
                    personnageRepository.save(p);
                }
            }
            session.addLog("Vous avez sacrifié l'item : " + requiredItemName + " !");
            if (spXp > 0) {
                session.addLog("Vos héros reçoivent " + spXp + " XP de Spiritualité en échange !");
            }
        } else if ("AUTEL".equals(altType)) {
            if (anomalyId == null) {
                throw new RuntimeException("Aucune anomalie sélectionnée pour le sacrifice.");
            }

            Personnage accepteur = null;
            if (characterId != null) {
                accepteur = session.getPlayers().stream().filter(p -> p.getId().equals(characterId)).findFirst()
                        .orElse(null);
            }
            if (accepteur == null) {
                accepteur = session.getPlayers().get(0);
            }
            AppUser user = accepteur.getUser();

            Anomalie toDestroy = anomalieRepository.findById(anomalyId)
                    .orElseThrow(() -> new RuntimeException("Anomalie introuvable."));

            if (!toDestroy.getOwnerUsername().equals(user.getUsername())) {
                throw new RuntimeException("Cette anomalie ne vous appartient pas.");
            }

            if (!toDestroy.isMagicObject()) {
                throw new RuntimeException("Vous ne pouvez sacrifier que des objets magiques, pas des matériaux.");
            }

            String reqSp = room.getAltarRequiredSpirituality();
            if (reqSp != null && toDestroy.getSpiritualite() != null
                    && !toDestroy.getSpiritualite().name().equals(reqSp)) {
                throw new RuntimeException("L'autel réclame une offrande de spiritualité " + reqSp + ".");
            }

            String anomalyName = toDestroy.getName();
            consumeAnomalie(user, toDestroy);
            session.addLog("Vous avez sacrifié l'anomalie : " + anomalyName + " sur l'autel.");

            String rewardType = room.getAltarRewardType();
            int rewardValue = room.getAltarRewardValue();
            int level = toDestroy.getLevel() != null ? toDestroy.getLevel() : 1;
            double multiplier = level == 1 ? 1.0 : (level == 2 ? 1.3 : 1.8);

            if ("GOLD".equals(rewardType)) {
                int multipliedValue = (int) Math.round(rewardValue * multiplier);
                user.setMonnaie(user.getMonnaie() + multipliedValue);
                userRepository.save(user);
                session.addLog("L'autel vous récompense de " + multipliedValue + " Or !");
            } else if ("XP".equals(rewardType)) {
                int multipliedValue = (int) Math.round(rewardValue * multiplier);
                int aliveHeroes = (int) session.getPlayers().stream().filter(p -> p.getHealthCurrent() > 0).count();
                if (aliveHeroes > 0) {
                    int xpPerHero = multipliedValue / aliveHeroes;
                    for (Personnage p : session.getPlayers()) {
                        if (p.getHealthCurrent() > 0) {
                            p.setSpiritualiteExperience(p.getSpiritualiteExperience() + xpPerHero);
                            personnageRepository.save(p);
                        }
                    }
                    session.addLog("L'autel accorde " + xpPerHero + " XP de Spiritualité à chaque héros !");
                }
            } else if ("ITEM".equals(rewardType)) {
                int chance = level == 1 ? 45 : (level == 2 ? 75 : 100);
                boolean success = new java.util.Random().nextInt(100) < chance;

                if (success) {
                    Equipment template = equipmentRepository.findById((long) rewardValue).orElse(null);
                    if (template != null) {
                        Equipment clone = new Equipment();
                        clone.copyStatsFrom(template);
                        clone.setTemplate(false);
                        clone.setUser(user);
                        clone.setOwnerUsername(user.getUsername());
                        equipmentRepository.save(clone);

                        if (clone.getSlot() == generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE) {
                            double currentWeight = session.getActiveConsumables().stream()
                                    .filter(java.util.Objects::nonNull)
                                    .mapToDouble(e -> e.calculateWeight())
                                    .sum();
                            double maxWeight = 10.0 + 5.0 * session.getPlayers().size();

                            if (currentWeight + clone.calculateWeight() <= maxWeight) {
                                session.getActiveConsumables().add(clone);
                                session.addLog("L'autel vous a offert un équipement : " + template.getName()
                                        + " et il a été ajouté à l'inventaire du groupe.");
                            } else {
                                session.addLog("L'autel vous a offert un équipement : " + template.getName()
                                        + " (envoyé au coffre, poids max atteint).");
                            }
                        } else {
                            session.addLog("L'autel vous a offert un équipement : " + template.getName() + " !");
                        }
                        room.setAltarRewardEquipment(clone);
                    }
                } else {
                    session.addLog("L'autel a consumé votre offrande sans vous accorder d'équipement...");
                }
            }
        }

        session.setRoomEventCompleted(true);
        return session;
    }

    CombatSession useRope(CombatSession session, Long equipmentId) {
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

        Equipment rope = null;
        for (Equipment eq : session.getActiveConsumables()) {
            if (eq.getId().equals(equipmentId) && eq.getConsumableCategory() == generation.grimoire.enumeration.ConsumableCategory.CORDE) {
                rope = eq;
                break;
            }
        }

        if (rope == null) {
            throw new RuntimeException("L'équipe ne possède pas cette Corde !");
        }

        session.getActiveConsumables().remove(rope);
        equipmentRepository.delete(rope);

        session.addLog("Vous utilisez " + rope.getName() + " pour éviter le piège !");
        session.setRoomEventCompleted(true);
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

        session.getActiveConsumables().remove(toConsume);
        personnageRepository.save(target);
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

        if (specialItemPriceName != null && !specialItemPriceName.trim().isEmpty()) {
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
        if (specialItemPriceName != null && !specialItemPriceName.trim().isEmpty()) {
            acheteur.removeSpecialItem(specialItemPriceName, 1);
        }

        // Give item
        if (entry.getSpecialItemName() != null && !entry.getSpecialItemName().trim().isEmpty()) {
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
        personnageRepository.save(acheteur);
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
            session.addLog("Félicitations, vous avez terminé le donjon !");
            if (!session.getPlayers().isEmpty()) {
                AppUser user = session.getPlayers().get(0).getUser();
                if (user != null) {
                    userRepository.save(user);
                }
                for (Personnage p : session.getPlayers()) {
                    personnageRepository.save(java.util.Objects.requireNonNull(p));
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
                        Anomalie clone = new Anomalie();
                        clone.setName(template.getName());
                        clone.setDescription(template.getDescription());
                        clone.setSpiritualite(template.getSpiritualite());
                        clone.setCategory(template.getCategory());
                        clone.setLevel(template.getLevel() != null ? template.getLevel() : 1);
                        clone.setMagicObject(template.isMagicObject());
                        clone.setTemplate(false);

                        AppUser user = null;
                        Personnage recipient = session.getPlayers().stream()
                                .filter(session::isEligibleForRewards)
                                .findFirst().orElse(null);
                        if (recipient != null) {
                            user = recipient.getUser();
                        }

                        if (user != null) {
                            clone.setOwnerUsername(user.getUsername());
                            clone.setUser(user);
                            anomalieRepository.save(clone);
                            anomalyName = clone.getName();
                            session.addLog("Vous avez obtenu l'item : " + anomalyName + " !");
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
