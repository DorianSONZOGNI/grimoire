package generation.grimoire.service;

import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.RecipeRewardType;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.LootEntryRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import generation.grimoire.repository.pve.SalleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RenameCascadeServiceTest {

    @Mock
    private AlchemyService alchemyService;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private DonjonRepository donjonRepository;

    @Mock
    private MonstreRepository monstreRepository;

    @Mock
    private SalleRepository salleRepository;

    @Mock
    private LootEntryRepository lootEntryRepository;

    @InjectMocks
    private RenameCascadeService renameCascadeService;

    @ParameterizedTest
    @NullAndEmptySource
    void cascadeAnomalyRename_whenOldNameIsNullOrEmpty_shouldDoNothing(String oldName) {
        renameCascadeService.cascadeAnomalyRename(oldName, "NewAnomaly");

        verifyNoInteractions(
                alchemyService,
                equipmentRepository,
                donjonRepository,
                monstreRepository,
                salleRepository,
                lootEntryRepository
        );
    }

    @Test
    void cascadeAnomalyRename_whenOldNameEqualsNewName_shouldDoNothing() {
        renameCascadeService.cascadeAnomalyRename("SameAnomaly", "SameAnomaly");

        verifyNoInteractions(
                alchemyService,
                equipmentRepository,
                donjonRepository,
                monstreRepository,
                salleRepository,
                lootEntryRepository
        );
    }

    @Test
    void cascadeAnomalyRename_whenRecipesContainAnomaly_shouldUpdateMapsAndRewardsAndSave() {
        // Recipe 1: GIVE_ANOMALY matching reward + matching requiredAnomalies map
        AlchemyRecipe recipe1 = new AlchemyRecipe();
        recipe1.setRewardType(RecipeRewardType.GIVE_ANOMALY);
        recipe1.setRewardName("OldAnomaly");
        recipe1.setRequiredAnomalies(new HashMap<>());
        recipe1.getRequiredAnomalies().put("OldAnomaly", 3);
        recipe1.getRequiredAnomalies().put("OtherAnomaly", 1);

        // Recipe 2: GIVE_EQUIPMENT reward matching oldName (should not change reward), but matching map
        AlchemyRecipe recipe2 = new AlchemyRecipe();
        recipe2.setRewardType(RecipeRewardType.GIVE_EQUIPMENT);
        recipe2.setRewardName("OldAnomaly");
        recipe2.setRequiredAnomalies(new HashMap<>());
        recipe2.getRequiredAnomalies().put("OldAnomaly", 5);

        // Recipe 3: unrelated recipe (no modification)
        AlchemyRecipe recipe3 = new AlchemyRecipe();
        recipe3.setRewardType(RecipeRewardType.GIVE_ANOMALY);
        recipe3.setRewardName("UnrelatedAnomaly");
        recipe3.setRequiredAnomalies(new HashMap<>());
        recipe3.getRequiredAnomalies().put("UnrelatedAnomaly", 2);

        when(alchemyService.getAllRecipes()).thenReturn(List.of(recipe1, recipe2, recipe3));
        when(equipmentRepository.findAll()).thenReturn(Collections.emptyList());
        when(donjonRepository.findAll()).thenReturn(Collections.emptyList());
        when(monstreRepository.findAll()).thenReturn(Collections.emptyList());
        when(lootEntryRepository.findAll()).thenReturn(Collections.emptyList());
        when(salleRepository.findAll()).thenReturn(Collections.emptyList());

        renameCascadeService.cascadeAnomalyRename("OldAnomaly", "NewAnomaly");

        // Verify Recipe 1
        assertEquals("NewAnomaly", recipe1.getRewardName());
        assertFalse(recipe1.getRequiredAnomalies().containsKey("OldAnomaly"));
        assertEquals(3, recipe1.getRequiredAnomalies().get("NewAnomaly"));
        assertEquals(1, recipe1.getRequiredAnomalies().get("OtherAnomaly"));
        verify(alchemyService).saveRecipe(recipe1);

        // Verify Recipe 2
        assertEquals("OldAnomaly", recipe2.getRewardName());
        assertFalse(recipe2.getRequiredAnomalies().containsKey("OldAnomaly"));
        assertEquals(5, recipe2.getRequiredAnomalies().get("NewAnomaly"));
        verify(alchemyService).saveRecipe(recipe2);

        // Verify Recipe 3
        assertEquals("UnrelatedAnomaly", recipe3.getRewardName());
        verify(alchemyService, never()).saveRecipe(recipe3);
    }

    @Test
    void cascadeAnomalyRename_whenEquipmentContainsAnomalyPrice_shouldUpdateMapAndSave() {
        Equipment eq1 = new Equipment();
        eq1.setPriceAnomalies(new HashMap<>());
        eq1.getPriceAnomalies().put("OldAnomaly", 4);
        eq1.getPriceAnomalies().put("StableAnomaly", 2);

        Equipment eq2 = new Equipment();
        eq2.setPriceAnomalies(new HashMap<>());
        eq2.getPriceAnomalies().put("OtherAnomaly", 1);

        when(alchemyService.getAllRecipes()).thenReturn(Collections.emptyList());
        when(equipmentRepository.findAll()).thenReturn(List.of(eq1, eq2));
        when(donjonRepository.findAll()).thenReturn(Collections.emptyList());
        when(monstreRepository.findAll()).thenReturn(Collections.emptyList());
        when(lootEntryRepository.findAll()).thenReturn(Collections.emptyList());
        when(salleRepository.findAll()).thenReturn(Collections.emptyList());

        renameCascadeService.cascadeAnomalyRename("OldAnomaly", "NewAnomaly");

        assertFalse(eq1.getPriceAnomalies().containsKey("OldAnomaly"));
        assertEquals(4, eq1.getPriceAnomalies().get("NewAnomaly"));
        assertEquals(2, eq1.getPriceAnomalies().get("StableAnomaly"));
        verify(equipmentRepository).save(eq1);

        verify(equipmentRepository, never()).save(eq2);
    }

    @Test
    void cascadeAnomalyRename_whenLootsContainAnomaly_shouldUpdateSpecialItemAndPriceSpecialItemAndSave() {
        LootEntry le1 = new LootEntry();
        le1.setSpecialItemName("OldAnomaly");
        le1.setPriceSpecialItemName("StableItem");

        LootEntry le2 = new LootEntry();
        le2.setSpecialItemName("OtherItem");
        le2.setPriceSpecialItemName("OldAnomaly");

        LootEntry le3 = new LootEntry();
        le3.setSpecialItemName("UnrelatedItem");
        le3.setPriceSpecialItemName("UnrelatedPrice");

        when(alchemyService.getAllRecipes()).thenReturn(Collections.emptyList());
        when(equipmentRepository.findAll()).thenReturn(Collections.emptyList());
        when(donjonRepository.findAll()).thenReturn(Collections.emptyList());
        when(monstreRepository.findAll()).thenReturn(Collections.emptyList());
        when(lootEntryRepository.findAll()).thenReturn(List.of(le1, le2, le3));
        when(salleRepository.findAll()).thenReturn(Collections.emptyList());

        renameCascadeService.cascadeAnomalyRename("OldAnomaly", "NewAnomaly");

        assertEquals("NewAnomaly", le1.getSpecialItemName());
        assertEquals("StableItem", le1.getPriceSpecialItemName());
        verify(lootEntryRepository).save(le1);

        assertEquals("OtherItem", le2.getSpecialItemName());
        assertEquals("NewAnomaly", le2.getPriceSpecialItemName());
        verify(lootEntryRepository).save(le2);

        verify(lootEntryRepository, never()).save(le3);
    }

    @Test
    void cascadeAnomalyRename_whenDonjonMonstreSalleContainAnomaly_shouldUpdateAndSave() {
        Donjon donjon1 = new Donjon();
        donjon1.setRequiredSecret("OldAnomaly");
        Donjon donjon2 = new Donjon();
        donjon2.setRequiredSecret("OtherSecret");

        Monstre monstre1 = new Monstre();
        monstre1.setNativeSecret("OldAnomaly");
        Monstre monstre2 = new Monstre();
        monstre2.setNativeSecret("OtherSecret");

        Salle salle1 = new Salle();
        salle1.setAlterationSpecialItemReward("OldAnomaly");
        salle1.setAlterationRequiredItem("OtherItem");

        Salle salle2 = new Salle();
        salle2.setAlterationSpecialItemReward("OtherItem");
        salle2.setAlterationRequiredItem("OldAnomaly");

        Salle salle3 = new Salle();
        salle3.setAlterationSpecialItemReward("OtherItem");
        salle3.setAlterationRequiredItem("OtherItem");

        when(alchemyService.getAllRecipes()).thenReturn(Collections.emptyList());
        when(equipmentRepository.findAll()).thenReturn(Collections.emptyList());
        when(donjonRepository.findAll()).thenReturn(List.of(donjon1, donjon2));
        when(monstreRepository.findAll()).thenReturn(List.of(monstre1, monstre2));
        when(lootEntryRepository.findAll()).thenReturn(Collections.emptyList());
        when(salleRepository.findAll()).thenReturn(List.of(salle1, salle2, salle3));

        renameCascadeService.cascadeAnomalyRename("OldAnomaly", "NewAnomaly");

        assertEquals("NewAnomaly", donjon1.getRequiredSecret());
        verify(donjonRepository).save(donjon1);
        verify(donjonRepository, never()).save(donjon2);

        assertEquals("NewAnomaly", monstre1.getNativeSecret());
        verify(monstreRepository).save(monstre1);
        verify(monstreRepository, never()).save(monstre2);

        assertEquals("NewAnomaly", salle1.getAlterationSpecialItemReward());
        verify(salleRepository).save(salle1);

        assertEquals("NewAnomaly", salle2.getAlterationRequiredItem());
        verify(salleRepository).save(salle2);

        verify(salleRepository, never()).save(salle3);
    }

    @ParameterizedTest
    @NullAndEmptySource
    void cascadeEquipmentRename_whenOldNameIsNullOrEmpty_shouldDoNothing(String oldName) {
        renameCascadeService.cascadeEquipmentRename(oldName, "NewEquip");

        verifyNoInteractions(
                alchemyService,
                equipmentRepository,
                donjonRepository,
                monstreRepository,
                salleRepository,
                lootEntryRepository
        );
    }

    @Test
    void cascadeEquipmentRename_whenOldNameEqualsNewName_shouldDoNothing() {
        renameCascadeService.cascadeEquipmentRename("SameEquip", "SameEquip");

        verifyNoInteractions(
                alchemyService,
                equipmentRepository,
                donjonRepository,
                monstreRepository,
                salleRepository,
                lootEntryRepository
        );
    }

    @Test
    void cascadeEquipmentRename_whenRecipesLootsSallesContainEquipment_shouldUpdateAndSave() {
        AlchemyRecipe r1 = new AlchemyRecipe();
        r1.setRewardType(RecipeRewardType.GIVE_EQUIPMENT);
        r1.setRewardName("OldEquip");
        r1.setRequiredConsumables(new HashMap<>());
        r1.getRequiredConsumables().put("OldEquip", 2);

        AlchemyRecipe r2 = new AlchemyRecipe();
        r2.setRewardType(RecipeRewardType.GIVE_CONSUMABLE);
        r2.setRewardName("OldEquip");

        AlchemyRecipe r3 = new AlchemyRecipe();
        r3.setRewardType(RecipeRewardType.GIVE_ANOMALY);
        r3.setRewardName("OldEquip");

        LootEntry le = new LootEntry();
        le.setSpecialItemName("OldEquip");

        Salle salle = new Salle();
        salle.setAlterationSpecialItemReward("OldEquip");
        salle.setAlterationRequiredItem("OldEquip");

        when(alchemyService.getAllRecipes()).thenReturn(List.of(r1, r2, r3));
        when(lootEntryRepository.findAll()).thenReturn(List.of(le));
        when(salleRepository.findAll()).thenReturn(List.of(salle));

        renameCascadeService.cascadeEquipmentRename("OldEquip", "NewEquip");

        assertEquals("NewEquip", r1.getRewardName());
        assertFalse(r1.getRequiredConsumables().containsKey("OldEquip"));
        assertEquals(2, r1.getRequiredConsumables().get("NewEquip"));
        verify(alchemyService).saveRecipe(r1);

        assertEquals("NewEquip", r2.getRewardName());
        verify(alchemyService).saveRecipe(r2);

        assertEquals("OldEquip", r3.getRewardName());
        verify(alchemyService, never()).saveRecipe(r3);

        assertEquals("NewEquip", le.getSpecialItemName());
        verify(lootEntryRepository).save(le);

        assertEquals("NewEquip", salle.getAlterationSpecialItemReward());
        assertEquals("NewEquip", salle.getAlterationRequiredItem());
        verify(salleRepository).save(salle);
    }
}
