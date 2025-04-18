package generation.grimoire.entity;


import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Data
@Entity
@Table(name = "voie")
public class Voie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

    @OneToMany(mappedBy = "voie", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VoiePassiveEffect> passiveEffects;
}
