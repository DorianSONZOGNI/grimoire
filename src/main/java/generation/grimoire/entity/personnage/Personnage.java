package generation.grimoire.entity.personnage;

import generation.grimoire.entity.Voie;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealOverTimeEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Personnage")
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
    private int crit;
    private int speed;

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = true)
    private Voie voie;

    // Liste des buffs/débuffs actifs (ici en mémoire, mais vous pouvez choisir de les persister si besoin)
    @Transient
    private List<BuffDebuffEffect> activeBuffs = new ArrayList<>();

    // Liste des effets de heal over time actifs (non persistés)
    @Transient
    private List<HealOverTimeEffect> activeHealOverTimeEffects = new ArrayList<>();

    @Transient
    private List<DamageOverTimeEffect> activeDamageOverTimeEffects = new ArrayList<>();

    @Transient
    private List<ConsumableSpellBuffDebuffEffect> consumableSpellBuffs = new ArrayList<>();

    /**
     * Applique des dégâts après calculs des résistance à ce personnage.
     * Calculs de résistance en fonction du DamageType.
     *
     * @param damage     le montant de dégâts
     * @param damageType le type de dégâts (ex : PHYSICAL, MAGICAL, etc.)
     */
    public void takeDamage(int damage, DamageType damageType) {
        double constant; // La constante K qui détermine la courbe.
        // Sélectionner la résistance en fonction du type de dégâts
        double resistanceValue = switch (damageType) {
            case PHYSIC -> {
                constant = 100; // Exemple, ajustez selon vos besoins
                yield this.armor;
            }
            case MAGIC -> {
                constant = 100; // Utilisez une constante différente si nécessaire
                yield this.resistance;
            }
            default -> {
                constant = 100;
                yield 0;
            }
        };

        // Calcul du facteur de réduction des dégâts (valeur entre 0 et 1)
        double reductionFactor = resistanceValue / (resistanceValue + constant);

        // Mapper le DamageType vers StatType pour obtenir le multiplicateur de vulnérabilité
        StatType statType = switch (damageType) {
            case MAGIC -> StatType.DAMAGE_TAKEN_MAGIC;
            case PHYSIC -> StatType.DAMAGE_TAKEN_PHYSIC;
            case BRUT -> StatType.DAMAGE_TAKEN_BRUT;
            default -> throw new IllegalArgumentException("Unknown damage type: " + damageType);
        };

        // Récupérer le multiplicateur de vulnérabilité
        double damageTakenMultiplier = Math.max(1.0, getStatBuffMultiplier(statType));

        // Appliquer le multiplicateur de dégâts avant de calculer la résistance
        double damageAfterBuff = damage * damageTakenMultiplier;

        // Calcul des dégâts après la réduction
        double finalDamage = damageAfterBuff * (1 - reductionFactor);

        // S'assurer que les dégâts sont toujours au moins 1
        int effectiveDamage = (int) finalDamage;

        // Appliquer les dégâts à la santé actuelle
        this.healthCurrent += effectiveDamage;

        // Affichage des informations
        double finalReductionFactor = Math.min(reductionFactor, 0.90); // Limite la réduction à 90%
        System.out.println(this.name + " subit " + effectiveDamage + " dégâts (" +
                "réduction de " + (int)(finalReductionFactor * 100) + "%), " +
                "PV restants : " + this.healthCurrent);

        // Affichage pour le débogage
        System.out.println("reductionFactor : " + reductionFactor);
        System.out.println("damageTakenMultiplier : " + damageTakenMultiplier);
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
     * Ajoute un effet de heal over time à ce personnage.
     * Vous pouvez cloner l'effet pour éviter de partager une même instance entre plusieurs applications.
     */
    public void addHealOverTimeEffect(HealOverTimeEffect effect) {
        activeHealOverTimeEffects.add(effect);
    }

    /**
     * Met à jour les effets de heal over time.
     * Doit être appelé à chaque tour pour appliquer les soins et décrémenter la durée.
     */
    public void updateHealOverTimeEffects() {
        Iterator<HealOverTimeEffect> iterator = activeHealOverTimeEffects.iterator();
        while (iterator.hasNext()) {
            HealOverTimeEffect effect = iterator.next();
            effect.tick(this);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(name + " n'a plus d'effet de heal over time.");
            }
        }
    }

    public void addDamageOverTimeEffect(DamageOverTimeEffect effect) {
        activeDamageOverTimeEffects.add(effect);
    }

    public void updateDamageOverTimeEffects() {
        Iterator<DamageOverTimeEffect> iterator = activeDamageOverTimeEffects.iterator();
        while (iterator.hasNext()) {
            DamageOverTimeEffect dot = iterator.next();
            dot.tick(this);
            if (dot.getDuration() <= 0) {
                iterator.remove();
                System.out.println(this.getName() + " n'est plus affecté par un effet de Damage Over Time.");
            }
        }
    }

    /**
     * Applique un effet de buff ou débuff sur ce personnage.
     *
     * @param buffDebuff l'effet à appliquer
     */
    public void applyBuff(BuffDebuffEffect buffDebuff, Double modifier) {
        buffDebuff.setModifier(modifier);
        activeBuffs.add(buffDebuff);

        System.out.println(name + " reçoit un effet sur " + buffDebuff.getStatAffected()
                + " (modificateur : " + modifier
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

    public void addConsumableSpellBuff(ConsumableSpellBuffDebuffEffect buff) {
        consumableSpellBuffs.add(buff);
        System.out.println(this.name + " reçoit un buff consommable pour " + buff.getRemainingApplications() + " prochain(s) sort(s).");
    }

    /**
     * Retire tous les buffs/débuffs actifs de ce personnage.
     * Vous pouvez ici rétablir les statistiques si nécessaire.
     */
    public void clearBuffs() {
        // Optionnel : rétablir les statistiques en inversant les effets appliqués
        activeBuffs.clear();
        System.out.println(name + " a été purifié de tous les buffs/débuffs.");
    }

    /**
     * Déclenche la logique d'un sort gratuit.
     * Ici, vous pouvez simplement afficher un message ou définir un flag pour qu'un sort gratuit soit traité ensuite.
     */
    public void triggerFreeSpell() {
        // Exemple simple : affichage et/ou flag à gérer par votre logique de jeu
        System.out.println(name + " déclenche un sort gratuit !");
        // Vous pouvez par exemple stocker un flag ou appeler directement un service de free spell
    }

    public double getStatBuffMultiplier(StatType statType) {
        return activeBuffs.stream()
                .filter(buff -> buff.affectsStatType(statType))
                .map(BuffDebuffEffect::getModifier)
                .reduce(1.0, (a, b) -> a * b);
    }


}
