package generation.grimoire.utils;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.StatType;

public class StatCalculator {

    /**
     * Récupère la valeur de la statistique définie par 'source' en utilisant les données du caster et de la target.
     * Les bonus flat provenant des passifs (ex: Violence, buffs) sont inclus pour les stats concernées.
     *
     * @param source  l'énumération définissant la source du calcul
     * @param caster  le personnage qui lance le sort
     * @param target  la cible du sort
     * @return la valeur correspondant à la source choisie
     */
    public static double getSourceValue(Source source, Personnage caster, Personnage target) {
        if (source == null) {
            return 1.0;
        }
        return switch (source) {
            case CASTER_POWER -> caster.getPower() + caster.getStatFlatBonus(StatType.POWER);
            case TARGET_POWER -> target.getPower() + target.getStatFlatBonus(StatType.POWER);
            case CASTER_PHYSICAL_POWER -> caster.getStrength() + caster.getStatFlatBonus(StatType.STRENGTH);
            case TARGET_PHYSICAL_POWER -> target.getStrength() + target.getStatFlatBonus(StatType.STRENGTH);
            case CASTER_MANA_MAX -> caster.getManaMax();
            case TARGET_MANA_MAX -> target.getManaMax();
            case TARGET_MANA_MISSING -> target.getManaMax() - target.getManaCurrent();
            case CASTER_MANA_MISSING -> caster.getManaMax() - caster.getManaCurrent();
            case TARGET_HEALTH_MAX -> target.getHealthMax();
            case CASTER_HEALTH_MAX -> caster.getHealthMax();
            case TARGET_HEALTH_MISSING -> target.getHealthMax() - target.getHealthCurrent();
            case CASTER_HEALTH_MISSING -> caster.getHealthMax() - caster.getHealthCurrent();
            case TARGET_HEALTH_CURRENT -> target.getHealthCurrent();
            case CASTER_HEALTH_CURRENT -> caster.getHealthCurrent();
            case CASTER_MANA_CURRENT -> caster.getManaCurrent();
            case TARGET_MANA_CURRENT -> target.getManaCurrent();
        };
    }

}
