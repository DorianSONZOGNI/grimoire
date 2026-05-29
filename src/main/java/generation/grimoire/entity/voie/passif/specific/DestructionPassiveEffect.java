package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCastEvent;
import generation.grimoire.event.TurnStartEvent;
import generation.grimoire.event.SpellCostAdjustEvent;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("DESTRUCTION_PASSIVE")
public class DestructionPassiveEffect extends VoiePassiveEffect {

    @Override
    public int getPriority() {
        return 0; // Priorité standard
    }

    // ─── Système d'événements unifié ───

    @Override
    public void onEvent(GameEvent event) {
        if (event instanceof SpellCastEvent e) {
            handleSpellCast(e);
        } else if (event instanceof TurnStartEvent e) {
            handleTurnStart(e);
        } else if (event instanceof SpellCostAdjustEvent e) {
            handleSpellCostAdjust(e);
        } else {
            super.onEvent(event);
        }
    }

    // ─── Handlers d'événements ───

    private void handleSpellCostAdjust(SpellCostAdjustEvent event) {
        Personnage personnage = event.getSource();
        int heat = personnage.getPassiveState("destruction_heat", 0);
        if (heat >= 100) {
            int[] costs = event.getCosts();
            costs[0] = 0; // mana cost = 0
            costs[1] = 0; // heal cost = 0
            if (costs.length > 2) {
                costs[2] = 0; // heat cost = 0
            }
            
            // Marquer que la chaleur a été consommée pour ce lancer de sort
            personnage.setPassiveState("destruction_heat_was_max", 1);
            personnage.setPassiveState("destruction_heat_generated_this_cast", 0);
            
            System.out.println("🔥 [Destruction] " + personnage.getName() + " consomme sa chaleur de 100. Le sort " + event.getSpell().getNom() + " est gratuit !");
        }
    }

    private void handleSpellCast(SpellCastEvent event) {
        Personnage personnage = event.getSource();
        Spell spell = event.getSpell();

        // Si le sort a déjà un effet de chaleur direct, le passif ne double pas la génération de chaleur
        boolean hasHeatEffect = spell.getEffects() != null && spell.getEffects().stream()
                .anyMatch(e -> e instanceof generation.grimoire.entity.spell.type.effect.HeatFixedEffect
                        || e instanceof generation.grimoire.entity.spell.type.effect.HeatPercentageEffect
                        || e instanceof generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect);

        int wasMax = personnage.getPassiveState("destruction_heat_was_max", 0);
        if (wasMax == 1) {
            int generated = personnage.getPassiveState("destruction_heat_generated_this_cast", 0);
            int newHeat = generated;
            if (!hasHeatEffect) {
                newHeat += spell.getHeatGenerated();
            }
            if (newHeat > 100) {
                newHeat = 100;
            }
            personnage.setPassiveState("destruction_heat", newHeat);
            personnage.setPassiveState("destruction_heat_was_max", 0);
            personnage.setPassiveState("destruction_heat_generated_this_cast", 0);
            System.out.println("🔥 [Destruction] " + personnage.getName() + " a consommé sa chaleur de 100. Nouvelle chaleur après génération du sort : " + newHeat + "/100.");
            if (newHeat >= 100) {
                personnage.triggerFreeSpell();
            }
            return;
        }

        if (hasHeatEffect) {
            return;
        }

        int heat = personnage.getPassiveState("destruction_heat", 0);
        int addedHeat = spell.getHeatGenerated();
        
        if (addedHeat == 0) {
            System.out.println("🔥 [Destruction] " + personnage.getName() + " lance un sort qui ne génère pas de chaleur.");
            return;
        }

        heat += addedHeat;
        if (heat > 100) {
            heat = 100;
        }
        System.out.println("🔥 [Destruction] " + personnage.getName() + " accumule de la chaleur (+" + addedHeat + " -> " + heat + "/100).");
        if (heat >= 100) {
            personnage.triggerFreeSpell();
            System.out.println("🔥 [Destruction] " + personnage.getName() + " a atteint 100 de chaleur ! Le prochain sort sera gratuit.");
        }
        personnage.setPassiveState("destruction_heat", heat);
    }

    private void handleTurnStart(TurnStartEvent event) {
        // Optionnel : éventuellement refroidir la chaleur sur le temps
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