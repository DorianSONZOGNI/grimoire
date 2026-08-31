package generation.grimoire.service;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.repository.PersonnageRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PersonnageServiceTest {

    @Mock
    private PersonnageRepository personnageRepository;

    @InjectMocks
    private PersonnageService personnageService;

    private Personnage dummyPersonnage;

    @BeforeEach
    void setUp() {
        dummyPersonnage = new Personnage();
        dummyPersonnage.setId(1L);
        dummyPersonnage.setName("Hero");
    }

    @Test
    void findByIdOrThrow_shouldReturnPersonnage_whenExists() {
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(dummyPersonnage));

        Personnage result = personnageService.findByIdOrThrow(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(personnageRepository).findById(1L);
    }

    @Test
    void findByIdOrThrow_shouldThrowEntityNotFoundException_whenNotExists() {
        when(personnageRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personnageService.findByIdOrThrow(99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Personnage non trouvé : 99");

        verify(personnageRepository).findById(99L);
    }

    @Test
    void findAll_shouldReturnListOfPersonnages() {
        when(personnageRepository.findAll()).thenReturn(List.of(dummyPersonnage));

        List<Personnage> result = personnageService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Hero");
        verify(personnageRepository).findAll();
    }

    @Test
    void save_shouldReturnSavedPersonnage() {
        when(personnageRepository.save(any(Personnage.class))).thenReturn(dummyPersonnage);

        Personnage result = personnageService.save(dummyPersonnage);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Hero");
        verify(personnageRepository).save(dummyPersonnage);
    }

    @Test
    void deleteById_shouldDelegateToRepository() {
        doNothing().when(personnageRepository).deleteById(1L);

        personnageService.deleteById(1L);

        verify(personnageRepository).deleteById(1L);
    }

    @Test
    void existsById_shouldReturnTrue_whenExists() {
        when(personnageRepository.existsById(1L)).thenReturn(true);

        boolean result = personnageService.existsById(1L);

        assertThat(result).isTrue();
        verify(personnageRepository).existsById(1L);
    }

    @Test
    void existsById_shouldReturnFalse_whenNotExists() {
        when(personnageRepository.existsById(99L)).thenReturn(false);

        boolean result = personnageService.existsById(99L);

        assertThat(result).isFalse();
        verify(personnageRepository).existsById(99L);
    }
}
