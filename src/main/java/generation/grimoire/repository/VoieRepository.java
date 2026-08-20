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
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"rankNames", "passiveEffects"})
    Optional<Voie> findByNom(String nom);

    @NonNull
    @Cacheable("voies")
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"rankNames", "passiveEffects"})
    List<Voie> findAll();

    @NonNull
    @Cacheable("voieById")
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"rankNames", "passiveEffects"})
    Optional<Voie> findById(@NonNull Long id);
}
