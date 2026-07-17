package generation.grimoire.repository;

import generation.grimoire.entity.Spiritualite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;

import java.util.Optional;
import java.util.List;

@Repository
public interface SpiritualiteRepository extends JpaRepository<Spiritualite, Long> {
    @Cacheable("spiritualitesByNom")
    Optional<Spiritualite> findByNom(String nom);

    @NonNull
    @Cacheable("spiritualites")
    List<Spiritualite> findAll();

    @NonNull
    @Cacheable("spiritualiteById")
    Optional<Spiritualite> findById(@NonNull Long id);
}
