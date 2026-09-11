package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.HuntingQuestEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HuntingQuestEntryRepository extends JpaRepository<HuntingQuestEntry, Long> {

    Optional<HuntingQuestEntry> findByQuestIdAndAccountName(Long questId, String accountName);

    List<HuntingQuestEntry> findByQuestIdOrderByFirstCompletionTimeAsc(Long questId);

    List<HuntingQuestEntry> findByQuestIdOrderByCompletionCountDesc(Long questId);

    long countByQuestId(Long questId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(e) FROM HuntingQuestEntry e WHERE e.accountName = :accountName AND e.rewardClaimed = false AND ((e.quest.type = 'DAILY') OR (e.quest.type = 'WEEKLY' AND e.quest.active = false AND e.rank >= 1 AND e.rank <= 3))")
    int countClaimable(@org.springframework.data.repository.query.Param("accountName") String accountName);
}
