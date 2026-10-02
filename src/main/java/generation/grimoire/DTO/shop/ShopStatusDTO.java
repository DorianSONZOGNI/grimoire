package generation.grimoire.dto.shop;

import java.util.List;

/**
 * DTO décrivant l'état du niveau de la boutique et la prochaine amélioration.
 */
public record ShopStatusDTO(
        int currentLevel,
        Integer nextLevel,
        String nextLevelDescription,
        List<UpgradeRequirementDTO> requirements,
        boolean canUpgrade
) {
    public record UpgradeRequirementDTO(
            String type,       // "GOLD", "ANOMALIE", "CONSOMMABLE"
            String name,       // nom précis si type != GOLD
            int required,
            int owned,
            boolean fulfilled
    ) {}
}
