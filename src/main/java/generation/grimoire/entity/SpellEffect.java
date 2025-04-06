package generation.grimoire.entity;

import generation.grimoire.entity.personnage.Personnage;
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
}
