package generation.grimoire.entity.auth;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Data
@NoArgsConstructor
@Entity
@Table(name = "AppUser")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role = "USER"; // ADMIN, USER

    @Column(nullable = false)
    private double monnaie = 0.0;
    
    @Column(nullable = false)
    private int maxCharacters = 2;

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_unlocked_secrets", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "secret_name")
    @Column(name = "level")
    private java.util.Map<String, Integer> unlockedSecrets = new java.util.HashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_unlocked_dungeons", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "dungeon_id")
    private Set<Long> unlockedDungeons = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_claimed_secret_rewards", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "secret_level_key")
    private Set<String> claimedSecretRewards = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_completed_dungeons", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "dungeon_id")
    private Set<Long> completedDungeons = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_discovered_items", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "item_name")
    private Set<String> discoveredItems = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_seen_alchemy_recipes", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "recipe_id")
    private Set<Long> seenAlchemyRecipes = new HashSet<>();

    @Column(nullable = false)
    private boolean unlockedVault = false;

    @Column(nullable = false)
    private boolean unlockedAlchemy = false;

    @Column(nullable = false)
    private boolean unlockedShop = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_unlocked_voie_levels", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "voie_id")
    @Column(name = "max_level")
    private Map<Long, Integer> unlockedVoieLevels = new HashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @CollectionTable(name = "user_unlocked_spirit_levels", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "spirit_id")
    @Column(name = "max_level")
    private Map<Long, Integer> unlockedSpiritualiteLevels = new HashMap<>();
}
