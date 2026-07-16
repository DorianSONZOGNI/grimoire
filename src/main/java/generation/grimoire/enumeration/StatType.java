package generation.grimoire.enumeration;

public enum StatType {
    SPEED("Vitesse", "bolt"),
    MANA("Mana", "water_drop"),
    HEALTH("Points de Vie", "favorite"),
    CRIT("Critique", "gps_fixed"),
    ARMURE("Armure", "shield"),
    RESISTANCE("Résistance", "shield"),
    POWER("Puissance", "auto_awesome"),
    STRENGTH("Force", "fitness_center"),
    BURN("Brûlure", "local_fire_department"),
    POISON("Poison", "science"),
    DAMAGE_TAKEN_MAGIC("Dégâts subis (Magique)", "flash_on"),
    DAMAGE_TAKEN_PHYSIC("Dégâts subis (Physique)", "flash_on"),
    DAMAGE_TAKEN_BRUT("Dégâts subis (Brut)", "flash_on"),
    DAMAGE_GIVEN_MAGIC("Dégâts infligés (Magique)", "bolt"),
    DAMAGE_GIVEN_PHYSIC("Dégâts infligés (Physique)", "bolt"),
    DAMAGE_GIVEN_BRUT("Dégâts infligés (Brut)", "bolt"),
    HEAL_RECEIVED("Soins reçus", "healing"),
    SHIELD_RECEIVED("Bouclier reçu", "security"),
    HEAL_GIVEN("Soins prodigués", "healing"),
    SHIELD_GIVEN("Bouclier prodigué", "security"),
    DAMAGE_GIVEN_MAGIC_TO_SHIELD("Dégâts sur bouclier (Magique)", "broken_image"),
    DAMAGE_GIVEN_PHYSIC_TO_SHIELD("Dégâts sur bouclier (Physique)", "broken_image"),
    SHIELD_PENETRATION("Pénétration de bouclier", "crisis_alert"),
    SHIELD_PIERCED("Bouclier percé", "crisis_alert"),
    AME_DETACHEE("Âme détachée", "blur_on");

    private final String label;
    private final String icon;

    StatType(String label, String icon) {
        this.label = label;
        this.icon = icon;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getIcon() { return icon; }

    @Override
    public String toString() {
        return label;
    }
}


