package generation.grimoire.DTO.pve;

import lombok.Data;

@Data
public class MonstreDTO {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private int level;
    
    private int healthMax;
    private int manaMax;
    private int power;
    private int strength;
    private int armor;
    private int resistance;
    private int crit;
    private int speed;
    
    private int rewardExp;
    private int rewardGold;
}
