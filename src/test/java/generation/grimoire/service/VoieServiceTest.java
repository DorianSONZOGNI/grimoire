package generation.grimoire.service;

import generation.grimoire.entity.Voie;
import generation.grimoire.repository.VoieRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class VoieServiceTest {

    @Mock
    private VoieRepository voieRepository;

    @InjectMocks
    private VoieService voieService;

    @Test
    void shouldSaveVoie() {
        // Given
        Voie voie = new Voie();
        voie.setId(1L);

        // When
        voieService.saveSpell(voie);

        // Then
        verify(voieRepository, times(1)).save(voie);
    }
}
