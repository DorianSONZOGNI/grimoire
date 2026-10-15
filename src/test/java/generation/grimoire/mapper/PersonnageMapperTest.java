package generation.grimoire.mapper;

import generation.grimoire.dto.personnage.PersonnageResponseDTO;
import generation.grimoire.dto.personnage.PersonnageSummaryDTO;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

class PersonnageMapperTest {

    private PersonnageMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = Mappers.getMapper(PersonnageMapper.class);
    }

    @Test
    @DisplayName("toResponse maps entity to PersonnageResponseDTO with base and derived stats")
    void toResponse_shouldMapFieldsCorrectly() {
        Personnage p = new Personnage();
        p.setId(42L);
        p.setName("Valérian");
        p.setHealthMax(150);
        p.setHealthCurrent(120);
        p.setManaMax(80);
        p.setManaCurrent(60);
        p.setPower(25);
        p.setStrength(15);
        p.setArmor(30);
        p.setResistance(20);
        p.setSpeed(7);
        p.setCrit(12);
        p.setRegenHp(3);
        p.setRegenMana(5);
        p.setVoieLevel(4);
        p.setExperience(2600);
        p.setSpiritualiteLevel(2);
        p.setSpiritualiteExperience(150);

        PersonnageResponseDTO dto = mapper.toResponse(p);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(42L);
        assertThat(dto.getName()).isEqualTo("Valérian");
        assertThat(dto.getHealthMax()).isEqualTo(150);
        assertThat(dto.getManaMax()).isEqualTo(80);
        assertThat(dto.getTotalHealthMax()).isEqualTo(150);
        assertThat(dto.getTotalManaMax()).isEqualTo(80);
        assertThat(dto.getTotalPower()).isEqualTo(25);
        assertThat(dto.getTotalStrength()).isEqualTo(15);
        assertThat(dto.getTotalArmor()).isEqualTo(30);
        assertThat(dto.getTotalResistance()).isEqualTo(20);
        assertThat(dto.getTotalSpeed()).isEqualTo(7);
        assertThat(dto.getTotalCrit()).isEqualTo(12);
        assertThat(dto.getTotalRegenHp()).isEqualTo(3);
        assertThat(dto.getTotalRegenMana()).isEqualTo(5);
        assertThat(dto.getVoieLevel()).isEqualTo(4);
        assertThat(dto.getExperience()).isEqualTo(2600);
        assertThat(dto.getSpiritualiteLevel()).isEqualTo(2);
        assertThat(dto.getSpiritualiteExperience()).isEqualTo(150);
    }

    @Test
    @DisplayName("toResponse returns null when input is null")
    void toResponse_nullInput_shouldReturnNull() {
        assertThat(mapper.toResponse(null)).isNull();
    }

    @Test
    @DisplayName("toSummary maps entity to PersonnageSummaryDTO including Voie and Spiritualité names")
    void toSummary_shouldMapSummaryCorrectly() {
        Personnage p = new Personnage();
        p.setId(10L);
        p.setName("Lyra");
        p.setHealthCurrent(90);
        p.setHealthMax(110);
        p.setVoieLevel(4);

        Voie voie = new Voie();
        voie.setNom("Raison");
        p.setVoie(voie);

        Spiritualite spirit = new Spiritualite();
        spirit.setNom("Esprit");
        p.setSpiritualite(spirit);

        PersonnageSummaryDTO summary = mapper.toSummary(p);

        assertThat(summary).isNotNull();
        assertThat(summary.getId()).isEqualTo(10L);
        assertThat(summary.getName()).isEqualTo("Lyra");
        assertThat(summary.getHealthCurrent()).isEqualTo(90);
        assertThat(summary.getHealthMax()).isEqualTo(110);
        assertThat(summary.getLevel()).isEqualTo(4);
        assertThat(summary.getVoieName()).isEqualTo("Raison");
        assertThat(summary.getSpiritualiteName()).isEqualTo("Esprit");
    }

    @Test
    @DisplayName("toSummary returns null when input is null")
    void toSummary_nullInput_shouldReturnNull() {
        assertThat(mapper.toSummary(null)).isNull();
    }
}
