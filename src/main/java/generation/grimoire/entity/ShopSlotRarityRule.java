package generation.grimoire.entity;

import generation.grimoire.enumeration.EquipmentRarity;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class ShopSlotRarityRule {
    
    @Column(nullable = false)
    private int slotIndex;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentRarity rarity;
    
    @Column(nullable = false)
    private int weight;
}
