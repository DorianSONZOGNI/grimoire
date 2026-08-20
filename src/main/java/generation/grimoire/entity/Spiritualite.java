package generation.grimoire.entity;

import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.List;
import java.util.Map;

@Data
@EqualsAndHashCode(exclude = {"passiveEffects"})
@ToString(exclude = {"passiveEffects"})
@Entity
@Table(name = "spiritualite")
public class Spiritualite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

    @Column(length = 500)
    private String description;

    @Column(length = 1000)
    private String passiveDescription;

    @ElementCollection
    @CollectionTable(name = "spiritualite_rank_names", joinColumns = @JoinColumn(name = "spiritualite_id"))
    @MapKeyColumn(name = "rang")
    @Column(name = "nom_rang")
    private Map<Integer, String> rankNames = new java.util.HashMap<>();

    @OneToMany(mappedBy = "spiritualite", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SpiritualitePassiveEffect> passiveEffects;
}