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
@DiscriminatorValue("ESPRIT_PASSIVE")
public class EspritPassiveEffect extends SpiritualitePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Contrainte de lancement uniquement
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Contrainte de lancement uniquement
    }

    @Override
    public boolean canCastSpell(Personnage caster, Spell spell) {
        // Obligé d'avoir soit plus de 20% hp, soit 20% mana
        boolean hasEnoughHp = caster.getHealthCurrent() >= (caster.getHealthMax() * 0.20);
        boolean hasEnoughMana = caster.getManaCurrent() >= (caster.getManaMax() * 0.20);

        if (!hasEnoughHp || !hasEnoughMana) {
            System.out.println(caster.getName()
                    + " n'a pas les prérequis d'Esprit (>= 20% HP ET >= 20% Mana) pour lancer " + spell.getNom());
            return false;
        }
        return true;
    }
}
