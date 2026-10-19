package generation.grimoire.entity.achievement;

import generation.grimoire.entity.auth.AppUser;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(
    name = "user_custom_achievement",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "achievement_title"})
)
public class UserCustomAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "achievement_title", nullable = false, length = 120)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 60)
    private String icon;

    @Column(length = 100)
    private String rewardTitle;

    @Column(nullable = false)
    private Instant unlockedAt;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private boolean notified = false;

    public UserCustomAchievement(AppUser user, String title, String description, String icon, String rewardTitle) {
        this.user = user;
        this.title = title;
        this.description = description;
        this.icon = (icon != null && !icon.isBlank()) ? icon : "emoji_events";
        this.rewardTitle = rewardTitle;
        this.unlockedAt = Instant.now();
        this.notified = false;
    }
}
