package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import lombok.Getter;

/**
 * Événement mutable émis après le calcul des coûts, avant paiement.
 * Permet aux passifs de modifier les coûts du sort (ex: Création rend le sort gratuit).
 * <p>
 * costs[0] = mana cost, costs[1] = heal cost.
 */
@Getter
public class SpellCostAdjustEvent extends GameEvent {
    private final int[] costs;

    public SpellCostAdjustEvent(Personnage source, Personnage target, Spell spell, int[] costs) {
        super(source, target, spell);
        this.costs = costs;
    }
}
