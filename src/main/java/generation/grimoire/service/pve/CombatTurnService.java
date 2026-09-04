package generation.grimoire.service.pve;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.MonsterBehavior;
import generation.grimoire.enumeration.MonsterType;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.model.pve.ActiveMonster;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.InitiativeEntry;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.service.SpellService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.List;

/**
 * Gestion des tours de combat : initiative, IA des monstres,
 * vérification des morts, fuite, et timeouts multijoueur.
 */
@Service
@Transactional
@RequiredArgsConstructor
class CombatTurnService {

    private final PersonnageRepository personnageRepository;
    private final UserRepository userRepository;
    private final SpellRepository spellRepository;
    private final SpellService spellService;
    private final SpellAvailabilityService spellAvailabilityService;

    CombatSession endTurn(CombatSession session) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT
                && session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.BOSS) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }

        Personnage p = session.getActivePlayer();

        if (p != null) {
            p.setBanalSpellCastThisTurn(false);
            p.setInstantSpellCastThisTurn(false);
            CombatLogCapture.captureLogs(session, () -> {
                if (p.getRemainingChannelingTurns() > 0) {
                    Personnage channelingTarget = p.getChannelingTarget();
                    if (channelingTarget == null && !session.getEnemies().isEmpty()) {
                        channelingTarget = session.getEnemies().get(0).getAsPersonnage();
                    }
                    List<Personnage> allAllies = session.getPlayers().stream().filter(pl -> pl.getHealthCurrent() > 0)
                            .toList();
                    List<Personnage> allEnemies = session.getEnemies().stream().map(m -> m.getAsPersonnage()).toList();
                    spellService.tickChanneling(p, channelingTarget, p.getChannelingChoiceKey(), p.getChannelingAlly(),
                            allAllies,
                            allEnemies);
                }
            });
        }
        session.advanceTurnIndex();
        advanceToNextLiveTurn(session);

        if (session.isRoundFinished() && !session.areAllEnemiesDead() && !session.areAllPlayersDead()) {
            session.setTurnNumber(session.getTurnNumber() + 1);
            rollInitiative(session);
        }

        spellAvailabilityService.compute(session);
        return session;
    }

    CombatSession processNextAutoTurn(CombatSession session) {
        if (session.isFinished())
            return session;

        if (session.isRoundFinished()) {
            if (!session.areAllEnemiesDead() && !session.areAllPlayersDead()) {
                session.setTurnNumber(session.getTurnNumber() + 1);
                rollInitiative(session);
            }
            spellAvailabilityService.compute(session);
            return session;
        }

        InitiativeEntry current = session.getTurnOrder()
                .get(session.getCurrentTurnIndex());

        // Safety: if the current turn is a player, we shouldn't auto-process! We just return.
        if (current.isPlayer()) {
            if (session.getTurnStartTime() == null) {
                session.setTurnStartTime(System.currentTimeMillis());
            }
            spellAvailabilityService.compute(session);
            return session;
        }

        ActiveMonster m = session.getEnemies().get(current.getIndex());
        if (!m.isDead()) {
            CombatLogCapture.captureLogs(session, () -> {
                session.addLog("--- Tour de l'ennemi " + m.getBase().getName() + " ---");
                spellService.startTurn(m.getAsPersonnage());

                // === REGÉNÉRATION HP & MANA ===
                if (!m.isDead()) {
                    int rHp = m.getBase().getRegenHp();
                    if (rHp > 0) {
                        int beforeHp = m.getAsPersonnage().getHealthCurrent();
                        m.getAsPersonnage().heal(rHp);
                        int healed = m.getAsPersonnage().getHealthCurrent() - beforeHp;
                        if (healed > 0) {
                            session.addLog("💖 " + m.getBase().getName() + " régénère " + healed + " PV.");
                        }
                    }
                    int rMana = m.getBase().getRegenMana();
                    if (rMana > 0) {
                        int beforeMana = m.getAsPersonnage().getManaCurrent();
                        m.getAsPersonnage().restoreMana(rMana);
                        int recovered = m.getAsPersonnage().getManaCurrent() - beforeMana;
                        if (recovered > 0) {
                            session.addLog("💧 " + m.getBase().getName() + " régénère " + recovered + " Mana.");
                        }
                    }
                }

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
                        List<Personnage> allAllies = session.getEnemies().stream().map(am -> am.getAsPersonnage())
                                .toList();
                        List<Personnage> allEnemies = session.getPlayers().stream()
                                .filter(pl -> pl.getHealthCurrent() > 0).toList();
                        spellService.tickChanneling(mp, cTarget, mp.getChannelingChoiceKey(), mp.getChannelingAlly(),
                                allAllies,
                                allEnemies);
                    }

                    List<Personnage> alivePlayers = session.getPlayers().stream()
                            .filter(pl -> pl.getHealthCurrent() > 0).toList();
                    if (!alivePlayers.isEmpty()) {
                        // === MUTATIONS : Caster des sorts avant l'attaque physique ===
                        if (m.getBase().getMutations() != null && !m.getBase().getMutations().isEmpty()) {
                            List<Personnage> allAlliesMut = session.getEnemies().stream()
                                    .map(am -> am.getAsPersonnage()).toList();
                            List<Personnage> allEnemiesMut = alivePlayers;

                            // Collecter tous les sorts de toutes les mutations du monstre
                            List<Spell> mutationSpells = new java.util.ArrayList<>();
                            for (generation.grimoire.entity.pve.Mutation mut : m.getBase().getMutations()) {
                                mutationSpells.addAll(spellRepository.findByMutationId(mut.getId()));
                            }

                            // Prioriser les sorts instantanés
                            java.util.Collections.shuffle(mutationSpells);
                            mutationSpells.sort((s1, s2) -> {
                                boolean isS1Inst = s1.getCastingType() == SpellCastingType.INSTANTANE;
                                boolean isS2Inst = s2.getCastingType() == SpellCastingType.INSTANTANE;
                                if (isS1Inst && !isS2Inst) return -1;
                                if (!isS1Inst && isS2Inst) return 1;
                                return 0;
                            });

                            // Essayer de caster jusqu'à 4 sorts par tour
                            int castCount = 0;
                            for (Spell mutSpell : mutationSpells) {
                                if (castCount >= 4)
                                    break;
                                if (m.isDead())
                                    break;

                                SpellCastingType cType = mutSpell.getCastingType();
                                if (cType == null)
                                    cType = SpellCastingType.BANAL;
                                    
                                // Si le monstre canalise, il ne peut lancer QUE des sorts instantanés (si autorisés)
                                if (mp.getRemainingChannelingTurns() > 0) {
                                    if (cType != SpellCastingType.INSTANTANE) continue;
                                    if (!mp.isAllowInstantDuringCurrentChanneling()) continue;
                                }

                                // Limite par tour
                                if (m.getAsPersonnage().isBanalSpellCastThisTurn()
                                        && cType != SpellCastingType.INSTANTANE)
                                    continue;
                                if (m.getAsPersonnage().isInstantSpellCastThisTurn()
                                        && cType == SpellCastingType.INSTANTANE)
                                    continue;

                                int totalManaCost = mutSpell.getManaCost();
                                if (mutSpell.getPercentManaCost() > 0) {
                                    totalManaCost += (int) Math.ceil(m.getAsPersonnage().getManaMax()
                                            * mutSpell.getPercentManaCost() / 100.0);
                                }

                                if (m.getAsPersonnage().getManaCurrent() >= totalManaCost && totalManaCost > 0) {
                                    String castError = m.getAsPersonnage().canCast(mutSpell);
                                    if (castError != null)
                                        continue;

                                    // Choisir une cible via l'IA existante
                                    MonsterBehavior behaviorMut = m.getBase().getBehavior();
                                    if (behaviorMut == null)
                                        behaviorMut = MonsterBehavior.NORMAL;
                                    Personnage mutTarget = resolveMonsterTarget(m, behaviorMut, alivePlayers,
                                            session);

                                    // Choisir un allié aléatoirement
                                    Personnage mutAlly = m.getAsPersonnage();
                                    java.util.List<Personnage> validAllies = allAlliesMut.stream()
                                            .filter(a -> a != m.getAsPersonnage() && a.getHealthCurrent() > 0)
                                            .toList();
                                    if (!validAllies.isEmpty()) {
                                        mutAlly = validAllies
                                                .get(new java.util.Random().nextInt(validAllies.size()));
                                    }

                                    session.addLog(
                                            "🧬 " + m.getBase().getName() + " lance " + mutSpell.getNom() + " !");
                                    final Personnage finalMutAlly = mutAlly;
                                    CombatLogCapture.captureLogs(session, () -> {
                                        spellService.castSpellGroup(mutSpell, m.getAsPersonnage(), mutTarget,
                                                finalMutAlly, allAlliesMut, allEnemiesMut, null);
                                    });

                                    if (cType == SpellCastingType.BANAL || cType == SpellCastingType.CANALISE)
                                        m.getAsPersonnage().setBanalSpellCastThisTurn(true);
                                    if (cType == SpellCastingType.INSTANTANE)
                                        m.getAsPersonnage().setInstantSpellCastThisTurn(true);

                                    castCount++;
                                }
                            }
                        }

                        // Vérifier si les joueurs sont toujours en vie après les mutations
                        alivePlayers = session.getPlayers().stream()
                                .filter(pl -> pl.getHealthCurrent() > 0).toList();
                        if (alivePlayers.isEmpty() || m.isDead() || m.getAsPersonnage().isBanalSpellCastThisTurn()
                                || m.getAsPersonnage().getRemainingChannelingTurns() > 0) {
                            // Combat terminé, monstre mort, ou a déjà casté un sort banal/canalisé, pas
                            // d'attaque physique
                        } else {
                            // === RÉSOLUTION DU CIBLAGE (IA) ===
                            MonsterBehavior behavior = m.getBase().getBehavior();
                            if (behavior == null)
                                behavior = MonsterBehavior.NORMAL;

                                List<Personnage> targetPlayers = new java.util.ArrayList<>();
                                if (behavior == MonsterBehavior.TRANSCENDANT) {
                                    targetPlayers.addAll(alivePlayers);
                                } else {
                                    targetPlayers.add(resolveMonsterTarget(m, behavior, alivePlayers, session));
                                }

                                for (Personnage targetPlayer : targetPlayers) {

                                    // === RÉSOLUTION DES DÉGÂTS (TYPE) ===
                                    int str = m.getBase().getStrength();
                                    int pwr = m.getBase().getPower();

                                    if (behavior == MonsterBehavior.BRUTAL) {
                                        int monsterDmg = str + pwr;
                                        System.out.println(m.getBase().getName() + " attaque " + targetPlayer.getName()
                                                + " et inflige " + monsterDmg + " dégâts bruts.");
                                        if (monsterDmg > 0) {
                                            m.getAsPersonnage().dealDamage(targetPlayer, monsterDmg,
                                                    generation.grimoire.enumeration.DamageType.BRUT);
                                        }
                                    } else {
                                        if (str > 0)
                                            m.getAsPersonnage().dealDamage(targetPlayer, str,
                                                    generation.grimoire.enumeration.DamageType.PHYSIC);
                                        if (pwr > 0)
                                            m.getAsPersonnage().dealDamage(targetPlayer, pwr,
                                                    generation.grimoire.enumeration.DamageType.MAGIC);

                                        StringBuilder logMsg = new StringBuilder();
                                        if (str > 0)
                                            logMsg.append(str).append(" dégâts physiques");
                                        if (pwr > 0) {
                                            if (str > 0)
                                                logMsg.append(" et ");
                                            logMsg.append(pwr).append(" dégâts magiques");
                                        }
                                        if (str == 0 && pwr == 0)
                                            logMsg.append("0 dégât");

                                        System.out.println(m.getBase().getName() + " attaque " + targetPlayer.getName()
                                                + " et inflige " + logMsg.toString() + ".");
                                    }

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
                                        session.addLog(
                                                "🔥 " + targetPlayer.getName() + " s'embrase au contact ! (" + burnDmg
                                                        + " dégâts par tour)");
                                    }

                                    int poisonDmg = m.getAsPersonnage().getPassiveState("POISON_ON_HIT", 0);
                                    if (poisonDmg > 0) {
                                        int poisonDur = m.getAsPersonnage().getPassiveState("POISON_ON_HIT_DURATION",
                                                3);
                                        generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect dot = new generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect();
                                        dot.setFixedDamagePerTick(poisonDmg);
                                        dot.setDuration(poisonDur);
                                        dot.setDamageType(generation.grimoire.enumeration.DamageType.BRUT);
                                        dot.setPoison(true);
                                        targetPlayer.getActiveDamageOverTimeEffects().add(dot);
                                        session.addLog("🦠 " + targetPlayer.getName() + " est empoisonné au contact ! ("
                                                + poisonDmg + " dégâts par tour)");
                                    }

                                    // === COMPORTEMENT : CORRUPTEUR — Drain de mana ===
                                    if (behavior == MonsterBehavior.CORRUPTEUR) {
                                        int manaLoss = (int) Math.floor(targetPlayer.getManaCurrent() * 0.05);
                                        if (manaLoss > 0) {
                                            targetPlayer.setManaCurrent(
                                                    Math.max(0, targetPlayer.getManaCurrent() - manaLoss));
                                            session.addLog("🦇 " + targetPlayer.getName() + " perd " + manaLoss
                                                    + " points de mana ! (Corrupteur)");
                                        }
                                    }

                                    if (targetPlayer.getHealthCurrent() <= 0) {
                                        System.out.println(targetPlayer.getName() + " a été vaincu...");
                                    }
                                } // End of targetPlayer loop
                        }
                    } // End of alive players else
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

            // Defeat penalty: 4 gold per room (half of flee penalty)
            int roomsCount = (session.getDonjon() != null && session.getDonjon().getSalles() != null)
                    ? session.getDonjon().getSalles().size()
                    : 1;
            int goldLoss = 4 * roomsCount;
            session.setTotalGoldLostOnDefeat(goldLoss);

            if (!session.getPlayers().isEmpty() && session.getPlayers().get(0).getId() != null) {
                Personnage dbP = personnageRepository
                        .findById(java.util.Objects.requireNonNull(session.getPlayers().get(0).getId())).orElse(null);
                if (dbP != null && dbP.getUser() != null) {
                    AppUser user = dbP.getUser();
                    user.setMonnaie(Math.max(0, user.getMonnaie() - goldLoss));
                    userRepository.save(user);
                    session.addLog("L'équipe perd " + goldLoss + " Or suite à cette défaite.");
                }
            }
        } else if (session.isRoundFinished() && !session.areAllEnemiesDead()) {
            session.setTurnNumber(session.getTurnNumber() + 1);
            rollInitiative(session);
        }

        spellAvailabilityService.compute(session);
        return session;
    }

    @Transactional
    void fleeCombat(CombatSession session, String username) {
        if (username != null) {
            boolean playerKilled = false;
            for (Personnage p : session.getPlayers()) {
                if (username.equals(p.getOwnerUsername()) && p.getHealthCurrent() > 0) {
                    p.setHealthCurrent(0);
                    playerKilled = true;
                }
            }

            if (playerKilled) {
                session.addLog("Le joueur " + username + " a pris la fuite. Ses personnages tombent au combat !");

                boolean anyAlive = session.getPlayers().stream().anyMatch(p -> p.getHealthCurrent() > 0);

                if (anyAlive) {
                    // Register as fled — excluded from all future rewards
                    session.getFledUsernames().add(username);

                    boolean wasTheirTurn = false;
                    if (!session.isFinished() && !session.isRoundFinished() && session.getCurrentTurnIndex() < session.getTurnOrder().size()) {
                        InitiativeEntry current = session.getTurnOrder().get(session.getCurrentTurnIndex());
                        if (current.isPlayer()) {
                            Personnage currentP = session.getPlayers().get(current.getIndex());
                            if (username.equals(currentP.getOwnerUsername())) {
                                wasTheirTurn = true;
                            }
                        }
                    }

                    if (wasTheirTurn) {
                        // Correctly advances the turn, runs monster AI if needed, and computes spell availability
                        endTurn(session);
                    } else {
                        // Recompute in case remaining player's spell availability changed
                        spellAvailabilityService.compute(session);
                    }
                    return;
                }
            }
        }

        int roomsCount = (session.getDonjon() != null && session.getDonjon().getSalles() != null)
                ? session.getDonjon().getSalles().size()
                : 1;
        int penaltyGold = 10 * roomsCount;
        int penaltyXpTotal = 10 * roomsCount;
        int nbHeroes = Math.max(1, session.getPlayers().size());
        int penaltyXpPerPlayer = penaltyXpTotal / nbHeroes;

        boolean goldDeducted = false;

        for (Personnage p : session.getPlayers()) {
            p.resetCombatState();
            Long playerId = p.getId();

            if (playerId == null) {
                continue;
            }

            Personnage dbPersonnage = personnageRepository.findById(playerId).orElse(null);

            if (dbPersonnage != null) {
                dbPersonnage.setExperience(Math.max(0, dbPersonnage.getExperience() - penaltyXpPerPlayer));
                personnageRepository.save(dbPersonnage);

                if (!goldDeducted) {
                    AppUser user = dbPersonnage.getUser();
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
    }

    void checkDeaths(CombatSession session) {
        // Check dead players
        for (Personnage p : session.getPlayers()) {
            if (p.getHealthCurrent() <= 0 && p.getId() != null
                    && !session.getPenalizedDeadPlayers().contains(p.getId())) {
                session.getPenalizedDeadPlayers().add(p.getId());

                int penalty = switch (p.getVoieLevel()) {
                    case 1 -> 10;
                    case 2 -> 30;
                    case 3 -> 80;
                    case 4 -> 125;
                    case 5 -> 160;
                    default -> 10;
                };

                Personnage dbPersonnage = personnageRepository.findById(java.util.Objects.requireNonNull(p.getId()))
                        .orElse(null);
                if (dbPersonnage != null) {
                    dbPersonnage.setExperience(Math.max(0, dbPersonnage.getExperience() - penalty));
                    personnageRepository.save(dbPersonnage);
                    p.setExperience(dbPersonnage.getExperience());
                    session.addLog(
                            "☠️ " + p.getName() + " succombe à ses blessures et perd " + penalty + " XP normal...");
                }
            }
        }

        // Check if all enemies were already processed
        boolean allAlreadyProcessed = session.getEnemies().stream()
                .allMatch(e -> e.getMaxHp() <= 0);
        int xpDrop = 0;
        int goldDrop = 0;
        // Check dead enemies
        for (ActiveMonster am : session.getEnemies()) {
            if (am.isDead() && am.getCurrentHp() <= 0 && am.getMaxHp() > 0) {
                am.setMaxHp(0);
                session.addLog(am.getBase().getName() + " est mort !");
                xpDrop += am.getBase().getRewardExp();
                goldDrop += am.getBase().getRewardGold();
            }
        }

        if (xpDrop > 0 || goldDrop > 0) {
            session.setTotalExpAccumulated(session.getTotalExpAccumulated() + xpDrop);
            session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + goldDrop);

            List<Personnage> eligiblePlayers = session.getPlayers().stream()
                    .filter(session::isEligibleForRewards).collect(java.util.stream.Collectors.toList());
            int expPerHero = xpDrop / Math.max(1, eligiblePlayers.size());
            for (Personnage p : eligiblePlayers) {
                p.setExperience(p.getExperience() + expPerHero);
                personnageRepository.save(p);
            }
            if (goldDrop > 0 && !eligiblePlayers.isEmpty()) {
                for (Personnage p : eligiblePlayers) {
                    AppUser u = p.getUser();
                    if (u != null) {
                        u.setMonnaie(u.getMonnaie() + goldDrop);
                        userRepository.save(u);
                    }
                }
                session.addLog("Les monstres vaincus ont lâché " + goldDrop + " Or. Chaque héros reçoit " + expPerHero
                        + " XP.");
            } else {
                session.addLog("Chaque héros reçoit " + expPerHero + " XP.");
            }
        }

        // Check if all enemies are now processed and weren't all processed before
        boolean allNowProcessed = session.getEnemies().stream()
                .allMatch(e -> e.getMaxHp() <= 0);
        if (!allAlreadyProcessed && allNowProcessed) {
            session.addLog("Combat terminé, vous avez vaincu tous les monstres !");
            for (Personnage p : session.getPlayers()) {
                p.resetCombatState();
            }

            // Boss end-of-combat bonus rewards
            if (session.getCurrentRoom().getType() == generation.grimoire.enumeration.RoomType.BOSS) {
                int bossSpXp = session.getCurrentRoom().getBossRewardSpiritualXp();
                int bossGold = session.getCurrentRoom().getBossRewardGold();
                System.out.println("[BOSS REWARDS] SalleId=" + session.getCurrentRoom().getId()
                        + " | bossRewardSpiritualXp=" + bossSpXp
                        + " | bossRewardGold=" + bossGold
                        + " | nbPlayers=" + session.getPlayers().size());

                List<Personnage> bossEligible = session.getPlayers().stream()
                        .filter(session::isEligibleForRewards).collect(java.util.stream.Collectors.toList());
                if (bossSpXp > 0 && !bossEligible.isEmpty()) {
                    int spXpPerHero = bossSpXp / Math.max(1, bossEligible.size());
                    for (Personnage p : bossEligible) {
                        p.setSpiritualiteExperience(p.getSpiritualiteExperience() + spXpPerHero);
                        personnageRepository.save(p);
                    }
                    session.setBossBonusSpiritualXp(bossSpXp);
                    session.addLog("🔮 Le Boss vaincu octroie " + bossSpXp + " XP Spiritualité, partagé entre "
                            + bossEligible.size() + " héros (" + spXpPerHero + " chacun).");
                }

                if (bossGold > 0 && !bossEligible.isEmpty()) {
                    for (Personnage p : bossEligible) {
                        AppUser u = p.getUser();
                        if (u != null) {
                            u.setMonnaie(u.getMonnaie() + bossGold);
                            userRepository.save(u);
                        }
                    }
                    session.setTotalGoldAccumulated(session.getTotalGoldAccumulated() + bossGold);
                    session.setBossBonusGold(bossGold);
                    session.addLog("💰 Le Boss vaincu octroie " + bossGold + " Or supplémentaires !");
                }
            }
        }
    }

    void rollInitiative(CombatSession session) {
        session.getTurnOrder().clear();
        session.setCurrentTurnIndex(0);
        java.util.Random rnd = new java.util.Random();

        for (int i = 0; i < session.getPlayers().size(); i++) {
            Personnage p = session.getPlayers().get(i);
            if (p.getHealthCurrent() > 0) {
                int speed = p.getEffectiveStat(generation.grimoire.enumeration.StatType.SPEED);
                int score = calculateInitiativeScore(speed, rnd);
                session.getTurnOrder().add(
                        new InitiativeEntry(true, i, score, speed, rnd.nextInt(100)));
            }
        }

        for (int i = 0; i < session.getEnemies().size(); i++) {
            ActiveMonster am = session.getEnemies().get(i);
            if (!am.isDead()) {
                int speed = am.getBase().getSpeed();
                int score = calculateInitiativeScore(speed, rnd);
                session.getTurnOrder().add(
                        new InitiativeEntry(false, i, score, speed, rnd.nextInt(100)));
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
        for (InitiativeEntry e : session.getTurnOrder()) {
            String name = e.isPlayer() ? session.getPlayers().get(e.getIndex()).getName()
                    : session.getEnemies().get(e.getIndex()).getBase().getName();
            session.addLog(name + " | Init: " + e.getInitiativeScore() + " (Vitesse: " + e.getSpeedStat() + ")");
        }

        // Clear leader forced targets at start of each round
        for (ActiveMonster am : session.getEnemies()) {
            am.setLeaderForcedTargetId(null);
        }

        advanceToNextLiveTurn(session);
    }

    void advanceToNextLiveTurn(CombatSession session) {
        // Process dead entities and start player turn
        while (!session.isRoundFinished()) {
            InitiativeEntry current = session.getTurnOrder()
                    .get(session.getCurrentTurnIndex());
            if (current.isPlayer() && session.getPlayers().get(current.getIndex()).getHealthCurrent() <= 0) {
                session.advanceTurnIndex();
            } else if (!current.isPlayer() && session.getEnemies().get(current.getIndex()).isDead()) {
                session.advanceTurnIndex();
            } else if (current.isPlayer()) {
                // It's a live player! Let's start their turn.
                if (session.getTurnStartTime() == null) {
                    session.setTurnStartTime(System.currentTimeMillis());
                }
                Personnage p = session.getPlayers().get(current.getIndex());
                session.addLog("--- Tour de " + p.getName() + " ---");
                CombatLogCapture.captureLogs(session, () -> {
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
        
        // Process any deaths that occurred from DoTs, channeled spells, or skipped turns
        checkDeaths(session);
    }

    Personnage resolveMonsterTarget(ActiveMonster m, MonsterBehavior behavior,
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
                        .max(java.util.Comparator.comparingInt(p -> p != null ? p.getManaCurrent() : 0))
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
                for (ActiveMonster ally : session.getEnemies()) {
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
            case BRUTAL -> {
                Personnage target = alivePlayers.stream()
                        .min(java.util.Comparator.comparingInt(p -> p.getHealthMax()))
                        .orElse(alivePlayers.get(0));
                session.addLog("\uD83E\uDDA0 " + m.getBase().getName() + " frappe " + target.getName()
                        + " (le moins de PV max - Brutal).");
                return target;
            }
            default -> {
                return alivePlayers.get(rnd.nextInt(alivePlayers.size()));
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
}
