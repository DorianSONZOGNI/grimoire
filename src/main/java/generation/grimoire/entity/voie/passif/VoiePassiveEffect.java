package generation.grimoire.entity.voie.passif;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.*;
import generation.grimoire.passif.PassiveEffect;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "voie_passive_effect")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "passive_type", discriminatorType = DiscriminatorType.STRING)
public abstract class VoiePassiveEffect implements PassiveEffect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = false)
    private Voie voie;

    @Enumerated(EnumType.STRING)
    private StatType statAffected;

    /**
     * Méthode appelée lorsqu'un sort est lancé par le personnage.
     * Le comportement pourra varier en fonction de la catégorie du sort.
     *
     * @param personnage le personnage concerné
     * @param spell le spell
     */
    public abstract void onSpellCast(Personnage personnage, Spell spell);

    /**
     * Méthode appelée au début de chaque tour.
     *
     * @param personnage le personnage concerné
     */
    public abstract void onTurnStart(Personnage personnage);

    /**
     * Permet à un passif d'altérer le type d'incantation (banal, instantané, canalisé) avant vérification des règles de tour.
     */
    public SpellCastingType adjustCastingType(Personnage caster, Spell spell, SpellCastingType currentType) {
        return currentType;
    }

    /**
     * Permet à un passif d'ajuster les coûts en mana et PV du sort avant vérification des ressources.
     * index 0 : mana cost, index 1 : heal cost.
     */
    public void adjustSpellCosts(Personnage caster, Spell spell, int[] costs) {
    }

    /**
     * Permet à un passif de réagir après que les coûts du sort ont été payés par le caster.
     */
    public void onSpellCostPaid(Personnage caster, Spell spell, int manaPaid) {
    }

    // ─── Bridge vers le système d'événements unifié ───

    /**
     * Implémentation par défaut du contrat {@link PassiveEffect} qui dispatche
     * les événements vers les méthodes existantes pour la rétro-compatibilité.
     * <p>
     * Les sous-classes qui souhaitent migrer vers le nouveau système peuvent
     * override cette méthode directement.
     */
    @Override
    public void onEvent(GameEvent event) {
        if (event instanceof CastingTypeAdjustEvent e) {
            e.setCurrentType(adjustCastingType(e.getSource(), e.getSpell(), e.getCurrentType()));
        } else if (event instanceof SpellCostAdjustEvent e) {
            adjustSpellCosts(e.getSource(), e.getSpell(), e.getCosts());
        } else if (event instanceof SpellCostPaidEvent e) {
            onSpellCostPaid(e.getSource(), e.getSpell(), e.getManaPaid());
        } else if (event instanceof SpellCastEvent e) {
            onSpellCast(e.getSource(), e.getSpell());
        } else if (event instanceof TurnStartEvent e) {
            onTurnStart(e.getSource());
        }
    }
}