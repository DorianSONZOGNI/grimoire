package generation.grimoire.entity;


import jakarta.persistence.*;

@Entity
@Table(name = "voie")
public class Voie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

}
