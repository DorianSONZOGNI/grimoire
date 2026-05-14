package generation.grimoire.repository;

import generation.grimoire.entity.Voie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoieRepository extends JpaRepository<Voie, Long> {
    Optional<Voie> findByNom(String nom);
}
