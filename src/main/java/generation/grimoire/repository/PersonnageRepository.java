package generation.grimoire.repository;

import generation.grimoire.entity.personnage.Personnage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PersonnageRepository extends JpaRepository<Personnage, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"voie", "spiritualite", "user"})
    List<Personnage> findByUser_Username(String username);

    @org.springframework.lang.NonNull
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"voie", "spiritualite", "user"})
    List<Personnage> findAll();
}
