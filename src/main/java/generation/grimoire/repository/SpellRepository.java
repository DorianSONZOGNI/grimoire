package generation.grimoire.repository;

import generation.grimoire.entity.Spell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpellRepository extends JpaRepository<Spell, Long> {
    List<Spell> findByVariantId(Integer variantId);
}
