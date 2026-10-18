package generation.grimoire.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;

@SuppressWarnings("null")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("IllegalArgumentException doit retourner 400 BAD REQUEST avec le message de l'exception")
    void handleBadRequest_devraitRetourner400AvecMessage() {
        // Given
        IllegalArgumentException exception = new IllegalArgumentException("Paramètre invalide");

        // When
        ResponseEntity<Map<String, String>> response = handler.handleBadRequest(exception);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .isNotNull()
                .containsEntry("error", "Paramètre invalide");
    }

    @Test
    @DisplayName("NoSuchElementException doit retourner 404 NOT FOUND avec message fixe")
    void handleNotFound_devraitRetourner404() {
        // Given
        NoSuchElementException exception = new NoSuchElementException("Entité absente");

        // When
        ResponseEntity<Map<String, String>> response = handler.handleNotFound(exception);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody())
                .isNotNull()
                .containsEntry("error", "Ressource introuvable");
    }

    @Test
    @DisplayName("NoResourceFoundException doit retourner 404 NOT FOUND avec le chemin de ressource")
    void handleNoResourceFound_devraitRetourner404AvecChemin() {
        // Given
        NoResourceFoundException exception = new NoResourceFoundException(HttpMethod.GET, "static/js/app.js");

        // When
        ResponseEntity<Map<String, String>> response = handler.handleNoResourceFound(exception);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody())
                .isNotNull()
                .containsEntry("error", "Fichier introuvable: static/js/app.js");
    }

    @Test
    @DisplayName("AccessDeniedException doit retourner 403 FORBIDDEN avec message fixe")
    void handleAccessDenied_devraitRetourner403() {
        // Given
        AccessDeniedException exception = new AccessDeniedException("Forbidden");

        // When
        ResponseEntity<Map<String, String>> response = handler.handleAccessDenied(exception);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody())
                .isNotNull()
                .containsEntry("error", "Accès interdit");
    }

    @Test
    @DisplayName("RuntimeException doit retourner 500 INTERNAL SERVER ERROR avec le nom de classe et message")
    void handleRuntime_devraitRetourner500AvecDetails() {
        // Given
        IllegalStateException exception = new IllegalStateException("État invalide");

        // When
        ResponseEntity<Map<String, String>> response = handler.handleRuntime(exception);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody())
                .isNotNull()
                .containsEntry("error", "Erreur interne du serveur: [IllegalStateException] État invalide");
    }

    @Test
    @DisplayName("Exception générique doit retourner 500 INTERNAL SERVER ERROR avec le nom de classe et message")
    void handleGeneric_devraitRetourner500AvecDetails() {
        // Given
        Exception exception = new Exception("Erreur critique non gérée");

        // When
        ResponseEntity<Map<String, String>> response = handler.handleGeneric(exception);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody())
                .isNotNull()
                .containsEntry("error", "Erreur interne du serveur: [Exception] Erreur critique non gérée");
    }
}
