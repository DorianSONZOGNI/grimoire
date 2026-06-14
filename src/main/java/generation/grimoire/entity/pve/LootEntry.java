package generation.grimoire.entity.pve;

import generation.grimoire.entity.Equipment;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "LootEntry")
public class LootEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salle_id")
    private Salle salle;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_id")
    private Equipment equipment;

    private double probability;
    
    // Nouveaux champs pour le Marchand (RENCONTRE)
    private String specialItemName; // Si null, c'est un équipement. Sinon, c'est le nom de l'item spécial à vendre.
    private Integer priceGold; // Le prix en Or
    private String priceSpecialItemName; // Le prix en Item Spécial (nom de l'item requis, null si aucun)
}
