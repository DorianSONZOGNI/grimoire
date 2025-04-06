package generation.grimoire.entity;

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
