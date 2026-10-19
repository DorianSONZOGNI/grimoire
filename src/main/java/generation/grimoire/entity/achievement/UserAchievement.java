package generation.grimoire.entity.achievement;

import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.enumeration.AchievementType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(
    name = "user_achievement",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "achievement_code"})
)
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "achievement_code", nullable = false, columnDefinition = "VARCHAR(50)")
    private AchievementType achievement;

    @Column(nullable = false)
    private int currentProgress = 0;

    @Column(nullable = false)
    private boolean unlocked = false;

    private Instant unlockedAt;

    public UserAchievement(AppUser user, AchievementType achievement) {
        this.user = user;
        this.achievement = achievement;
        this.currentProgress = 0;
        this.unlocked = false;
    }
}
