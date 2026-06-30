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
@DiscriminatorValue("CONVICTION_PASSIVE")
public class ConvictionPassiveEffect extends VoiePassiveEffect {

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Aucun effet immédiat lors du cast
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        int level = personnage.getVoieLevel();
        int regenAmount = 25 + (Math.max(0, level - 1) * 4);
        int newMana = Math.min(personnage.getManaCurrent() + regenAmount, personnage.getManaMax());
        personnage.setManaCurrent(newMana);
        System.out.println(
                personnage.getName() + " régénère " + regenAmount + " mana (Conviction). Nouveau mana: " + newMana);
    }

    @Override
    public int adjustMaxMana(Personnage personnage, int currentMaxMana) {
        int level = personnage.getVoieLevel();
        return currentMaxMana + (Math.max(0, level - 1) * 20);
    }
}