package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.Mutation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

@Repository
public interface MutationRepository extends JpaRepository<Mutation, Long> {
    @NonNull
    @Cacheable("mutations")
    List<Mutation> findAll();

    @NonNull
    @Cacheable("mutationById")
    Optional<Mutation> findById(@NonNull Long id);
}
