package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.utils.StatCalculator;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("BUFF_DEBUFF")
public class BuffDebuffEffect extends SpellEffect {

    @Enumerated(EnumType.STRING)
    private StatType statAffected;

    /**
     * Multiplicateur : positif pour buff, négatif pour débuff.
     * Ignoré si flatValue != 0.
     */
    private double modifier;

    /**
     * Valeur brute à ajouter (ou soustraire si négative) à la statAffected.
     * Si non nul, s'applique directement sans multiplication.
     */
    private int flatValue;

    // Duration 0 -> tours en cours (on invalide les buff duration == 0 en fin de tours et duration -1 après)
    private int duration;

    /**
     * Liste des sorts qui ont été impactés par ce buff (pour suivi ou log).
     */
    @Transient
    private List<Spell> impactedSpells = new ArrayList<>();

    @Transient
    private String sourceName;

    // S'il y a un ratio, la source est importante
    @Enumerated(EnumType.STRING)
    private Source modifierSource;

    @Override
    public void apply(Personnage caster, Personnage target) {
        if (!impactedSpells.isEmpty()) {
            for (Spell spell : impactedSpells) {
                System.out.println("Buff/Débuff sur le sort : " + spell.getNom());
                // flat sur la cible
                if (flatValue != 0) {
                    target.applyFlatBuff(statAffected, flatValue);
                }
                // ratio sur les effets du sort
                if (modifier != 0) {
                    applyToSpell(spell, caster, target);
                }
            }
            return;
        }

        if (flatValue != 0) {
            if (duration > 0) {
                target.getActiveBuffs().add(this);
                System.out.println(target.getName() + " reçoit un effet sur " + statAffected + " (valeur fixe: " + flatValue + ") pour " + duration + " tours.");
            } else {
                target.applyFlatBuff(statAffected, flatValue);
            }
        }

        if (modifier != 0) {
            double baseValue     = StatCalculator.getSourceValue(modifierSource, caster, target);
            double modifierValue = baseValue * modifier;
            target.applyBuff(this, modifierValue);
        }
    }

    /**
     * Applique un effet sur un sort spécifique (comme un buff/débuff sur les dégâts).
     */
    protected void applyToSpell(Spell spell, Personnage caster, Personnage target) {
        spell.getEffects().forEach(effect -> effect.applyModifierFromBuff(this, caster, target));
    }

    public boolean affectsStatType(StatType statType) {
        return this.statAffected == statType;
    }

}