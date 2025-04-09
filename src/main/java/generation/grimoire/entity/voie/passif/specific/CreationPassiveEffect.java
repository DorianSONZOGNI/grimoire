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

    private int spellsCastThisTurn = 0;
    private final int MAX_SPELLS_PER_TURN = 3;


    /**
     * Nouvelle méthode utilisant le coût en actions du sort.
     * Convention : 1 = instantané, 2 = banal, 3 ou plus = lent.
     */
    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        if (spellsCastThisTurn == 0) {
            if (spell.getAction() == 1) {
                System.out.println(personnage.getName() + " lance un sort instantané gratuit (Création).");
            } else if (spell.getAction() == 2) {
                System.out.println(personnage.getName() + " transforme un sort banal en instantané (Création).");
            } else if (spell.getAction() >= 3) {
                System.out.println(personnage.getName() + " obtient un bouclier équivalent au mana dépensé pour le sort lent (Création), mais ne peut pas se déplacer.");
            }
        }
        spellsCastThisTurn = Math.min(spellsCastThisTurn + 1, MAX_SPELLS_PER_TURN);
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        spellsCastThisTurn = 0;
    }
}