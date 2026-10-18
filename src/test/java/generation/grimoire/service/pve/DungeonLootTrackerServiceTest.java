package generation.grimoire.service.pve;

import generation.grimoire.dto.equipment.DungeonDropSourceDTO;
import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.EventSubType;
import generation.grimoire.enumeration.RoomType;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DungeonLootTrackerServiceTest {

    @Mock
    private DonjonRepository donjonRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private AnomalieRepository anomalieRepository;

    @Mock
    private generation.grimoire.repository.AlchemyRecipeRepository recipeRepository;

    @InjectMocks
    private DungeonLootTrackerService dungeonLootTrackerService;

    private Donjon donjon1;

    @BeforeEach
    void setUp() {
        donjon1 = new Donjon();
        donjon1.setId(10L);
        donjon1.setName("Crypte Maudite");
        donjon1.setSalles(new ArrayList<>());
    }

    @Test
    void testEquipmentInTreasureAndMerchantRooms() {
        // Salle 1: Coffre (TREASURE)
        Salle treasureRoom = new Salle();
        treasureRoom.setType(RoomType.TREASURE);
        treasureRoom.setLootTable(new ArrayList<>());

        Equipment sword = new Equipment();
        sword.setId(101L);
        sword.setName("Épée Spectrale");

        LootEntry entry1 = new LootEntry();
        entry1.setEquipment(sword);
        treasureRoom.getLootTable().add(entry1);

        // Salle 2: Marchand (EVENT / RENCONTRE)
        Salle shopRoom = new Salle();
        shopRoom.setType(RoomType.EVENT);
        shopRoom.setEventSubType(EventSubType.RENCONTRE);
        shopRoom.setLootTable(new ArrayList<>());

        Equipment shield = new Equipment();
        shield.setId(102L);
        shield.setName("Bouclier de Lumière");

        LootEntry entry2 = new LootEntry();
        entry2.setEquipment(shield);
        shopRoom.getLootTable().add(entry2);

        donjon1.getSalles().add(treasureRoom);
        donjon1.getSalles().add(shopRoom);

        when(donjonRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(donjon1));

        Map<String, List<DungeonDropSourceDTO>> sources = dungeonLootTrackerService.buildEquipmentDungeonSourcesMap();

        assertTrue(sources.containsKey("épée spectrale"));
        List<DungeonDropSourceDTO> swordSources = sources.get("épée spectrale");
        assertEquals(1, swordSources.size());
        assertEquals("Crypte Maudite", swordSources.get(0).dungeonName());
        assertTrue(swordSources.get(0).sourceTypes().contains("Coffre"));

        assertTrue(sources.containsKey("bouclier de lumière"));
        List<DungeonDropSourceDTO> shieldSources = sources.get("bouclier de lumière");
        assertEquals(1, shieldSources.size());
        assertTrue(shieldSources.get(0).sourceTypes().contains("Boutique"));
    }

    @Test
    void testEquipmentInAltarAndStrangeDoor() {
        // Salle 1: Autel sacrificiel
        Salle altarRoom = new Salle();
        altarRoom.setType(RoomType.EVENT);
        altarRoom.setAlterationType("AUTEL");
        altarRoom.setAltarRewardType("ITEM");
        altarRoom.setAltarRewardValue(201);

        Equipment relic = new Equipment();
        relic.setId(201L);
        relic.setName("Amulette Ancienne");
        when(equipmentRepository.findById(201L)).thenReturn(Optional.of(relic));

        // Salle 2: Porte étrange avec issue AUTEL et issue ITEM (lootTable)
        Salle doorRoom = new Salle();
        doorRoom.setType(RoomType.EVENT);
        doorRoom.setEventSubType(EventSubType.PORTE_ETRANGE);
        doorRoom.setDoorOutcomes("[{\"type\":\"AUTEL\",\"altarRewardType\":\"ITEM\",\"altarRewardValue\":202}]");

        Equipment ring = new Equipment();
        ring.setId(202L);
        ring.setName("Anneau Lunaire");
        when(equipmentRepository.findById(202L)).thenReturn(Optional.of(ring));

        Equipment boots = new Equipment();
        boots.setId(203L);
        boots.setName("Bottes Célestes");
        LootEntry doorLoot = new LootEntry();
        doorLoot.setEquipment(boots);
        doorRoom.setLootTable(List.of(doorLoot));

        donjon1.getSalles().add(altarRoom);
        donjon1.getSalles().add(doorRoom);

        when(donjonRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(donjon1));

        Map<String, List<DungeonDropSourceDTO>> sources = dungeonLootTrackerService.buildEquipmentDungeonSourcesMap();

        // Altar
        assertTrue(sources.containsKey("amulette ancienne"));
        assertTrue(sources.get("amulette ancienne").get(0).sourceTypes().contains("Autel sacrificiel"));

        // Strange door altar outcome
        assertTrue(sources.containsKey("anneau lunaire"));
        assertTrue(sources.get("anneau lunaire").get(0).sourceTypes().contains("Autel sacrificiel"));

        // Strange door item loot
        assertTrue(sources.containsKey("bottes célestes"));
        assertTrue(sources.get("bottes célestes").get(0).sourceTypes().contains("Coffre (Porte étrange)"));
    }

    @Test
    void testMultipleSourcesInSameDungeonAggregated() {
        Equipment dagger = new Equipment();
        dagger.setId(301L);
        dagger.setName("Dague de l'Ombre");

        Salle room1 = new Salle();
        room1.setType(RoomType.TREASURE);
        LootEntry e1 = new LootEntry();
        e1.setEquipment(dagger);
        room1.setLootTable(List.of(e1));

        Salle room2 = new Salle();
        room2.setType(RoomType.EVENT);
        room2.setEventSubType(EventSubType.RENCONTRE);
        LootEntry e2 = new LootEntry();
        e2.setEquipment(dagger);
        room2.setLootTable(List.of(e2));

        donjon1.getSalles().add(room1);
        donjon1.getSalles().add(room2);

        when(donjonRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(donjon1));

        Map<String, List<DungeonDropSourceDTO>> sources = dungeonLootTrackerService.buildEquipmentDungeonSourcesMap();
        List<DungeonDropSourceDTO> daggerSources = sources.get("dague de l'ombre");

        assertNotNull(daggerSources);
        assertEquals(1, daggerSources.size()); // 1 entry per dungeon
        assertEquals(2, daggerSources.get(0).sourceTypes().size());
        assertTrue(daggerSources.get(0).sourceTypes().contains("Coffre"));
        assertTrue(daggerSources.get(0).sourceTypes().contains("Boutique"));
    }

    @Test
    void testItemNeverLootableReturnsEmpty() {
        when(donjonRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(donjon1));

        Map<String, List<DungeonDropSourceDTO>> sources = dungeonLootTrackerService.buildEquipmentDungeonSourcesMap();
        assertFalse(sources.containsKey("objet inexistant"));
    }

    @Test
    void testAnomalieSources() {
        Salle roomAlter = new Salle();
        roomAlter.setType(RoomType.EVENT);
        roomAlter.setAlterationSpecialItemReward("Fragment d'Âme");

        Salle roomDoor = new Salle();
        roomDoor.setType(RoomType.EVENT);
        roomDoor.setEventSubType(EventSubType.PORTE_ETRANGE);
        roomDoor.setDoorOutcomes("[{\"type\":\"TRESOR\",\"treasureAnomalieId\":501}]");

        Anomalie ano = new Anomalie();
        ano.setId(501L);
        ano.setName("Oeil du Chaos");
        when(anomalieRepository.findById(501L)).thenReturn(Optional.of(ano));

        donjon1.getSalles().add(roomAlter);
        donjon1.getSalles().add(roomDoor);

        when(donjonRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(donjon1));

        Map<String, List<DungeonDropSourceDTO>> sources = dungeonLootTrackerService.buildAnomalieDungeonSourcesMap();

        assertTrue(sources.containsKey("fragment d'âme"));
        assertTrue(sources.get("fragment d'âme").get(0).sourceTypes().contains("Altération"));

        assertTrue(sources.containsKey("oeil du chaos"));
        assertTrue(sources.get("oeil du chaos").get(0).sourceTypes().contains("Trésor (Porte étrange)"));
    }

    @Test
    void testEquipmentAlchemyRecipes() {
        generation.grimoire.entity.AlchemyRecipe r1 = new generation.grimoire.entity.AlchemyRecipe();
        r1.setId(1L);
        r1.setName("Transmutation d'Acier");
        r1.setRewardType(generation.grimoire.enumeration.RecipeRewardType.GIVE_EQUIPMENT);
        r1.setRewardName("Épée Spectrale");

        generation.grimoire.entity.AlchemyRecipe r2 = new generation.grimoire.entity.AlchemyRecipe();
        r2.setId(2L);
        r2.setName("Élixir de Soin Majeur");
        r2.setRewardType(generation.grimoire.enumeration.RecipeRewardType.GIVE_CONSUMABLE);
        r2.setRewardName("Potion Supérieure");

        when(recipeRepository.findAll()).thenReturn(List.of(r1, r2));

        Map<String, List<String>> recipes = dungeonLootTrackerService.buildEquipmentAlchemyRecipesMap();

        assertTrue(recipes.containsKey("épée spectrale"));
        assertEquals(List.of("Transmutation d'Acier"), recipes.get("épée spectrale"));

        assertTrue(recipes.containsKey("potion supérieure"));
        assertEquals(List.of("Élixir de Soin Majeur"), recipes.get("potion supérieure"));
    }

    @Test
    void testAnomalieAlchemyRecipes() {
        generation.grimoire.entity.AlchemyRecipe r1 = new generation.grimoire.entity.AlchemyRecipe();
        r1.setId(3L);
        r1.setName("Invocation Occulte");
        r1.setRewardType(generation.grimoire.enumeration.RecipeRewardType.GIVE_ANOMALY);
        r1.setRewardName("Oeil du Chaos");

        when(recipeRepository.findAll()).thenReturn(List.of(r1));

        Map<String, List<String>> recipes = dungeonLootTrackerService.buildAnomalieAlchemyRecipesMap();

        assertTrue(recipes.containsKey("oeil du chaos"));
        assertEquals(List.of("Invocation Occulte"), recipes.get("oeil du chaos"));
    }
}
