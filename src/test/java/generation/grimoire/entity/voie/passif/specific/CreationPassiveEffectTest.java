package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.event.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CreationPassiveEffectTest {

    private CreationPassiveEffect passive;
    private Personnage personnage;

    @BeforeEach
    void setUp() {
        passive = new CreationPassiveEffect();
        personnage = new Personnage();
        personnage.setName("Testeur");
    }

    @Test
    void testTurnStart_FirstTurn_GivesBudAndResetsUsedState() {
        // Au premier tour, le passif donne 1 bourgeon
        TurnStartEvent event = new TurnStartEvent(personnage);
        passive.onEvent(event);

        assertEquals(1, personnage.getPassiveState("creation_buds", 0), "Doit avoir 1 bourgeon");
        assertEquals(1, personnage.getPassiveState("creation_initialized", 0), "Doit être initialisé");
        assertEquals(0, personnage.getPassiveState("creation_used_this_turn", 0), "Ne doit pas être marqué comme utilisé");
    }

    @Test
    void testTurnStart_SubsequentTurns_DoesNotGiveExtraBudsButResetsUsedState() {
        // Simule qu'on a déjà eu le premier tour
        personnage.setPassiveState("creation_initialized", 1);
        personnage.setPassiveState("creation_buds", 0);
        personnage.setPassiveState("creation_used_this_turn", 1);

        TurnStartEvent event = new TurnStartEvent(personnage);
        passive.onEvent(event);

        assertEquals(0, personnage.getPassiveState("creation_buds", 0), "Ne donne pas de bourgeon supplémentaire");
        assertEquals(0, personnage.getPassiveState("creation_used_this_turn", 0), "Doit réinitialiser l'état d'utilisation");
    }

    @Test
    void testCastingTypeAdjust_WithBudsAndBanalSpell_TransformsToInstantane() {
        personnage.setPassiveState("creation_buds", 1);
        personnage.setPassiveState("creation_used_this_turn", 0);

        Spell spell = new Spell();
        spell.setNom("Sort Banal");
        spell.setAction(2); // Action 2 correspond à Banal

        CastingTypeAdjustEvent event = new CastingTypeAdjustEvent(personnage, null, spell, SpellCastingType.BANAL);
        passive.onEvent(event);

        assertEquals(SpellCastingType.INSTANTANE, event.getCurrentType(), "Le sort banal doit devenir instantané");
    }

    @Test
    void testCastingTypeAdjust_WithoutBuds_DoesNotTransform() {
        personnage.setPassiveState("creation_buds", 0);
        personnage.setPassiveState("creation_used_this_turn", 0);

        Spell spell = new Spell();
        spell.setNom("Sort Banal");
        spell.setAction(2);

        CastingTypeAdjustEvent event = new CastingTypeAdjustEvent(personnage, null, spell, SpellCastingType.BANAL);
        passive.onEvent(event);

        assertEquals(SpellCastingType.BANAL, event.getCurrentType(), "Sans bourgeon, le sort reste banal");
    }

    @Test
    void testCostAdjust_WithBudsAndInstantaneSpell_MakesItFree() {
        personnage.setPassiveState("creation_buds", 1);
        personnage.setPassiveState("creation_used_this_turn", 0);

        Spell spell = new Spell();
        spell.setNom("Sort Instantané");
        spell.setAction(1); // Action 1 correspond à Instantané
        spell.setCastingType(SpellCastingType.INSTANTANE);

        int[] costs = {50, 20}; // {mana, hp}
        SpellCostAdjustEvent event = new SpellCostAdjustEvent(personnage, null, spell, costs);
        passive.onEvent(event);

        assertEquals(0, event.getCosts()[0], "Le coût en mana doit être gratuit");
        assertEquals(0, event.getCosts()[1], "Le coût en vie (heal/HP) doit être gratuit");
    }

    @Test
    void testCostPaid_WithBudsAndCanaliseSpell_GivesShield() {
        personnage.setPassiveState("creation_buds", 1);
        personnage.setPassiveState("creation_used_this_turn", 0);

        Spell spell = new Spell();
        spell.setNom("Sort Canalisé");
        spell.setAction(3); // Action >= 3 correspond à Canalisé
        spell.setChannelingDuration(4);

        SpellCostPaidEvent event = new SpellCostPaidEvent(personnage, null, spell, 100, 0, 0);
        passive.onEvent(event);

        // Le bouclier est égal à 30% du mana dépensé (100 * 0.3 = 30)
        assertEquals(30, personnage.getTotalShield(), "Doit donner un bouclier équivalent à 30% du mana dépensé");
    }

    @Test
    void testCostPaid_WithBudsAndCanaliseSpell_DefaultDurationIfZero() {
        personnage.setPassiveState("creation_buds", 1);
        personnage.setPassiveState("creation_used_this_turn", 0);

        Spell spell = new Spell();
        spell.setNom("Sort Canalisé");
        spell.setAction(3);
        spell.setChannelingDuration(0); // Teste la durée par défaut (3)

        SpellCostPaidEvent event = new SpellCostPaidEvent(personnage, null, spell, 50, 0, 0);
        passive.onEvent(event);

        // 50 * 0.3 = 15
        assertEquals(15, personnage.getTotalShield());
    }

    @Test
    void testSpellCast_ConsumesBudAndMarksUsed() {
        personnage.setPassiveState("creation_buds", 2);
        personnage.setPassiveState("creation_used_this_turn", 0);

        Spell spell = new Spell();
        spell.setAction(1);

        SpellCastEvent event = new SpellCastEvent(personnage, null, spell);
        passive.onEvent(event);

        assertEquals(1, personnage.getPassiveState("creation_buds", 0), "Un bourgeon doit être consommé");
        assertEquals(1, personnage.getPassiveState("creation_used_this_turn", 0), "Le passif doit être marqué comme utilisé");
    }

    @Test
    void testSpellCast_AlreadyUsedThisTurn_DoesNotConsumeBud() {
        personnage.setPassiveState("creation_buds", 2);
        personnage.setPassiveState("creation_used_this_turn", 1); // Déjà utilisé

        Spell spell = new Spell();
        spell.setAction(1);

        SpellCastEvent event = new SpellCastEvent(personnage, null, spell);
        passive.onEvent(event);

        assertEquals(2, personnage.getPassiveState("creation_buds", 0), "Ne doit pas consommer un autre bourgeon si déjà utilisé");
        assertEquals(1, personnage.getPassiveState("creation_used_this_turn", 0));
    }
}
