package generation.grimoire.entity.personnage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ActiveShieldTest {

    @Test
    void shouldCreateActiveShieldWithNoArgsConstructorAndSetters() {
        ActiveShield shield = new ActiveShield();
        shield.setAmount(100);
        shield.setDuration(3);
        shield.setSourceName("Aura Protection");

        assertThat(shield.getAmount()).isEqualTo(100);
        assertThat(shield.getDuration()).isEqualTo(3);
        assertThat(shield.getSourceName()).isEqualTo("Aura Protection");
    }

    @Test
    void shouldCreateActiveShieldWithAllArgsConstructor() {
        ActiveShield shield = new ActiveShield(50, 2, "Bouclier Divin");

        assertThat(shield.getAmount()).isEqualTo(50);
        assertThat(shield.getDuration()).isEqualTo(2);
        assertThat(shield.getSourceName()).isEqualTo("Bouclier Divin");
    }

    @Test
    void shouldSupportEqualsAndHashCodeAndToString() {
        ActiveShield s1 = new ActiveShield(75, 1, "Barrière");
        ActiveShield s2 = new ActiveShield(75, 1, "Barrière");
        ActiveShield s3 = new ActiveShield(50, 1, "Barrière");

        assertThat(s1).isEqualTo(s2);
        assertThat(s1.hashCode()).isEqualTo(s2.hashCode());
        assertThat(s1).isNotEqualTo(s3);
        assertThat(s1.toString()).contains("amount=75", "duration=1", "sourceName=Barrière");
    }
}
