package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.HuntingQuestEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HuntingQuestEntryRepository extends JpaRepository<HuntingQuestEntry, Long> {

    Optional<HuntingQuestEntry> findByQuestIdAndAccountName(Long questId, String accountName);

    List<HuntingQuestEntry> findByQuestIdOrderByFirstCompletionTimeAsc(Long questId);

    List<HuntingQuestEntry> findByQuestIdOrderByCompletionCountDesc(Long questId);

    /** Weekly ranking: fewest turns first, earliest completion as tiebreaker. Null bestTurnCount goes last. */
    @org.springframework.data.jpa.repository.Query(
        "SELECT e FROM HuntingQuestEntry e WHERE e.quest.id = :questId AND e.bestTurnCount IS NOT NULL " +
        "ORDER BY e.bestTurnCount ASC, e.firstCompletionTime ASC")
    List<HuntingQuestEntry> findByQuestIdOrderByBestTurnCountAsc(@org.springframework.data.repository.query.Param("questId") Long questId);

    long countByQuestId(Long questId);

    List<HuntingQuestEntry> findByQuestId(Long questId);

    List<HuntingQuestEntry> findByAccountName(String accountName);
}
