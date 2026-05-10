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

    private static final String TRAHISON_USED_THIS_TURN     = "trahison_used_this_turn";
    private static final String TRAHISON_LOW_HP_USED         = "trahison_low_hp_used_this_turn";

    private static final double BASE_RATIO          = 0.10; // 10% une fois par tour
    private static final double LOW_HP_RATIO        = 0.15; // 15% sur la 1ère cible < 50% HP
    private static final double DEBUFFED_RATIO      = 0.10; // 10% permanent sur cible débuée

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // L'effet n'est pas déclenché par un sort.
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        personnage.setPassiveState(TRAHISON_USED_THIS_TURN, 0);
        personnage.setPassiveState(TRAHISON_LOW_HP_USED, 0);
    }

    public void onPhysicalHit(Personnage attacker, Personnage target, double baseDamage) {
        double bonusRatio = 0.0;

        // 1) Bonus de base : 10%, une seule fois par tour
        int usedThisTurn = attacker.getPassiveState(TRAHISON_USED_THIS_TURN, 0);
        if (usedThisTurn == 0) {
            bonusRatio += BASE_RATIO;
            attacker.setPassiveState(TRAHISON_USED_THIS_TURN, 1);
        }

        // 2) Bonus sur cible < 50% HP : 15%, une seule fois par tour
        int lowHpUsed = attacker.getPassiveState(TRAHISON_LOW_HP_USED, 0);
        if (lowHpUsed == 0 && isTargetUnderHalfHp(target)) {
            bonusRatio += LOW_HP_RATIO;
            attacker.setPassiveState(TRAHISON_LOW_HP_USED, 1);
        }

        // 3) Bonus permanent sur cible débuée : 10% à chaque coup
        if (target.hasDebuff()) {
            bonusRatio += DEBUFFED_RATIO;
        }

        if (bonusRatio <= 0) return;

        int extraDamage = (int) Math.round(baseDamage * bonusRatio);
        if (extraDamage <= 0) return;

        System.out.println(attacker.getName() + " inflige " + extraDamage
                + " dégâts supplémentaires grâce à Trahison (ratio: " + (bonusRatio * 100) + "%).");
        target.takeDamage(extraDamage, DamageType.PHYSIC);
        attacker.heal(extraDamage);
    }

    private boolean isTargetUnderHalfHp(Personnage target) {
        return target.getCurrentHp() <= target.getMaxHp() * 0.5;
    }
}