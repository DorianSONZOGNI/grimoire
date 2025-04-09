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
        return switch (source) {
            case CASTER_POWER -> caster.getPower();
            case TARGET_MANA_MISSING -> target.getManaMax() - target.getManaCurrent();
            case TARGET_HEALTH_MAX -> target.getHealthMax();
            case CASTER_MANA_MAX -> caster.getManaMax();
            case TARGET_HEALTH_MISSING -> target.getHealthMax() - target.getHealthCurrent();
            default -> throw new IllegalArgumentException("Source de calcul non supportée : " + source);
        };
    }

}
