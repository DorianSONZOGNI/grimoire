package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCategory;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("DESTRUCTION_PASSIVE")
public class DestructionPassiveEffect extends VoiePassiveEffect {

    private double heat; // valeur de chaleur accumulée

    @Override
    public void onSpellCast(Personnage personnage, SpellCategory spellCategory) {
        // Chaque sort lancé génère, par exemple, 10 points de chaleur
        heat += 10;
        System.out.println(personnage.getName() + " accumule de la chaleur (" + heat + "/100).");
        if (heat >= 100) {
            // Déclencher un sort gratuit et consommer la chaleur
            personnage.triggerFreeSpell();
            heat = 0;
            System.out.println(personnage.getName() + " consomme sa chaleur et lance un sort gratuit !");
        }
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Optionnel : éventuellement refroidir la chaleur sur le temps
    }
}