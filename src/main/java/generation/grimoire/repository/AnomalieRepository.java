package generation.grimoire.repository;

import generation.grimoire.entity.Anomalie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.cache.annotation.Cacheable;
import java.util.List;

public interface AnomalieRepository extends JpaRepository<Anomalie, Long> {
    List<Anomalie> findByOwnerUsername(String ownerUsername);
    @Cacheable("anomalieTemplateByName")
    Anomalie findFirstByNameAndIsTemplateTrueOrderByIdAsc(String name);
    
    @Cacheable("anomalieTemplates")
    List<Anomalie> findByIsTemplateTrue();
    List<Anomalie> findByName(String name);
    
    @Cacheable("anomalieDistinctNames")
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT a.name FROM Anomalie a WHERE a.name IS NOT NULL")
    List<String> findDistinctNames();
}
