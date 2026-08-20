package generation.grimoire.service;

import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.RecipeRewardType;
import generation.grimoire.repository.AlchemyRecipeRepository;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.pve.LootEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlchemyServiceTest {

    @Mock
    private AlchemyRecipeRepository recipeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PersonnageRepository personnageRepository;
    @Mock
    private AnomalieRepository anomalieRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private LootEntryRepository lootEntryRepository;

    @InjectMocks
    private AlchemyService alchemyService;

    private AppUser user;
    private Personnage personnage;
    private AlchemyRecipe recipe;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        user.setUsername("testuser");
        user.setRole("USER");
        user.setMonnaie(100);
        user.setUnlockedSecrets(new HashMap<>());

        personnage = new Personnage();
        personnage.setId(1L);
        personnage.setName("TestCrafter");
        personnage.setUser(user);
        personnage.setSpiritualiteExperience(50);
        personnage.setEquipments(new ArrayList<>());

        recipe = new AlchemyRecipe();
        recipe.setId(1L);
        recipe.setName("Test Recipe");
        recipe.setCostGold(10);
        recipe.setCostSpiritXp(5);
        recipe.setRewardType(RecipeRewardType.GIVE_ANOMALY);
        recipe.setRewardName("Test Anomaly");
        recipe.setRewardQuantity(1);
        recipe.setRewardLevel(1);
    }

    @Test
    @SuppressWarnings("null")
    void craftRecipe_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());

        assertEquals(90, user.getMonnaie());
        assertEquals(45, personnage.getSpiritualiteExperience());
        verify(userRepository).save(Objects.requireNonNull(user));
        verify(personnageRepository).save(Objects.requireNonNull(personnage));
        verify(anomalieRepository).save(any(Anomalie.class));
        assertTrue(result.contains("Vous avez obtenu"));
    }

    @Test
    void craftRecipe_userNotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());
        });

        assertEquals("Utilisateur introuvable", exception.getMessage());
    }

    @Test
    void craftRecipe_recipeNotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());
        });

        assertEquals("Recette introuvable", exception.getMessage());
    }

    @Test
    void craftRecipe_insufficientGold() {
        user.setMonnaie(5);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());
        });

        assertEquals("Fonds insuffisants en Or.", exception.getMessage());
    }

    @Test
    void craftRecipe_insufficientSpiritXp() {
        personnage.setSpiritualiteExperience(2);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());
        });

        assertEquals("Expérience de spiritualité insuffisante pour ce personnage.", exception.getMessage());
    }

    @Test
    @SuppressWarnings({ "null" })
    void craftRecipe_requiresAnomalies_success() {
        recipe.setRequiredAnomalies(Map.of("requiredAnomaly", 1));

        Anomalie requiredAnomaly = new Anomalie();
        requiredAnomaly.setId(1L);
        requiredAnomaly.setName("requiredAnomaly");
        requiredAnomaly.setTemplate(false);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(anomalieRepository.findByOwnerUsername("testuser")).thenReturn(List.of(requiredAnomaly));

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, List.of(1L), new ArrayList<>());

        verify(anomalieRepository).deleteAll(org.mockito.ArgumentMatchers.<Iterable<? extends Anomalie>>any());
        assertTrue(result.contains("Vous avez obtenu"));
    }

    @Test
    void craftRecipe_requiresAnomalies_missing() {
        recipe.setRequiredAnomalies(Map.of("requiredAnomaly", 1));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(anomalieRepository.findByOwnerUsername("testuser")).thenReturn(new ArrayList<>());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, List.of(1L), new ArrayList<>());
        });

        assertTrue(exception.getMessage().contains("Veuillez sélectionner"));
    }

    @Test
    void craftRecipe_unlockFeature_success() {
        recipe.setRewardType(RecipeRewardType.UNLOCK_FEATURE);
        recipe.setRewardName("Secret_A");
        recipe.setRewardLevel(1);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());

        assertEquals(1, user.getUnlockedSecrets().get("Secret_A"));
        verify(userRepository, atLeastOnce()).save(Objects.requireNonNull(user));
        assertTrue(result.contains("Vous avez débloqué le secret"));
    }

    @Test
    void craftRecipe_unlockFeature_alreadyPossessed() {
        recipe.setRewardType(RecipeRewardType.UNLOCK_FEATURE);
        recipe.setRewardName("Secret_A");
        recipe.setRewardLevel(1);
        user.getUnlockedSecrets().put("Secret_A", 1);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());
        });

        assertEquals("Vous possédez déjà ce niveau de secret.", exception.getMessage());
    }

    @Test
    void craftRecipe_unlockFeature_requiresPreviousLevel() {
        recipe.setRewardType(RecipeRewardType.UNLOCK_FEATURE);
        recipe.setRewardName("Secret_A");
        recipe.setRewardLevel(3);
        user.getUnlockedSecrets().put("Secret_A", 1);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());
        });

        assertEquals("Vous devez d'abord débloquer le niveau précédent de ce secret.", exception.getMessage());
    }

    @Test
    @SuppressWarnings({ "null", "unchecked" })
    void craftRecipe_requiresConsumables_success() {
        recipe.setRequiredConsumables(Map.of("Potion", 1));

        generation.grimoire.entity.Equipment consumable = new generation.grimoire.entity.Equipment();
        consumable.setId(10L);
        consumable.setName("Potion");
        consumable.setSlot(generation.grimoire.enumeration.EquipmentSlot.CONSOMMABLE);
        consumable.setTemplate(false);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(equipmentRepository.findByOwnerUsername("testuser")).thenReturn(List.of(consumable));
        when(lootEntryRepository.findByEquipmentId(10L)).thenReturn(new ArrayList<>());

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), List.of(10L));

        verify(equipmentRepository).deleteAll(any(Iterable.class));
        assertTrue(result.contains("Vous avez obtenu"));
    }

    @Test
    void craftRecipe_requiresConsumables_missing() {
        recipe.setRequiredConsumables(Map.of("Potion", 1));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(equipmentRepository.findByOwnerUsername("testuser")).thenReturn(new ArrayList<>());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), List.of(10L));
        });

        assertTrue(exception.getMessage().contains("Veuillez sélectionner"));
    }

    @Test
    @SuppressWarnings({ "null" })
    void craftRecipe_requiresAnomalies_isAdmin() {
        user.setRole("ADMIN");
        recipe.setRequiredAnomalies(Map.of("requiredAnomaly", 1));

        Anomalie requiredAnomaly = new Anomalie();
        requiredAnomaly.setId(1L);
        requiredAnomaly.setName("requiredAnomaly");
        requiredAnomaly.setTemplate(false);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(anomalieRepository.findByOwnerUsername("testuser")).thenReturn(List.of(requiredAnomaly));

        alchemyService.craftRecipe("testuser", 1L, 1L, List.of(1L), new ArrayList<>());

        verify(anomalieRepository).deleteAll(argThat(iterable -> !((Collection<?>) iterable).iterator().hasNext()));
    }

    @Test
    @SuppressWarnings({ "null" })
    void giveReward_giveConsumable() {
        recipe.setRewardType(RecipeRewardType.GIVE_CONSUMABLE);
        recipe.setRewardName("Potion");
        recipe.setRewardQuantity(2);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(equipmentRepository.findFirstByNameAndIsTemplateTrueOrderByIdAsc("Potion")).thenReturn(null);

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());

        verify(equipmentRepository, times(2)).save(any(generation.grimoire.entity.Equipment.class));
        assertTrue(result.contains("Vous avez obtenu 2x Consommable : Potion"));
    }

    @Test
    @SuppressWarnings({ "null" })
    void giveReward_giveEquipment() {
        recipe.setRewardType(RecipeRewardType.GIVE_EQUIPMENT);
        recipe.setRewardName("Epée");
        recipe.setRewardQuantity(1);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(equipmentRepository.findFirstByNameAndIsTemplateTrueOrderByIdAsc("Epée")).thenReturn(null);

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());

        verify(equipmentRepository, times(1)).save(any(generation.grimoire.entity.Equipment.class));
        assertTrue(result.contains("Vous avez obtenu 1x Équipement : Epée"));
    }

    @Test
    @SuppressWarnings({ "null" })
    void giveReward_upgradeAnomaly() {
        recipe.setRewardType(RecipeRewardType.UPGRADE_ANOMALY);
        recipe.setRewardName("Anomalie Magique");
        recipe.setRewardLevel(2);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));
        when(anomalieRepository.findFirstByNameAndIsTemplateTrueOrderByIdAsc("Anomalie Magique")).thenReturn(null);

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());

        verify(anomalieRepository, times(1)).save(any(Anomalie.class));
        assertTrue(result.contains("Vous avez amélioré une anomalie en : Anomalie Magique (Niv. 2)"));
    }

    @Test
    @SuppressWarnings({ "null" })
    void giveReward_giveSpiritXp() {
        recipe.setRewardType(RecipeRewardType.GIVE_SPIRIT_XP);
        recipe.setRewardQuantity(100);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(recipeRepository.findById(1L)).thenReturn(Optional.of(recipe));
        when(personnageRepository.findById(1L)).thenReturn(Optional.of(personnage));

        String result = alchemyService.craftRecipe("testuser", 1L, 1L, new ArrayList<>(), new ArrayList<>());

        assertEquals(145, personnage.getSpiritualiteExperience()); // 50 (initial) - 5 (cost) + 100
        verify(personnageRepository, times(2)).save(any(Personnage.class));
        assertTrue(result.contains("a gagné 100 XP de Spiritualité"));
    }
}
