package generation.grimoire.event;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;

public class SpellChannelingTickEvent extends GameEvent {
    
    private final int currentTurn;

    public SpellChannelingTickEvent(Personnage source, Personnage target, Spell spell, int currentTurn) {
        super(source, target, spell);
        this.currentTurn = currentTurn;
    }

    public int getCurrentTurn() {
        return currentTurn;
    }
}
