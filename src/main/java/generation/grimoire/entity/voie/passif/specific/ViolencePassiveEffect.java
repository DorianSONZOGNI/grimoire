package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCastEvent;
import generation.grimoire.event.TurnStartEvent;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("VIOLENCE_PASSIVE")
public class ViolencePassiveEffect extends VoiePassiveEffect {

    private static final String STATE_CAST_THIS_TURN = "violence_cast_this_turn";
    private static final String STATE_INSPIRATION = "violence_inspiration";
    private static final String STATE_EXPIRATION = "violence_expiration";

    @Override
    public void onEvent(GameEvent event) {
        if (event instanceof SpellCastEvent e) {
            handleSpellCast(e);
        } else if (event instanceof TurnStartEvent e) {
            handleTurnStart(e);
        } else {
            super.onEvent(event);
        }
    }

    private void handleSpellCast(SpellCastEvent event) {
        Personnage personnage = event.getSource();
        Spell spell = event.getSpell();

        if (spell.getVoie() != null && "Voie de la Violence".equals(spell.getVoie().getNom())) {
            personnage.setPassiveState(STATE_CAST_THIS_TURN, 1);
            int inspirationCount = personnage.getPassiveState(STATE_INSPIRATION, 0);
            int expirationCount = personnage.getPassiveState(STATE_EXPIRATION, 0);

            if (spell.getCategory() == SpellCategory.INSPIRATION) {
                inspirationCount = Math.min(inspirationCount + 1, 5);
                personnage.setPassiveState(STATE_INSPIRATION, inspirationCount);
                personnage.setPassiveState(STATE_EXPIRATION, 0); // Réinitialise l'autre cumul

                // Appliquer un bonus de critique de +2% par stack (remplace l'ancien via stat_flat)
                personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.CRIT.name(), inspirationCount * 2);
                personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.POWER.name(), 0);

                System.out.println(personnage.getName() + " gagne +" + (inspirationCount * 2) + " de critique (inspiration " + inspirationCount + "/5).");
            } else if (spell.getCategory() == SpellCategory.EXPIRATION) {
                expirationCount = Math.min(expirationCount + 1, 10);
                personnage.setPassiveState(STATE_EXPIRATION, expirationCount);
                personnage.setPassiveState(STATE_INSPIRATION, 0);

                // Augmenter la puissance de +2 par sort d'expiration
                personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.POWER.name(), expirationCount * 2);
                personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.CRIT.name(), 0);

                System.out.println(personnage.getName() + " gagne +" + (expirationCount * 2) + " de puissance (expiration " + expirationCount + "/10).");
            }
        }
    }

    private void handleTurnStart(TurnStartEvent event) {
        Personnage personnage = event.getSource();
        int castLastTurn = personnage.getPassiveState(STATE_CAST_THIS_TURN, 0);
        if (castLastTurn == 0) {
            // Aucun sort de la voie n'a été lancé au tour précédent, on perd les stacks
            personnage.setPassiveState(STATE_INSPIRATION, 0);
            personnage.setPassiveState(STATE_EXPIRATION, 0);
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.CRIT.name(), 0);
            personnage.setPassiveState("stat_flat_" + generation.grimoire.enumeration.StatType.POWER.name(), 0);
            System.out.println(personnage.getName() + " perd ses stacks de Violence (aucun sort lancé au tour précédent).");
        }
        // On réinitialise le flag pour le nouveau tour
        personnage.setPassiveState(STATE_CAST_THIS_TURN, 0);
    }

    // ─── Méthodes legacy (conservées pour rétro-compatibilité) ───

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        handleSpellCast(new SpellCastEvent(personnage, null, spell));
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        handleTurnStart(new TurnStartEvent(personnage));
    }
}
