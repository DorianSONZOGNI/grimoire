package generation.grimoire.entity.pve;

import generation.grimoire.enumeration.RoomType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Salle")
public class Salle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private RoomType type;

    // IF COMBAT
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "salle_monstre",
        joinColumns = @JoinColumn(name = "salle_id"),
        inverseJoinColumns = @JoinColumn(name = "monstre_id")
    )
    private List<Monstre> monsters = new ArrayList<>();

    // IF TREASURE
    private int treasureGold;
    private int treasureExp;

    // IF EVENT
    private String eventText;
    // Positive or negative effect amount
    private int eventEffectAmount;
}
