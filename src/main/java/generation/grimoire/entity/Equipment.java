package generation.grimoire.entity;

import generation.grimoire.enumeration.EquipmentSlot;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@NoArgsConstructor
@EqualsAndHashCode(exclude = {"personnage", "user"})
@ToString(exclude = {"personnage", "user"})
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

    @Column(name = "is_template", nullable = false)
    private boolean isTemplate = false;

    @Column(name = "available_in_shop", nullable = false)
    private boolean availableInShop = false;

    @ElementCollection
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    @CollectionTable(name = "equipment_anomaly_prices", joinColumns = @JoinColumn(name = "equipment_id"))
    @MapKeyColumn(name = "anomaly_name")
    @Column(name = "quantity")
    private java.util.Map<String, Integer> priceAnomalies = new java.util.HashMap<>();

    public void copyStatsFrom(Equipment template) {
        if (template == null)
            return;
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
        this.setConsumableCategory(template.getConsumableCategory());
    }

    public double calculateWeight() {
        double w = this.baseWeight;
        
        double mHp = 0.2, mMana = 0.2, mPow = 2.0, mStr = 2.0, mArm = 1.0, mRes = 1.0;
        double mSpd = 3.0, mCrit = 1.5, mRegHp = 3.0, mRegMana = 1.5;

        if (this.slot != null) {
            switch (this.slot) {
                case ARME_GAUCHE:
                case ARME_DROITE:
                case ARME_DEUX_MAINS:
                    mArm = 1.5; mRes = 1.5;
                    mHp = 0.4; mMana = 0.4;
                    mStr = 1.8; mPow = 1.8;
                    mRegHp = 2.4; mRegMana = 1.2;
                    break;
                case CASQUE:
                case PLASTRON:
                    mArm = 0.8; mRes = 0.8;
                    mStr = 2.5; mPow = 2.5;
                    mSpd = 3.5;
                    mCrit = 2.0;
                    break;
                case ANNEAU_GAUCHE:
                case ANNEAU_DROIT:
                    mMana = 0.1;
                    mArm = 2.0; mRes = 2.0;
                    mRegMana = 0.8;
                    break;
                case BOTTES:
                    mSpd = 1.5;
                    break;
                case CAPE:
                    mCrit = 1.5;
                    break;
                default:
                    break;
            }
        }

        w += this.bonusHealthMax * mHp;
        w += this.bonusManaMax * mMana;
        w += this.bonusPower * mPow;
        w += this.bonusStrength * mStr;
        w += this.bonusArmor * mArm;
        w += this.bonusResistance * mRes;
        w += this.bonusSpeed * mSpd;
        w += this.bonusCrit * mCrit;
        w += this.regenHealthPerTurn * mRegHp;
        w += this.regenManaPerTurn * mRegMana;

        if ((this.rarity == generation.grimoire.enumeration.EquipmentRarity.EPIQUE ||
                this.rarity == generation.grimoire.enumeration.EquipmentRarity.RELIQUE ||
                this.rarity == generation.grimoire.enumeration.EquipmentRarity.MAUDIT) &&
                this.specialEffect != generation.grimoire.enumeration.EquipmentEffectType.NONE &&
                this.specialEffectValue != 0) {

            if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.MAUDIT) {
                w += this.specialEffectValue * 0.2;
            } else {
                w += this.specialEffectValue * 1.5;
            }
        }
        return w;
    }

    public double getWeight() {
        return this.calculateWeight();
    }

    public double calculateShopPrice() {
        double weight = this.calculateWeight();
        double multiplier = 1.0;
        if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.COMMUN)
            multiplier = 1.0;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.INHABITUEL)
            multiplier = 1.5;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.RARE)
            multiplier = 2.0;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.MYTHIQUE)
            multiplier = 2.5;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.LEGENDAIRE)
            multiplier = 3.0;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.EPIQUE)
            multiplier = 5.0;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.RELIQUE)
            multiplier = 6.0;
        else if (this.rarity == generation.grimoire.enumeration.EquipmentRarity.MAUDIT)
            multiplier = 4.0;

        double slotMultiplier = 1.0;
        if (this.slot == generation.grimoire.enumeration.EquipmentSlot.PLASTRON)
            slotMultiplier = 1.1;
        else if (this.slot == generation.grimoire.enumeration.EquipmentSlot.ANNEAU_GAUCHE || this.slot == generation.grimoire.enumeration.EquipmentSlot.ANNEAU_DROIT)
            slotMultiplier = 1.5;
        else if (this.slot == generation.grimoire.enumeration.EquipmentSlot.BOTTES)
            slotMultiplier = 0.9;
        else if (this.slot == generation.grimoire.enumeration.EquipmentSlot.CAPE)
            slotMultiplier = 1.2;
        else if (this.slot == generation.grimoire.enumeration.EquipmentSlot.ARME_DROITE)
            slotMultiplier = 1.5;
        else if (this.slot == generation.grimoire.enumeration.EquipmentSlot.ARME_GAUCHE)
            slotMultiplier = 1.4;
        else if (this.slot == generation.grimoire.enumeration.EquipmentSlot.ARME_DEUX_MAINS)
            slotMultiplier = 1.1;

        return Math.ceil(weight * 2 * multiplier * slotMultiplier);
    }
}
