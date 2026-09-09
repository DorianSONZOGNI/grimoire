package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.DungeonRunStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DungeonRunStatRepository extends JpaRepository<DungeonRunStat, Long> {

    @Query("SELECT COALESCE(MAX(d.runNumber), 0) FROM DungeonRunStat d WHERE d.dungeonId = :dungeonId")
    int findMaxRunNumberByDungeonId(Long dungeonId);
}
