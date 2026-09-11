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
}
