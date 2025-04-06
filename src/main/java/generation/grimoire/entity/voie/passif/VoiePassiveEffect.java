package generation.grimoire.entity.voie.passif;

import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.enumeration.StatType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "voie_passive_effect")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "passive_type", discriminatorType = DiscriminatorType.STRING)
public abstract class VoiePassiveEffect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = false)
    private Voie voie;

    @Enumerated(EnumType.STRING)
    private StatType statAffected;

    /**
     * Méthode appelée lorsqu’un sort est lancé par le personnage.
     * Le comportement pourra varier en fonction de la catégorie du sort.
     *
     * @param personnage le personnage concerné
     * @param spellCategory la catégorie du sort lancé (ex : INSPIRATION ou EXPIRATION pour la voie violence)
     */
    public abstract void onSpellCast(Personnage personnage, SpellCategory spellCategory);

    /**
     * Méthode appelée au début de chaque tour.
     *
     * @param personnage le personnage concerné
     */
    public abstract void onTurnStart(Personnage personnage);
}