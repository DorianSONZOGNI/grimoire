package generation.grimoire.dto.personnage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PersonnageDTOTest {

    @Test
    @DisplayName("PersonnageRequestDTO has correct default values")
    void personnageRequestDTO_defaults() {
        PersonnageRequestDTO dto = new PersonnageRequestDTO();

        assertThat(dto.getHealthMax()).isEqualTo(100);
        assertThat(dto.getManaMax()).isEqualTo(100);
        assertThat(dto.getPower()).isEqualTo(10);
        assertThat(dto.getStrength()).isEqualTo(10);
        assertThat(dto.getArmor()).isEqualTo(5);
        assertThat(dto.getResistance()).isEqualTo(5);
        assertThat(dto.getSpeed()).isEqualTo(1);
        assertThat(dto.getCrit()).isEqualTo(5);
        assertThat(dto.getRegenHp()).isEqualTo(2);
        assertThat(dto.getRegenMana()).isEqualTo(4);
        assertThat(dto.getVoieLevel()).isEqualTo(1);
        assertThat(dto.getExperience()).isEqualTo(0);
        assertThat(dto.getSpiritualiteLevel()).isEqualTo(1);
        assertThat(dto.getSpiritualiteExperience()).isEqualTo(0);
    }

    @Test
    @DisplayName("PersonnageResponseDTO getters and setters work properly")
    void personnageResponseDTO_settersAndGetters() {
        PersonnageResponseDTO dto = new PersonnageResponseDTO();
        dto.setId(10L);
        dto.setName("Mage");
        dto.setOwnerUsername("merlin");
        dto.setHealthMax(120);
        dto.setManaMax(200);
        dto.setTotalHealthMax(150);
        dto.setTotalManaMax(250);
        dto.setTotalPower(40);
        dto.setTotalStrength(12);
        dto.setTotalArmor(20);
        dto.setTotalResistance(35);
        dto.setTotalSpeed(8);
        dto.setTotalCrit(15);
        dto.setTotalRegenHp(5);
        dto.setTotalRegenMana(10);
        dto.setVoieLevel(4);
        dto.setExperience(12500);
        dto.setCurrentLevelXp(2500);
        dto.setNextLevelXp(12500);
        dto.setSpiritualiteLevel(3);
        dto.setSpiritualiteExperience(900);
        dto.setCurrentLevelSpiritXp(300);
        dto.setNextLevelSpiritXp(900);

        PersonnageResponseDTO.VoieRef voieRef = new PersonnageResponseDTO.VoieRef();
        voieRef.setId(1L);
        voieRef.setNom("Raison");
        dto.setVoie(voieRef);

        PersonnageResponseDTO.SpiritualiteRef spiritRef = new PersonnageResponseDTO.SpiritualiteRef();
        spiritRef.setId(2L);
        spiritRef.setNom("Esprit");
        dto.setSpiritualite(spiritRef);

        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getName()).isEqualTo("Mage");
        assertThat(dto.getOwnerUsername()).isEqualTo("merlin");
        assertThat(dto.getVoie().getNom()).isEqualTo("Raison");
        assertThat(dto.getSpiritualite().getNom()).isEqualTo("Esprit");
        assertThat(dto.getTotalPower()).isEqualTo(40);
    }

    @Test
    @DisplayName("PersonnageSummaryDTO getters and setters work properly")
    void personnageSummaryDTO_settersAndGetters() {
        PersonnageSummaryDTO summary = new PersonnageSummaryDTO();
        summary.setId(5L);
        summary.setName("Rogue");
        summary.setOwnerUsername("shadow");
        summary.setLevel(3);
        summary.setAvatarUrl("avatar.png");
        summary.setHealthCurrent(80);
        summary.setHealthMax(100);
        summary.setVoieName("Trahison");
        summary.setSpiritualiteName("Ténèbres");

        assertThat(summary.getId()).isEqualTo(5L);
        assertThat(summary.getName()).isEqualTo("Rogue");
        assertThat(summary.getOwnerUsername()).isEqualTo("shadow");
        assertThat(summary.getLevel()).isEqualTo(3);
        assertThat(summary.getAvatarUrl()).isEqualTo("avatar.png");
        assertThat(summary.getHealthCurrent()).isEqualTo(80);
        assertThat(summary.getHealthMax()).isEqualTo(100);
        assertThat(summary.getVoieName()).isEqualTo("Trahison");
        assertThat(summary.getSpiritualiteName()).isEqualTo("Ténèbres");
    }
}
