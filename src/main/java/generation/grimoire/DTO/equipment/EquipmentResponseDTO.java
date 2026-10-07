package generation.grimoire.dto.equipment;

import lombok.Data;

@Data
public class EquipmentResponseDTO {
    private Long id;
    private String name;
    private String slot;
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
    private String rarity;
    private String specialEffect;
    private int specialEffectValue;
    private double baseWeight;
    private int consumableHpPercent;
    private int consumableManaPercent;
    private int consumableMissingHpPercent;
    private int consumableMissingManaPercent;
    private int consumableBonusXpPercent;
    private int consumableBonusMagicalDamagePercent;
    private int consumableBonusPhysicalDamagePercent;
    private int consumableBonusArmorFlat;
    private int consumableBonusResistanceFlat;
    private int consumableDurationTurns;
    private String consumableCategory;
    private double weight;
    private double maxWeight;
    private boolean isTemplate;
    private boolean availableInShop;
    private String requiredSecret;
    private int requiredSecretLevel;
    private java.util.Map<String, Integer> priceAnomalies;
    private String ownerUsername;
    private PersonnageRef personnage;

    @Data
    public static class PersonnageRef {
        private Long id;
        private String name;
        private String voie;
    }
}
