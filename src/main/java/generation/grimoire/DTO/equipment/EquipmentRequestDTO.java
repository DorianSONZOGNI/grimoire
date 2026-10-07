package generation.grimoire.dto.equipment;

import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.enumeration.ConsumableCategory;
import generation.grimoire.enumeration.EquipmentRarity;
import generation.grimoire.enumeration.EquipmentEffectType;
import lombok.Data;
import java.util.Map;
import java.util.HashMap;

@Data
public class EquipmentRequestDTO {
    private Long id;
    private String name;
    private EquipmentSlot slot;
    private int bonusHealthMax = 0;
    private int bonusManaMax = 0;
    private int bonusPower = 0;
    private int bonusStrength = 0;
    private int bonusArmor = 0;
    private int bonusResistance = 0;
    private int bonusSpeed = 0;
    private int bonusCrit = 0;
    private int regenHealthPerTurn = 0;
    private int regenManaPerTurn = 0;
    private double baseWeight = 0.0;
    private int consumableHpPercent = 0;
    private int consumableManaPercent = 0;
    private int consumableMissingHpPercent = 0;
    private int consumableMissingManaPercent = 0;
    private int consumableBonusXpPercent = 0;
    private int consumableBonusMagicalDamagePercent = 0;
    private int consumableBonusPhysicalDamagePercent = 0;
    private int consumableBonusArmorFlat = 0;
    private int consumableBonusResistanceFlat = 0;
    private int consumableDurationTurns = 0;
    private ConsumableCategory consumableCategory;
    private EquipmentRarity rarity;
    private EquipmentEffectType specialEffect;
    private int specialEffectValue = 0;
    private Long personnageId;
    private Map<String, Integer> priceAnomalies = new HashMap<>();
    private Boolean availableInShop;
    private String requiredSecret;
    private int requiredSecretLevel = 0;
}
