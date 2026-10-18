package generation.grimoire.controller;

import generation.grimoire.dto.personnage.PersonnageRequestDTO;
import generation.grimoire.dto.personnage.PersonnageResponseDTO;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.mapper.PersonnageMapper;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.SpiritualiteRepository;
import generation.grimoire.repository.VoieRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.service.PersonnageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PersonnageControllerTest {

    @Mock
    private PersonnageService personnageService;
    @Mock
    private PersonnageRepository personnageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private VoieRepository voieRepository;
    @Mock
    private SpiritualiteRepository spiritualiteRepository;
    @Mock
    private PersonnageMapper personnageMapper;
    @Mock
    private Authentication authentication;

    private PersonnageController controller;

    @BeforeEach
    void setUp() {
        controller = new PersonnageController(
                personnageService,
                personnageRepository,
                userRepository,
                voieRepository,
                spiritualiteRepository,
                personnageMapper
        );
    }

    private void mockAuth(String username, String role) {
        lenient().when(authentication.getName()).thenReturn(username);
        lenient().doReturn(Collections.singletonList(new SimpleGrantedAuthority(role)))
                .when(authentication).getAuthorities();
    }

    // ── getAllPersonnages ──────────────────────────────────────

    @Test
    @DisplayName("getAllPersonnages returns 401 when principal is null")
    void getAllPersonnages_nullPrincipal_returnsUnauthorized() {
        ResponseEntity<List<PersonnageResponseDTO>> response = controller.getAllPersonnages(null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("getAllPersonnages returns user's characters mapped to DTOs")
    void getAllPersonnages_authenticated_returnsList() {
        mockAuth("alice", "ROLE_USER");
        Personnage p = new Personnage();
        p.setId(1L);
        p.setName("Aria");
        AppUser user = new AppUser();
        user.setUsername("alice");
        p.setUser(user);

        PersonnageResponseDTO dto = new PersonnageResponseDTO();
        dto.setId(1L);
        dto.setName("Aria");

        when(personnageRepository.findByUser_Username("alice")).thenReturn(List.of(p));
        when(personnageMapper.toResponse(p)).thenReturn(dto);

        ResponseEntity<List<PersonnageResponseDTO>> response = controller.getAllPersonnages(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).getOwnerUsername()).isEqualTo("alice");
    }

    // ── getLimit ───────────────────────────────────────────────

    @Test
    @DisplayName("getLimit returns 401 when principal is null")
    void getLimit_nullPrincipal_returnsUnauthorized() {
        ResponseEntity<Map<String, Integer>> response = controller.getLimit(null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("getLimit returns 401 when user not found in repository")
    void getLimit_userNotFound_returnsUnauthorized() {
        when(authentication.getName()).thenReturn("ghost");
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Integer>> response = controller.getLimit(authentication);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("getLimit returns correct max and current for standard user")
    void getLimit_standardUser_returnsUserLimit() {
        mockAuth("bob", "ROLE_USER");
        AppUser user = new AppUser();
        user.setUsername("bob");
        user.setMaxCharacters(4);
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(user));
        when(personnageRepository.findByUser_Username("bob")).thenReturn(List.of(new Personnage()));

        ResponseEntity<Map<String, Integer>> response = controller.getLimit(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("maxCharacters", 4);
        assertThat(response.getBody()).containsEntry("currentCharacters", 1);
    }

    @Test
    @DisplayName("getLimit returns 999 max for admin")
    void getLimit_adminUser_returns999Max() {
        mockAuth("admin", "ROLE_ADMIN");
        AppUser user = new AppUser();
        user.setUsername("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        when(personnageRepository.findByUser_Username("admin")).thenReturn(Collections.emptyList());

        ResponseEntity<Map<String, Integer>> response = controller.getLimit(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("maxCharacters", 999);
        assertThat(response.getBody()).containsEntry("currentCharacters", 0);
    }

    // ── getAllAdmin ────────────────────────────────────────────

    @Test
    @DisplayName("getAllAdmin returns 401 when principal is null")
    void getAllAdmin_nullPrincipal_returnsUnauthorized() {
        ResponseEntity<List<PersonnageResponseDTO>> response = controller.getAllAdmin(null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("getAllAdmin returns 403 when user is not admin")
    void getAllAdmin_nonAdmin_returnsForbidden() {
        mockAuth("user", "ROLE_USER");

        ResponseEntity<List<PersonnageResponseDTO>> response = controller.getAllAdmin(authentication);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("getAllAdmin returns all characters when user is admin")
    void getAllAdmin_admin_returnsAll() {
        mockAuth("admin", "ROLE_ADMIN");
        Personnage p = new Personnage();
        p.setId(10L);
        when(personnageRepository.findAll()).thenReturn(List.of(p));
        when(personnageMapper.toResponse(p)).thenReturn(new PersonnageResponseDTO());

        ResponseEntity<List<PersonnageResponseDTO>> response = controller.getAllAdmin(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // ── createOrUpdate ─────────────────────────────────────────

    @Test
    @DisplayName("createOrUpdate returns 401 when principal is null")
    void createOrUpdate_nullPrincipal_returnsUnauthorized() {
        ResponseEntity<Map<String, Object>> response = controller.createOrUpdate(new PersonnageRequestDTO(), null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("createOrUpdate returns 400 when creating without Voie or Spiritualite")
    void createOrUpdate_createMissingVoieOrSpirit_returnsBadRequest() {
        mockAuth("alice", "ROLE_USER");
        PersonnageRequestDTO dto = new PersonnageRequestDTO();
        dto.setName("Newbie");
        dto.setVoieId(null);
        dto.setSpiritualiteId(1L);

        ResponseEntity<Map<String, Object>> response = controller.createOrUpdate(dto, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "Une Voie et une Spiritualité sont obligatoires à la création.");
    }

    @Test
    @DisplayName("createOrUpdate returns 400 when character limit reached")
    void createOrUpdate_limitReached_returnsBadRequest() {
        mockAuth("alice", "ROLE_USER");
        AppUser user = new AppUser();
        user.setUsername("alice");
        user.setMaxCharacters(2);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(personnageRepository.findByUser_Username("alice")).thenReturn(List.of(new Personnage(), new Personnage()));

        PersonnageRequestDTO dto = new PersonnageRequestDTO();
        dto.setName("ThirdGuy");
        dto.setVoieId(1L);
        dto.setSpiritualiteId(2L);

        ResponseEntity<Map<String, Object>> response = controller.createOrUpdate(dto, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("message").toString()).contains("Limite de personnages atteinte");
    }

    @Test
    @DisplayName("createOrUpdate creates character successfully")
    void createOrUpdate_createNew_success() {
        mockAuth("alice", "ROLE_USER");
        AppUser user = new AppUser();
        user.setUsername("alice");
        user.setMaxCharacters(3);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(personnageRepository.findByUser_Username("alice")).thenReturn(Collections.emptyList());

        Voie voie = new Voie();
        voie.setId(1L);
        voie.setNom("Raison");
        when(voieRepository.findById(1L)).thenReturn(Optional.of(voie));

        Spiritualite spirit = new Spiritualite();
        spirit.setId(2L);
        spirit.setNom("Esprit");
        when(spiritualiteRepository.findById(2L)).thenReturn(Optional.of(spirit));

        Personnage saved = new Personnage();
        saved.setId(100L);
        saved.setName("Hero");
        saved.setVoie(voie);
        saved.setSpiritualite(spirit);
        saved.setUser(user);
        when(personnageService.save(any(Personnage.class))).thenReturn(saved);

        PersonnageResponseDTO responseDto = new PersonnageResponseDTO();
        responseDto.setId(100L);
        responseDto.setName("Hero");
        when(personnageMapper.toResponse(saved)).thenReturn(responseDto);

        PersonnageRequestDTO dto = new PersonnageRequestDTO();
        dto.setName("Hero");
        dto.setVoieId(1L);
        dto.setSpiritualiteId(2L);

        ResponseEntity<Map<String, Object>> response = controller.createOrUpdate(dto, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("message").toString()).contains("créé avec succès");
        assertThat(response.getBody()).containsKey("personnage");
    }

    @Test
    @DisplayName("createOrUpdate returns 403 when updating character owned by another user and not admin")
    void createOrUpdate_updateNotOwnerAndNotAdmin_returnsForbidden() {
        mockAuth("bob", "ROLE_USER");
        Personnage existing = new Personnage();
        existing.setId(5L);
        AppUser otherUser = new AppUser();
        otherUser.setUsername("alice");
        existing.setUser(otherUser);

        when(personnageService.existsById(5L)).thenReturn(true);
        when(personnageService.findByIdOrThrow(5L)).thenReturn(existing);

        PersonnageRequestDTO dto = new PersonnageRequestDTO();
        dto.setId(5L);
        dto.setName("StolenHero");

        ResponseEntity<Map<String, Object>> response = controller.createOrUpdate(dto, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("createOrUpdate updates character successfully when owner")
    void createOrUpdate_updateAsOwner_success() {
        mockAuth("alice", "ROLE_USER");
        Personnage existing = new Personnage();
        existing.setId(5L);
        AppUser user = new AppUser();
        user.setUsername("alice");
        existing.setUser(user);

        when(personnageService.existsById(5L)).thenReturn(true);
        when(personnageService.findByIdOrThrow(5L)).thenReturn(existing);
        when(personnageService.save(any(Personnage.class))).thenReturn(existing);

        PersonnageResponseDTO responseDto = new PersonnageResponseDTO();
        responseDto.setId(5L);
        when(personnageMapper.toResponse(existing)).thenReturn(responseDto);

        PersonnageRequestDTO dto = new PersonnageRequestDTO();
        dto.setId(5L);
        dto.setName("UpdatedName");

        ResponseEntity<Map<String, Object>> response = controller.createOrUpdate(dto, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("message").toString()).contains("mis à jour avec succès");
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    @DisplayName("delete returns 401 when principal is null")
    void delete_nullPrincipal_returnsUnauthorized() {
        ResponseEntity<String> response = controller.delete(1L, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("delete returns 403 when non-admin deletes someone else's character")
    void delete_notOwner_returnsForbidden() {
        mockAuth("bob", "ROLE_USER");
        Personnage existing = new Personnage();
        existing.setId(1L);
        AppUser alice = new AppUser();
        alice.setUsername("alice");
        existing.setUser(alice);
        when(personnageService.findByIdOrThrow(1L)).thenReturn(existing);

        ResponseEntity<String> response = controller.delete(1L, authentication);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("delete deletes character and returns 200 when owner")
    void delete_owner_deletesSuccessfully() {
        mockAuth("alice", "ROLE_USER");
        Personnage existing = new Personnage();
        existing.setId(1L);
        AppUser alice = new AppUser();
        alice.setUsername("alice");
        existing.setUser(alice);

        when(personnageService.findByIdOrThrow(1L)).thenReturn(existing);
        when(personnageService.existsById(1L)).thenReturn(true);

        ResponseEntity<String> response = controller.delete(1L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("Personnage supprimé.");
        verify(personnageService).deleteById(1L);
    }

    @Test
    @DisplayName("delete returns 404 when character does not exist")
    void delete_notFound_returns404() {
        mockAuth("admin", "ROLE_ADMIN");
        Personnage existing = new Personnage();
        existing.setId(99L);
        when(personnageService.findByIdOrThrow(99L)).thenReturn(existing);
        when(personnageService.existsById(99L)).thenReturn(false);

        ResponseEntity<String> response = controller.delete(99L, authentication);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
