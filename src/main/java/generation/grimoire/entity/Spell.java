package generation.grimoire.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "spell")
public class Spell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private int niveau;
    private String description;

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = true)
    private Voie voie;

    @ManyToOne
    @JoinColumn(name = "spiritualite_id", nullable = true)
    private Spiritualite spiritualite;

}
