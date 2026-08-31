package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.event.GameEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PassiveDispatcherTest {

    @InjectMocks
    private PassiveDispatcher passiveDispatcher;

    @Mock
    private Personnage caster;
    @Mock
    private Spell spell;
    @Mock
    private GameEvent event;

    private Voie casterVoie;
    private Spiritualite casterSpirit;

    @BeforeEach
    void setUp() {
        casterVoie = new Voie();
        casterVoie.setId(1L);
        casterVoie.setNom("Voie Caster");

        casterSpirit = new Spiritualite();
        casterSpirit.setId(1L);
        casterSpirit.setNom("Spirit Caster");
    }

    @Test
    void shouldSortPassivesByPriorityAndDispatchEvent() {
        // Given
        VoiePassiveEffect lowPriority = mock(VoiePassiveEffect.class, "LowPriority");
        when(lowPriority.getPriority()).thenReturn(10);

        VoiePassiveEffect highPriority = mock(VoiePassiveEffect.class, "HighPriority");
        when(highPriority.getPriority()).thenReturn(100);

        casterVoie.setPassiveEffects(List.of(lowPriority, highPriority));
        when(caster.getVoie()).thenReturn(casterVoie);
        when(caster.getSpiritualite()).thenReturn(null);

        // When
        passiveDispatcher.dispatch(caster, null, event);

        // Then
        InOrder inOrder = inOrder(highPriority, lowPriority);
        inOrder.verify(highPriority).onEvent(event);
        inOrder.verify(lowPriority).onEvent(event);
    }

    @Test
    void shouldCollectCasterPassivesWhenSpellIsNull() {
        VoiePassiveEffect voiePassive = mock(VoiePassiveEffect.class, "VoiePassive");
        casterVoie.setPassiveEffects(List.of(voiePassive));

        SpiritualitePassiveEffect spiritPassive = mock(SpiritualitePassiveEffect.class, "SpiritPassive");
        casterSpirit.setPassiveEffects(List.of(spiritPassive));

        when(caster.getVoie()).thenReturn(casterVoie);
        when(caster.getSpiritualite()).thenReturn(casterSpirit);

        passiveDispatcher.dispatch(caster, null, event);

        verify(voiePassive).onEvent(event);
        verify(spiritPassive).onEvent(event);
    }

    @Test
    void shouldCollectSpellPassivesWhenDifferentFromCaster() {
        // Caster has Voie 1 and Spirit 1
        VoiePassiveEffect casterVoiePassive = mock(VoiePassiveEffect.class, "CasterVoiePassive");
        casterVoie.setPassiveEffects(List.of(casterVoiePassive));

        SpiritualitePassiveEffect casterSpiritPassive = mock(SpiritualitePassiveEffect.class, "CasterSpiritPassive");
        casterSpirit.setPassiveEffects(List.of(casterSpiritPassive));

        when(caster.getVoie()).thenReturn(casterVoie);
        when(caster.getSpiritualite()).thenReturn(casterSpirit);

        // Spell has Voie 2 and Spirit 2
        Voie spellVoie = new Voie();
        spellVoie.setId(2L);
        spellVoie.setNom("Voie Spell");
        VoiePassiveEffect spellVoiePassive = mock(VoiePassiveEffect.class, "SpellVoiePassive");
        spellVoie.setPassiveEffects(List.of(spellVoiePassive));

        Spiritualite spellSpirit = new Spiritualite();
        spellSpirit.setId(2L);
        spellSpirit.setNom("Spirit Spell");
        SpiritualitePassiveEffect spellSpiritPassive = mock(SpiritualitePassiveEffect.class, "SpellSpiritPassive");
        spellSpirit.setPassiveEffects(List.of(spellSpiritPassive));

        when(spell.getVoie()).thenReturn(spellVoie);
        when(spell.getSpiritualite()).thenReturn(spellSpirit);

        // When
        passiveDispatcher.dispatch(caster, spell, event);

        // Then
        // Caster's Voie passives should NOT be called because spell's Voie is different
        verify(casterVoiePassive, never()).onEvent(any());
        // Spell's Voie passives SHOULD be called
        verify(spellVoiePassive).onEvent(event);

        // Caster's Spirit passives SHOULD be called (always collected)
        verify(casterSpiritPassive).onEvent(event);
        // Spell's Spirit passives SHOULD be called (because different from caster)
        verify(spellSpiritPassive).onEvent(event);
    }

    @Test
    void shouldNotDuplicatePassivesWhenSpellHasSameVoieAndSpirit() {
        // Spell has SAME Voie and Spirit as Caster
        VoiePassiveEffect casterVoiePassive = mock(VoiePassiveEffect.class, "CasterVoiePassive");
        casterVoie.setPassiveEffects(List.of(casterVoiePassive));

        SpiritualitePassiveEffect casterSpiritPassive = mock(SpiritualitePassiveEffect.class, "CasterSpiritPassive");
        casterSpirit.setPassiveEffects(List.of(casterSpiritPassive));

        when(caster.getVoie()).thenReturn(casterVoie);
        when(caster.getSpiritualite()).thenReturn(casterSpirit);

        when(spell.getVoie()).thenReturn(casterVoie);
        when(spell.getSpiritualite()).thenReturn(casterSpirit);

        // When
        passiveDispatcher.dispatch(caster, spell, event);

        // Then
        // Should only be called once
        verify(casterVoiePassive, times(1)).onEvent(event);
        verify(casterSpiritPassive, times(1)).onEvent(event);
    }
}
