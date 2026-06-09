package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.Monstre;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonstreRepository extends JpaRepository<Monstre, Long> {
}
