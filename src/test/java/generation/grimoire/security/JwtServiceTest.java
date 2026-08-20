package generation.grimoire.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
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
