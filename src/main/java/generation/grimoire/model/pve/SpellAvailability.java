package generation.grimoire.model.pve;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Représente la disponibilité d'un sort pour le joueur pendant le combat.
 * Envoyé au frontend pour griser les sorts non-lançables avec une icône explicative.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpellAvailability {
    private Long spellId;
    private boolean castable;
    
    /**
     * Raison du blocage :
     * - "RESOURCE"      : pas assez de mana, PV ou chaleur
     * - "CONDITION"     : condition de spiritualité non remplie (Esprit, Ténèbres, Karma)
     * - "ACTION_LIMIT"  : action déjà consommée ce tour (instantané, banal)
     * - "CHANNELING"    : canalisation en cours
     * - null            : le sort est lançable
     */
    private String reason;
    
    /** Message explicatif pour le tooltip */
    private String tooltip;
    
    public static SpellAvailability available(Long spellId) {
        return new SpellAvailability(spellId, true, null, null);
    }
    
    public static SpellAvailability blocked(Long spellId, String reason, String tooltip) {
        return new SpellAvailability(spellId, false, reason, tooltip);
    }
}
