package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCastEvent;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("TRAHISON_PASSIVE")
public class TrahisonPassiveEffect extends VoiePassiveEffect {

    private static final String TRAHISON_USED_THIS_TURN = "trahison_used_this_turn";
    private static final String TRAHISON_LOW_HP_USED_THIS_TURN = "trahison_low_hp_used_this_turn";
    private static final String TRAHISON_DEBUFF_USED_THIS_TURN = "trahison_debuff_used_this_turn";

    private static final double BASE_BONUS_DAMAGE_RATIO = 0.10;
    private static final double LOW_HP_BONUS_DAMAGE_RATIO = 0.15;
    private static final double DEBUFFED_TARGET_BONUS_DAMAGE_RATIO = 0.10;

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // L'effet n'est pas déclenché par un sort.
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        personnage.setPassiveState(TRAHISON_USED_THIS_TURN, 0);
        personnage.setPassiveState(TRAHISON_LOW_HP_USED_THIS_TURN, 0);
        personnage.setPassiveState(TRAHISON_DEBUFF_USED_THIS_TURN, 0);
    }

    public void onPhysicalHit(Personnage attacker, Personnage target, double baseDamage) {
        int usedThisTurn = attacker.getPassiveState(TRAHISON_USED_THIS_TURN, 0);
        int lowHpUsedThisTurn = attacker.getPassiveState(TRAHISON_LOW_HP_USED_THIS_TURN, 0);
        int debuffUsedThisTurn = attacker.getPassiveState(TRAHISON_DEBUFF_USED_THIS_TURN, 0);

        if (usedThisTurn == 0) {
            int extraDamage = (int) Math.round(baseDamage * BASE_BONUS_DAMAGE_RATIO);
            if (extraDamage > 0) {
                System.out.println(attacker.getName() + " inflige " + extraDamage + " dégâts supplémentaires de base grâce à Trahison.");
                target.takeDamage(extraDamage, DamageType.BRUT, attacker);
                attacker.heal(extraDamage);
            }
            attacker.setPassiveState(TRAHISON_USED_THIS_TURN, 1);
        }

        if (lowHpUsedThisTurn == 0 && isTargetUnderHalfHp(target)) {
            int extraDamage = (int) Math.round(baseDamage * LOW_HP_BONUS_DAMAGE_RATIO);
            if (extraDamage > 0) {
                System.out.println(attacker.getName() + " inflige " + extraDamage + " dégâts supplémentaires (Cible <50% HP) grâce à Trahison.");
                target.takeDamage(extraDamage, DamageType.BRUT, attacker);
                attacker.heal(extraDamage);
            }
            attacker.setPassiveState(TRAHISON_LOW_HP_USED_THIS_TURN, 1);
        }

        if (debuffUsedThisTurn == 0 && target.hasDebuff()) {
            int extraDamage = (int) Math.round(baseDamage * DEBUFFED_TARGET_BONUS_DAMAGE_RATIO);
            if (extraDamage > 0) {
                System.out.println(attacker.getName() + " inflige " + extraDamage + " dégâts supplémentaires (Cible avec Débuff) grâce à Trahison.");
                target.takeDamage(extraDamage, DamageType.BRUT, attacker);
                attacker.heal(extraDamage);
            }
            attacker.setPassiveState(TRAHISON_DEBUFF_USED_THIS_TURN, 1);
        }
    }

    private boolean isTargetUnderHalfHp(Personnage target) {
        return target.getCurrentHp() <= target.getMaxHp() * 0.5;
    }
}