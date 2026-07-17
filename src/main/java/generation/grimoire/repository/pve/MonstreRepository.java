package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.Monstre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

public interface MonstreRepository extends JpaRepository<Monstre, Long> {
    @NonNull
    @Cacheable("monstres")
    List<Monstre> findAll();

    @NonNull
    @Cacheable("monstreById")
    Optional<Monstre> findById(@NonNull Long id);
}
