package generation.grimoire.mapper;

import generation.grimoire.dto.alchemy.AlchemyRecipeRequestDTO;
import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.enumeration.RecipeRewardType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AlchemyRecipeMapperTest {

    private AlchemyRecipeMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new AlchemyRecipeMapper();
    }

    private AlchemyRecipeRequestDTO createSampleRequestDTO() {
        AlchemyRecipeRequestDTO dto = new AlchemyRecipeRequestDTO();
        dto.setId(42L);
        dto.setName("Élixir de Transmutation");
        dto.setDescription("Permet de transmuter les essences instables.");
        dto.setCostGold(150.0);
        dto.setCostSpiritXp(75.5);

        Map<String, Integer> anomalies = new HashMap<>();
        anomalies.put("Faille Temporelle", 3);
        anomalies.put("Écho du Néant", 1);
        dto.setRequiredAnomalies(anomalies);

        Map<String, Integer> consumables = new HashMap<>();
        consumables.put("Poudre d'Or", 5);
        dto.setRequiredConsumables(consumables);

        dto.setRewardType(RecipeRewardType.GIVE_ANOMALY);
        dto.setRewardName("Anomalie Primordiale");
        dto.setRewardQuantity(2);
        dto.setRewardLevel(3);

        return dto;
    }

    @Nested
    @DisplayName("toEntity tests")
    class ToEntityTests {

        @Test
        @DisplayName("toEntity with valid DTO should map all scalar and reward fields")
        void toEntity_validDto_shouldMapAllFields() {
            AlchemyRecipeRequestDTO dto = createSampleRequestDTO();

            AlchemyRecipe entity = mapper.toEntity(dto);

            assertThat(entity).isNotNull();
            assertThat(entity.getId()).isEqualTo(42L);
            assertThat(entity.getName()).isEqualTo("Élixir de Transmutation");
            assertThat(entity.getDescription()).isEqualTo("Permet de transmuter les essences instables.");
            assertThat(entity.getCostGold()).isEqualTo(150.0);
            assertThat(entity.getCostSpiritXp()).isEqualTo(75.5);

            // Required maps
            assertThat(entity.getRequiredAnomalies())
                    .containsEntry("Faille Temporelle", 3)
                    .containsEntry("Écho du Néant", 1);
            assertThat(entity.getRequiredConsumables())
                    .containsEntry("Poudre d'Or", 5);

            // Rewards
            assertThat(entity.getRewardType()).isEqualTo(RecipeRewardType.GIVE_ANOMALY);
            assertThat(entity.getRewardName()).isEqualTo("Anomalie Primordiale");
            assertThat(entity.getRewardQuantity()).isEqualTo(2);
            assertThat(entity.getRewardLevel()).isEqualTo(3);
        }

        @Test
        @DisplayName("toEntity with null DTO should return null")
        void toEntity_nullDto_shouldReturnNull() {
            assertThat(mapper.toEntity(null)).isNull();
        }

        @Test
        @DisplayName("toEntity with null maps should initialize empty maps")
        void toEntity_nullMaps_shouldInitializeEmptyMaps() {
            AlchemyRecipeRequestDTO dto = new AlchemyRecipeRequestDTO();
            dto.setId(10L);
            dto.setName("Recette Simple");
            dto.setRequiredAnomalies(null);
            dto.setRequiredConsumables(null);

            AlchemyRecipe entity = mapper.toEntity(dto);

            assertThat(entity).isNotNull();
            assertThat(entity.getRequiredAnomalies()).isNotNull().isEmpty();
            assertThat(entity.getRequiredConsumables()).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("toEntity should ensure defensive copying of requiredAnomalies and requiredConsumables")
        void toEntity_defensiveCopy_shouldIsolateMaps() {
            AlchemyRecipeRequestDTO dto = createSampleRequestDTO();

            AlchemyRecipe entity = mapper.toEntity(dto);

            assertThat(entity).isNotNull();

            // Mutate DTO maps after mapping
            dto.getRequiredAnomalies().put("Nouvelle Anomalie", 99);
            dto.getRequiredConsumables().put("Nouveau Consommable", 88);

            assertThat(entity.getRequiredAnomalies()).doesNotContainKey("Nouvelle Anomalie");
            assertThat(entity.getRequiredConsumables()).doesNotContainKey("Nouveau Consommable");

            // Mutate entity maps
            entity.getRequiredAnomalies().put("Anomalie Entité", 11);
            entity.getRequiredConsumables().put("Consommable Entité", 22);

            assertThat(dto.getRequiredAnomalies()).doesNotContainKey("Anomalie Entité");
            assertThat(dto.getRequiredConsumables()).doesNotContainKey("Consommable Entité");
        }
    }

    @Nested
    @DisplayName("updateEntity tests")
    class UpdateEntityTests {

        @Test
        @DisplayName("updateEntity with valid DTO should update fields without changing entity id")
        void updateEntity_validDto_shouldUpdateEntityAndPreserveId() {
            AlchemyRecipe entity = new AlchemyRecipe();
            entity.setId(100L);
            entity.setName("Ancien Nom");
            entity.setDescription("Ancienne Description");
            entity.setCostGold(10.0);
            entity.setCostSpiritXp(5.0);

            Map<String, Integer> oldAnomalies = new HashMap<>();
            oldAnomalies.put("Ancienne Anomalie", 1);
            entity.setRequiredAnomalies(oldAnomalies);

            Map<String, Integer> oldConsumables = new HashMap<>();
            oldConsumables.put("Ancien Consommable", 2);
            entity.setRequiredConsumables(oldConsumables);

            AlchemyRecipeRequestDTO dto = createSampleRequestDTO();
            dto.setId(999L); // ID in DTO should not overwrite entity ID in updateEntity

            mapper.updateEntity(dto, entity);

            assertThat(entity.getId()).isEqualTo(100L);
            assertThat(entity.getName()).isEqualTo("Élixir de Transmutation");
            assertThat(entity.getDescription()).isEqualTo("Permet de transmuter les essences instables.");
            assertThat(entity.getCostGold()).isEqualTo(150.0);
            assertThat(entity.getCostSpiritXp()).isEqualTo(75.5);

            assertThat(entity.getRequiredAnomalies())
                    .containsEntry("Faille Temporelle", 3)
                    .containsEntry("Écho du Néant", 1)
                    .doesNotContainKey("Ancienne Anomalie");

            assertThat(entity.getRequiredConsumables())
                    .containsEntry("Poudre d'Or", 5)
                    .doesNotContainKey("Ancien Consommable");

            assertThat(entity.getRewardType()).isEqualTo(RecipeRewardType.GIVE_ANOMALY);
            assertThat(entity.getRewardName()).isEqualTo("Anomalie Primordiale");
            assertThat(entity.getRewardQuantity()).isEqualTo(2);
            assertThat(entity.getRewardLevel()).isEqualTo(3);
        }

        @Test
        @DisplayName("updateEntity with null DTO should do nothing and not fail")
        void updateEntity_nullDto_shouldDoNothing() {
            AlchemyRecipe entity = new AlchemyRecipe();
            entity.setId(50L);
            entity.setName("Nom Original");

            mapper.updateEntity(null, entity);

            assertThat(entity.getId()).isEqualTo(50L);
            assertThat(entity.getName()).isEqualTo("Nom Original");
        }

        @Test
        @DisplayName("updateEntity with null entity should safely exit without throwing")
        void updateEntity_nullEntity_shouldSafelyReturn() {
            AlchemyRecipeRequestDTO dto = createSampleRequestDTO();

            mapper.updateEntity(dto, null);
            // No exception thrown
        }

        @Test
        @DisplayName("updateEntity with both null should safely exit without throwing")
        void updateEntity_bothNull_shouldSafelyReturn() {
            mapper.updateEntity(null, null);
            // No exception thrown
        }

        @Test
        @DisplayName("updateEntity with null maps should set empty maps on entity")
        void updateEntity_nullMaps_shouldSetEmptyMaps() {
            AlchemyRecipe entity = new AlchemyRecipe();
            Map<String, Integer> initialAnomalies = new HashMap<>();
            initialAnomalies.put("Anomalie Existante", 4);
            entity.setRequiredAnomalies(initialAnomalies);

            Map<String, Integer> initialConsumables = new HashMap<>();
            initialConsumables.put("Consommable Existant", 2);
            entity.setRequiredConsumables(initialConsumables);

            AlchemyRecipeRequestDTO dto = new AlchemyRecipeRequestDTO();
            dto.setRequiredAnomalies(null);
            dto.setRequiredConsumables(null);

            mapper.updateEntity(dto, entity);

            assertThat(entity.getRequiredAnomalies()).isNotNull().isEmpty();
            assertThat(entity.getRequiredConsumables()).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("updateEntity should ensure defensive copying of requiredAnomalies and requiredConsumables")
        void updateEntity_defensiveCopy_shouldIsolateMaps() {
            AlchemyRecipe entity = new AlchemyRecipe();
            AlchemyRecipeRequestDTO dto = createSampleRequestDTO();

            mapper.updateEntity(dto, entity);

            // Mutate DTO maps after update
            dto.getRequiredAnomalies().put("Anomalie Ajoutée Plus Tard", 50);
            dto.getRequiredConsumables().put("Consommable Ajouté Plus Tard", 60);

            assertThat(entity.getRequiredAnomalies()).doesNotContainKey("Anomalie Ajoutée Plus Tard");
            assertThat(entity.getRequiredConsumables()).doesNotContainKey("Consommable Ajouté Plus Tard");

            // Mutate entity maps
            entity.getRequiredAnomalies().put("Anomalie Modifiée Entité", 70);
            entity.getRequiredConsumables().put("Consommable Modifié Entité", 80);

            assertThat(dto.getRequiredAnomalies()).doesNotContainKey("Anomalie Modifiée Entité");
            assertThat(dto.getRequiredConsumables()).doesNotContainKey("Consommable Modifié Entité");
        }
    }

    @Nested
    @DisplayName("reward mapping tests")
    class RewardMappingTests {

        @Test
        @DisplayName("reward fields (type, name, quantity, level) should be mapped accurately across different types")
        void rewardMapping_shouldCorrectlyMapAllRewardFields() {
            AlchemyRecipeRequestDTO dto = new AlchemyRecipeRequestDTO();
            dto.setRewardType(RecipeRewardType.GIVE_EQUIPMENT);
            dto.setRewardName("Bâton d'Archimage");
            dto.setRewardQuantity(1);
            dto.setRewardLevel(5);

            AlchemyRecipe entity = mapper.toEntity(dto);

            assertThat(entity.getRewardType()).isEqualTo(RecipeRewardType.GIVE_EQUIPMENT);
            assertThat(entity.getRewardName()).isEqualTo("Bâton d'Archimage");
            assertThat(entity.getRewardQuantity()).isEqualTo(1);
            assertThat(entity.getRewardLevel()).isEqualTo(5);

            // Update to another reward type
            dto.setRewardType(RecipeRewardType.UNLOCK_FEATURE);
            dto.setRewardName("Chambre de Fusion");
            dto.setRewardQuantity(1);
            dto.setRewardLevel(1);

            mapper.updateEntity(dto, entity);

            assertThat(entity.getRewardType()).isEqualTo(RecipeRewardType.UNLOCK_FEATURE);
            assertThat(entity.getRewardName()).isEqualTo("Chambre de Fusion");
            assertThat(entity.getRewardQuantity()).isEqualTo(1);
            assertThat(entity.getRewardLevel()).isEqualTo(1);
        }
    }
}
