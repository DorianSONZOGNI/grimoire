package generation.grimoire.entity;

import generation.grimoire.enumeration.SpiritualiteType;
import generation.grimoire.entity.auth.AppUser;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Anomalie")
public class Anomalie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SpiritualiteType spiritualite;

    private String ownerUsername;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Integer level = 1;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean isMagicObject = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private AppUser user;
}
