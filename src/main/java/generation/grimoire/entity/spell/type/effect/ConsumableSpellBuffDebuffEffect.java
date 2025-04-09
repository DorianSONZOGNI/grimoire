package generation.grimoire.entity.spell.type.effect;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Transient;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;


@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("CONSUMABLE_BUFF")
public class ConsumableSpellBuffDebuffEffect extends BuffDebuffEffect {

    /**
     * Liste des sorts qui ont été impactés par ce buff (pour suivi ou log).
     */
    @Transient
    private List<Spell> impactedSpells = new ArrayList<>();

    /**
     * Nombre de sorts restants sur lesquels ce buff s'appliquera.
     */
    private int remainingApplications;

    /**
     * Constructeur par défaut.
     * Par défaut, le buff s'applique sur 1 sort et aucun bonus n'est appliqué (modifier = 1.0, donc pas de changement).
     */
    public ConsumableSpellBuffDebuffEffect() {
        this.remainingApplications = 1;
        // Par défaut, ne modifier aucun effet (1.0 = multiplicateur neutre)
        this.setModifier(1.0);
    }

    /**
     * Constructeur paramétré.
     *
     * @param remainingApplications Le nombre de sorts qui seront buffés.
     * @param modifier              Le multiplicateur à appliquer (par exemple, 1.5 pour +50%).
     */
    public ConsumableSpellBuffDebuffEffect(int remainingApplications, double modifier) {
        this.remainingApplications = remainingApplications;
        this.setModifier(modifier);
    }

    /**
     * Applique le buff sur le sort passé en paramètre.
     * Pour chaque effet de type DamageEffect du sort, le multiplicateur d'amplification est multiplié par getModifier().
     *
     * @param spell Le sort à modifier.
     */
    public void applyToSpell(Spell spell) {
        // Pour tous les effets de dégâts (qui étendent DamageEffect)
        spell.getEffects().stream()
                .filter(effect -> effect instanceof DamageEffect)
                .forEach(effect -> {
                    DamageEffect damageEffect =
                            (DamageEffect) effect;
                    double currentMult = damageEffect.getAmplificationMultiplier();
                    damageEffect.setAmplificationMultiplier(currentMult * getModifier());
                });
        impactedSpells.add(spell);
        remainingApplications--;
        System.out.println("Buff consommable appliqué sur le sort " + spell.getNom() +
                " avec un multiplicateur de " + getModifier() +
                ". Sorts restants : " + remainingApplications);
    }

    /**
     * Méthode d'application standard héritée de SpellEffect.
     * Ici, cet effet est consommable sur le prochain sort, donc cette méthode n'est pas utilisée directement.
     *
     * @param caster le personnage qui lance le sort.
     * @param target la cible (non utilisé ici).
     */
    @Override
    public void apply(Personnage caster, Personnage target) {
        // Cet effet doit être appliqué via applyToSpell(Spell).
    }

    /**
     * Indique si le buff est toujours actif.
     *
     * @return true si remainingApplications > 0, false sinon.
     */
    public boolean isActive() {
        return remainingApplications > 0;
    }
}