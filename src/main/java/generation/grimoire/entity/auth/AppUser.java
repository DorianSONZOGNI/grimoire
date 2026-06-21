package generation.grimoire.entity.auth;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
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
    @CollectionTable(name = "user_unlocked_secrets", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "secret_name")
    private Set<String> unlockedSecrets = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_unlocked_dungeons", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "dungeon_id")
    private Set<Long> unlockedDungeons = new HashSet<>();

}
