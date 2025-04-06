package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCategory;
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

    @Override
    public void onSpellCast(Personnage personnage, SpellCategory spellCategory) {
        if (spellsCastThisTurn == 0) {
            if (spellCategory == SpellCategory.INSTANTANE) {
                System.out.println(personnage.getName() + " lance un sort instantané gratuit (Création).");
            } else if (spellCategory == SpellCategory.BANAL) {
                System.out.println(personnage.getName() + " transforme un sort banal en instantané (Création).");
            } else if (spellCategory == SpellCategory.LENT) {
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