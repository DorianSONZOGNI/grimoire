package generation.grimoire.service.pve;

import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.entity.spell.type.effect.HeatFixedEffect;
import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.enumeration.EquipmentEffectType;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.event.CanCastCheckEvent;
import generation.grimoire.event.CastingTypeAdjustEvent;
import generation.grimoire.event.SpellCostAdjustEvent;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.model.pve.InitiativeEntry;
import generation.grimoire.model.pve.SpellAvailability;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.service.PassiveDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SpellAvailabilityServiceTest {

    @Mock
    private SpellRepository spellRepository;

    @Mock
    private PassiveDispatcher passiveDispatcher;

    @InjectMocks
    private SpellAvailabilityService spellAvailabilityService;

    private Personnage caster;
    private CombatSession session;

    @BeforeEach
    void setUp() {
        caster = new Personnage();
        caster.setId(1L);
        caster.setName("Test Hero");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);
        caster.setManaMax(100);
        caster.setManaCurrent(100);

        Donjon donjon = new Donjon();
        donjon.setId(1L);
        Salle salle = new Salle();
        donjon.setSalles(List.of(salle));

        session = new CombatSession("test-id", donjon, new ArrayList<>(List.of(caster)));
        session.setFinished(false);
        session.getTurnOrder().clear();
        session.getTurnOrder().add(new InitiativeEntry(true, 0, 10, 10, 0));
        session.setCurrentTurnIndex(0);
    }

    private Spell createSpell(Long id, String name, int manaCost, int healCost, int heatCost, SpellCastingType castingType) {
        Spell spell = new Spell();
        spell.setId(id);
        spell.setNom(name);
        spell.setManaCost(manaCost);
        spell.setHealCost(healCost);
        spell.setHeatCost(heatCost);
        spell.setCastingType(castingType != null ? castingType : SpellCastingType.BANAL);
        return spell;
    }

    @Test
    @DisplayName("compute - Ne fait rien si la session est terminée")
    void compute_whenSessionFinished_shouldDoNothing() {
        session.setFinished(true);

        spellAvailabilityService.compute(session);

        verifyNoInteractions(spellRepository);
        verifyNoInteractions(passiveDispatcher);
        assertThat(session.getSpellAvailability()).isEmpty();
    }

    @Test
    @DisplayName("compute - Vide les sorts si aucun joueur actif")
    void compute_whenActivePlayerNull_shouldClearSpellsAndReturn() {
        session.getTurnOrder().clear();

        spellAvailabilityService.compute(session);

        verifyNoInteractions(spellRepository);
        assertThat(session.getAvailableSpells()).isEmpty();
        assertThat(session.getSpellAvailability()).isEmpty();
    }

    @Test
    @DisplayName("compute - Filtre les sorts selon canCast du personnage")
    void compute_whenSpellsFilteredByCanCast_shouldOnlyIncludeAllowedSpells() {
        Voie voieFeu = new Voie();
        voieFeu.setId(10L);
        voieFeu.setNom("Feu");
        caster.setVoie(voieFeu);
        caster.setVoieLevel(5);

        Spell allowedSpell = createSpell(1L, "Boule de Feu", 20, 0, 0, SpellCastingType.BANAL);
        allowedSpell.setVoie(voieFeu);
        allowedSpell.setNiveau(1);

        Voie voieGlace = new Voie();
        voieGlace.setId(20L);
        voieGlace.setNom("Glace");
        Spell forbiddenSpell = createSpell(2L, "Javelot de Glace", 20, 0, 0, SpellCastingType.BANAL);
        forbiddenSpell.setVoie(voieGlace);
        forbiddenSpell.setNiveau(1);

        when(spellRepository.findAll()).thenReturn(List.of(forbiddenSpell, allowedSpell));

        spellAvailabilityService.compute(session);

        assertThat(session.getAvailableSpells()).containsExactly(allowedSpell);
        assertThat(session.getSpellAvailability()).hasSize(1);
        assertThat(session.getSpellAvailability().get(0).getSpellId()).isEqualTo(1L);
        assertThat(session.getSpellAvailability().get(0).isCastable()).isTrue();
    }

    @Test
    @DisplayName("compute - Bloque les sorts banals si une canalisation est en cours")
    void compute_whenChannelingActive_nonInstantSpell_shouldBeBlocked() {
        caster.setRemainingChannelingTurns(2);
        Spell banalSpell = createSpell(1L, "Frappe Lourde", 10, 0, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(banalSpell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("CHANNELING");
        assertThat(avail.getTooltip()).contains("Canalisation en cours : seuls les sorts instantanés sont autorisés");
    }

    @Test
    @DisplayName("compute - Bloque les sorts instantanés si la canalisation les interdit")
    void compute_whenChannelingActive_instantSpellForbidden_shouldBeBlocked() {
        caster.setRemainingChannelingTurns(1);
        caster.setAllowInstantDuringCurrentChanneling(false);

        Spell instantSpell = createSpell(1L, "Réflexe", 10, 0, 0, SpellCastingType.INSTANTANE);
        when(spellRepository.findAll()).thenReturn(List.of(instantSpell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("CHANNELING");
        assertThat(avail.getTooltip()).contains("Cette canalisation interdit les sorts instantanés");
    }

    @Test
    @DisplayName("compute - Autorise les sorts instantanés si la canalisation le permet")
    void compute_whenChannelingActive_instantSpellAllowed_shouldBeAvailable() {
        caster.setRemainingChannelingTurns(1);
        caster.setAllowInstantDuringCurrentChanneling(true);

        Spell instantSpell = createSpell(1L, "Éclair", 10, 0, 0, SpellCastingType.INSTANTANE);
        when(spellRepository.findAll()).thenReturn(List.of(instantSpell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isTrue();
    }

    @Test
    @DisplayName("compute - Bloque si une action majeure / sort banal a déjà été joué ce tour")
    void compute_whenBanalSpellAlreadyCastThisTurn_shouldBlockMajorAction() {
        caster.setBanalSpellCastThisTurn(true);
        caster.setRemainingChannelingTurns(0);

        Spell spell = createSpell(1L, "Coup Banal", 10, 0, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("ACTION_LIMIT");
        assertThat(avail.getTooltip()).contains("Action majeure déjà effectuée ce tour");
    }

    @Test
    @DisplayName("compute - Bloque si un sort instantané a déjà été lancé ce tour")
    void compute_whenInstantSpellAlreadyCastThisTurn_andSpellInstant_shouldBlock() {
        caster.setInstantSpellCastThisTurn(true);

        Spell instantSpell = createSpell(1L, "Riposte", 10, 0, 0, SpellCastingType.INSTANTANE);
        when(spellRepository.findAll()).thenReturn(List.of(instantSpell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("ACTION_LIMIT");
        assertThat(avail.getTooltip()).contains("Sort instantané déjà lancé ce tour");
    }

    @Test
    @DisplayName("compute - Ajuste le type de casting via CastingTypeAdjustEvent")
    void compute_whenPassiveAdjustsCastingTypeToInstant_shouldApplyInstantRules() {
        caster.setInstantSpellCastThisTurn(true);
        Spell spell = createSpell(1L, "Sort Transformé", 10, 0, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        doAnswer(invocation -> {
            CastingTypeAdjustEvent event = invocation.getArgument(2);
            event.setCurrentType(SpellCastingType.INSTANTANE);
            return null;
        }).when(passiveDispatcher).dispatch(eq(caster), eq(spell), any(CastingTypeAdjustEvent.class));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("ACTION_LIMIT");
        assertThat(avail.getTooltip()).contains("Sort instantané déjà lancé ce tour");
    }

    @Test
    @DisplayName("compute - Bloque avec tooltip Esprit si condition non remplie")
    void compute_whenPassiveBlocksCanCastCheck_withEsprit_shouldBlockWithEspritTooltip() {
        Spiritualite esprit = new Spiritualite();
        esprit.setId(10L);
        esprit.setNom("Voie de l'Esprit");
        caster.setSpiritualite(esprit);
        caster.setSpiritualiteLevel(5);

        Spell spell = createSpell(1L, "Méditation", 10, 0, 0, SpellCastingType.BANAL);
        spell.setSpiritualite(esprit);
        spell.setNiveau(1);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        doAnswer(invocation -> {
            CanCastCheckEvent event = invocation.getArgument(2);
            event.setAllowed(false);
            return null;
        }).when(passiveDispatcher).dispatch(eq(caster), eq(spell), any(CanCastCheckEvent.class));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("CONDITION");
        assertThat(avail.getTooltip()).contains("Condition Esprit non remplie");
    }

    @Test
    @DisplayName("compute - Bloque avec tooltip Ténèbres si condition non remplie")
    void compute_whenPassiveBlocksCanCastCheck_withTenebres_shouldBlockWithTenebresTooltip() {
        Spiritualite tenebres = new Spiritualite();
        tenebres.setId(11L);
        tenebres.setNom("Ténèbres Profondes");
        caster.setSpiritualite(tenebres);
        caster.setSpiritualiteLevel(5);

        Spell spell = createSpell(1L, "Ombre", 10, 0, 0, SpellCastingType.BANAL);
        spell.setSpiritualite(tenebres);
        spell.setNiveau(1);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        doAnswer(invocation -> {
            CanCastCheckEvent event = invocation.getArgument(2);
            event.setAllowed(false);
            return null;
        }).when(passiveDispatcher).dispatch(eq(caster), eq(spell), any(CanCastCheckEvent.class));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("CONDITION");
        assertThat(avail.getTooltip()).contains("Condition Ténèbres non remplie");
    }

    @Test
    @DisplayName("compute - Bloque avec tooltip Karma si karma_locked")
    void compute_whenPassiveBlocksCanCastCheck_withKarmaLocked_shouldBlockWithKarmaTooltip() {
        Spiritualite karma = new Spiritualite();
        karma.setId(12L);
        karma.setNom("Voie du Karma");
        caster.setSpiritualite(karma);
        caster.setSpiritualiteLevel(5);
        caster.setPassiveState("karma_locked", 1);

        Spell spell = createSpell(1L, "Jugement", 10, 0, 0, SpellCastingType.BANAL);
        spell.setSpiritualite(karma);
        spell.setNiveau(1);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        doAnswer(invocation -> {
            CanCastCheckEvent event = invocation.getArgument(2);
            event.setAllowed(false);
            return null;
        }).when(passiveDispatcher).dispatch(eq(caster), eq(spell), any(CanCastCheckEvent.class));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("CONDITION");
        assertThat(avail.getTooltip()).contains("Karma verrouillé");
    }

    @Test
    @DisplayName("compute - Bloque avec tooltip générique si condition non remplie sans spiritualité reconnue")
    void compute_whenPassiveBlocksCanCastCheck_defaultConditionTooltip() {
        Spell spell = createSpell(1L, "Sort Mystère", 10, 0, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        doAnswer(invocation -> {
            CanCastCheckEvent event = invocation.getArgument(2);
            event.setAllowed(false);
            return null;
        }).when(passiveDispatcher).dispatch(eq(caster), eq(spell), any(CanCastCheckEvent.class));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("CONDITION");
        assertThat(avail.getTooltip()).isEqualTo("Condition de lancement non remplie");
    }

    @Test
    @DisplayName("compute - Bloque si mana insuffisant")
    void compute_whenManaInsufficient_shouldBlockWithResource() {
        caster.setManaCurrent(30);
        Spell spell = createSpell(1L, "Mégasort", 50, 0, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("Mana insuffisant (30/50)");
        assertThat(avail.getFinalManaCost()).isEqualTo(50);
    }

    @Test
    @DisplayName("compute - Calcule le coût mana avec percentManaCost et CURSED_MANA_TAX")
    void compute_whenPercentManaCostAndCursedTax_shouldCalculateAccurately() {
        caster.setManaMax(100);
        caster.setManaCurrent(25);

        Equipment cursedGear = new Equipment();
        cursedGear.setSlot(EquipmentSlot.ANNEAU);
        cursedGear.setSpecialEffect(EquipmentEffectType.CURSED_MANA_TAX);
        cursedGear.setSpecialEffectValue(50); // +50% taxe mana
        caster.getEquipments().add(cursedGear);

        Spell spell = createSpell(1L, "Sort Maudit", 10, 0, 0, SpellCastingType.BANAL);
        spell.setPercentManaCost(10); // +10% de 100 = 10 -> manaCost = 20. Taxe 50% de 20 = 10 -> 30 total
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("Mana insuffisant (25/30)");
        assertThat(avail.getFinalManaCost()).isEqualTo(30);
    }

    @Test
    @DisplayName("compute - Bloque si PV insuffisants (healCost)")
    void compute_whenHealthInsufficient_shouldBlockWithResource() {
        caster.setHealthCurrent(20);
        Spell spell = createSpell(1L, "Sort Sacrificiel", 0, 40, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("PV insuffisants (20/40)");
        assertThat(avail.getFinalHealCost()).isEqualTo(40);
    }

    @Test
    @DisplayName("compute - Calcule le coût PV avec percentHealCost")
    void compute_whenPercentHealCost_shouldCalculateAccurately() {
        caster.setHealthMax(200);
        caster.setHealthCurrent(30);
        Spell spell = createSpell(1L, "Transfusion", 0, 10, 0, SpellCastingType.BANAL);
        spell.setPercentHealCost(20); // 20% de 200 = 40 -> total 50
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("PV insuffisants (30/50)");
        assertThat(avail.getFinalHealCost()).isEqualTo(50);
    }

    @Test
    @DisplayName("compute - Bloque si Chaleur insuffisante")
    void compute_whenHeatInsufficient_shouldBlockWithResource() {
        caster.setPassiveState("destruction_heat", 15);
        Spell spell = createSpell(1L, "Brasier", 0, 0, 30, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("Chaleur insuffisante (15/30)");
        assertThat(avail.getFinalHeatCost()).isEqualTo(30);
    }

    @Test
    @DisplayName("compute - Intègre le coût de chaleur négatif issu de HeatFixedEffect")
    void compute_whenHeatFixedEffectConsumesHeat_shouldAddToHeatCost() {
        caster.setPassiveState("destruction_heat", 20);

        Spell spell = createSpell(1L, "Explosion Thermique", 0, 0, 10, SpellCastingType.BANAL);
        HeatFixedEffect effect = new HeatFixedEffect();
        effect.setAmount(-25); // Consomme 25 de chaleur additionnelle
        spell.addEffect(effect);

        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("Chaleur insuffisante (20/35)");
        assertThat(avail.getFinalHeatCost()).isEqualTo(35);
    }

    @Test
    @DisplayName("compute - Bloque si graines (bourgeons) insuffisantes avec déclenchement passif Création")
    void compute_whenSeedsInsufficient_shouldBlockWithResource() {
        caster.setPassiveState("creation_buds", 2);
        caster.setPassiveState("creation_used_this_turn", 0); // Active le bonus passif (+1 requis)

        Spell spell = createSpell(1L, "Floraison", 0, 0, 0, SpellCastingType.BANAL);
        spell.setSeedCost(2); // Requis: 2 + 1 = 3

        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isFalse();
        assertThat(avail.getReason()).isEqualTo("RESOURCE");
        assertThat(avail.getTooltip()).isEqualTo("Graines insuffisantes (2/3)");
    }

    @Test
    @DisplayName("compute - Prend en compte la modification de coûts par SpellCostAdjustEvent")
    void compute_whenSpellCostAdjustEventModifiesCost_shouldUseAdjustedCosts() {
        caster.setManaCurrent(10);
        Spell spell = createSpell(1L, "Sort Coûteux Réduit", 100, 0, 0, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        doAnswer(invocation -> {
            SpellCostAdjustEvent event = invocation.getArgument(2);
            event.getCosts()[0] = 0; // Réduit le coût en mana à 0
            return null;
        }).when(passiveDispatcher).dispatch(eq(caster), eq(spell), any(SpellCostAdjustEvent.class));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isTrue();
        assertThat(avail.getFinalManaCost()).isEqualTo(0);
    }

    @Test
    @DisplayName("compute - Valide un sort disponible lorsque toutes les ressources et conditions sont réunies")
    void compute_whenAllConditionsSatisfied_shouldBeAvailable() {
        caster.setManaCurrent(80);
        caster.setHealthCurrent(90);
        caster.setPassiveState("destruction_heat", 50);

        Spell spell = createSpell(1L, "Flamme Parfaite", 25, 10, 15, SpellCastingType.BANAL);
        when(spellRepository.findAll()).thenReturn(List.of(spell));

        spellAvailabilityService.compute(session);

        assertThat(session.getSpellAvailability()).hasSize(1);
        SpellAvailability avail = session.getSpellAvailability().get(0);
        assertThat(avail.isCastable()).isTrue();
        assertThat(avail.getReason()).isNull();
        assertThat(avail.getTooltip()).isNull();
        assertThat(avail.getFinalManaCost()).isEqualTo(25);
        assertThat(avail.getFinalHealCost()).isEqualTo(10);
        assertThat(avail.getFinalHeatCost()).isEqualTo(15);
    }
}
