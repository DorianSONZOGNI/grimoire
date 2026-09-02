package generation.grimoire.dto.personnage;

import lombok.Data;

@Data
public class PersonnageResponseDTO {
    private Long id;
    private String name;
    private String ownerUsername;
    private int healthMax;
    private int manaMax;
    private int power;
    private int strength;
    private int armor;
    private int resistance;
    private int speed;
    private int crit;
    private int regenHp;
    private int regenMana;
    
    private int totalHealthMax;
    private int totalManaMax;
    private int totalPower;
    private int totalStrength;
    private int totalArmor;
    private int totalResistance;
    private int totalSpeed;
    private int totalCrit;
    private int totalRegenHp;
    private int totalRegenMana;
    
    private int experience;
    private int currentLevelXp;
    private int nextLevelXp;
    private int voieLevel;
    
    private int spiritualiteLevel;
    private int spiritualiteExperience;
    private int currentLevelSpiritXp;
    private int nextLevelSpiritXp;
    
    private VoieRef voie;
    private SpiritualiteRef spiritualite;

    @Data
    public static class VoieRef {
        private Long id;
        private String nom;
    }

    @Data
    public static class SpiritualiteRef {
        private Long id;
        private String nom;
    }
}
