package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.HealEffect;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCostPaidEvent;
import generation.grimoire.event.TurnStartEvent;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("SURETE_PASSIVE")
public class SuretePassiveEffect extends VoiePassiveEffect {

    private static final String STATE_SURETE_POINTS = "surete_points";
    private static final int MAX_POINTS = 100;

    @Override
    public void onEvent(GameEvent event) {
        if (event instanceof SpellCostPaidEvent e) {
            handleSpellCostPaid(e.getSource(), e.getTarget(), e.getSpell(), e.getManaPaid(), e.getAllAllies(), e.getAllEnemies());
        } else if (event instanceof TurnStartEvent e) {
            onTurnStart(e.getSource());
        } else {
            super.onEvent(event);
        }
    }

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Géré par onSpellCostPaid
    }

    @Override
    public void onSpellCostPaid(Personnage personnage, Spell spell, int manaPaid) {
        handleSpellCostPaid(personnage, null, spell, manaPaid, null, null);
    }

    public void handleSpellCostPaid(Personnage caster, Personnage target, Spell spell, int manaPaid,
                                   List<Personnage> allAllies, List<Personnage> allEnemies) {
        if (caster == null) return;

        int storedPoints = caster.getPassiveState(STATE_SURETE_POINTS, 0);
        boolean shouldTrigger = (storedPoints >= MAX_POINTS);

        if (shouldTrigger && spell != null) {
            storedPoints -= MAX_POINTS;
            applySureteBonus(caster, target, spell, allAllies, allEnemies);
        }

        int pointsGained = (int) Math.round(manaPaid * 0.35);
        storedPoints = Math.min(MAX_POINTS, storedPoints + pointsGained);
        caster.setPassiveState(STATE_SURETE_POINTS, storedPoints);
        System.out.println("🛡️ [Sûreté] " + caster.getName() + " stocke " + pointsGained + " pts (35% de " + manaPaid
                + " mana). Total: " + storedPoints + "/" + MAX_POINTS);
    }

    private void applySureteBonus(Personnage caster, Personnage target, Spell spell,
                                 List<Personnage> allAllies, List<Personnage> allEnemies) {
        if (spell.getEffects() == null || spell.getEffects().isEmpty()) return;

        boolean hasAllyHeal = false;
        boolean touchesEnemy = false;
        boolean touchesSelf = false;

        for (SpellEffect eff : spell.getEffects()) {
            EffectTarget tgt = eff.getEffectTarget();
            if (tgt == null) tgt = EffectTarget.TARGET;

            // 1. Soins sur allié (+50% de soins sur ce sort uniquement)
            boolean isAllyTarget = (tgt == EffectTarget.ALLY || tgt == EffectTarget.ALL_ALLIES);
            if (tgt == EffectTarget.TARGET && isTargetAlly(caster, target)) {
                isAllyTarget = true;
            }
            if (isAllyTarget && eff instanceof HealEffect healEff) {
                hasAllyHeal = true;
                healEff.setAmplificationMultiplier(healEff.getAmplificationMultiplier() * 1.5);
            }

            // 2. Débuffs sur ennemi (+20% dégâts magiques & physiques subis pendant 2 tours)
            if (tgt == EffectTarget.ALL_ENEMIES || tgt == EffectTarget.ALL_COMBATANTS) {
                touchesEnemy = true;
            } else if (tgt == EffectTarget.TARGET && (target == null || isTargetEnemy(caster, target))) {
                touchesEnemy = true;
            }

            // 3. Buff sur soi-même (+20% de puissance pendant 3 tours)
            if (tgt == EffectTarget.CASTER || tgt == EffectTarget.ALL_COMBATANTS) {
                touchesSelf = true;
            } else if (tgt == EffectTarget.TARGET && target != null && target.equals(caster)) {
                touchesSelf = true;
            }
        }

        if (hasAllyHeal) {
            System.out.println("✨ [Sûreté] +50% de soins réalisés sur " + spell.getNom() + " (alliés) !");
        }

        if (touchesEnemy) {
            List<Personnage> enemiesToDebuff = new ArrayList<>();
            boolean isAoeEnemies = spell.getEffects().stream().anyMatch(e ->
                    e.getEffectTarget() == EffectTarget.ALL_ENEMIES || e.getEffectTarget() == EffectTarget.ALL_COMBATANTS);

            if (isAoeEnemies && allEnemies != null && !allEnemies.isEmpty()) {
                for (Personnage en : allEnemies) {
                    if (en != null && isTargetEnemy(caster, en)) {
                        enemiesToDebuff.add(en);
                    }
                }
            } else if (target != null && isTargetEnemy(caster, target)) {
                enemiesToDebuff.add(target);
            }

            for (Personnage enemy : enemiesToDebuff) {
                BuffDebuffEffect debuffMag = new BuffDebuffEffect();
                debuffMag.setStatAffected(StatType.DAMAGE_TAKEN_MAGIC);
                debuffMag.setModifier(0.20);
                debuffMag.setDuration(2);
                enemy.getActiveBuffs().add(debuffMag);

                BuffDebuffEffect debuffPhys = new BuffDebuffEffect();
                debuffPhys.setStatAffected(StatType.DAMAGE_TAKEN_PHYSIC);
                debuffPhys.setModifier(0.20);
                debuffPhys.setDuration(2);
                enemy.getActiveBuffs().add(debuffPhys);

                System.out.println("❄️ [Sûreté] Débuffs appliqués sur " + enemy.getName()
                        + " : +20% dégâts magiques & physiques subis (2 tours).");
            }
        }

        if (touchesSelf) {
            BuffDebuffEffect buffPower = new BuffDebuffEffect();
            buffPower.setStatAffected(StatType.POWER);
            buffPower.setModifier(0.20);
            buffPower.setDuration(3);
            caster.getActiveBuffs().add(buffPower);
            System.out.println("🌊 [Sûreté] Buff appliqué sur " + caster.getName() + " : +20% Puissance (3 tours).");
        }
    }

    private boolean isTargetAlly(Personnage caster, Personnage target) {
        if (target == null) return false;
        if (caster.getTeamId() != null && target.getTeamId() != null) {
            return caster.isAlly(target);
        }
        return false;
    }

    private boolean isTargetEnemy(Personnage caster, Personnage target) {
        if (target == null) return false;
        if (target.equals(caster)) return false;
        if (caster.getTeamId() != null && target.getTeamId() != null) {
            return !caster.isAlly(target);
        }
        return true;
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        if (personnage == null) return;
        int storedPoints = personnage.getPassiveState(STATE_SURETE_POINTS, 0);
        storedPoints = Math.min(MAX_POINTS, storedPoints + 10);
        System.out.println(personnage.getName() + " gagne passivement 10 points de sûreté (Total: " + storedPoints + "/" + MAX_POINTS + ").");
        personnage.setPassiveState(STATE_SURETE_POINTS, storedPoints);
    }
}