package generation.grimoire.entity.pve;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "hunting_quest")
public class HuntingQuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** "DAILY" ou "WEEKLY" */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Long dungeonId;

    @Column(nullable = false)
    private String dungeonName;

    private int dungeonLevel;

    private int dungeonRoomCount;

    private String requiredSecret;

    private int requiredSecretLevel;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private boolean active = true;

    private Long rewardAnomalieId;
}
