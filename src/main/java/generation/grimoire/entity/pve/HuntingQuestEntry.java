package generation.grimoire.entity.pve;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(name = "hunting_quest_entry", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"quest_id", "account_name"})
})
public class HuntingQuestEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quest_id", nullable = false)
    private HuntingQuest quest;

    @Column(name = "account_name", nullable = false)
    private String accountName;

    /** 1 pour daily (terminé ou pas), N pour weekly */
    @Column(nullable = false)
    private int completionCount = 0;

    /** Timestamp de la première complétion (pour départager le daily) */
    private Instant firstCompletionTime;

    /** Rang calculé (1, 2, 3 ou 0 si pas dans le top 3) */
    @Column(name = "quest_rank", nullable = false)
    private int rank = 0;

    /** Récompense récupérée ? */
    @Column(nullable = false)
    private boolean rewardClaimed = false;
}
