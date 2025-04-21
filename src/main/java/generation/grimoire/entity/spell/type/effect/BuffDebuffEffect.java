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

    // Valeur du modificateur : positif pour buff, négatif pour débuff.
    private double modifier;

    // Duration 0 -> tours en cours (on invalide les buff duration == 0 en fin de tours et duration -1 après)
    private int duration;

    /**
     * Liste des sorts qui ont été impactés par ce buff (pour suivi ou log).
     */
    @Transient
    private List<Spell> impactedSpells = new ArrayList<>();

    // S'il y a un ratio, la source est importante
    @Enumerated(EnumType.STRING)
    private Source modifierSource;

    @Override
    public void apply(Personnage caster, Personnage target) {
        if (impactedSpells.isEmpty()) {
            // Si la liste est vide, on applique le buff/débuff normalement à la cible
            double baseValue = StatCalculator.getSourceValue(modifierSource, caster, target);
            double modifierValue = baseValue * modifier;
            target.applyBuff(this, modifierValue);
        } else {
            // Si la liste est renseignée, appliquer uniquement aux sorts listés
            for (Spell spell : impactedSpells) {
                System.out.println("Buff/Débuff appliqué sur le sort : " + spell.getNom());
                // On applique le buff ou le debuff sur le sort spécifié
                applyToSpell(spell, caster, target);
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

        // Un buff de puissance (POWER) affecte tous les types de dégâts (magiques, physiques, bruts)
        if (statType == StatType.POWER && statAffected == StatType.POWER) return true;

        // L’armure réduit les dégâts physiques
        if (statType == StatType.ARMURE && statAffected == StatType.ARMURE) return true;

        // La résistance réduit les dégâts magiques
        if (statType == StatType.RESISTANCE && statAffected == StatType.RESISTANCE) return true;

        // Pour les stats "pures" comme SPEED ou MANA
        return statType == statAffected;
    }
}