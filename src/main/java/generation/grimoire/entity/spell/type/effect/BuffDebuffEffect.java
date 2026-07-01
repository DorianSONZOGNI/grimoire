package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.personnage.Personnage;
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

    public BuffDebuffEffect cloneEffect() {
        BuffDebuffEffect clone = new BuffDebuffEffect();
        clone.setId(this.getId());
        clone.setSpell(this.getSpell());
        clone.setEffectTarget(this.getEffectTarget());
        clone.setRequiredChoiceKey(this.getRequiredChoiceKey());
        clone.setChannelingTurns(this.getChannelingTurns() != null ? new java.util.ArrayList<>(this.getChannelingTurns()) : null);
        
        clone.setStatAffected(this.statAffected);
        clone.setModifier(this.modifier);
        clone.setFlatValue(this.flatValue);
        clone.setDuration(this.duration);
        clone.setModifierSource(this.getModifierSource());
        clone.setSourceName(this.getSourceName());
        return clone;
    }

    @Override
    public void apply(Personnage caster, Personnage target) {
        if (statAffected == StatType.AME_DETACHEE) {
            java.util.Optional<BuffDebuffEffect> existing = target.getActiveBuffs().stream()
                .filter(b -> b.getStatAffected() == StatType.AME_DETACHEE)
                .findFirst();
            if (existing.isPresent()) {
                existing.get().setDuration(2);
                System.out.println(target.getName() + " réinitialise son Âme Détachée à 2 tours.");
            } else {
                BuffDebuffEffect clone = this.cloneEffect();
                clone.setDuration(2);
                target.getActiveBuffs().add(clone);
                System.out.println(target.getName() + " reçoit l'état Âme Détachée pour 2 tours.");
            }
            return;
        }

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

        int totalFlatToApply = this.flatValue;
        double totalModifierToApply = 0.0;

        if (this.modifier != 0) {
            if (getModifierSource() != null) {
                double baseValue = StatCalculator.getSourceValue(getModifierSource(), caster, target);
                totalFlatToApply += (int) Math.round(baseValue * this.modifier);
            } else {
                totalModifierToApply = this.modifier;
            }
        }

        if (totalFlatToApply != 0 || totalModifierToApply != 0) {
            if (duration > 0) {
                if (totalFlatToApply != 0) {
                    BuffDebuffEffect cloneFlat = this.cloneEffect();
                    cloneFlat.setFlatValue(totalFlatToApply);
                    cloneFlat.setModifier(0);
                    target.getActiveBuffs().add(cloneFlat);
                }
                if (totalModifierToApply != 0) {
                    BuffDebuffEffect cloneMult = this.cloneEffect();
                    cloneMult.setFlatValue(0);
                    cloneMult.setModifier(totalModifierToApply);
                    target.getActiveBuffs().add(cloneMult);
                }
                System.out.println(target.getName() + " reçoit un effet sur " + statAffected + " (fixe: " + totalFlatToApply + ", mult: " + totalModifierToApply + ") pour " + duration + " tours.");
            } else {
                if (totalFlatToApply != 0) {
                    target.applyFlatBuff(statAffected, totalFlatToApply);
                }
                if (totalModifierToApply != 0) {
                    BuffDebuffEffect cloneMult = this.cloneEffect();
                    cloneMult.setFlatValue(0);
                    cloneMult.setModifier(totalModifierToApply);
                    target.getActiveBuffs().add(cloneMult);
                }
            }
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