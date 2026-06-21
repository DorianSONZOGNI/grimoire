package generation.grimoire.entity;

import generation.grimoire.enumeration.RecipeRewardType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Alchemy_Recipe")
public class AlchemyRecipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    // Coûts basiques
    private double costGold = 0;
    private double costSpiritXp = 0;

    // Ingrédients : Anomalies requises (Nom de l'anomalie -> Quantité)
    @ElementCollection
    @CollectionTable(name = "recipe_required_anomalies", joinColumns = @JoinColumn(name = "recipe_id"))
    @MapKeyColumn(name = "anomaly_name")
    @Column(name = "quantity")
    private Map<String, Integer> requiredAnomalies = new HashMap<>();

    // Ingrédients : Consommables requis (Nom du consommable -> Quantité)
    @ElementCollection
    @CollectionTable(name = "recipe_required_consumables", joinColumns = @JoinColumn(name = "recipe_id"))
    @MapKeyColumn(name = "consumable_name")
    @Column(name = "quantity")
    private Map<String, Integer> requiredConsumables = new HashMap<>();

    // Récompense générée
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecipeRewardType rewardType = RecipeRewardType.OTHER;

    // Nom de la récompense (ex: Nom de l'anomalie à donner, nom de l'équipement, ou de l'unlock)
    @Column(nullable = false)
    private String rewardName;

    private int rewardQuantity = 1;

    // Utile pour les objets ayant un niveau (ex: Anomalie niveau 2 générée)
    private int rewardLevel = 1;
}
