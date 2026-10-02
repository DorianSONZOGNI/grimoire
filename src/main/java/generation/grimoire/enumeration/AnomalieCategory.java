package generation.grimoire.enumeration;

public enum AnomalieCategory {
    PIERRE("Pierre", "landslide"),
    METAL("Métal", "hardware"),
    COEUR("Cœur", "favorite"),
    ORBE("Orbe", "lens"),
    CRISTAL("Cristal", "diamond"),
    PLUME("Plume", "history_edu"),
    ECAILLE("Écaille", "waves"),
    GOUTTE("Goutte", "water_drop"),
    LIVRE("Livre", "auto_stories"),
    CRANE("Crâne", "skull"),
    SABLIER_VIDE("Sablier vide", "hourglass_empty"),
    SABLIER_PLEIN("Sablier plein", "hourglass_full"),
    MATIERE("Matière", "matter"),
    JETON("Jeton", "token"),
    DRONE("Drone", "drone_2"),
    CUBE("Cube", "deployed_code"),
    TECH("Tech", "memory"),
    AUTRE("Autre", "category");

    private final String label;
    private final String icon;

    AnomalieCategory(String label, String icon) {
        this.label = label;
        this.icon = icon;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getIcon() { return icon; }
}

