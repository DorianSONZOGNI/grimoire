package generation.grimoire.dto.pve;

import lombok.Data;

@Data
public class MutationRequestDTO {
    private String nom;
    private String description;
    
    // Multiplicateurs de stats
    private double healthMaxMultiplier = 1.0;
    private double manaMaxMultiplier = 1.0;
    private double powerMultiplier = 1.0;
    private double strengthMultiplier = 1.0;
    private double armorMultiplier = 1.0;
    private double resistanceMultiplier = 1.0;
    private double speedMultiplier = 1.0;
    
    // Bonus fixes
    private int bonusCrit = 0;
}
