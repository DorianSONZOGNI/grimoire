package generation.grimoire.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret",
                "fausse_cle_de_test_uniquement_pour_les_tests_unitaires_1234");
        ReflectionTestUtils.setField(Objects.requireNonNull(jwtService), "jwtExpirationMs", 900000L);
    }

    @Test
    void shouldGenerateAndValidateJwt() {
        String username = "testuser";
        String token = jwtService.generateAccessToken(username);

        assertThat(token).isNotBlank();

        boolean isValid = jwtService.validateJwt(token);
        assertThat(isValid).isTrue();

        String extractedUsername = jwtService.getUsernameFromJwt(token);
        assertThat(extractedUsername).isEqualTo(username);
    }

    @Test
    void shouldInvalidateBadToken() {
        boolean isValid = jwtService.validateJwt("invalid_token_string");
        assertThat(isValid).isFalse();
    }
}
