package generation.grimoire.entity;

import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.enumeration.SpellCondition;
import generation.grimoire.enumeration.ZoneType;
import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

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
    private int healCost;
    private int percentHealCost;
    private int action;
    private Integer variantId; // Groupe de variantes de sorts
    @Enumerated(EnumType.STRING)
    private SpellCondition conditionType; //"ALLY", "HIGHER_RESISTANCE", LOW_LIFE etc. Permet les choix conditionnel
    private Integer choiceKey; // La "clé" pour différencier les versions du sort, permet les choix manuel

    @Enumerated(EnumType.STRING)
    private ZoneType zoneEffect;

    @Enumerated(EnumType.STRING)
    private SpellCategory category;

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = true)
    private Voie voie;

    @ManyToOne
    @JoinColumn(name = "spiritualite_id", nullable = true)
    private Spiritualite spiritualite;

    @OneToMany(mappedBy = "spell", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SpellEffect> effects = new ArrayList<>();

    public void addEffect(SpellEffect effect) {
        effect.setSpell(this);
        effects.add(effect);
    }

}
