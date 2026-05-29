package generation.grimoire.entity;


import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Entity
@Table(name = "voie")
public class Voie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "voie_rank_names", joinColumns = @JoinColumn(name = "voie_id"))
    @MapKeyColumn(name = "rang")
    @Column(name = "nom_rang")
    private Map<Integer, String> rankNames = new java.util.HashMap<>();

    @OneToMany(mappedBy = "voie", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<VoiePassiveEffect> passiveEffects;
}
