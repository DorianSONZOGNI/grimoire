package generation.grimoire.model.pve;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InitiativeEntryTest {

    @Test
    void shouldTestGettersAndSetters() {
        InitiativeEntry entry = new InitiativeEntry();
        entry.setPlayer(true);
        entry.setIndex(2);
        entry.setInitiativeScore(15);
        entry.setSpeedStat(10);
        entry.setTieBreakerRoll(5);

        assertThat(entry.isPlayer()).isTrue();
        assertThat(entry.getIndex()).isEqualTo(2);
        assertThat(entry.getInitiativeScore()).isEqualTo(15);
        assertThat(entry.getSpeedStat()).isEqualTo(10);
        assertThat(entry.getTieBreakerRoll()).isEqualTo(5);
    }
    
    @Test
    void shouldTestAllArgsConstructor() {
        InitiativeEntry entry = new InitiativeEntry(false, 1, 20, 12, 3);
        
        assertThat(entry.isPlayer()).isFalse();
        assertThat(entry.getIndex()).isEqualTo(1);
        assertThat(entry.getInitiativeScore()).isEqualTo(20);
        assertThat(entry.getSpeedStat()).isEqualTo(12);
        assertThat(entry.getTieBreakerRoll()).isEqualTo(3);
    }
}
