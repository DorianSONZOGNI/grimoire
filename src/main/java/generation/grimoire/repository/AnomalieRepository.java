package generation.grimoire.repository;

import generation.grimoire.entity.Anomalie;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnomalieRepository extends JpaRepository<Anomalie, Long> {
    List<Anomalie> findByOwnerUsername(String ownerUsername);
    Anomalie findFirstByName(String name);
    List<Anomalie> findByName(String name);
    
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT a.name FROM Anomalie a WHERE a.name IS NOT NULL")
    List<String> findDistinctNames();
}
