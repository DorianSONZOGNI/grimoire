package generation.grimoire.service.pve;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.service.SpellService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Exécution des actions de combat d'un joueur (lancement de sort ou attaque physique).
 * Ne gère PAS checkDeaths/computeSpellAvailability — le façade CombatService orchestre ces appels.
 */
@Service
@RequiredArgsConstructor
class CombatActionService {

    private final SpellRepository spellRepository;
    private final SpellService spellService;

    /**
     * Exécute l'action d'un joueur : sort ou attaque physique.
     * Les vérifications post-action (checkDeaths, computeSpellAvailability) sont gérées par le façade.
     */
    void executePlayerAction(CombatSession session, Long spellId, Integer targetIndex, Integer allyTargetIndex,
            Integer choiceKey) {
        if (session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.COMBAT
                && session.getCurrentRoom().getType() != generation.grimoire.enumeration.RoomType.BOSS) {
            throw new RuntimeException("Ce n'est pas une salle de combat !");
        }

        Personnage p = session.getActivePlayer();
        if (p == null)
            return;

        // Player Action
        if (spellId != null) {
            Spell spellToCast = spellRepository.findById(spellId).orElse(null);
            if (spellToCast != null) {
                // Find target
                Personnage target = null;
                boolean targetsEnemy = spellToCast.getEffects().stream()
                        .filter(e -> e.getRequiredChoiceKey() == null || e.getRequiredChoiceKey().equals(choiceKey))
                        .anyMatch(e -> e.getEffectTarget() == generation.grimoire.enumeration.EffectTarget.TARGET);
                boolean targetsAlly = spellToCast.getEffects().stream()
                        .filter(e -> e.getRequiredChoiceKey() == null || e.getRequiredChoiceKey().equals(choiceKey))
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
                    if (allyTarget != null && allyTarget.getId().equals(p.getId())) {
                        // Le sort a peut-être d'autres effets valides (ex: sur l'ennemi ou le lanceur).
                        // On annule juste la cible alliée pour que l'effet ALLY soit ignoré,
                        // mais on permet au sort de se lancer.
                        allyTarget = null;
                    }
                }

                List<Personnage> allEnemies = session.getEnemies().stream()
                        .map(am -> am.getAsPersonnage()).toList();
                List<Personnage> allAllies = session.getPlayers().stream().filter(pl -> pl.getHealthCurrent() > 0)
                        .toList();

                final Personnage finalTarget = target;
                final Personnage finalAlly = allyTarget;
                session.addLog(p.getName() + " lance " + spellToCast.getNom() + " !");
                CombatLogCapture.captureLogs(session, () -> {
                    spellService.castSpellGroup(spellToCast, p, finalTarget, finalAlly, allAllies, allEnemies,
                            choiceKey);
                });
            }
        } else if (targetIndex != null && targetIndex >= 0 && targetIndex < session.getEnemies().size()) {
            if (p.isBanalSpellCastThisTurn()) {
                session.addLog(p.getName() + " a déjà effectué une action majeure (sort banal ou attaque) ce tour-ci.");
                return; // don't do attack
            }
            generation.grimoire.model.pve.ActiveMonster targetMonster = session.getEnemies().get(targetIndex);
            if (!targetMonster.isDead()) {
                p.setBanalSpellCastThisTurn(true);
                CombatLogCapture.captureLogs(session, () -> {
                    int pAtk = p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH);
                    int mAtk = p.getEffectiveStat(generation.grimoire.enumeration.StatType.POWER);

                    int baseDmg;
                    generation.grimoire.enumeration.DamageType dmgType;
                    boolean isMixed = false;

                    if (pAtk > mAtk) {
                        baseDmg = (int) (pAtk * 0.8);
                        dmgType = generation.grimoire.enumeration.DamageType.PHYSIC;
                    } else if (mAtk > pAtk) {
                        baseDmg = (int) (mAtk * 0.8);
                        dmgType = generation.grimoire.enumeration.DamageType.MAGIC;
                    } else {
                        baseDmg = (int) (pAtk * 0.8); // Since they are equal
                        dmgType = null;
                        isMixed = true;
                    }

                    int totalCrit = p.getCrit() + p.getStatFlatBonus(generation.grimoire.enumeration.StatType.CRIT);
                    totalCrit = Math.max(0, Math.min(100, totalCrit));
                    boolean isCrit = ((int) (Math.random() * 100) + 1) <= totalCrit;

                    if (isCrit) {
                        System.out.println("💥 Coup Critique déclenché par " + p.getName() + " !");
                        double critMult = 1.5;
                        int bonus = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CRIT_DAMAGE);
                        if (bonus > 0) {
                            critMult += (bonus / 100.0);
                        }
                        baseDmg = (int) (baseDmg * critMult);
                    }

                    if (isMixed) {
                        int half = baseDmg / 2;
                        int remainder = baseDmg - half;
                        System.out.println(p.getName() + " attaque " + targetMonster.getBase().getName() + " ("
                                + (isCrit ? "Critique mixte : " : "Force/Puissance : ") + baseDmg + ") !");
                        if (half > 0) p.dealDamage(targetMonster.getAsPersonnage(), half, generation.grimoire.enumeration.DamageType.PHYSIC);
                        if (remainder > 0) p.dealDamage(targetMonster.getAsPersonnage(), remainder, generation.grimoire.enumeration.DamageType.MAGIC);
                    } else {
                        String statLabel = (dmgType == generation.grimoire.enumeration.DamageType.PHYSIC) ? "Force" : "Puissance";
                        System.out.println(p.getName() + " attaque " + targetMonster.getBase().getName() + " ("
                                + (isCrit ? "Critique : " : statLabel + " : ") + baseDmg + ") !");
                        p.dealDamage(targetMonster.getAsPersonnage(), baseDmg, dmgType);
                    }
                });
            }
        }
    }
}
