package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.event.*;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Passif de la Voie de la Création.
 * <p>
 * Effet sur le 1er sort du tour selon son type d'action :
 * <ul>
 *   <li>Instantané (action=1) → coût gratuit</li>
 *   <li>Banal (action=2) → lancé comme un instantané</li>
 *   <li>Canalisé (action≥3) → donne un bouclier = mana dépensé (durée = durée du sort)</li>
 * </ul>
 * <p>
 * Cette classe est migrée vers le système d'événements unifié via {@link #onEvent(GameEvent)}.
 */
@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("CREATION_PASSIVE")
public class CreationPassiveEffect extends VoiePassiveEffect {

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

    // ─── Handlers d'événements ───

    private void handleCastingTypeAdjust(CastingTypeAdjustEvent event) {
        Personnage caster = event.getSource();
        Spell spell = event.getSpell();
        int spellsCastThisTurn = caster.getPassiveState("creation_spells_cast", 0);

        if (spellsCastThisTurn == 0) {
            int spellAction = resolveSpellAction(spell, event.getCurrentType());
            if (spellAction == 2) {
                System.out.println("✨ [Création] " + caster.getName() + " transforme le sort banal " + spell.getNom() + " en sort instantané.");
                event.setCurrentType(SpellCastingType.INSTANTANE);
            }
        }
    }

    private void handleCostAdjust(SpellCostAdjustEvent event) {
        Personnage caster = event.getSource();
        Spell spell = event.getSpell();
        int spellsCastThisTurn = caster.getPassiveState("creation_spells_cast", 0);

        if (spellsCastThisTurn == 0) {
            int spellAction = resolveSpellAction(spell, spell.getCastingType());
            if (spellAction == 1) {
                event.getCosts()[0] = 0; // mana cost
                event.getCosts()[1] = 0; // heal cost
                System.out.println("✨ [Création] " + caster.getName() + " lance " + spell.getNom() + " gratuitement (coût en mana et PV annulé).");
            }
        }
    }

    private void handleCostPaid(SpellCostPaidEvent event) {
        Personnage caster = event.getSource();
        Spell spell = event.getSpell();
        int spellsCastThisTurn = caster.getPassiveState("creation_spells_cast", 0);

        if (spellsCastThisTurn == 0) {
            int spellAction = resolveSpellAction(spell, spell.getCastingType());
            if (spellAction >= 3) {
                int shieldDuration = spell.getChannelingDuration();
                if (shieldDuration <= 0) {
                    shieldDuration = 3;
                }
                caster.addShield(event.getManaPaid(), shieldDuration, "Création");
            }
        }
    }

    private void handleSpellCast(SpellCastEvent event) {
        Personnage personnage = event.getSource();
        Spell spell = event.getSpell();
        int spellsCastThisTurn = personnage.getPassiveState("creation_spells_cast", 0);

        if (spellsCastThisTurn == 0) {
            int spellAction = resolveSpellAction(spell, spell.getCastingType());
            if (spellAction == 1) {
                System.out.println(personnage.getName() + " lance un sort instantané gratuit (Création).");
            } else if (spellAction == 2) {
                System.out.println(personnage.getName() + " transforme un sort banal en instantané (Création).");
            } else if (spellAction >= 3) {
                System.out.println(personnage.getName() + " obtient un bouclier équivalent au mana dépensé pour le sort lent (Création), mais ne peut pas se déplacer.");
            }
        }
        personnage.setPassiveState("creation_spells_cast", Math.min(spellsCastThisTurn + 1, 3));
    }

    private void handleTurnStart(TurnStartEvent event) {
        event.getSource().setPassiveState("creation_spells_cast", 0);
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