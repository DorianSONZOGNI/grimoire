package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("CREATION_PASSIVE")
public class CreationPassiveEffect extends VoiePassiveEffect
{

    /**
     * Nouvelle méthode utilisant le coût en actions du sort.
     * Convention : 1 = instantané, 2 = banal, 3 ou plus = lent.
     */
    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        int spellsCastThisTurn = personnage.getPassiveState("creation_spells_cast", 0);
        if (spellsCastThisTurn == 0) {
            if (spell.getAction() == 1) {
                System.out.println(personnage.getName() + " lance un sort instantané gratuit (Création).");
            } else if (spell.getAction() == 2) {
                System.out.println(personnage.getName() + " transforme un sort banal en instantané (Création).");
            } else if (spell.getAction() >= 3) {
                System.out.println(personnage.getName() + " obtient un bouclier équivalent au mana dépensé pour le sort lent (Création), mais ne peut pas se déplacer.");
            }
        }
        personnage.setPassiveState("creation_spells_cast", Math.min(spellsCastThisTurn + 1, 3));
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        personnage.setPassiveState("creation_spells_cast", 0);
    }
}