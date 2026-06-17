package generation.grimoire.DTO.pve;

import generation.grimoire.enumeration.RoomType;
import generation.grimoire.enumeration.EventSubType;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class SalleDTO {
    private Long id;
    private RoomType type;
    private EventSubType eventSubType;
    private List<MonstreDTO> monsters;
    private int treasureGold;
    private int treasureExp;
    private String eventText;
    private int eventEffectAmount;
    private String alterationType;
    private int alterationHpAmount;
    private int alterationExpAmount;
    private String alterationRewardType;
    private int alterationSpiritualXpReward;
    private String alterationSpecialItemReward;
    private String alterationRequiredItem;
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
    private List<LootEntryDTO> lootTable;
}
