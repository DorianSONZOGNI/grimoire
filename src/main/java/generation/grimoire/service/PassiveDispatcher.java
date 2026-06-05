package generation.grimoire.service;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.event.GameEvent;
import generation.grimoire.passif.PassiveEffect;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Service centralisé qui collecte les passifs pertinents d'un personnage
 * et leur dispatch les événements de gameplay dans l'ordre de priorité.
 * <p>
 * Ce service est un pur médiateur sans état : il ne gère pas l'enregistrement
 * des passifs, il les collecte dynamiquement depuis les entités du personnage
 * (Voie, Spiritualité, et potentiellement le sort lui-même).
 */
@Service
public class PassiveDispatcher {

    /**
     * Dispatche un événement de gameplay à tous les passifs pertinents du
     * personnage,
     * triés par priorité décroissante (les plus prioritaires s'exécutent en
     * premier).
     *
     * @param caster le personnage dont on collecte les passifs
     * @param spell  le sort en cours de lancement (peut être null pour
     *               TurnStartEvent)
     * @param event  l'événement à dispatcher
     */
    public void dispatch(Personnage caster, Spell spell, GameEvent event) {
        List<PassiveEffect> passives = collectPassives(caster, spell);
        passives.sort(Comparator.comparingInt(PassiveEffect::getPriority).reversed());
        for (PassiveEffect passive : passives) {
            passive.onEvent(event);
        }
    }

    /**
     * Collecte l'ensemble des passifs pertinents pour un personnage donné et un
     * sort.
     * Sources considérées :
     * <ol>
     * <li>Passifs de la Voie du personnage</li>
     * <li>Passifs de la Spiritualité du personnage</li>
     * <li>Passifs de la Spiritualité du sort (si différente de celle du
     * personnage)</li>
     * </ol>
     *
     * @param caster le personnage
     * @param spell  le sort (peut être null)
     * @return la liste des passifs applicables
     */
    private List<PassiveEffect> collectPassives(Personnage caster, Spell spell) {
        List<PassiveEffect> result = new ArrayList<>();

        // Passifs de la Voie du personnage
        if (caster.getVoie() != null && caster.getVoie().getPassiveEffects() != null) {
            result.addAll(caster.getVoie().getPassiveEffects());
        }

        // Passifs de la Spiritualité du personnage
        if (caster.getSpiritualite() != null && caster.getSpiritualite().getPassiveEffects() != null) {
            result.addAll(caster.getSpiritualite().getPassiveEffects());
        }

        // Passifs de la Spiritualité du sort (si différente de celle du personnage)
        if (spell != null && spell.getSpiritualite() != null) {
            boolean sameId = caster.getSpiritualite() != null && caster.getSpiritualite().getId() != null && spell.getSpiritualite().getId() != null && caster.getSpiritualite().getId().equals(spell.getSpiritualite().getId());
            boolean sameName = caster.getSpiritualite() != null && caster.getSpiritualite().getNom() != null && caster.getSpiritualite().getNom().equals(spell.getSpiritualite().getNom());
            
            if (caster.getSpiritualite() == null || (!sameId && !sameName)) {
                if (spell.getSpiritualite().getPassiveEffects() != null) {
                    result.addAll(spell.getSpiritualite().getPassiveEffects());
                }
            }
        }

        return result;
    }
}
