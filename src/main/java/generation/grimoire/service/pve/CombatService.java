package generation.grimoire.service.pve;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.SpellAvailability;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.SalleRepository;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.service.SpellService;
import generation.grimoire.service.PassiveDispatcher;
import generation.grimoire.entity.Spell;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.MonsterType;
import generation.grimoire.enumeration.MonsterBehavior;
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
    private final AnomalieRepository anomalieRepository;
    private final SalleRepository salleRepository;
    private final generation.grimoire.repository.pve.MonstreRepository monstreRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    // In-memory combat sessions
    private final Map<String, CombatSession> activeSessions = new ConcurrentHashMap<>();

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

        generation.grimoire.entity.auth.AppUser account = userRepository.findByUsername(username)
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
                throw new RuntimeException("Pas assez d'or pour entrer dans ce donjon (Requis : " + d.getEntryCostGold() + " Or).");
            }
            account.setMonnaie(account.getMonnaie() - d.getEntryCostGold());
            userRepository.save(account);
        }

        if (d.getSalles() == null || d.getSalles().isEmpty()) {
            throw new RuntimeException("Ce donjon ne contient aucune salle.");
        }

        String sessionId = UUID.randomUUID().toString();
        CombatSession session = new CombatSession(sessionId, d, players);

        if (consumableIds != null && !consumableIds.isEmpty()) {
            for (Long cid : consumableIds) {
                if (cid != null) { // <-- Added null check
                    equipmentRepository.findById(cid).ifPresent(eq -> {
                        if (eq.getOwnerUsername() != null && eq.getOwnerUsername().equals(username)) {
                            session.getActiveConsumables().add(eq);
                        }
                    });
                }
            }
        }

        handleRoomStart(session);

        activeSessions.put(sessionId, session);
        computeSpellAvailability(session);
        return session;
    }

    public CombatSession getSession(String sessionId) {
        return activeSessions.get(sessionId);
    }

    private void handleRoomStart(CombatSession session) {
        if (session.getCurrentRoom() == null)
            return;

        // Re-fetch la salle pour éviter les LazyInitializationException sur les listes
        // de monstres et loots
        generation.grimoire.entity.pve.Salle freshSalle = salleRepository
                .findById(java.util.Objects.requireNonNull(session.getCurrentRoom().getId()))
                .orElse(session.getCurrentRoom());

        // Force initialization of lazy collections to prevent
        // LazyInitializationException during Jackson serialization
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
                    generation.grimoire.model.pve.ActiveMonster am = new generation.grimoire.model.pve.ActiveMonster(m);

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
            rollInitiative(session);
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.TREASURE) {
            session.getEnemies().clear();
            session.addLog("Vous trouvez un trésor !");
        } else if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT) {
            session.getEnemies().clear();
            session.addLog("Événement : " + session.getCurrentRoom().getEventText());
        }
    }

    private void applyBossGlobalBuffs(generation.grimoire.model.pve.ActiveMonster am,
            generation.grimoire.entity.pve.Salle room) {
        generation.grimoire.entity.personnage.Personnage p = am.getAsPersonnage();
        String globalBuffsJson = room.getGlobalBuffs();
        if (globalBuffsJson == null || globalBuffsJson.trim().isEmpty()) {
            return;
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode buffsNode = mapper.readTree(globalBuffsJson);
            if (buffsNode.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode buffNode : buffsNode) {
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

    public CombatSession openChest(String sessionId, boolean useKey) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished())
            return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.TREASURE) {
            throw new RuntimeException("Ce n'est pas une salle de trésor !");
        }
        if (session.isRoomEventCompleted()) {
            throw new RuntimeException("Le coffre a déjà été ouvert.");
        }

        if (useKey) {
            generation.grimoire.entity.Equipment key = null;
            for (generation.grimoire.entity.Equipment eq : session.getActiveConsumables()) {
                if ("Clé".equalsIgnoreCase(eq.getName())) {
                    key = eq;
                    break;
                }
            }
            if (key == null) {
                throw new RuntimeException("L'équipe ne possède pas de Clé !");
            }
            session.getActiveConsumables().remove(key);
            equipmentRepository.delete(key);
            session.addLog(
                    "Vous utilisez une Clé pour ouvrir les compartiments secrets du coffre ! (+10% de chance de butin)");
        }

        int gold = session.getCurrentRoom().getTreasureGold();
        int exp = session.getCurrentRoom().getTreasureExp();
        session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + gold);

        int expPerHero = exp / Math.max(1, session.getPlayers().size());
        for (Personnage p : session.getPlayers()) {
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

        session.addLog("Vous avez ouvert le coffre ! Vous trouvez " + gold + " Or et chaque héros gagne " + expPerHero
                + " XP.");

        // Loot table
        java.util.Random rnd = new java.util.Random();
        if (session.getCurrentRoom().getLootTable() != null && user != null) {
            for (LootEntry entry : session.getCurrentRoom().getLootTable()) {
                double roll = rnd.nextDouble() * 100.0;
                double proba = entry.getProbability() + (useKey ? 10.0 : 0.0);
                if (roll <= proba && entry.getEquipment() != null) {
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

    public CombatSession acceptAlteration(String sessionId, Long anomalyId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished())
            return session;
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

                boolean hasEnoughHp = true;
                if (effect < 0 && p.getHealthCurrent() <= -effect) {
                    hasEnoughHp = false;
                }

                boolean hasEnoughXp = true;
                if (expEffect < 0 && p.getExperience() < -expEffect) {
                    hasEnoughXp = false;
                }

                if (hasEnoughHp && hasEnoughXp) {
                    eligibleCount++;
                    if (effect > 0)
                        p.heal(effect);
                    else if (effect < 0)
                        p.takeDamage(-effect, generation.grimoire.enumeration.DamageType.BRUT);

                    if (expEffect != 0) {
                        p.setExperience(p.getExperience() + expEffect);
                    }

                    if ("SPIRITUAL_XP".equals(room.getAlterationRewardType())) {
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

                if ("SPIRITUAL_XP".equals(room.getAlterationRewardType())
                        && room.getAlterationSpiritualXpReward() > 0) {
                    session.addLog(eligibleCount + " héros reçoivent " + room.getAlterationSpiritualXpReward()
                            + " XP de Spiritualité !");
                    logged = true;
                } else if ("SPECIAL_ITEM".equals(room.getAlterationRewardType())) {
                    String itemName = room.getAlterationSpecialItemReward();
                    Anomalie template = anomalieRepository.findFirstByName(itemName);
                    if (template != null && !session.getPlayers().isEmpty()) {
                        generation.grimoire.entity.auth.AppUser user = session.getPlayers().get(0).getUser();
                        if (user != null) {
                            Anomalie newAnomaly = new Anomalie();
                            newAnomaly.setName(template.getName());
                            newAnomaly.setDescription(template.getDescription());
                            newAnomaly.setSpiritualite(template.getSpiritualite());
                            newAnomaly.setOwnerUsername(user.getUsername());
                            newAnomaly.setUser(user);
                            anomalieRepository.save(newAnomaly);
                            session.addLog("L'équipe reçoit l'Item Spécial : " + itemName + " !");
                            logged = true;
                        }
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
            AppUser user = session.getPlayers().get(0).getUser();
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

            if (session.getPlayers().isEmpty()) {
                throw new RuntimeException("Aucun joueur dans la session.");
            }
            AppUser user = session.getPlayers().get(0).getUser();
            if (user == null) {
                throw new RuntimeException("Utilisateur inconnu.");
            }

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

            if ("GOLD".equals(rewardType)) {
                user.setMonnaie(user.getMonnaie() + rewardValue);
                userRepository.save(user);
                session.addLog("L'autel vous récompense de " + rewardValue + " Or !");
            } else if ("XP".equals(rewardType)) {
                for (Personnage p : session.getPlayers()) {
                    if (p.getHealthCurrent() > 0) {
                        p.setSpiritualiteExperience(p.getSpiritualiteExperience() + rewardValue);
                        personnageRepository.save(p);
                    }
                }
                session.addLog("L'autel accorde " + rewardValue + " XP de Spiritualité à tous les héros !");
            } else if ("ITEM".equals(rewardType)) {
                generation.grimoire.entity.Equipment template = equipmentRepository.findById((long) rewardValue)
                        .orElse(null);
                if (template != null) {
                    generation.grimoire.entity.Equipment clone = new generation.grimoire.entity.Equipment();
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
                    session.addLog("L'autel vous a offert un équipement : " + template.getName() + " !");
                }
            }
        }

        session.setRoomEventCompleted(true);
        return session;
    }

    public CombatSession useRope(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished())
            return session;

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

        generation.grimoire.entity.Equipment rope = null;
        for (generation.grimoire.entity.Equipment eq : session.getActiveConsumables()) {
            if ("Corde".equalsIgnoreCase(eq.getName())) {
                rope = eq;
                break;
            }
        }

        if (rope == null) {
            throw new RuntimeException("L'équipe ne possède pas de Corde !");
        }

        session.getActiveConsumables().remove(rope);
        equipmentRepository.delete(rope);

        session.addLog("Vous utilisez une Corde pour éviter le piège !");
        session.setRoomEventCompleted(true);
        return session;
    }

    public CombatSession consumeItem(String sessionId, Long consumableId, Long targetCharacterId, String username) {
        CombatSession session = getSession(sessionId);
        if (session == null)
            throw new RuntimeException("Session introuvable");

        generation.grimoire.entity.Equipment toConsume = null;
        for (generation.grimoire.entity.Equipment eq : session.getActiveConsumables()) {
            if (eq.getId().equals(consumableId)) {
                toConsume = eq;
                break;
            }
        }
        if (toConsume == null)
            throw new RuntimeException("Consommable non trouvé dans le combat");

        generation.grimoire.entity.personnage.Personnage target = null;
        for (generation.grimoire.entity.personnage.Personnage p : session.getPlayers()) {
            if (p.getId().equals(targetCharacterId)) {
                target = p;
                break;
            }
        }
        if (target == null)
            throw new RuntimeException("Cible introuvable");

        String itemName = toConsume.getName();
        if ("Pain".equalsIgnoreCase(itemName)) {
            if (target.getHealthCurrent() > 0) {
                int heal = (int) (target.getHealthMax() * 0.25);
                target.setHealthCurrent(Math.min(target.getHealthMax(), target.getHealthCurrent() + heal));
                session.addLog("🍞 " + target.getName() + " mange du Pain et récupère " + heal + " PV.");
            } else {
                throw new RuntimeException("Impossible d'utiliser du Pain sur un personnage mort.");
            }
        } else if ("Potion de mana".equalsIgnoreCase(itemName)) {
            if (target.getHealthCurrent() > 0) {
                int heal = (int) (target.getManaMax() * 0.25);
                target.setManaCurrent(Math.min(target.getManaMax(), target.getManaCurrent() + heal));
                session.addLog("💧 " + target.getName() + " boit une Potion de mana et récupère " + heal + " Mana.");
            } else {
                throw new RuntimeException("Impossible d'utiliser une Potion de mana sur un personnage mort.");
            }
        } else {
            throw new RuntimeException("Ce consommable ne peut pas être utilisé de cette façon.");
        }

        session.getActiveConsumables().remove(toConsume);
        personnageRepository.save(target);
        equipmentRepository.delete(toConsume);
        return session;
    }

    public CombatSession buyMerchantItem(String sessionId, int lootIndex, Long characterId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished()) {
            throw new RuntimeException("Session introuvable ou terminée.");
        }
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
            if (acheteur.getSpecialItemQuantity(specialItemPriceName) < 1) {
                throw new RuntimeException("Pas assez de " + specialItemPriceName + ".");
            }
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
                Anomalie template = anomalieRepository.findFirstByName(itemName);
                if (template != null) {
                    Anomalie newAnomaly = new Anomalie();
                    newAnomaly.setName(template.getName());
                    newAnomaly.setDescription(template.getDescription());
                    newAnomaly.setSpiritualite(template.getSpiritualite());
                    newAnomaly.setOwnerUsername(user.getUsername());
                    newAnomaly.setUser(user);
                    anomalieRepository.save(newAnomaly);
                }
            }

            session.addLog(acheteur.getName() + " a acheté " + itemName + ".");
        } else if (entry.getEquipment() != null) {
            Equipment clone = new Equipment();
            Equipment template = entry.getEquipment();
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
            clone.setSpecialEffect(template.getSpecialEffect());
            clone.setSpecialEffectValue(template.getSpecialEffectValue());
            clone.setRarity(template.getRarity());
            clone.setUser(user);

            equipmentRepository.save(clone);
            session.addLog(acheteur.getName() + " a acheté " + clone.getName() + ".");
        }

        session.getPurchasedMerchantItems().add(lootIndex);
        personnageRepository.save(acheteur);
        return session;
    }

    public CombatSession proceedToNextRoom(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished())
            return session;

        // If current room was treasure or event, apply it now before moving
        if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.EVENT
                && !session.isRoomEventCompleted()) {
            generation.grimoire.entity.pve.Salle room = session.getCurrentRoom();
            generation.grimoire.enumeration.EventSubType subType = room.getEventSubType();

            if (subType == generation.grimoire.enumeration.EventSubType.ALTERATION) {
                // If it's an alteration and we proceed without having accepted it, the player
                // ignored it. We do nothing.
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

    public CombatSession openStrangeDoor(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished())
            return session;
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
            return session;
        }

        try {
            com.fasterxml.jackson.databind.JsonNode outcomesNode = objectMapper.readTree(json);
            if (!outcomesNode.isArray() || outcomesNode.size() == 0) {
                session.addLog("La porte était une simple illusion... Rien ne se passe.");
                session.setRoomEventCompleted(true);
                return session;
            }

            int totalProb = 0;
            for (com.fasterxml.jackson.databind.JsonNode outcome : outcomesNode) {
                totalProb += outcome.path("probability").asInt(0);
            }

            if (totalProb <= 0) {
                session.addLog("La porte est bloquée à jamais.");
                session.setRoomEventCompleted(true);
                return session;
            }

            java.util.Random rnd = new java.util.Random();
            int roll = rnd.nextInt(totalProb);
            int currentSum = 0;
            com.fasterxml.jackson.databind.JsonNode selectedOutcome = null;

            for (com.fasterxml.jackson.databind.JsonNode outcome : outcomesNode) {
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

                com.fasterxml.jackson.databind.JsonNode monstersNode = selectedOutcome.path("monsters");
                if (monstersNode.isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode mIdNode : monstersNode) {
                        Long mId = mIdNode.asLong();
                        generation.grimoire.entity.pve.Monstre m = monstreRepository.findById(mId).orElse(null);
                        if (m != null)
                            room.getMonsters().add(m);
                    }
                }

                // Initialize enemies based on updated room monsters manually to avoid
                // overwriting from DB in handleRoomStart
                session.getEnemies().clear();
                for (generation.grimoire.entity.pve.Monstre m : room.getMonsters()) {
                    generation.grimoire.model.pve.ActiveMonster am = new generation.grimoire.model.pve.ActiveMonster(m);
                    session.getEnemies().add(am);
                }

                session.setTurnNumber(1);
                for (Personnage p : session.getPlayers()) {
                    p.setBanalSpellCastThisTurn(false);
                    p.setInstantSpellCastThisTurn(false);
                }
                rollInitiative(session);

                // Apply global buffs
                com.fasterxml.jackson.databind.JsonNode buffsNode = selectedOutcome.path("globalBuffs");
                if (buffsNode.isArray() && !session.getEnemies().isEmpty()) {
                    for (com.fasterxml.jackson.databind.JsonNode buffNode : buffsNode) {
                        String bType = buffNode.path("type").asText();
                        int bVal = buffNode.path("value").asInt(0);
                        int bDur = buffNode.path("duration").asInt(0);

                        for (generation.grimoire.model.pve.ActiveMonster am : session.getEnemies()) {
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
                session.addLog("Vous avez ouvert la porte et trouvé une salle remplie de trésors !");
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
                    generation.grimoire.entity.Equipment eq = equipmentRepository.findById((long) rewardValue)
                            .orElse(null);
                    room.setAltarRewardEquipment(eq);
                }
                room.setEventText("Un autel mystique (" + spirituality + ") réclame une offrande magique.");
            } else if ("TRESOR".equals(type)) {
                session.addLog("Vous avez ouvert la porte et trouvé une montagne d'or !");
                room.setType(generation.grimoire.enumeration.RoomType.TREASURE);
                room.setEventSubType(null);
                room.setTreasureGold(100);
                room.setTreasureExp(50);
            } else if ("PIEGE".equals(type)) {
                session.addLog("Vous avez ouvert la porte... et déclenché un piège mortel !");
                room.setEventSubType(generation.grimoire.enumeration.EventSubType.PIEGE);
                room.setTrapType(selectedOutcome.path("trapType").asText("PV"));
                room.setTrapAmount(selectedOutcome.path("trapAmount").asInt(0));
                room.setTrapHasRopeOption(selectedOutcome.path("trapHasRopeOption").asBoolean(false));
                room.setTrapDamageHpPct(selectedOutcome.path("trapDamageHpPct").asInt(0));
                room.setTrapDamageManaPct(selectedOutcome.path("trapDamageManaPct").asInt(0));
                room.setTrapDamageHpFixed(selectedOutcome.path("trapDamageHpFixed").asInt(0));
                room.setTrapDamageManaFixed(selectedOutcome.path("trapDamageManaFixed").asInt(0));
            } else {
                session.addLog("Vous avez ouvert la porte... Il n'y a absolument rien derrière.");
                session.setRoomEventCompleted(true);
            }

        } catch (Exception e) {
            e.printStackTrace();
            session.addLog("La porte refuse de s'ouvrir.");
            session.setRoomEventCompleted(true);
        }

        computeSpellAvailability(session);
        return session;
    }

    public CombatSession executeAction(String sessionId, Long spellId, Integer targetIndex, Integer allyTargetIndex,
            Integer choiceKey) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null)
            throw new RuntimeException("Session introuvable");
        if (session.isFinished())
            return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT
                && session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.BOSS) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }

        Personnage p = session.getActivePlayer();
        if (p == null)
            return session;

        // Player Action
        if (spellId != null) {
            Spell spellToCast = spellRepository.findById(spellId).orElse(null);
            if (spellToCast != null) {
                // Find target
                Personnage target = null;
                boolean targetsEnemy = spellToCast.getEffects().stream()
                        .anyMatch(e -> e.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.TARGET);
                boolean targetsAlly = spellToCast.getEffects().stream()
                        .anyMatch(e -> e.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.ALLY);

                if (targetsEnemy && targetIndex != null && targetIndex >= 0
                        && targetIndex < session.getEnemies().size()) {
                    target = session.getEnemies().get(targetIndex).getAsPersonnage();
                } else if (targetsAlly) {
                    target = p; // In PvE, ally is usually the player themselves if no companions
                } else {
                    target = p; // Default fallback, spellService logic resolves ALL_ENEMIES etc anyway
                }

                Personnage allyTarget = p; // default
                if (targetsAlly) {
                    if (allyTargetIndex != null && allyTargetIndex >= 0
                            && allyTargetIndex < session.getPlayers().size()) {
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

                List<Personnage> allEnemies = session.getEnemies().stream()
                        .map(generation.grimoire.model.pve.ActiveMonster::getAsPersonnage).toList();
                List<Personnage> allAllies = session.getPlayers().stream().filter(pl -> pl.getHealthCurrent() > 0)
                        .toList();

                final Personnage finalTarget = target;
                final Personnage finalAlly = allyTarget;
                session.addLog(p.getName() + " lance " + spellToCast.getNom() + " !");
                captureLogs(session, () -> {
                    spellService.castSpellGroup(spellToCast, p, finalTarget, finalAlly, allAllies, allEnemies,
                            choiceKey);
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
                    System.out.println(p.getName() + " attaque " + targetMonster.getBase().getName() + " et inflige "
                            + damageDone + " dégâts !");
                    targetMonster.takeDamage(damageDone);
                });
            }
        }

        checkDeaths(session);

        computeSpellAvailability(session);
        return session;
    }

    private void checkDeaths(CombatSession session) {
        // Check dead players
        for (Personnage p : session.getPlayers()) {
            if (p.getHealthCurrent() <= 0 && p.getId() != null && !session.getPenalizedDeadPlayers().contains(p.getId())) {
                session.getPenalizedDeadPlayers().add(p.getId());
                
                int penalty = 0;
                switch (p.getVoieLevel()) {
                    case 1: penalty = 10; break;
                    case 2: penalty = 30; break;
                    case 3: penalty = 80; break;
                    case 4: penalty = 125; break;
                    case 5: penalty = 160; break;
                    default: penalty = 10; break;
                }
                
                Personnage dbPersonnage = personnageRepository.findById(p.getId()).orElse(null);
                if (dbPersonnage != null) {
                    dbPersonnage.setExperience(Math.max(0, dbPersonnage.getExperience() - penalty));
                    personnageRepository.save(dbPersonnage);
                    p.setExperience(dbPersonnage.getExperience());
                    session.addLog("☠️ " + p.getName() + " succombe à ses blessures et perd " + penalty + " XP normal...");
                }
            }
        }

        // Check if all enemies were already processed (maxHp set to 0) before this
        // call.
        // We use maxHp == 0 instead of isDead() because isDead() checks healthCurrent
        // <= 0,
        // which is already true when a spell kills a monster before checkDeaths runs.
        boolean allAlreadyProcessed = session.getEnemies().stream()
                .allMatch(e -> e.getMaxHp() <= 0);
        int xpDrop = 0;
        int goldDrop = 0;
        // Check dead enemies
        for (generation.grimoire.model.pve.ActiveMonster m : session.getEnemies()) {
            if (m.isDead() && m.getCurrentHp() <= 0 && m.getMaxHp() > 0) {
                // We set maxHp to 0 to prevent re-awarding exp/gold next turn, hacky but works
                // for now
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
                session.addLog("Les monstres vaincus ont lâché " + goldDrop + " Or. Chaque héros reçoit " + expPerHero
                        + " XP.");
            } else {
                session.addLog("Chaque héros reçoit " + expPerHero + " XP.");
            }
        }

        // Check if all enemies are now processed (all maxHp == 0) and weren't all
        // processed before
        boolean allNowProcessed = session.getEnemies().stream()
                .allMatch(e -> e.getMaxHp() <= 0);
        if (!allAlreadyProcessed && allNowProcessed) {
            session.addLog("Combat terminé, vous avez vaincu tous les monstres !");

            // Boss end-of-combat bonus rewards
            if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
                int bossSpXp = session.getCurrentRoom().getBossRewardSpiritualXp();
                int bossGold = session.getCurrentRoom().getBossRewardGold();
                System.out.println("[BOSS REWARDS] SalleId=" + session.getCurrentRoom().getId()
                        + " | bossRewardSpiritualXp=" + bossSpXp
                        + " | bossRewardGold=" + bossGold
                        + " | nbPlayers=" + session.getPlayers().size());

                if (bossSpXp > 0 && !session.getPlayers().isEmpty()) {
                    int spXpPerHero = bossSpXp / Math.max(1, session.getPlayers().size());
                    for (Personnage p : session.getPlayers()) {
                        p.setSpiritualiteExperience(p.getSpiritualiteExperience() + spXpPerHero);
                        personnageRepository.save(p);
                    }
                    session.setBossBonusSpiritualXp(bossSpXp);
                    session.addLog("🔮 Le Boss vaincu octroie " + bossSpXp + " XP Spiritualité, partagé entre "
                            + session.getPlayers().size() + " héros (" + spXpPerHero + " chacun).");
                }

                if (bossGold > 0 && !session.getPlayers().isEmpty()) {
                    generation.grimoire.entity.auth.AppUser user = session.getPlayers().get(0).getUser();
                    if (user != null) {
                        user.setMonnaie(user.getMonnaie() + bossGold);
                        userRepository.save(user);
                    }
                    session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + bossGold);
                    session.setBossBonusGold(bossGold);
                    session.addLog("💰 Le Boss vaincu octroie " + bossGold + " Or supplémentaires !");
                }
            }
        }
    }

    public CombatSession endTurn(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null)
            throw new RuntimeException("Session introuvable");
        if (session.isFinished())
            return session;
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT
                && session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.BOSS) {
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
        if (session == null || session.isFinished())
            return session;

        if (session.isRoundFinished()) {
            if (!session.areAllEnemiesDead() && !session.areAllPlayersDead()) {
                session.setTurnNumber(session.getTurnNumber() + 1);
                rollInitiative(session);
            }
            computeSpellAvailability(session);
            return session;
        }

        generation.grimoire.model.pve.InitiativeEntry current = session.getTurnOrder()
                .get(session.getCurrentTurnIndex());

        // Safety: if the current turn is a player, we shouldn't auto-process! We just
        // return.
        if (current.isPlayer()) {
            computeSpellAvailability(session);
            return session;
        }

        generation.grimoire.model.pve.ActiveMonster m = session.getEnemies().get(current.getIndex());
        if (!m.isDead()) {
            captureLogs(session, () -> {
                session.addLog("--- Tour de l'ennemi " + m.getBase().getName() + " ---");
                spellService.startTurn(m.getAsPersonnage());

                // === PASSIF TYPE : MORT_VIVANT — Régénération début de tour ===
                MonsterType mType = m.getBase().getMonsterType();
                if (mType == null)
                    mType = MonsterType.NORMAL;
                if (mType == MonsterType.MORT_VIVANT && !m.isDead()) {
                    int regenAmount = (int) Math.ceil(m.getBase().getHealthMax() * 0.05);
                    int newHp = Math.min(m.getBase().getHealthMax(),
                            m.getAsPersonnage().getHealthCurrent() + regenAmount);
                    m.getAsPersonnage().setHealthCurrent(newHp);
                    session.addLog("\uD83D\uDC80 " + m.getBase().getName() + " se régénère de " + regenAmount
                            + " PV (Mort-vivant).");
                }

                if (!m.isDead()) {
                    Personnage mp = m.getAsPersonnage();
                    if (mp.getRemainingChannelingTurns() > 0) {
                        Personnage cTarget = mp.getChannelingTarget();
                        if (cTarget == null && !session.getPlayers().isEmpty()) {
                            cTarget = session.getPlayers().get(0);
                        }
                        spellService.tickChanneling(mp, cTarget, mp.getChannelingChoiceKey());
                    } else {
                        List<Personnage> alivePlayers = session.getPlayers().stream()
                                .filter(pl -> pl.getHealthCurrent() > 0).toList();
                        if (!alivePlayers.isEmpty()) {
                            // === RÉSOLUTION DU CIBLAGE (IA) ===
                            MonsterBehavior behavior = m.getBase().getBehavior();
                            if (behavior == null)
                                behavior = MonsterBehavior.NORMAL;

                            Personnage targetPlayer = resolveMonsterTarget(m, behavior, alivePlayers, session);

                            // === RÉSOLUTION DES DÉGÂTS (TYPE) ===
                            int monsterDmg;
                            if (mType == MonsterType.HYBRIDE) {
                                monsterDmg = Math.max(m.getBase().getStrength(), m.getBase().getPower());
                            } else {
                                monsterDmg = m.getBase().getStrength();
                            }

                            generation.grimoire.enumeration.DamageType dmgType = generation.grimoire.enumeration.DamageType.PHYSIC;
                            if (behavior == MonsterBehavior.INSENSIBLE) {
                                dmgType = generation.grimoire.enumeration.DamageType.BRUT;
                            }

                            System.out.println(m.getBase().getName() + " attaque " + targetPlayer.getName()
                                    + " et inflige " + monsterDmg + " dégâts.");
                            targetPlayer.takeDamage(monsterDmg, dmgType);

                            // Check for ON_HIT passive effects (BURN, POISON)
                            int burnDmg = m.getAsPersonnage().getPassiveState("BURN_ON_HIT", 0);
                            if (burnDmg > 0) {
                                int burnDur = m.getAsPersonnage().getPassiveState("BURN_ON_HIT_DURATION", 3);
                                generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect dot = new generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect();
                                dot.setFixedDamagePerTick(burnDmg);
                                dot.setDuration(burnDur);
                                dot.setDamageType(generation.grimoire.enumeration.DamageType.MAGIC);
                                dot.setBurn(true);
                                targetPlayer.getActiveDamageOverTimeEffects().add(dot);
                                session.addLog("🔥 " + targetPlayer.getName() + " s'embrase au contact ! (" + burnDmg
                                        + " dégâts par tour)");
                            }

                            int poisonDmg = m.getAsPersonnage().getPassiveState("POISON_ON_HIT", 0);
                            if (poisonDmg > 0) {
                                int poisonDur = m.getAsPersonnage().getPassiveState("POISON_ON_HIT_DURATION", 3);
                                generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect dot = new generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect();
                                dot.setFixedDamagePerTick(poisonDmg);
                                dot.setDuration(poisonDur);
                                dot.setDamageType(generation.grimoire.enumeration.DamageType.BRUT);
                                dot.setPoison(true);
                                targetPlayer.getActiveDamageOverTimeEffects().add(dot);
                                session.addLog("🦠 " + targetPlayer.getName() + " est empoisonné au contact ! ("
                                        + poisonDmg + " dégâts par tour)");
                            }

                            // === PASSIF TYPE : DEMON — 10% dégâts bruts supplémentaires ===
                            if (mType == MonsterType.DEMON) {
                                int brutDmg = (int) Math.ceil(monsterDmg * 0.10);
                                if (brutDmg > 0) {
                                    targetPlayer.takeDamage(brutDmg, generation.grimoire.enumeration.DamageType.BRUT);
                                    session.addLog("\uD83D\uDD25 " + m.getBase().getName() + " inflige " + brutDmg
                                            + " dégâts bruts supplémentaires (Démon).");
                                }
                            }

                            // === PASSIF TYPE : VAMPIRE — 20% vol de vie ===
                            if (mType == MonsterType.VAMPIRE) {
                                int healAmount = (int) Math.ceil(monsterDmg * 0.20);
                                int newHp = Math.min(m.getBase().getHealthMax(),
                                        m.getAsPersonnage().getHealthCurrent() + healAmount);
                                m.getAsPersonnage().setHealthCurrent(newHp);
                                session.addLog("\uD83E\uDDDB " + m.getBase().getName() + " vole " + healAmount
                                        + " PV (Vampire).");
                            }

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

            // Defeat penalty: 8 gold per room
            int roomsCount = (session.getDonjon() != null && session.getDonjon().getSalles() != null)
                    ? session.getDonjon().getSalles().size() : 1;
            int goldLoss = 8 * roomsCount;
            session.setTotalGoldLostOnDefeat(goldLoss);

            if (!session.getPlayers().isEmpty() && session.getPlayers().get(0).getId() != null) {
                Personnage dbP = personnageRepository.findById(session.getPlayers().get(0).getId()).orElse(null);
                if (dbP != null && dbP.getUser() != null) {
                    generation.grimoire.entity.auth.AppUser user = dbP.getUser();
                    user.setMonnaie(Math.max(0, user.getMonnaie() - goldLoss));
                    userRepository.save(user);
                    session.addLog("L'équipe perd " + goldLoss + " Or suite à cette défaite.");
                }
            }
        } else if (session.isRoundFinished() && !session.areAllEnemiesDead()) {
            session.setTurnNumber(session.getTurnNumber() + 1);
            rollInitiative(session);
        }

        computeSpellAvailability(session);
        return session;
    }

    @org.springframework.transaction.annotation.Transactional
    public void fleeCombat(String sessionId) {
        CombatSession session = activeSessions.get(sessionId);
        if (session == null || session.isFinished())
            return;

        int roomsCount = (session.getDonjon() != null && session.getDonjon().getSalles() != null)
                ? session.getDonjon().getSalles().size()
                : 1;
        int penaltyGold = 10 * roomsCount;
        int penaltyXpTotal = 10 * roomsCount;
        int nbHeroes = Math.max(1, session.getPlayers().size());
        int penaltyXpPerPlayer = penaltyXpTotal / nbHeroes;

        boolean goldDeducted = false;

        for (Personnage p : session.getPlayers()) {
            Long playerId = p.getId();

            if (playerId == null) {
                continue;
            }

            Personnage dbPersonnage = personnageRepository.findById(playerId).orElse(null);

            if (dbPersonnage != null) {
                dbPersonnage.setExperience(Math.max(0, dbPersonnage.getExperience() - penaltyXpPerPlayer));
                personnageRepository.save(dbPersonnage);

                if (!goldDeducted) {
                    generation.grimoire.entity.auth.AppUser user = dbPersonnage.getUser();
                    if (user != null) {
                        user.setMonnaie(Math.max(0, user.getMonnaie() - penaltyGold));
                        userRepository.save(user);
                        goldDeducted = true;
                    }
                }

                p.setExperience(dbPersonnage.getExperience());
            }
        }

        session.setFinished(true);
        session.setPlayerWon(false);
        activeSessions.remove(sessionId);
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
                session.getTurnOrder().add(
                        new generation.grimoire.model.pve.InitiativeEntry(true, i, score, speed, rnd.nextInt(100)));
            }
        }

        for (int i = 0; i < session.getEnemies().size(); i++) {
            generation.grimoire.model.pve.ActiveMonster m = session.getEnemies().get(i);
            if (!m.isDead()) {
                int speed = m.getBase().getSpeed();
                int score = calculateInitiativeScore(speed, rnd);
                session.getTurnOrder().add(
                        new generation.grimoire.model.pve.InitiativeEntry(false, i, score, speed, rnd.nextInt(100)));
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
            String name = e.isPlayer() ? session.getPlayers().get(e.getIndex()).getName()
                    : session.getEnemies().get(e.getIndex()).getBase().getName();
            session.addLog(name + " | Init: " + e.getInitiativeScore() + " (Vitesse: " + e.getSpeedStat() + ")");
        }

        advanceToNextLiveTurn(session);

        // Clear leader forced targets at start of each round
        for (generation.grimoire.model.pve.ActiveMonster am : session.getEnemies()) {
            am.setLeaderForcedTargetId(null);
        }
    }

    private Personnage resolveMonsterTarget(generation.grimoire.model.pve.ActiveMonster m, MonsterBehavior behavior,
            List<Personnage> alivePlayers, CombatSession session) {
        java.util.Random rnd = new java.util.Random();

        // If a leader has forced a target on us, use that
        if (m.getLeaderForcedTargetId() != null) {
            for (Personnage p : alivePlayers) {
                if (p.getId().equals(m.getLeaderForcedTargetId())) {
                    session.addLog(
                            "\uD83D\uDC51 " + m.getBase().getName() + " obéit au Leader et cible " + p.getName() + ".");
                    return p;
                }
            }
            // Leader target is dead, fall through to own behavior
        }

        switch (behavior) {
            case PREDATEUR -> {
                // Lock onto a target, keep it until dead
                if (m.getLockedTargetId() != null) {
                    for (Personnage p : alivePlayers) {
                        if (p.getId().equals(m.getLockedTargetId())) {
                            session.addLog("\uD83D\uDC3A " + m.getBase().getName() + " continue de traquer "
                                    + p.getName() + " (Prédateur).");
                            return p;
                        }
                    }
                }
                // Target dead or none, pick new one
                Personnage newTarget = alivePlayers.get(rnd.nextInt(alivePlayers.size()));
                m.setLockedTargetId(newTarget.getId());
                session.addLog("\uD83D\uDC3A " + m.getBase().getName() + " verrouille " + newTarget.getName()
                        + " comme proie (Prédateur).");
                return newTarget;
            }
            case CORRUPTEUR -> {
                // Target with highest mana
                Personnage target = alivePlayers.stream()
                        .max(java.util.Comparator.comparingInt(Personnage::getManaCurrent))
                        .orElse(alivePlayers.get(0));
                session.addLog("\uD83D\uDC1B " + m.getBase().getName() + " cible " + target.getName()
                        + " (le plus de Mana - Corrupteur).");
                return target;
            }
            case LEADER -> {
                // Pick a target and force all allies to hit it too
                Personnage target = alivePlayers.get(rnd.nextInt(alivePlayers.size()));
                session.addLog("\uD83D\uDC51 " + m.getBase().getName() + " ordonne à tous les monstres de cibler "
                        + target.getName() + " (Leader) !");
                for (generation.grimoire.model.pve.ActiveMonster ally : session.getEnemies()) {
                    if (ally != m && !ally.isDead()) {
                        ally.setLeaderForcedTargetId(target.getId());
                    }
                }
                return target;
            }
            case ASSASSIN -> {
                // Target with lowest resistance
                Personnage target = alivePlayers.stream()
                        .min(java.util.Comparator.comparingInt(
                                p -> p.getEffectiveStat(generation.grimoire.enumeration.StatType.RESISTANCE)))
                        .orElse(alivePlayers.get(0));
                session.addLog("\uD83D\uDDE1\uFE0F " + m.getBase().getName() + " vise " + target.getName()
                        + " (la plus faible Résistance - Assassin).");
                return target;
            }
            case INSENSIBLE -> {
                // Random target, but damage type is handled in caller
                Personnage target = alivePlayers.get(rnd.nextInt(alivePlayers.size()));
                session.addLog("\uD83E\uDDA0 " + m.getBase().getName() + " frappe " + target.getName()
                        + " avec des dégâts bruts (Insensible).");
                return target;
            }
            default -> {
                return alivePlayers.get(rnd.nextInt(alivePlayers.size()));
            }
        }
    }

    private void advanceToNextLiveTurn(CombatSession session) {
        // Process dead entities and start player turn
        while (!session.isRoundFinished()) {
            generation.grimoire.model.pve.InitiativeEntry current = session.getTurnOrder()
                    .get(session.getCurrentTurnIndex());
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
     * Calcule la disponibilité de chaque sort pour le joueur à l'état actuel du
     * combat.
     * Reproduit la logique de validation de SpellService.castSpellGroup() en mode
     * lecture seule.
     */
    private void computeSpellAvailability(CombatSession session) {
        if (session.isFinished())
            return;
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
                public void write(int b) {
                }
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
        if (cType == null)
            cType = SpellCastingType.BANAL;

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

        // 4) Calcul des coûts ajustés (passifs Création, Consolidation, Destruction,
        // Karma Harmonie)
        int actualManaCost = spell.getManaCost();
        if (spell.getPercentManaCost() > 0) {
            double manaBase = generation.grimoire.utils.StatCalculator.getSourceValue(
                    spell.getPercentManaCostSource() != null ? spell.getPercentManaCostSource()
                            : generation.grimoire.enumeration.Source.CASTER_MANA_MAX,
                    p, p);
            actualManaCost += (int) (manaBase * spell.getPercentManaCost() / 100);
        }
        int actualHealCost = spell.getHealCost();
        if (spell.getPercentHealCost() > 0) {
            double healBase = generation.grimoire.utils.StatCalculator.getSourceValue(
                    spell.getPercentHealCostSource() != null ? spell.getPercentHealCostSource()
                            : generation.grimoire.enumeration.Source.CASTER_HEALTH_MAX,
                    p, p);
            actualHealCost += (int) (healBase * spell.getPercentHealCost() / 100);
        }
        int actualHeatCost = spell.getHeatCost();
        if (spell.getPercentHeatCost() > 0) {
            actualHeatCost += (int) (100.0 * spell.getPercentHeatCost() / 100.0);
        }

        // Ajustement des coûts via les passifs (Création, Consolidation, Destruction,
        // Karma)
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

    private void consumeAnomalie(AppUser user, generation.grimoire.entity.Anomalie toDestroy) {
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
