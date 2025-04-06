package generation.grimoire.entity.personnage;

import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.enumeration.DamageType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "game_character") // "character" pouvant être réservé selon le SGBD
public class Personnage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // Statistiques de vie et de mana
    private int healthMax;
    private int healthCurrent;
    private int manaMax;
    private int manaCurrent;
    private int power;
    private int armor;
    private int resistance;

    // Liste des buffs/débuffs actifs (ici en mémoire, mais vous pouvez choisir de les persister si besoin)
    @Transient
    private List<BuffDebuffEffect> activeBuffs = new ArrayList<>();

    /**
     * Applique des dégâts à ce personnage.
     * Vous pouvez ajouter ici des calculs de résistance en fonction du DamageType.
     *
     * @param damage     le montant de dégâts
     * @param damageType le type de dégâts (ex : PHYSICAL, MAGICAL, etc.)
     */
    public void takeDamage(int damage, DamageType damageType) {
        // Exemple de logique simplifiée : soustrait les dégâts de la vie actuelle
        this.healthCurrent -= damage;
        if (this.healthCurrent < 0) {
            this.healthCurrent = 0;
        }
        System.out.println(name + " subit " + damage + " dégâts (" + damageType + "). Vie actuelle : " + healthCurrent);
    }

    /**
     * Soigne ce personnage.
     *
     * @param healAmount le montant de soin à appliquer
     */
    public void heal(int healAmount) {
        this.healthCurrent += healAmount;
        if (this.healthCurrent > this.healthMax) {
            this.healthCurrent = this.healthMax;
        }
        System.out.println(name + " est soigné de " + healAmount + " points. Vie actuelle : " + healthCurrent);
    }

    /**
     * Applique un effet de buff ou débuff sur ce personnage.
     *
     * @param buffDebuff l'effet à appliquer
     */
    public void applyBuff(BuffDebuffEffect buffDebuff, Double modifier) {
        activeBuffs.add(buffDebuff);
        System.out.println(name + " reçoit un effet sur " + buffDebuff.getStatAffected()
                + " (modificateur : " + buffDebuff.getModifier()
                + ") pour " + buffDebuff.getDuration() + " tours.");
    }

    /**
     * Met à jour la durée des buffs/débuffs actifs et retire ceux qui sont expirés.
     */
    public void updateBuffs() {
        Iterator<BuffDebuffEffect> iterator = activeBuffs.iterator();
        while (iterator.hasNext()) {
            BuffDebuffEffect effect = iterator.next();
            effect.setDuration(effect.getDuration() - 1);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(name + " perd l'effet sur " + effect.getStatAffected());
            }
        }
    }
}
