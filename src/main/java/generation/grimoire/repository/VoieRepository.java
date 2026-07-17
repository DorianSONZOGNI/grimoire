package generation.grimoire.repository;

import generation.grimoire.entity.Voie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;

import java.util.Optional;
import java.util.List;

@Repository
public interface VoieRepository extends JpaRepository<Voie, Long> {
    @Cacheable("voiesByNom")
    Optional<Voie> findByNom(String nom);

    @NonNull
    @Cacheable("voies")
    List<Voie> findAll();

    @NonNull
    @Cacheable("voieById")
    Optional<Voie> findById(@NonNull Long id);
}
