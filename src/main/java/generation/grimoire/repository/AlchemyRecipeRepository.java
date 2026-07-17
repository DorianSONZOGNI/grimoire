package generation.grimoire.repository;

import generation.grimoire.entity.AlchemyRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlchemyRecipeRepository extends JpaRepository<AlchemyRecipe, Long> {
    @NonNull
    @Cacheable("alchemyRecipesList")
    List<AlchemyRecipe> findAll();

    @NonNull
    @Cacheable("alchemyRecipeById")
    Optional<AlchemyRecipe> findById(@NonNull Long id);
}
