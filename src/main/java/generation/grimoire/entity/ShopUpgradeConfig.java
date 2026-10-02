package generation.grimoire.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

/**
 * Configuration d'un palier d'amélioration de la boutique.
 * Chaque entrée définit le coût (or + anomalies) pour passer au niveau targetLevel.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "shop_upgrade_config")
public class ShopUpgradeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Niveau cible (ex: 2 = passer du niveau 1 au niveau 2) */
    @Column(nullable = false, unique = true)
    private int targetLevel;

    /** Description affichée dans le panneau quête */
    @Column(nullable = false)
    private String description;

    /** Coût en or */
    @Column(nullable = false)
    private int goldCost = 0;

    /**
     * Coût en anomalies : nom de l'anomalie → quantité requise.
     * Stocké en table de jointure.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "shop_upgrade_anomaly_cost", joinColumns = @JoinColumn(name = "config_id"))
    @MapKeyColumn(name = "anomaly_name")
    @Column(name = "quantity")
    private Map<String, Integer> anomalyCost = new HashMap<>();

    /** Déblocage des slots spécifiques */
    @Column(nullable = false)
    private boolean unlocksSlot4 = false;

    @Column(nullable = false)
    private boolean unlocksSlot5 = false;

    @Column(nullable = false)
    private boolean unlocksPromo = false;

    @Column(nullable = false)
    private boolean unlocksBlackMarket = false;

    /** Règles de rareté par slot (probabilités) */
    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "shop_upgrade_slot_rules", joinColumns = @JoinColumn(name = "config_id"))
    private List<ShopSlotRarityRule> slotRules = new ArrayList<>();
}
