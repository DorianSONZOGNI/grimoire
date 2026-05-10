package generation.grimoire.entity;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "spell_effect")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "effect_type", discriminatorType = DiscriminatorType.STRING)
public abstract class SpellEffect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Association vers le sort auquel cet effet appartient
    @ManyToOne
    @JoinColumn(name = "spell_id", nullable = false)
    private Spell spell;

    /**
     * Applique cet effet du sort sur la cible.
     *
     * @param caster le lanceur du sort
     * @param target la cible
     */
    public abstract void apply(Personnage caster, Personnage target);

    /**
     * Permet aux effets de réagir à un buff/débuff (peut être ignoré si non concerné).
     */
    public void applyModifierFromBuff(BuffDebuffEffect buff, Personnage caster, Personnage target) {
        // Par défaut, ne fait rien
    }
    /**
     * Calcule si le sort déclenche un coup critique.
     */
    protected boolean checkCriticalHit(Personnage caster) {
        int totalCrit = caster.getCrit() + caster.getStatFlatBonus(generation.grimoire.enumeration.StatType.CRIT);
        totalCrit = Math.max(0, Math.min(100, totalCrit));
        int roll = (int) (Math.random() * 100) + 1;
        
        boolean isCrit = roll <= totalCrit;
        if (isCrit) {
            System.out.println("💥 Coup Critique déclenché par " + caster.getName() + " !");
        }
        return isCrit;
    }
}
