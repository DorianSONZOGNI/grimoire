package generation.grimoire.mapper;

import generation.grimoire.dto.equipment.EquipmentRequestDTO;
import generation.grimoire.dto.equipment.EquipmentResponseDTO;
import generation.grimoire.dto.equipment.EquipmentShopDTO;
import generation.grimoire.entity.Equipment;
import generation.grimoire.enumeration.ConsumableCategory;
import generation.grimoire.enumeration.EquipmentEffectType;
import generation.grimoire.enumeration.EquipmentRarity;
import generation.grimoire.enumeration.EquipmentSlot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EquipmentMapperTest {

    private EquipmentMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = Mappers.getMapper(EquipmentMapper.class);
    }

    private Equipment createSampleEquipment() {
        Equipment e = new Equipment();
        e.setId(101L);
        e.setName("Lame de l'Ombre");
        e.setSlot(EquipmentSlot.ARME_DROITE);
        e.setRarity(EquipmentRarity.EPIQUE);
        e.setSpecialEffect(EquipmentEffectType.LIFESTEAL);
        e.setSpecialEffectValue(15);
        e.setBonusHealthMax(50);
        e.setBonusManaMax(30);
        e.setBonusPower(20);
        e.setBonusStrength(15);
        e.setBonusArmor(10);
        e.setBonusResistance(8);
        e.setBonusSpeed(5);
        e.setBonusCrit(12);
        e.setRegenHealthPerTurn(3);
        e.setRegenManaPerTurn(2);
        e.setBaseWeight(4.5);
        e.setConsumableHpPercent(0);
        e.setConsumableManaPercent(0);
        e.setConsumableMissingHpPercent(0);
        e.setConsumableMissingManaPercent(0);
        e.setConsumableBonusXpPercent(0);
        e.setConsumableBonusMagicalDamagePercent(0);
        e.setConsumableBonusPhysicalDamagePercent(0);
        e.setConsumableBonusArmorFlat(0);
        e.setConsumableBonusResistanceFlat(0);
        e.setConsumableDurationTurns(0);
        e.setConsumableCategory(ConsumableCategory.AUTRE);
        e.setTemplate(true);
        e.setAvailableInShop(true);
        e.setRequiredSecret("SECRET_SHADOW");
        e.setRequiredSecretLevel(3);
        Map<String, Integer> anomalies = new HashMap<>();
        anomalies.put("Écho Temporel", 2);
        e.setPriceAnomalies(anomalies);
        return e;
    }

    @Nested
    @DisplayName("toResponse tests")
    class ToResponseTests {

        @Test
        @DisplayName("toResponse should correctly map full equipment entity to response DTO")
        void toResponse_shouldMapAllFields() {
            Equipment entity = createSampleEquipment();

            EquipmentResponseDTO dto = mapper.toResponse(entity);

            assertThat(dto).isNotNull();
            assertThat(dto.getId()).isEqualTo(101L);
            assertThat(dto.getName()).isEqualTo("Lame de l'Ombre");
            assertThat(dto.getSlot()).isEqualTo("ARME_DROITE");
            assertThat(dto.getRarity()).isEqualTo("EPIQUE");
            assertThat(dto.getSpecialEffect()).isEqualTo("LIFESTEAL");
            assertThat(dto.getSpecialEffectValue()).isEqualTo(15);
            assertThat(dto.getBonusHealthMax()).isEqualTo(50);
            assertThat(dto.getBonusManaMax()).isEqualTo(30);
            assertThat(dto.getBonusPower()).isEqualTo(20);
            assertThat(dto.getBonusStrength()).isEqualTo(15);
            assertThat(dto.getBonusArmor()).isEqualTo(10);
            assertThat(dto.getBonusResistance()).isEqualTo(8);
            assertThat(dto.getBonusSpeed()).isEqualTo(5);
            assertThat(dto.getBonusCrit()).isEqualTo(12);
            assertThat(dto.getRegenHealthPerTurn()).isEqualTo(3);
            assertThat(dto.getRegenManaPerTurn()).isEqualTo(2);
            assertThat(dto.getBaseWeight()).isEqualTo(4.5);
            assertThat(dto.getWeight()).isEqualTo(entity.calculateWeight());
            assertThat(dto.isTemplate()).isTrue();
            assertThat(dto.isAvailableInShop()).isTrue();
            assertThat(dto.getRequiredSecret()).isEqualTo("SECRET_SHADOW");
            assertThat(dto.getRequiredSecretLevel()).isEqualTo(3);
            assertThat(dto.getPriceAnomalies()).containsEntry("Écho Temporel", 2);
            assertThat(dto.getConsumableCategory()).isEqualTo("AUTRE");
        }

        @Test
        @DisplayName("toResponse should handle null enum values gracefully")
        void toResponse_nullEnums_shouldHandleSafely() {
            Equipment entity = new Equipment();
            entity.setId(1L);
            entity.setSlot(null);
            entity.setRarity(null);
            entity.setSpecialEffect(null);
            entity.setConsumableCategory(null);

            EquipmentResponseDTO dto = mapper.toResponse(entity);

            assertThat(dto).isNotNull();
            assertThat(dto.getSlot()).isNull();
            assertThat(dto.getRarity()).isNull();
            assertThat(dto.getSpecialEffect()).isNull();
            assertThat(dto.getConsumableCategory()).isEqualTo("AUTRE");
        }

        @Test
        @DisplayName("toResponse should return null when input is null")
        void toResponse_nullInput_shouldReturnNull() {
            assertThat(mapper.toResponse(null)).isNull();
        }
    }

    @Nested
    @DisplayName("toShopDto tests")
    class ToShopDtoTests {

        @Test
        @DisplayName("toShopDto should map consumable equipment correctly")
        void toShopDto_consumableItem_shouldMapCorrectly() {
            Equipment entity = new Equipment();
            entity.setId(201L);
            entity.setName("Potion de Vie Majeure");
            entity.setSlot(EquipmentSlot.CONSOMMABLE);
            entity.setRarity(EquipmentRarity.RARE);
            entity.setSpecialEffect(EquipmentEffectType.NONE);
            entity.setBaseWeight(0.5);
            entity.setConsumableHpPercent(50);
            entity.setConsumableManaPercent(10);
            entity.setConsumableMissingHpPercent(20);
            entity.setConsumableMissingManaPercent(5);
            entity.setConsumableBonusXpPercent(15);
            entity.setConsumableBonusMagicalDamagePercent(0);
            entity.setConsumableBonusPhysicalDamagePercent(0);
            entity.setConsumableBonusArmorFlat(5);
            entity.setConsumableBonusResistanceFlat(5);
            entity.setConsumableDurationTurns(3);
            entity.setConsumableCategory(ConsumableCategory.POTION_ROUGE);
            entity.setAvailableInShop(true);
            entity.setRequiredSecret("ALCH_1");
            entity.setRequiredSecretLevel(1);

            EquipmentShopDTO dto = mapper.toShopDto(entity);

            assertThat(dto).isNotNull();
            assertThat(dto.getId()).isEqualTo(201L);
            assertThat(dto.getName()).isEqualTo("Potion de Vie Majeure");
            assertThat(dto.getSlot()).isEqualTo(EquipmentSlot.CONSOMMABLE);
            assertThat(dto.getRarity()).isEqualTo(EquipmentRarity.RARE);
            assertThat(dto.getSpecialEffect()).isEqualTo(EquipmentEffectType.NONE);
            assertThat(dto.getBaseWeight()).isEqualTo(0.5);
            assertThat(dto.getWeight()).isEqualTo(entity.calculateWeight());
            assertThat(dto.isConsumable()).isTrue();
            assertThat(dto.getConsumableCategory()).isEqualTo("POTION_ROUGE");
            assertThat(dto.getConsumableHpPercent()).isEqualTo(50);
            assertThat(dto.getConsumableManaPercent()).isEqualTo(10);
            assertThat(dto.getConsumableMissingHpPercent()).isEqualTo(20);
            assertThat(dto.getConsumableMissingManaPercent()).isEqualTo(5);
            assertThat(dto.getConsumableBonusXpPercent()).isEqualTo(15);
            assertThat(dto.getConsumableBonusArmorFlat()).isEqualTo(5);
            assertThat(dto.getConsumableBonusResistanceFlat()).isEqualTo(5);
            assertThat(dto.getConsumableDurationTurns()).isEqualTo(3);
            assertThat(dto.isAvailableInShop()).isTrue();
            assertThat(dto.getRequiredSecret()).isEqualTo("ALCH_1");
            assertThat(dto.getRequiredSecretLevel()).isEqualTo(1);
        }

        @Test
        @DisplayName("toShopDto should mark non-consumable equipment with isConsumable false")
        void toShopDto_nonConsumableItem_shouldSetIsConsumableFalse() {
            Equipment entity = createSampleEquipment();

            EquipmentShopDTO dto = mapper.toShopDto(entity);

            assertThat(dto).isNotNull();
            assertThat(dto.isConsumable()).isFalse();
            assertThat(dto.getSlot()).isEqualTo(EquipmentSlot.ARME_DROITE);
            assertThat(dto.getRarity()).isEqualTo(EquipmentRarity.EPIQUE);
        }

        @Test
        @DisplayName("toShopDto should fallback to AUTRE when consumableCategory is null")
        void toShopDto_nullConsumableCategory_shouldDefaultToAutre() {
            Equipment entity = new Equipment();
            entity.setSlot(EquipmentSlot.ANNEAU);
            entity.setConsumableCategory(null);

            EquipmentShopDTO dto = mapper.toShopDto(entity);

            assertThat(dto).isNotNull();
            assertThat(dto.getConsumableCategory()).isEqualTo("AUTRE");
        }

        @Test
        @DisplayName("toShopDto should return null when input is null")
        void toShopDto_nullInput_shouldReturnNull() {
            assertThat(mapper.toShopDto(null)).isNull();
        }
    }

    @Nested
    @DisplayName("updateEntity tests")
    class UpdateEntityTests {

        @Test
        @DisplayName("updateEntity should update entity attributes while preserving ignored fields")
        void updateEntity_shouldUpdateFieldsAndIgnoreRestricted() {
            Equipment entity = createSampleEquipment();
            Long originalId = entity.getId();
            boolean originalTemplate = entity.isTemplate();

            EquipmentRequestDTO dto = new EquipmentRequestDTO();
            dto.setId(999L); // should be ignored
            dto.setName("Lame Divine Renommée");
            dto.setSlot(EquipmentSlot.ARME_DEUX_MAINS);
            dto.setRarity(EquipmentRarity.LEGENDAIRE);
            dto.setSpecialEffect(EquipmentEffectType.EXECUTION);
            dto.setSpecialEffectValue(25);
            dto.setBonusHealthMax(100);
            dto.setBonusManaMax(80);
            dto.setBonusPower(45);
            dto.setBonusStrength(40);
            dto.setBonusArmor(25);
            dto.setBonusResistance(20);
            dto.setBonusSpeed(10);
            dto.setBonusCrit(20);
            dto.setRegenHealthPerTurn(7);
            dto.setRegenManaPerTurn(6);
            dto.setBaseWeight(8.0);
            dto.setAvailableInShop(false);
            dto.setRequiredSecret("SECRET_DIVINE");
            dto.setRequiredSecretLevel(5);
            Map<String, Integer> newAnomalies = new HashMap<>();
            newAnomalies.put("Poussière Stellaire", 10);
            dto.setPriceAnomalies(newAnomalies);

            mapper.updateEntity(dto, entity);

            // Ignored fields preserved
            assertThat(entity.getId()).isEqualTo(originalId);
            assertThat(entity.isTemplate()).isEqualTo(originalTemplate);

            // Updated fields
            assertThat(entity.getName()).isEqualTo("Lame Divine Renommée");
            assertThat(entity.getSlot()).isEqualTo(EquipmentSlot.ARME_DEUX_MAINS);
            assertThat(entity.getRarity()).isEqualTo(EquipmentRarity.LEGENDAIRE);
            assertThat(entity.getSpecialEffect()).isEqualTo(EquipmentEffectType.EXECUTION);
            assertThat(entity.getSpecialEffectValue()).isEqualTo(25);
            assertThat(entity.getBonusHealthMax()).isEqualTo(100);
            assertThat(entity.getBonusManaMax()).isEqualTo(80);
            assertThat(entity.getBonusPower()).isEqualTo(45);
            assertThat(entity.getBonusStrength()).isEqualTo(40);
            assertThat(entity.getBonusArmor()).isEqualTo(25);
            assertThat(entity.getBonusResistance()).isEqualTo(20);
            assertThat(entity.getBonusSpeed()).isEqualTo(10);
            assertThat(entity.getBonusCrit()).isEqualTo(20);
            assertThat(entity.getRegenHealthPerTurn()).isEqualTo(7);
            assertThat(entity.getRegenManaPerTurn()).isEqualTo(6);
            assertThat(entity.getBaseWeight()).isEqualTo(8.0);
            assertThat(entity.isAvailableInShop()).isFalse();
            assertThat(entity.getRequiredSecret()).isEqualTo("SECRET_DIVINE");
            assertThat(entity.getRequiredSecretLevel()).isEqualTo(5);
            assertThat(entity.getPriceAnomalies()).containsEntry("Poussière Stellaire", 10);
            assertThat(entity.getPriceAnomalies()).doesNotContainKey("Écho Temporel");
        }

        @Test
        @DisplayName("updateEntity should do nothing if dto is null")
        void updateEntity_nullDto_shouldDoNothing() {
            Equipment entity = createSampleEquipment();
            String originalName = entity.getName();

            mapper.updateEntity(null, entity);

            assertThat(entity.getName()).isEqualTo(originalName);
        }
    }
}
