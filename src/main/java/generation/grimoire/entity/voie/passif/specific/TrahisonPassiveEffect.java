package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.DamageType;
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
    }

    public void onPhysicalHit(Personnage attacker, Personnage target, double baseDamage) {
        double bonusRatio = 0.0;

        int usedThisTurn = attacker.getPassiveState(TRAHISON_USED_THIS_TURN, 0);
        int lowHpUsedThisTurn = attacker.getPassiveState(TRAHISON_LOW_HP_USED_THIS_TURN, 0);

        if (usedThisTurn == 0) {
            bonusRatio += BASE_BONUS_DAMAGE_RATIO;
            attacker.setPassiveState(TRAHISON_USED_THIS_TURN, 1);
        }

        if (lowHpUsedThisTurn == 0 && isTargetUnderHalfHp(target)) {
            bonusRatio += LOW_HP_BONUS_DAMAGE_RATIO;
            attacker.setPassiveState(TRAHISON_LOW_HP_USED_THIS_TURN, 1);
        }

        if (target.hasDebuff()) {
            bonusRatio += DEBUFFED_TARGET_BONUS_DAMAGE_RATIO;
        }

        if (bonusRatio <= 0) {
            return;
        }

        int extraDamage = (int) Math.round(baseDamage * bonusRatio);

        if (extraDamage <= 0) {
            return;
        }

        System.out.println(attacker.getName()
                + " inflige "
                + extraDamage
                + " dégâts supplémentaires grâce à Trahison.");

        target.takeDamage(extraDamage, DamageType.PHYSIC, attacker);

        // À garder si tu veux conserver l'identité vol de vie de Trahison.
        attacker.heal(extraDamage);
    }

    private boolean isTargetUnderHalfHp(Personnage target) {
        return target.getCurrentHp() <= target.getMaxHp() * 0.5;
    }
}