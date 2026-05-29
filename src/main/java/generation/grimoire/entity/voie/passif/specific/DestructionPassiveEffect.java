package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
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
        } else {
            super.onEvent(event);
        }
    }

    // ─── Handlers d'événements ───

    private void handleSpellCast(SpellCastEvent event) {
        Personnage personnage = event.getSource();
        Spell spell = event.getSpell();

        // Si le sort a déjà un effet de chaleur direct, le passif ne double pas la génération de chaleur
        boolean hasHeatEffect = spell.getEffects() != null && spell.getEffects().stream()
                .anyMatch(e -> e instanceof generation.grimoire.entity.spell.type.effect.HeatFixedEffect
                        || e instanceof generation.grimoire.entity.spell.type.effect.HeatPercentageEffect
                        || e instanceof generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect);
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
        System.out.println("🔥 [Destruction] " + personnage.getName() + " accumule de la chaleur (+" + addedHeat + " -> " + heat + "/100).");
        if (heat >= 100) {
            personnage.triggerFreeSpell();
            heat = 0;
            System.out.println("🔥 [Destruction] " + personnage.getName() + " consomme sa chaleur et lance un sort gratuit !");
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