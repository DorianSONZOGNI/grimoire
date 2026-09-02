package generation.grimoire.dto.pve;

import lombok.Data;
import java.util.List;

@Data
public class DonjonDTO {
    private String name;
    private String description;
    private String imageUrl;
    private int recommendedLevel;
    private int maxHeroes;
    private int unlockCostGold;
    private int entryCostGold;
    private String requiredSecret;
    private int requiredSecretLevel;
    private List<SalleDTO> salles;

    @Data
    public static class SalleDTO {
        private generation.grimoire.enumeration.RoomType type;
        private String eventSubType;
        private String eventText;
        private int eventEffectAmount;
        private String alterationType;
        private int alterationHpAmount;
        private int alterationExpAmount;
        private String alterationRewardType;
        private int alterationSpiritualXpReward;
        private String alterationSpecialItemReward;
        private String alterationRequiredItem;
        private int treasureGold;
        private int treasureExp;
        private String trapType;
        private int trapAmount;
        private boolean trapHasRopeOption;
        private Integer trapDamageHpPct;
        private Integer trapDamageManaPct;
        private Integer trapDamageHpFixed;
        private Integer trapDamageManaFixed;
        private String doorOutcomes;
        private String globalBuffs;
        private int bossRewardSpiritualXp;
        private int bossRewardGold;
        private List<MonsterRefDTO> monsters;
        private List<LootEntryDTO> lootTable;
    }

    @Data
    public static class MonsterRefDTO {
        private Long id;
    }

    @Data
    public static class LootEntryDTO {
        private Long equipmentId;
        private double probability;
        private String specialItemName;
        private int priceGold;
        private String priceSpecialItemName;
    }
}
