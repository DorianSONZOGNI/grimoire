package generation.grimoire.repository;

import generation.grimoire.entity.ShopUpgradeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShopUpgradeConfigRepository extends JpaRepository<ShopUpgradeConfig, Long> {
    Optional<ShopUpgradeConfig> findByTargetLevel(int targetLevel);
}
