package generation.grimoire.entity.pve;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Donjon")
public class Donjon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private int recommendedLevel;
    
    private int maxHeroes = 1;
    
    private String imageUrl;

    // For a simple novice dungeon, it's one combat. 
    // We can map multiple monsters to a dungeon if needed later, or just one boss.
    // For now, let's keep it flexible with a list of encounters or simply a ManyToMany with monsters.
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "donjon_id")
    private List<Salle> salles = new ArrayList<>();
}
