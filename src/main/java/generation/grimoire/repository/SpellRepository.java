package generation.grimoire.repository;

import generation.grimoire.entity.Spell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpellRepository extends JpaRepository<Spell, Long> {

    @NonNull
    @Cacheable("spells")
    @EntityGraph(attributePaths = {"effects", "effects.channelingTurns", "voie", "voie.rankNames", "spiritualite", "spiritualite.rankNames", "mutation"})
    List<Spell> findAll();

    @NonNull
    @Cacheable("spellById")
    @EntityGraph(attributePaths = {"effects", "effects.channelingTurns", "voie", "voie.rankNames", "spiritualite", "spiritualite.rankNames", "mutation"})
    Optional<Spell> findById(@NonNull Long id);

    @Cacheable("spellsByVariant")
    @EntityGraph(attributePaths = {"effects", "effects.channelingTurns", "voie", "voie.rankNames", "spiritualite", "spiritualite.rankNames", "mutation"})
    List<Spell> findByVariantId(Integer variantId);

    @Cacheable("spellsByMutation")
    @EntityGraph(attributePaths = {"effects", "effects.channelingTurns", "voie", "voie.rankNames", "spiritualite", "spiritualite.rankNames", "mutation"})
    List<Spell> findByMutationId(Long mutationId);
}
