package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("TENEBRE_PASSIVE")
public class TenebrePassiveEffect extends SpiritualitePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Remplacé par la contrainte de lancement
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Remplacé par la contrainte de lancement
    }

    @Override
    public boolean canCastSpell(Personnage caster, Spell spell) {
        if (spell.getNom() != null && spell.getNom().toLowerCase().contains("base")) {
            return true;
        }

        // Obligé d'avoir moins de 80% hp ou 80% mana
        boolean conditionHp = caster.getHealthCurrent() <= (caster.getHealthMax() * 0.80);
        boolean conditionMana = caster.getManaCurrent() <= (caster.getManaMax() * 0.80);

        if (!conditionHp && !conditionMana) {
            System.out.println(caster.getName() + " n'a pas les prérequis de Ténèbres (<= 80% HP ou <= 80% Mana) pour lancer " + spell.getNom());
            return false;
        }
        return true;
    }
}
