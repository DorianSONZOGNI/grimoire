package generation.grimoire.entity;

import generation.grimoire.enumeration.EquipmentSlot;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Equipment")
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EquipmentSlot slot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private generation.grimoire.enumeration.EquipmentRarity rarity = generation.grimoire.enumeration.EquipmentRarity.COMMUN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private generation.grimoire.enumeration.EquipmentEffectType specialEffect = generation.grimoire.enumeration.EquipmentEffectType.NONE;

    private int specialEffectValue = 0;

    // Bonus de stats accordés par cet équipement
    private int bonusHealthMax = 0;
    private int bonusManaMax = 0;
    private int bonusPower = 0;
    private int bonusStrength = 0;
    private int bonusArmor = 0;
    private int bonusResistance = 0;
    private int bonusSpeed = 0;
    private int bonusCrit = 0;

    // Effets spéciaux par tour
    private int regenHealthPerTurn = 0;
    private int regenManaPerTurn = 0;

    // Poids de base pour les objets sans stats (ex: consommables)
    private double baseWeight = 0.0;

    // Champs spécifiques aux consommables
    private int consumableHpPercent = 0;
    private int consumableManaPercent = 0;
    private int consumableMissingHpPercent = 0;
    private int consumableMissingManaPercent = 0;
    private generation.grimoire.enumeration.ConsumableCategory consumableCategory = generation.grimoire.enumeration.ConsumableCategory.AUTRE;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "personnage_id", nullable = true)
    private generation.grimoire.entity.personnage.Personnage personnage;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private generation.grimoire.entity.auth.AppUser user;

    @Column(name = "owner_username")
    private String ownerUsername;
    
    @Column(name = "is_shop_template", nullable = false)
    private boolean isShopTemplate = false;

    @ElementCollection
    @CollectionTable(name = "equipment_anomaly_prices", joinColumns = @JoinColumn(name = "equipment_id"))
    @MapKeyColumn(name = "anomaly_name")
    @Column(name = "quantity")
    private java.util.Map<String, Integer> priceAnomalies = new java.util.HashMap<>();

    public void copyStatsFrom(Equipment template) {
        if (template == null) return;
        this.setName(template.getName());
        this.setSlot(template.getSlot());
        this.setRarity(template.getRarity());
        this.setSpecialEffect(template.getSpecialEffect());
        this.setSpecialEffectValue(template.getSpecialEffectValue());
        this.setBonusHealthMax(template.getBonusHealthMax());
        this.setBonusManaMax(template.getBonusManaMax());
        this.setBonusPower(template.getBonusPower());
        this.setBonusStrength(template.getBonusStrength());
        this.setBonusArmor(template.getBonusArmor());
        this.setBonusResistance(template.getBonusResistance());
        this.setBonusSpeed(template.getBonusSpeed());
        this.setBonusCrit(template.getBonusCrit());
        this.setRegenHealthPerTurn(template.getRegenHealthPerTurn());
        this.setRegenManaPerTurn(template.getRegenManaPerTurn());
        this.setBaseWeight(template.getBaseWeight());
        this.setConsumableHpPercent(template.getConsumableHpPercent());
        this.setConsumableManaPercent(template.getConsumableManaPercent());
        this.setConsumableMissingHpPercent(template.getConsumableMissingHpPercent());
        this.setConsumableMissingManaPercent(template.getConsumableMissingManaPercent());
    }

    public double calculateWeight() {
        double w = this.baseWeight;
        w += this.bonusHealthMax * 0.2;
        w += this.bonusManaMax * 0.2;
        w += this.bonusPower * 2.0;
        w += this.bonusStrength * 2.0;
        w += this.bonusArmor * 1.0;
        w += this.bonusResistance * 1.0;
        w += this.bonusSpeed * 2.0;
        w += this.bonusCrit * 1.0;
        w += this.regenHealthPerTurn * 1.0;
        w += this.regenManaPerTurn * 1.0;

        if ((this.rarity == generation.grimoire.enumeration.EquipmentRarity.EPIQUE || 
             this.rarity == generation.grimoire.enumeration.EquipmentRarity.RELIQUE) &&
            this.specialEffect != generation.grimoire.enumeration.EquipmentEffectType.NONE && 
            this.specialEffectValue > 0) {
            
            w += this.specialEffectValue * 1.0;
        }
        return w;
    }
}
