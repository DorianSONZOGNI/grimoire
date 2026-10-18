package generation.grimoire.controller;

import generation.grimoire.enumeration.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SuppressWarnings("null")
class EnumMetaControllerTest {

    private EnumMetaController controller;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        controller = new EnumMetaController();
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("getEquipmentSlots retourne la liste complète des slots avec les clés requises")
    void getEquipmentSlots_devraitRetournerTousLesSlots() throws Exception {
        List<Map<String, String>> slots = controller.getEquipmentSlots();

        assertThat(slots).hasSize(EquipmentSlot.values().length);
        assertThat(slots.get(0)).containsOnlyKeys("name", "label", "icon", "color", "extraClass");

        EquipmentSlot first = EquipmentSlot.values()[0];
        assertThat(slots.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("icon", first.getIcon())
                .containsEntry("color", first.getColorHex())
                .containsEntry("extraClass", first.getExtraClass());

        mockMvc.perform(get("/api/meta/equipment-slots"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(EquipmentSlot.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].label").value(first.getLabel()))
                .andExpect(jsonPath("$[0].icon").value(first.getIcon()))
                .andExpect(jsonPath("$[0].color").value(first.getColorHex()))
                .andExpect(jsonPath("$[0].extraClass").value(first.getExtraClass()));
    }

    @Test
    @DisplayName("getEquipmentRarities retourne la liste complète des raretés avec cssClass et color")
    void getEquipmentRarities_devraitRetournerToutesLesRaretes() throws Exception {
        List<Map<String, String>> rarities = controller.getEquipmentRarities();

        assertThat(rarities).hasSize(EquipmentRarity.values().length);
        assertThat(rarities.get(0)).containsOnlyKeys("name", "label", "cssClass", "color");

        EquipmentRarity first = EquipmentRarity.values()[0];
        assertThat(rarities.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("cssClass", first.getCssClass())
                .containsEntry("color", first.getColor());

        mockMvc.perform(get("/api/meta/equipment-rarities"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(EquipmentRarity.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].label").value(first.getLabel()))
                .andExpect(jsonPath("$[0].cssClass").value(first.getCssClass()))
                .andExpect(jsonPath("$[0].color").value(first.getColor()));
    }

    @Test
    @DisplayName("getMonsterBehaviors retourne la liste des comportements avec description et icon")
    void getMonsterBehaviors_devraitRetournerTousLesComportements() throws Exception {
        List<Map<String, String>> behaviors = controller.getMonsterBehaviors();

        assertThat(behaviors).hasSize(MonsterBehavior.values().length);
        assertThat(behaviors.get(0)).containsOnlyKeys("name", "label", "description", "icon");

        MonsterBehavior first = MonsterBehavior.values()[0];
        assertThat(behaviors.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("description", first.getDescription())
                .containsEntry("icon", first.getIcon());

        mockMvc.perform(get("/api/meta/monster-behaviors"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(MonsterBehavior.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].description").value(first.getDescription()));
    }

    @Test
    @DisplayName("getMonsterTypes retourne la liste des types de monstres")
    void getMonsterTypes_devraitRetournerTousLesTypesMonstres() throws Exception {
        List<Map<String, String>> types = controller.getMonsterTypes();

        assertThat(types).hasSize(MonsterType.values().length);
        assertThat(types.get(0)).containsOnlyKeys("name", "label", "description", "icon");

        MonsterType first = MonsterType.values()[0];
        assertThat(types.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("description", first.getDescription())
                .containsEntry("icon", first.getIcon());

        mockMvc.perform(get("/api/meta/monster-types"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(MonsterType.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()));
    }

    @Test
    @DisplayName("getSources retourne la liste des sources avec name et label")
    void getSources_devraitRetournerToutesLesSources() throws Exception {
        List<Map<String, String>> sources = controller.getSources();

        assertThat(sources).hasSize(Source.values().length);
        assertThat(sources.get(0)).containsOnlyKeys("name", "label");

        Source first = Source.values()[0];
        assertThat(sources.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel());

        mockMvc.perform(get("/api/meta/sources"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(Source.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].label").value(first.getLabel()));
    }

    @Test
    @DisplayName("getConsumableCategories retourne la liste des catégories de consommables avec color")
    void getConsumableCategories_devraitRetournerToutesLesCategories() throws Exception {
        List<Map<String, String>> categories = controller.getConsumableCategories();

        assertThat(categories).hasSize(ConsumableCategory.values().length);
        assertThat(categories.get(0)).containsOnlyKeys("name", "label", "icon", "color");

        ConsumableCategory first = ConsumableCategory.values()[0];
        assertThat(categories.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("icon", first.getIcon())
                .containsEntry("color", first.getColorHex());

        mockMvc.perform(get("/api/meta/consumable-categories"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(ConsumableCategory.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].color").value(first.getColorHex()));
    }

    @Test
    @DisplayName("getAnomalieCategories retourne la liste des catégories d'anomalies")
    void getAnomalieCategories_devraitRetournerToutesLesCategories() throws Exception {
        List<Map<String, String>> categories = controller.getAnomalieCategories();

        assertThat(categories).hasSize(AnomalieCategory.values().length);
        assertThat(categories.get(0)).containsOnlyKeys("name", "label", "icon");

        AnomalieCategory first = AnomalieCategory.values()[0];
        assertThat(categories.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("icon", first.getIcon());

        mockMvc.perform(get("/api/meta/anomalie-categories"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(AnomalieCategory.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].icon").value(first.getIcon()));
    }

    @Test
    @DisplayName("getStatTypes retourne la liste des types de statistiques")
    void getStatTypes_devraitRetournerTousLesStatTypes() throws Exception {
        List<Map<String, String>> statTypes = controller.getStatTypes();

        assertThat(statTypes).hasSize(StatType.values().length);
        assertThat(statTypes.get(0)).containsOnlyKeys("name", "label", "icon");

        StatType first = StatType.values()[0];
        assertThat(statTypes.get(0))
                .containsEntry("name", first.name())
                .containsEntry("label", first.getLabel())
                .containsEntry("icon", first.getIcon());

        mockMvc.perform(get("/api/meta/stat-types"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(StatType.values().length)))
                .andExpect(jsonPath("$[0].name").value(first.name()))
                .andExpect(jsonPath("$[0].label").value(first.getLabel()));
    }

    @Test
    @DisplayName("getAllMeta regroupe toutes les métadonnées dans une seule réponse")
    void getAllMeta_devraitRetournerToutesLesMetas() throws Exception {
        Map<String, List<Map<String, String>>> allMeta = controller.getAllMeta();

        assertThat(allMeta).containsOnlyKeys(
                "equipmentSlots",
                "equipmentRarities",
                "monsterBehaviors",
                "monsterTypes",
                "sources",
                "consumableCategories",
                "anomalieCategories",
                "statTypes"
        );

        assertThat(allMeta.get("equipmentSlots")).hasSize(EquipmentSlot.values().length);
        assertThat(allMeta.get("equipmentRarities")).hasSize(EquipmentRarity.values().length);
        assertThat(allMeta.get("monsterBehaviors")).hasSize(MonsterBehavior.values().length);
        assertThat(allMeta.get("monsterTypes")).hasSize(MonsterType.values().length);
        assertThat(allMeta.get("sources")).hasSize(Source.values().length);
        assertThat(allMeta.get("consumableCategories")).hasSize(ConsumableCategory.values().length);
        assertThat(allMeta.get("anomalieCategories")).hasSize(AnomalieCategory.values().length);
        assertThat(allMeta.get("statTypes")).hasSize(StatType.values().length);

        mockMvc.perform(get("/api/meta/all"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.equipmentSlots", hasSize(EquipmentSlot.values().length)))
                .andExpect(jsonPath("$.equipmentRarities", hasSize(EquipmentRarity.values().length)))
                .andExpect(jsonPath("$.monsterBehaviors", hasSize(MonsterBehavior.values().length)))
                .andExpect(jsonPath("$.monsterTypes", hasSize(MonsterType.values().length)))
                .andExpect(jsonPath("$.sources", hasSize(Source.values().length)))
                .andExpect(jsonPath("$.consumableCategories", hasSize(ConsumableCategory.values().length)))
                .andExpect(jsonPath("$.anomalieCategories", hasSize(AnomalieCategory.values().length)))
                .andExpect(jsonPath("$.statTypes", hasSize(StatType.values().length)));
    }
}
