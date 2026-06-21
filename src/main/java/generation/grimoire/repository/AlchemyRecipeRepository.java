package generation.grimoire.repository;

import generation.grimoire.entity.AlchemyRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlchemyRecipeRepository extends JpaRepository<AlchemyRecipe, Long> {
}
