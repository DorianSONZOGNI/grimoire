package generation.grimoire.model.pve;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SpellAvailabilityTest {

    @Test
    void shouldCreateAvailable() {
        SpellAvailability sa = SpellAvailability.available(10L);
        
        assertThat(sa.getSpellId()).isEqualTo(10L);
        assertThat(sa.isCastable()).isTrue();
        assertThat(sa.getReason()).isNull();
        assertThat(sa.getTooltip()).isNull();
    }

    @Test
    void shouldCreateBlocked() {
        SpellAvailability sa = SpellAvailability.blocked(10L, "RESOURCE", "Not enough mana");
        
        assertThat(sa.getSpellId()).isEqualTo(10L);
        assertThat(sa.isCastable()).isFalse();
        assertThat(sa.getReason()).isEqualTo("RESOURCE");
        assertThat(sa.getTooltip()).isEqualTo("Not enough mana");
    }

    @Test
    void shouldTestGettersAndSetters() {
        SpellAvailability sa = new SpellAvailability();
        sa.setSpellId(5L);
        sa.setCastable(true);
        sa.setReason("TEST");
        sa.setTooltip("Tooltip");
        
        assertThat(sa.getSpellId()).isEqualTo(5L);
        assertThat(sa.isCastable()).isTrue();
        assertThat(sa.getReason()).isEqualTo("TEST");
        assertThat(sa.getTooltip()).isEqualTo("Tooltip");
    }
}
