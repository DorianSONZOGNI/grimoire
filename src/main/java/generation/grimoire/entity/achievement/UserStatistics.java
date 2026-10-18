package generation.grimoire.entity.achievement;

import generation.grimoire.entity.auth.AppUser;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "user_statistics")
public class UserStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private int fleeCount = 0;

    @Column(nullable = false)
    private int transmutationsCount = 0;

    @Column(nullable = false)
    private int chestsOpenedCount = 0;

    @Column(nullable = false)
    private int equipmentsRecycledCount = 0;

    @Column(nullable = false)
    private double goldSpentInShop = 0.0;

    @Column(nullable = false)
    private boolean curiousClicked = false;

    public UserStatistics(AppUser user) {
        this.user = user;
    }
}

