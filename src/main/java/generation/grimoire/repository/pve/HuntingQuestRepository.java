package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.HuntingQuest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HuntingQuestRepository extends JpaRepository<HuntingQuest, Long> {

    Optional<HuntingQuest> findByTypeAndActiveTrue(String type);

    /** Quête hebdo précédente (la plus récente inactive) pour récupération tardive */
    Optional<HuntingQuest> findFirstByTypeAndActiveFalseOrderByEndDateDesc(String type);

    /** Toutes les quêtes dont la fin est dépassée et encore actives */
    List<HuntingQuest> findByActiveTrueAndEndDateBefore(LocalDate date);
}
