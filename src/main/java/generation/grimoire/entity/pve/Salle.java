package generation.grimoire.entity.pve;

import generation.grimoire.enumeration.RoomType;
import generation.grimoire.enumeration.EventSubType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Salle")
public class Salle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private RoomType type;

    // IF EVENT — sous-type
    @Enumerated(EnumType.STRING)
    private EventSubType eventSubType;

    // IF COMBAT
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "salle_monstre",
        joinColumns = @JoinColumn(name = "salle_id"),
        inverseJoinColumns = @JoinColumn(name = "monstre_id")
    )
    private List<Monstre> monsters = new ArrayList<>();

    // IF TREASURE
    private int treasureGold;
    private int treasureExp;

    // IF EVENT
    private String eventText;
    // Positive or negative effect amount (used by generic events)
    private int eventEffectAmount;

    // IF ALTERATION
    private String alterationType; // "VIE_XP", "ITEM", "RIEN"
    private int alterationHpAmount;
    private int alterationExpAmount;
    private String alterationRewardType; // "SPIRITUAL_XP", "SPECIAL_ITEM"
    private int alterationSpiritualXpReward;
    private String alterationSpecialItemReward;
    private String alterationRequiredItem;

    // IF PIEGE
    private String trapType; // "PV", "MANA"
    private int trapAmount;
    private boolean trapHasRopeOption;

    // IF PORTE_ETRANGE — outcomes as JSON string
    @Column(columnDefinition = "TEXT")
    private String doorOutcomes; // JSON: [{"type":"BOSS","probability":20},{"type":"ITEM","probability":50}]

    @OneToMany(mappedBy = "salle", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LootEntry> lootTable = new ArrayList<>();
}
