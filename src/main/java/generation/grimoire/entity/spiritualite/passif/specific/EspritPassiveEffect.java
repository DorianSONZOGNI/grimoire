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
        // Ne vérifier la condition que pour les sorts de cette spiritualité
        if (spell.getSpiritualite() == null || this.getSpiritualite() == null) {
            return true;
        }
        boolean sameId = spell.getSpiritualite().getId() != null && this.getSpiritualite().getId() != null
                && spell.getSpiritualite().getId().equals(this.getSpiritualite().getId());
        boolean sameName = spell.getSpiritualite().getNom() != null && this.getSpiritualite().getNom() != null
                && spell.getSpiritualite().getNom().equals(this.getSpiritualite().getNom());
        if (!sameId && !sameName) {
            return true; // Le sort n'est pas de cette spiritualité, ne pas bloquer
        }

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
