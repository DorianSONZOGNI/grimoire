package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.event.*;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;

/**
 * Passif de la Voie de la Création.
 * <p>
 * S'active en consommant un bourgeon (stack). Effet selon le type d'action du sort :
 * <ul>
 *   <li>Instantané (action=1) → coût gratuit</li>
 *   <li>Banal (action=2) → lancé comme un instantané</li>
 *   <li>Canalisé (action≥3) → donne un bouclier = mana dépensé (durée = durée du sort)</li>
 * </ul>
 * <p>
 * Le passif ne se déclenche que si le personnage possède au moins 1 bourgeon.
 * Un bourgeon est consommé à chaque activation.
 * Le personnage commence le combat avec 1 bourgeon.
 */
@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@Entity
@DiscriminatorValue("CREATION_PASSIVE")
public class CreationPassiveEffect extends VoiePassiveEffect {

    private static final String STATE_BUDS = "creation_buds";
    private static final String STATE_INITIALIZED = "creation_initialized";
    private static final String STATE_USED_THIS_TURN = "creation_used_this_turn";

    @Override
    public int getPriority() {
        return 100; // S'exécute en premier : modifie le type de cast avant les autres passifs
    }

    // ─── Système d'événements unifié ───

    @Override
    public void onEvent(GameEvent event) {
        if (event instanceof CastingTypeAdjustEvent e) {
            handleCastingTypeAdjust(e);
        } else if (event instanceof SpellCostAdjustEvent e) {
            handleCostAdjust(e);
        } else if (event instanceof SpellCostPaidEvent e) {
            handleCostPaid(e);
        } else if (event instanceof SpellCastEvent e) {
            handleSpellCast(e);
        } else if (event instanceof TurnStartEvent e) {
            handleTurnStart(e);
        }
    }

    // ─── Helpers ───

    private boolean hasBuds(Personnage p) {
        return p.getPassiveState(STATE_BUDS, 0) > 0;
    }

    private boolean canUsePassiveThisTurn(Personnage p) {
        return p.getPassiveState(STATE_USED_THIS_TURN, 0) == 0;
    }

    private void consumeBudAndMarkUsed(Personnage p) {
        int buds = p.getPassiveState(STATE_BUDS, 0);
        if (buds > 0) {
            p.setPassiveState(STATE_BUDS, buds - 1);
            System.out.println("🌱 [Création] " + p.getName() + " consomme un bourgeon (" + (buds - 1) + " restant(s)).");
        }
        p.setPassiveState(STATE_USED_THIS_TURN, 1);
    }

    // ─── Handlers d'événements ───

    private void handleCastingTypeAdjust(CastingTypeAdjustEvent event) {
        Personnage caster = event.getSource();
        Spell spell = event.getSpell();

        if (hasBuds(caster) && canUsePassiveThisTurn(caster)) {
            int spellAction = resolveSpellAction(spell, event.getCurrentType());
            if (spellAction == 2) {
                System.out.println("✨ [Création] " + caster.getName() + " transforme le sort banal " + spell.getNom() + " en sort instantané (bourgeon).");
                event.setCurrentType(SpellCastingType.INSTANTANE);
            }
        }
    }

    private void handleCostAdjust(SpellCostAdjustEvent event) {
        Personnage caster = event.getSource();
        Spell spell = event.getSpell();

        if (hasBuds(caster) && canUsePassiveThisTurn(caster)) {
            int spellAction = resolveSpellAction(spell, spell.getCastingType());
            if (spellAction == 1) {
                event.getCosts()[0] = 0; // mana cost
                event.getCosts()[1] = 0; // heal cost
                System.out.println("✨ [Création] " + caster.getName() + " lance " + spell.getNom() + " gratuitement grâce à un bourgeon.");
            }
        }
    }

    private void handleCostPaid(SpellCostPaidEvent event) {
        Personnage caster = event.getSource();
        Spell spell = event.getSpell();

        if (hasBuds(caster) && canUsePassiveThisTurn(caster)) {
            int spellAction = resolveSpellAction(spell, spell.getCastingType());
            if (spellAction >= 3) {
                int shieldDuration = spell.getChannelingDuration();
                if (shieldDuration <= 0) {
                    shieldDuration = 3;
                }
                int shieldAmount = (int) (event.getManaPaid() * 0.3);
                caster.addShield(shieldAmount, shieldDuration, "Création");
            }
        }
    }

    private void handleSpellCast(SpellCastEvent event) {
        Personnage personnage = event.getSource();
        Spell spell = event.getSpell();

        if (hasBuds(personnage) && canUsePassiveThisTurn(personnage)) {
            consumeBudAndMarkUsed(personnage);

            int spellAction = resolveSpellAction(spell, spell.getCastingType());
            if (spellAction == 1) {
                System.out.println(personnage.getName() + " lance un sort instantané gratuit (Création, bourgeon consommé).");
            } else if (spellAction == 2) {
                System.out.println(personnage.getName() + " transforme un sort banal en instantané (Création, bourgeon consommé).");
            } else if (spellAction >= 3) {
                System.out.println(personnage.getName() + " obtient un bouclier pour le sort canalisé (Création, bourgeon consommé).");
            }
        }
    }

    private void handleTurnStart(TurnStartEvent event) {
        Personnage p = event.getSource();
        // Initialisation au premier tour : 1 bourgeon de départ
        if (p.getPassiveState(STATE_INITIALIZED, 0) == 0) {
            p.setPassiveState(STATE_BUDS, 1);
            p.setPassiveState(STATE_INITIALIZED, 1);
            System.out.println("🌱 [Création] " + p.getName() + " commence avec 1 bourgeon.");
        }
        // Reset du flag de consommation
        p.setPassiveState(STATE_USED_THIS_TURN, 0);
    }

    // ─── Utilitaires ───

    /**
     * Résout le type d'action effectif d'un sort en tenant compte du champ action
     * et du casting type par défaut.
     */
    private int resolveSpellAction(Spell spell, SpellCastingType castingType) {
        int spellAction = spell.getAction();
        if (spellAction == 0 && castingType != null) {
            return switch (castingType) {
                case INSTANTANE -> 1;
                case BANAL -> 2;
                case CANALISE -> 3;
            };
        }
        return spellAction;
    }

    // ─── Méthodes legacy (conservées pour rétro-compatibilité, non appelées par le bridge) ───

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        handleSpellCast(new SpellCastEvent(personnage, null, spell));
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        handleTurnStart(new TurnStartEvent(personnage));
    }
}