package generation.grimoire.model.pve;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MultiCombatSessionTest {

    @Test
    void shouldTestGettersAndSetters() {
        MultiCombatSession session = new MultiCombatSession();
        session.setMultiSessionId("multi-id");
        session.setShortCode("ABCD");
        session.setHostUsername("host");
        session.setHostCharacterIds(List.of(1L, 2L));
        session.setGuestUsername("guest");
        session.setGuestCharacterIds(List.of(3L));
        session.setDungeonId(10L);
        session.setConsumableIds(List.of(5L, 6L));
        session.setStatus(MultiCombatSession.Status.ACTIVE);
        session.setCombatSessionId("combat-id");

        assertThat(session.getMultiSessionId()).isEqualTo("multi-id");
        assertThat(session.getShortCode()).isEqualTo("ABCD");
        assertThat(session.getHostUsername()).isEqualTo("host");
        assertThat(session.getHostCharacterIds()).containsExactly(1L, 2L);
        assertThat(session.getGuestUsername()).isEqualTo("guest");
        assertThat(session.getGuestCharacterIds()).containsExactly(3L);
        assertThat(session.getDungeonId()).isEqualTo(10L);
        assertThat(session.getConsumableIds()).containsExactly(5L, 6L);
        assertThat(session.getStatus()).isEqualTo(MultiCombatSession.Status.ACTIVE);
        assertThat(session.getCombatSessionId()).isEqualTo("combat-id");
        assertThat(session.getCreatedAt()).isNotNull();
        assertThat(session.getLastActivity()).isNotNull();
    }
}
