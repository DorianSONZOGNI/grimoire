package generation.grimoire.entity.voie.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.enumeration.StatType;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("CONSOLIDATION_PASSIVE")
public class ConsolidationPassiveEffect extends VoiePassiveEffect {

    private static final String SOURCE_NAME = "CONSOLIDATION";
    private static final String STATE_CAST_THIS_TURN = "consolidation_cast_this_turn";
    private static final String STATE_ACTIVE_LEVEL = "consolidation_active_level";

    @Override
    public void onTurnStart(Personnage personnage) {
        int castLastTurn = personnage.getPassiveState(STATE_CAST_THIS_TURN, 0);

        // Supprimer tous les anciens buffs de consolidation
        personnage.getActiveBuffs().removeIf(b -> SOURCE_NAME.equals(b.getSourceName()));

        if (castLastTurn == 0) {
            // Aucun sort lancé au tour précédent → buff par défaut +5% armure
            applyDefaultBuff(personnage);
            personnage.setPassiveState(STATE_ACTIVE_LEVEL, 0);
        } else {
            // Un sort a été lancé, on ré-applique le buff pour qu'il dure ce tour
            int activeLevel = personnage.getPassiveState(STATE_ACTIVE_LEVEL, 0);
            switch (activeLevel) {
                case 1 -> applyLevel1(personnage);
                case 2 -> applyLevel2(personnage);
                case 3 -> applyLevel3(personnage);
                case 4 -> applyLevel4(personnage);
                case 5 -> applyLevel5(personnage);
                default -> {
                    applyDefaultBuff(personnage);
                    personnage.setPassiveState(STATE_ACTIVE_LEVEL, 0);
                }
            }
        }

        // Réinitialiser le flag pour ce nouveau tour
        personnage.setPassiveState(STATE_CAST_THIS_TURN, 0);
    }

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        int niveau = spell.getNiveau();
        if (niveau < 1 || niveau > 5) {
            return; // Niveau hors limites, on ignore
        }

        // Supprimer tous les anciens buffs de consolidation
        personnage.getActiveBuffs().removeIf(b -> SOURCE_NAME.equals(b.getSourceName()));

        // Appliquer le buff basé sur le niveau du sort
        switch (niveau) {
            case 1 -> applyLevel1(personnage);
            case 2 -> applyLevel2(personnage);
            case 3 -> applyLevel3(personnage);
            case 4 -> applyLevel4(personnage);
            case 5 -> applyLevel5(personnage);
        }

        personnage.setPassiveState(STATE_CAST_THIS_TURN, 1);
        personnage.setPassiveState(STATE_ACTIVE_LEVEL, niveau);
    }

    @Override
    public void adjustSpellCosts(Personnage caster, Spell spell, int[] costs) {
        int activeLevel = caster.getPassiveState(STATE_ACTIVE_LEVEL, 0);
        if (activeLevel == 4) {
            // -20% sur le coût des sorts
            costs[0] = (int) Math.round(costs[0] * 0.80);
            costs[1] = (int) Math.round(costs[1] * 0.80);
            if (costs.length > 2) {
                costs[2] = (int) Math.round(costs[2] * 0.80);
            }
        }
    }

    // ─── Buffs par défaut et par niveau ───

    private void applyDefaultBuff(Personnage personnage) {
        addModifierBuff(personnage, StatType.ARMURE, 0.05);
        System.out.println(personnage.getName() + " bénéficie de +5% d'armure (Consolidation - par défaut).");
    }

    /** Lvl 1 : +1 Vitesse */
    private void applyLevel1(Personnage personnage) {
        addFlatBuff(personnage, StatType.SPEED, 1);
        System.out.println(personnage.getName() + " bénéficie de +1 Vitesse (Consolidation - Lvl 1).");
    }

    /** Lvl 2 : +10% Armure */
    private void applyLevel2(Personnage personnage) {
        addModifierBuff(personnage, StatType.ARMURE, 0.10);
        System.out.println(personnage.getName() + " bénéficie de +10% d'armure (Consolidation - Lvl 2).");
    }

    /** Lvl 3 : +10% Résistance magique */
    private void applyLevel3(Personnage personnage) {
        addModifierBuff(personnage, StatType.RESISTANCE, 0.10);
        System.out.println(personnage.getName() + " bénéficie de +10% de résistance magique (Consolidation - Lvl 3).");
    }

    /** Lvl 4 : -20% coût des sorts (via adjustSpellCosts) */
    private void applyLevel4(Personnage personnage) {
        // Pas de buff classique, la réduction est gérée par adjustSpellCosts
        System.out.println(personnage.getName() + " bénéficie de -20% sur le coût des sorts (Consolidation - Lvl 4).");
    }

    /** Lvl 5 : +8% Armure et +8% Résistance magique */
    private void applyLevel5(Personnage personnage) {
        addModifierBuff(personnage, StatType.ARMURE, 0.08);
        addModifierBuff(personnage, StatType.RESISTANCE, 0.08);
        System.out.println(personnage.getName()
                + " bénéficie de +8% d'armure et +8% de résistance magique (Consolidation - Lvl 5).");
    }

    // ─── Utilitaires ───

    private void addModifierBuff(Personnage personnage, StatType stat, double modifier) {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(stat);
        buff.setModifier(modifier);
        buff.setFlatValue(0);
        buff.setDuration(1);
        buff.setSourceName(SOURCE_NAME);
        personnage.getActiveBuffs().add(buff);
    }

    private void addFlatBuff(Personnage personnage, StatType stat, int value) {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(stat);
        buff.setFlatValue(value);
        buff.setDuration(1);
        buff.setSourceName(SOURCE_NAME);
        personnage.getActiveBuffs().add(buff);
    }
}