package generation.grimoire.entity.pve;

import generation.grimoire.enumeration.MonsterType;
import generation.grimoire.enumeration.MonsterBehavior;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Monstre")
public class Monstre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String imageUrl;

    private int level = 1;

    // Base stats similar to Personnage
    private int healthMax;
    private int manaMax;
    private int power;
    private int strength;
    private int armor;
    private int resistance;
    private int crit;
    private int speed;

    // For simple AI logic / rewards
    private int rewardExp;
    private int rewardGold;

    @Enumerated(EnumType.STRING)
    private MonsterType monsterType = MonsterType.NORMAL;

    @Enumerated(EnumType.STRING)
    private MonsterBehavior behavior = MonsterBehavior.NORMAL;
}
