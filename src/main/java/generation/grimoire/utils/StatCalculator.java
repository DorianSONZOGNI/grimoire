package generation.grimoire.utils;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.Source;

public class StatCalculator {

    /**
     * Récupère la valeur de la statistique définie par 'source' en utilisant les données du caster et de la target.
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
            case CASTER_POWER -> caster.getPower();
            case TARGET_POWER -> target.getPower();
            case CASTER_MANA_MAX -> caster.getManaMax();
            case TARGET_MANA_MAX -> target.getManaMax();
            case TARGET_MANA_MISSING -> target.getManaMax() - target.getManaCurrent();
            case CASTER_MANA_MISSING -> caster.getManaMax() - caster.getManaCurrent();
            case TARGET_HEALTH_MAX -> target.getHealthMax();
            case CASTER_HEALTH_MAX -> caster.getHealthMax();
            case TARGET_HEALTH_MISSING -> target.getHealthMax() - target.getHealthCurrent();
            case CASTER_HEALTH_MISSING -> caster.getHealthMax() - caster.getHealthCurrent();
        };
    }

}
