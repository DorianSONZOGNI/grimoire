package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import lombok.Getter;

/**
 * Émis après que les coûts du sort ont été payés par le caster.
 * Permet aux passifs de réagir au paiement (ex: Création donne un bouclier basé sur le mana dépensé).
 */
@Getter
public class SpellCostPaidEvent extends GameEvent {
    private final int manaPaid;
    private final int hpPaid;

    public SpellCostPaidEvent(Personnage source, Personnage target, Spell spell, int manaPaid, int hpPaid) {
        super(source, target, spell);
        this.manaPaid = manaPaid;
        this.hpPaid = hpPaid;
    }
}
