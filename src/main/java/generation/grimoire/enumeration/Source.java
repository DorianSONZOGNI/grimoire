package generation.grimoire.enumeration;


// Pour le calcul des statistiques
public enum Source {
    CASTER_POWER("Puiss. Lanceur"),
    TARGET_POWER("Puiss. Cible"),
    CASTER_PHYSICAL_POWER("Force Phy. Lanceur"),
    TARGET_PHYSICAL_POWER("Force Phy. Cible"),
    CASTER_MANA_MAX("Mana Max Lanc."),
    TARGET_MANA_MAX("Mana Max Cib."),
    CASTER_MANA_MISSING("Mana Manq. Lanc."),
    TARGET_MANA_MISSING("Mana Manq. Cib."),
    CASTER_MANA_CURRENT("Mana Act. Lanc."),
    TARGET_MANA_CURRENT("Mana Act. Cib."),
    CASTER_HEALTH_MAX("PV Max Lanc."),
    TARGET_HEALTH_MAX("PV Max Cib."),
    CASTER_HEALTH_MISSING("PV Manq. Lanc."),
    TARGET_HEALTH_MISSING("PV Manq. Cib."),
    CASTER_HEALTH_CURRENT("PV Act. Lanc."),
    TARGET_HEALTH_CURRENT("PV Act. Cib.");

    private final String label;

    Source(String label) {
        this.label = label;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
}


