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

    @Override
    public void onTurnStart(Personnage personnage) {
        // Supprimer tous les anciens buffs de consolidation
        personnage.getActiveBuffs().removeIf(b -> SOURCE_NAME.equals(b.getSourceName()));
        
        int maxHp = personnage.getHealthMax();
        int currentHp = personnage.getHealthCurrent();
        double threshold = maxHp * 0.20;

        if (currentHp > threshold) {
            int hpCost = (int) (maxHp * 0.05);
            personnage.setHealthCurrent(Math.max(1, currentHp - hpCost));
            
            int shieldAmount = (int) (currentHp * 0.10);
            personnage.addShield(shieldAmount, 1, SOURCE_NAME);
            
            System.out.println(personnage.getName() + " perd " + hpCost + " PV et gagne un bouclier de " + shieldAmount + " (Consolidation).");
        } else {
            addModifierBuff(personnage, StatType.ARMURE, 0.20);
            addModifierBuff(personnage, StatType.RESISTANCE, 0.20);
            System.out.println(personnage.getName() + " bénéficie de +20% d'armure et de résistance magique (Consolidation - Urgence).");
        }
    }

    private void addModifierBuff(Personnage personnage, StatType stat, double modifier) {
        BuffDebuffEffect buff = new BuffDebuffEffect();
        buff.setStatAffected(stat);
        buff.setModifier(modifier);
        buff.setFlatValue(0);
        buff.setDuration(1);
        buff.setSourceName(SOURCE_NAME);
        personnage.getActiveBuffs().add(buff);
    }

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Plus d'effet au lancement de sort pour cette voie
    }

    @Override
    public void adjustSpellCosts(Personnage caster, Spell spell, int[] costs) {
        // Pas d'ajustement de coût
    }
}