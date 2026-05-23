package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.repository.SpellRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;

class SpellCategoryCastingTest {

    private SpellService spellService;
    private Personnage caster;
    private Personnage target;

    private Spell instantSpell;
    private Spell banalSpell;
    private Spell channeledSpellAllowInstant;
    private Spell channeledSpellBlockInstant;

    @BeforeEach
    void setUp() {
        SpellRepository spellRepository = Mockito.mock(SpellRepository.class);
        PersonnageService personnageService = Mockito.mock(PersonnageService.class);
        spellService = new SpellService(spellRepository, personnageService);

        caster = new Personnage();
        caster.setName("Caster");
        caster.setHealthMax(100);
        caster.setHealthCurrent(100);
        caster.setManaMax(100);
        caster.setManaCurrent(100);

        target = new Personnage();
        target.setName("Target");
        target.setHealthMax(100);
        target.setHealthCurrent(100);

        // 1. Instant spell
        instantSpell = new Spell();
        instantSpell.setNom("Instant spell");
        instantSpell.setCastingType(SpellCastingType.INSTANTANE);
        instantSpell.setManaCost(10);

        // 2. Banal spell
        banalSpell = new Spell();
        banalSpell.setNom("Banal spell");
        banalSpell.setCastingType(SpellCastingType.BANAL);
        banalSpell.setManaCost(10);

        // 3. Channeled spell allowing instant spells
        channeledSpellAllowInstant = new Spell();
        channeledSpellAllowInstant.setNom("Channeled spell allow instant");
        channeledSpellAllowInstant.setCastingType(SpellCastingType.CANALISE);
        channeledSpellAllowInstant.setChannelingDuration(3);
        channeledSpellAllowInstant.setAllowInstantDuringChanneling(true);
        channeledSpellAllowInstant.setManaCost(10);

        // 4. Channeled spell blocking instant spells
        channeledSpellBlockInstant = new Spell();
        channeledSpellBlockInstant.setNom("Channeled spell block instant");
        channeledSpellBlockInstant.setCastingType(SpellCastingType.CANALISE);
        channeledSpellBlockInstant.setChannelingDuration(3);
        channeledSpellBlockInstant.setAllowInstantDuringChanneling(false);
        channeledSpellBlockInstant.setManaCost(10);
    }

    @Test
    void testNormalTurnCasting_InstantThenBanal() {
        caster.startTurn();

        // 1. Cast instant spell -> Allowed
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.isInstantSpellCastThisTurn()).isTrue();
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // 2. Cast banal spell -> Allowed
        spellService.castSpell(banalSpell, caster, target, null);
        assertThat(caster.isBanalSpellCastThisTurn()).isTrue();
        assertThat(caster.getManaCurrent()).isEqualTo(80);
    }

    @Test
    void testBanalThenInstant_Blocked() {
        caster.startTurn();

        // 1. Cast banal spell -> Allowed
        spellService.castSpell(banalSpell, caster, target, null);
        assertThat(caster.isBanalSpellCastThisTurn()).isTrue();
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // 2. Cast instant spell -> Blocked (Banal is last action)
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.isInstantSpellCastThisTurn()).isFalse();
        assertThat(caster.getManaCurrent()).isEqualTo(90); // Cost not deducted
    }

    @Test
    void testDoubleInstant_Blocked() {
        caster.startTurn();

        // 1. Cast instant spell -> Allowed
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.isInstantSpellCastThisTurn()).isTrue();
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // 2. Cast another instant spell -> Blocked
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(90); // Cost not deducted
    }

    @Test
    void testChannelingBlockInstant() {
        // --- Turn 1 ---
        caster.startTurn();

        // Cast channeled spell block instant -> Allowed
        spellService.castSpell(channeledSpellBlockInstant, caster, target, null);
        assertThat(caster.isBanalSpellCastThisTurn()).isTrue();
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(3);
        assertThat(caster.isAllowInstantDuringCurrentChanneling()).isFalse();
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // --- Turn 2 (Channeling remaining: 2) ---
        caster.startTurn(); // Decrements channeling turns by 1 to 2.
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(2);
        assertThat(caster.isBanalSpellCastThisTurn()).isFalse(); // blocked by channeling
        assertThat(caster.isInstantSpellCastThisTurn()).isFalse(); // blocked by channeling

        // Attempting to cast banal spell -> Blocked
        spellService.castSpell(banalSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // Attempting to cast instant spell -> Blocked
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // --- Turn 3 (Channeling remaining: 1) ---
        caster.startTurn(); // Decrements to 1.
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(1);
        assertThat(caster.isBanalSpellCastThisTurn()).isFalse(); // blocked by channeling
        assertThat(caster.isInstantSpellCastThisTurn()).isFalse(); // blocked by channeling

        // Attempting to cast instant spell -> Blocked
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // --- Turn 4 (Channeling finished) ---
        caster.startTurn(); // Decrements to 0, channeling terminates.
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(0);
        assertThat(caster.isBanalSpellCastThisTurn()).isFalse(); // released
        assertThat(caster.isInstantSpellCastThisTurn()).isFalse(); // released

        // Cast instant spell -> Allowed
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(80);

        // Cast banal spell -> Allowed
        spellService.castSpell(banalSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(70);
    }

    @Test
    void testChannelingAllowInstant() {
        // --- Turn 1 ---
        caster.startTurn();

        // Cast channeled spell allowing instant -> Allowed
        spellService.castSpell(channeledSpellAllowInstant, caster, target, null);
        assertThat(caster.isBanalSpellCastThisTurn()).isTrue();
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(3);
        assertThat(caster.isAllowInstantDuringCurrentChanneling()).isTrue();
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // --- Turn 2 (Channeling remaining: 2) ---
        caster.startTurn(); // Decrements channeling turns by 1 to 2.
        assertThat(caster.getRemainingChannelingTurns()).isEqualTo(2);
        assertThat(caster.isBanalSpellCastThisTurn()).isFalse(); // blocked by channeling
        assertThat(caster.isInstantSpellCastThisTurn()).isFalse(); // instant is ALLOWED

        // Attempting to cast banal spell -> Blocked
        spellService.castSpell(banalSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(90);

        // Cast instant spell -> Allowed
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.isInstantSpellCastThisTurn()).isTrue();
        assertThat(caster.getManaCurrent()).isEqualTo(80);

        // Attempting a second instant spell in Turn 2 -> Blocked
        spellService.castSpell(instantSpell, caster, target, null);
        assertThat(caster.getManaCurrent()).isEqualTo(80);
    }
}
