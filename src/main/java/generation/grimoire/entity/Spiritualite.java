package generation.grimoire.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "spiritualite")
public class Spiritualite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

}