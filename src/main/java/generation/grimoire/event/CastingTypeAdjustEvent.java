package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCastingType;
import lombok.Getter;
import lombok.Setter;

/**
 * Événement mutable émis avant la validation des règles de tour.
 * Permet aux passifs de modifier le type d'incantation du sort (ex: Création transforme banal → instantané).
 */
@Getter
@Setter
public class CastingTypeAdjustEvent extends GameEvent {
    private SpellCastingType currentType;

    public CastingTypeAdjustEvent(Personnage source, Personnage target, Spell spell, SpellCastingType currentType) {
        super(source, target, spell);
        this.currentType = currentType;
    }
}
