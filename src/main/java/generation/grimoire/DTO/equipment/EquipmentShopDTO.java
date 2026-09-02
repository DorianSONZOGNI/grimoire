package generation.grimoire.dto.equipment;

import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.enumeration.EquipmentRarity;
import generation.grimoire.enumeration.EquipmentEffectType;
import lombok.Data;
import java.util.Map;

@Data
public class EquipmentShopDTO {
    private Long id;
    private String name;
    private EquipmentSlot slot;
    private int bonusHealthMax;
    private int bonusManaMax;
    private int bonusPower;
    private int bonusStrength;
    private int bonusArmor;
    private int bonusResistance;
    private int bonusSpeed;
    private int bonusCrit;
    private int regenHealthPerTurn;
    private int regenManaPerTurn;
    private EquipmentRarity rarity;
    private EquipmentEffectType specialEffect;
    private int specialEffectValue;
    private double shopPrice;
    private Map<String, Integer> priceAnomalies;
    private double weight;
    private double baseWeight;
    private int consumableHpPercent;
    private int consumableManaPercent;
    private int consumableMissingHpPercent;
    private int consumableMissingManaPercent;
    private String consumableCategory;
    private boolean isConsumable;
    private boolean availableInShop;
    private boolean isDiscount;
    private double originalPrice;
}
