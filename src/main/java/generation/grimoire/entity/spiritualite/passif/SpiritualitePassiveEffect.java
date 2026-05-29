package generation.grimoire.entity.spiritualite.passif;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.*;
import generation.grimoire.passif.PassiveEffect;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "spiritualite_passive_effect")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "passive_type", discriminatorType = DiscriminatorType.STRING)
public abstract class SpiritualitePassiveEffect implements PassiveEffect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "spiritualite_id", nullable = false)
    private Spiritualite spiritualite;

    @Enumerated(EnumType.STRING)
    private StatType statAffected;

    /**
     * Méthode appelée lorsqu'un sort est lancé par le personnage ou lorsqu'un sort de cette spiritualité est lancé.
     *
     * @param personnage le personnage concerné
     * @param spell le sort lancé
     */
    public abstract void onSpellCast(Personnage personnage, Spell spell);

    /**
     * Méthode appelée au début de chaque tour.
     *
     * @param personnage le personnage concerné
     */
    public abstract void onTurnStart(Personnage personnage);

    /**
     * Vérifie si les conditions spirituelles sont remplies pour lancer ce sort.
     *
     * @param caster le personnage qui lance le sort
     * @param spell le sort à lancer
     * @return true si le sort peut être lancé, false sinon
     */
    public abstract boolean canCastSpell(Personnage caster, Spell spell);

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
        if (event instanceof CanCastCheckEvent e) {
            if (!canCastSpell(e.getSource(), e.getSpell())) {
                e.setAllowed(false);
            }
        } else if (event instanceof SpellCastEvent e) {
            onSpellCast(e.getSource(), e.getSpell());
        } else if (event instanceof TurnStartEvent e) {
            onTurnStart(e.getSource());
        }
    }
}
