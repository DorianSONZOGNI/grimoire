package generation.grimoire.dto.personnage;

import lombok.Data;

@Data
public class PersonnageRequestDTO {
    private Long id;
    private String name;
    private int healthMax = 100;
    private int manaMax = 100;
    private int power = 10;
    private int strength = 10;
    private int armor = 5;
    private int resistance = 5;
    private int speed = 1;
    private int crit = 5;
    private int regenHp = 2;
    private int regenMana = 4;
    private Long voieId;
    private int voieLevel = 1;
    private int experience = 0;
    private Long spiritualiteId;
    private int spiritualiteLevel = 1;
    private int spiritualiteExperience = 0;
}
