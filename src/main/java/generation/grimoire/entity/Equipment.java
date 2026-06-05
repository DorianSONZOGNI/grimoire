package generation.grimoire.entity;

import generation.grimoire.enumeration.EquipmentSlot;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Equipment")
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentSlot slot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private generation.grimoire.enumeration.EquipmentRarity rarity = generation.grimoire.enumeration.EquipmentRarity.COMMUN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private generation.grimoire.enumeration.EquipmentEffectType specialEffect = generation.grimoire.enumeration.EquipmentEffectType.NONE;

    private int specialEffectValue = 0;

    // Bonus de stats accordés par cet équipement
    private int bonusHealthMax = 0;
    private int bonusManaMax = 0;
    private int bonusPower = 0;
    private int bonusStrength = 0;
    private int bonusArmor = 0;
    private int bonusResistance = 0;
    private int bonusSpeed = 0;
    private int bonusCrit = 0;

    // Effets spéciaux par tour
    private int regenHealthPerTurn = 0;
    private int regenManaPerTurn = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "personnage_id", nullable = true)
    private generation.grimoire.entity.personnage.Personnage personnage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private generation.grimoire.entity.auth.AppUser user;
}
