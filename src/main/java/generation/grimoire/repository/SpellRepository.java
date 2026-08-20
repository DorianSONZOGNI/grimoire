package generation.grimoire.repository;

import generation.grimoire.entity.Spell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpellRepository extends JpaRepository<Spell, Long> {
    
    @NonNull
    @Cacheable("spells")
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT s FROM Spell s LEFT JOIN FETCH s.effects LEFT JOIN FETCH s.voie LEFT JOIN FETCH s.spiritualite")
    List<Spell> findAll();

    @NonNull
    @Cacheable("spellById")
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"effects", "effects.channelingTurns", "voie", "spiritualite"})
    Optional<Spell> findById(@NonNull Long id);

    @Cacheable("spellsByVariant")
    List<Spell> findByVariantId(Integer variantId);

    @Cacheable("spellsByMutation")
    List<Spell> findByMutationId(Long mutationId);
}
