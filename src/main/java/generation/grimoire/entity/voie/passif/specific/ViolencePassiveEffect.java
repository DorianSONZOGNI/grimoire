package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.personnage.PersonnageCombatHelper;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.SpellCategory;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCastEvent;
import generation.grimoire.event.TurnStartEvent;
import generation.grimoire.event.SpellChannelingTickEvent;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("VIOLENCE_PASSIVE")
public class ViolencePassiveEffect extends VoiePassiveEffect {

    private static final String STATE_INSPIRATION = "violence_inspiration";
    private static final String STATE_EXPIRATION = "violence_expiration";

    @Override
    public void onEvent(GameEvent event) {
        if (event instanceof SpellCastEvent e) {
            handleSpellCast(e);
        } else if (event instanceof SpellChannelingTickEvent e) {
            handleSpellChannelingTick(e);
        } else if (event instanceof TurnStartEvent e) {
            handleTurnStart(e);
        } else {
            super.onEvent(event);
        }
    }

    private void handleSpellChannelingTick(SpellChannelingTickEvent event) {
        Spell spell = event.getSpell();
        if (spell.getVoie() != null && "Voie de la Violence".equals(spell.getVoie().getNom())) {
            applyViolencePassive(event.getSource(), spell);
        }
    }

    private void handleSpellCast(SpellCastEvent event) {
        Spell spell = event.getSpell();
        if (spell.getVoie() != null && "Voie de la Violence".equals(spell.getVoie().getNom())) {
            applyViolencePassive(event.getSource(), spell);
        }
    }

    private void applyViolencePassive(Personnage personnage, Spell spell) {
        int inspirationCount = personnage.getPassiveState(STATE_INSPIRATION, 0);
        int expirationCount = personnage.getPassiveState(STATE_EXPIRATION, 0);

        if (spell.getCategory() == SpellCategory.INSPIRATION) {
            // Swap check: Consuming Expiration stacks
            if (expirationCount >= 4 && expirationCount <= 6) {
                applyBuff(personnage, StatType.STRENGTH, 0.30, 0, 2);
            } else if (expirationCount >= 7) {
                applyBuff(personnage, StatType.STRENGTH, 0.60, 0, 2);
            }

            personnage.setPassiveState(STATE_EXPIRATION, 0); // Reset Expiration

            // Check if we are casting same type after 6 stacks
            if (inspirationCount >= 6) {
                applyBurn(personnage);
            }

            inspirationCount = Math.min(inspirationCount + 1, 7);
            personnage.setPassiveState(STATE_INSPIRATION, inspirationCount);

            System.out.println(personnage.getName() + " cast Inspiration. Stacks: " + inspirationCount + "/7");

        } else if (spell.getCategory() == SpellCategory.EXPIRATION) {
            // Swap check: Consuming Inspiration stacks
            if (inspirationCount >= 4 && inspirationCount <= 6) {
                applyBuff(personnage, StatType.CRIT, 0, 100, 2);
            } else if (inspirationCount >= 7) {
                applyBuff(personnage, StatType.CRIT, 0, 200, 2);
            }

            personnage.setPassiveState(STATE_INSPIRATION, 0); // Reset Inspiration

            // Check if we are casting same type after 6 stacks
            if (expirationCount >= 6) {
                applyBurn(personnage);
            }

            expirationCount = Math.min(expirationCount + 1, 7);
            personnage.setPassiveState(STATE_EXPIRATION, expirationCount);

            System.out.println(personnage.getName() + " cast Expiration. Stacks: " + expirationCount + "/7");
        }
    }

    private void applyBuff(Personnage personnage, StatType statType, double modifier, int flatValue, int duration) {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(statType);
        buff.setModifier(modifier);
        buff.setFlatValue(flatValue);
        buff.setDuration(duration);
        buff.setSourceName("Violence (Swap)");
        personnage.applyBuff(buff, modifier);
    }

    private void applyBurn(Personnage personnage) {
        int power = PersonnageCombatHelper.getEffectiveStat(personnage, StatType.POWER);
        int strength = PersonnageCombatHelper.getEffectiveStat(personnage, StatType.STRENGTH);
        int burnDamage = (int) Math.round((power * 0.15) + (strength * 0.15));

        BuffDebuffEffect burn = new BuffDebuffEffect();
        burn.setStatAffected(StatType.BURN);
        burn.setFlatValue(burnDamage);
        burn.setDuration(3);
        burn.setSourceName("Violence (Surcharge)");
        personnage.applyBuff(burn, 0.0); // modifier is 0.0, we use flatValue

        System.out.println(personnage.getName() + " subit un contrecoup de Brûlure (" + burnDamage
                + " dégâts de Brûlure par tour pour 3 tours).");
    }

    private void handleTurnStart(TurnStartEvent event) {
        // La logique des dégâts de surcharge a été remplacée par l'application de
        // brûlures lors du lancer.
    }

    // ─── Méthodes legacy (conservées pour rétro-compatibilité) ───

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        handleSpellCast(new SpellCastEvent(personnage, null, spell));
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        handleTurnStart(new TurnStartEvent(personnage));
    }
}
