package generation.grimoire.entity.pve;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "mutation")
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Mutation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

    private int level = 1;

    @Column(length = 500)
    private String description;

    private String icon;

    private String color;

    @OneToMany(mappedBy = "mutation", fetch = FetchType.EAGER)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"mutation"})
    private java.util.List<generation.grimoire.entity.Spell> spells;
}
