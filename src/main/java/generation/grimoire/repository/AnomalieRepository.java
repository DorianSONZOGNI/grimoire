package generation.grimoire.repository;

import generation.grimoire.entity.Anomalie;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnomalieRepository extends JpaRepository<Anomalie, Long> {
    List<Anomalie> findByOwnerUsername(String ownerUsername);
}
