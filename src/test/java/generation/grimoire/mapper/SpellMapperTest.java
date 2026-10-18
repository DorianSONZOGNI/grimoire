package generation.grimoire.mapper;

import generation.grimoire.dto.spell.SpellCreationRequestDTO;
import generation.grimoire.entity.Spell;
import generation.grimoire.enumeration.KarmaAlignment;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.SpellCastingType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpellMapperTest {

    private SpellMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = Mappers.getMapper(SpellMapper.class);
    }

    @Test
    @DisplayName("toEntity maps primitive and simple fields from SpellCreationRequestDTO")
    void toEntity_shouldMapPrimitiveFieldsCorrectly() {
        SpellCreationRequestDTO dto = new SpellCreationRequestDTO();
        dto.setNom("Boule de feu");
        dto.setNiveau(3);
        dto.setDescription("Projette une boule de flammes incandescente.");
        dto.setCastingType(SpellCastingType.CANALISE);
        dto.setManaCost(25);
        dto.setPercentManaCost(10);
        dto.setPercentManaCostSource(Source.CASTER_MANA_CURRENT);
        dto.setHealCost(5);
        dto.setPercentHealCost(2);
        dto.setPercentHealCostSource(Source.CASTER_HEALTH_CURRENT);
        dto.setHeatCost(15);
        dto.setPercentHeatCost(5);
        dto.setHeatGenerated(20);
        dto.setSeedCost(1);
        dto.setChannelingDuration(4);
        dto.setAllowInstantDuringChanneling(false);
        dto.setInspiration(true);
        dto.setKarmaAlignment(KarmaAlignment.OFFENSIVE);

        Spell spell = mapper.toEntity(dto);

        assertThat(spell).isNotNull();
        assertThat(spell.getNom()).isEqualTo("Boule de feu");
        assertThat(spell.getNiveau()).isEqualTo(3);
        assertThat(spell.getDescription()).isEqualTo("Projette une boule de flammes incandescente.");
        assertThat(spell.getCastingType()).isEqualTo(SpellCastingType.CANALISE);
        assertThat(spell.getManaCost()).isEqualTo(25);
        assertThat(spell.getPercentManaCost()).isEqualTo(10);
        assertThat(spell.getPercentManaCostSource()).isEqualTo(Source.CASTER_MANA_CURRENT);
        assertThat(spell.getHealCost()).isEqualTo(5);
        assertThat(spell.getPercentHealCost()).isEqualTo(2);
        assertThat(spell.getPercentHealCostSource()).isEqualTo(Source.CASTER_HEALTH_CURRENT);
        assertThat(spell.getHeatCost()).isEqualTo(15);
        assertThat(spell.getPercentHeatCost()).isEqualTo(5);
        assertThat(spell.getHeatGenerated()).isEqualTo(20);
        assertThat(spell.getSeedCost()).isEqualTo(1);
        assertThat(spell.getChannelingDuration()).isEqualTo(4);
        assertThat(spell.isAllowInstantDuringChanneling()).isFalse();
        assertThat(spell.isInspiration()).isTrue();
        assertThat(spell.getKarmaAlignment()).isEqualTo(KarmaAlignment.OFFENSIVE);
    }

    @Test
    @DisplayName("toEntity explicitly ignores id, voie, spiritualite, mutation, and effects")
    void toEntity_shouldIgnoreLinkedEntitiesAndId() {
        SpellCreationRequestDTO dto = new SpellCreationRequestDTO();
        dto.setId(99L);
        dto.setVoieId(10L);
        dto.setSpiritualiteId(20L);
        dto.setMutationId(30L);

        SpellCreationRequestDTO.EffectCreationDTO effectDTO = new SpellCreationRequestDTO.EffectCreationDTO();
        effectDTO.setDamage(50);
        dto.setEffects(List.of(effectDTO));

        Spell spell = mapper.toEntity(dto);

        assertThat(spell).isNotNull();
        assertThat(spell.getId()).isNull();
        assertThat(spell.getVoie()).isNull();
        assertThat(spell.getSpiritualite()).isNull();
        assertThat(spell.getMutation()).isNull();
        assertThat(spell.getEffects()).isEmpty();
    }

    @Test
    @DisplayName("toEntity returns null when input is null")
    void toEntity_nullInput_shouldReturnNull() {
        assertThat(mapper.toEntity(null)).isNull();
    }
}
