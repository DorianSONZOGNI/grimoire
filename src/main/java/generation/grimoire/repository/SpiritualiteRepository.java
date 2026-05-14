package generation.grimoire.repository;

import generation.grimoire.entity.Spiritualite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpiritualiteRepository extends JpaRepository<Spiritualite, Long> {
    Optional<Spiritualite> findByNom(String nom);
}
