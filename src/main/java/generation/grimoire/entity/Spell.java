package generation.grimoire.entity;

import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.enumeration.KarmaAlignment;
import generation.grimoire.entity.pve.Mutation;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "spell")
public class Spell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private int niveau;
    private String description;
    private int manaCost;
    private int percentManaCost;
    @Enumerated(EnumType.STRING)
    private Source percentManaCostSource = Source.CASTER_MANA_MAX;

    private int healCost;
    private int percentHealCost;
    @Enumerated(EnumType.STRING)
    private Source percentHealCostSource = Source.CASTER_HEALTH_MAX;
    private int heatCost;
    private int percentHeatCost;
    private int heatGenerated;
    private int seedCost;
    private int action;
    private Integer variantId; // Groupe de variantes de sorts
    @Enumerated(EnumType.STRING)
    private SpellCondition conditionType; // "ALLY", "HIGHER_RESISTANCE", LOW_LIFE etc. Permet les choix conditionnel
    private Integer choiceKey; // La "clé" pour différencier les versions du sort, permet les choix manuel

    @Enumerated(EnumType.STRING)
    private SpellCategory category;

    @Enumerated(EnumType.STRING)
    private KarmaAlignment karmaAlignment = KarmaAlignment.NONE;

    private boolean inspiration;

    @Enumerated(EnumType.STRING)
    private SpellCastingType castingType = SpellCastingType.BANAL;

    private int channelingDuration;
    private boolean allowInstantDuringChanneling = true;

    @ManyToOne
    @JoinColumn(name = "voie_id")
    private Voie voie;

    @ManyToOne
    @JoinColumn(name = "spiritualite_id")
    private Spiritualite spiritualite;

    @ManyToOne
    @JoinColumn(name = "mutation_id")
    private Mutation mutation;

    @OneToMany(mappedBy = "spell", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private java.util.Set<SpellEffect> effects = new java.util.LinkedHashSet<>();

    public void addEffect(SpellEffect effect) {
        effect.setSpell(this);
        effects.add(effect);
    }

}
