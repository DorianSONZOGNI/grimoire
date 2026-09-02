package generation.grimoire.dto.pve;

import lombok.Data;
import java.util.List;

@Data
public class MonstreRequestDTO {
    private String nom;
    private String description;
    private String avatarUrl;
    private int tier;
    private boolean rare;
    private boolean epic;
    private int customLevel;
    
    // Stats de base
    private int baseHealthMax;
    private int baseManaMax;
    private int basePower;
    private int baseStrength;
    private int baseArmor;
    private int baseResistance;
    private int baseSpeed;
    private int baseCrit;
    
    // Loots
    private List<LootDTO> loots;
    
    private List<Long> mutationIds = new java.util.ArrayList<>();

    @Data
    public static class LootDTO {
        private Long equipmentTemplateId;
        private double dropRate;
    }
}
