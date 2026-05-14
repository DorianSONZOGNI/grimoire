package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
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
    public void onSpellCast(Personnage personnage, Spell spell) {
        int heat = personnage.getPassiveState("destruction_heat", 0);
        
        // La chaleur dépend exclusivement du paramètre heatGenerated du sort.
        // La liberté de création permet d'avoir 0 ou des valeurs fixes/calculées définies sur le sort.
        int addedHeat = spell.getHeatGenerated();
        
        if (addedHeat == 0) {
            System.out.println(personnage.getName() + " lance un sort qui ne génère pas de chaleur.");
            return;
        }

        heat += addedHeat;
        System.out.println(personnage.getName() + " accumule de la chaleur (+" + addedHeat + " -> " + heat + "/100).");
        if (heat >= 100) {
            // Déclencher un sort gratuit et consommer la chaleur
            personnage.triggerFreeSpell();
            heat = 0;
            System.out.println(personnage.getName() + " consomme sa chaleur et lance un sort gratuit !");
        }
        personnage.setPassiveState("destruction_heat", heat);
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Optionnel : éventuellement refroidir la chaleur sur le temps
    }
}