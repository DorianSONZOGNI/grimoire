package generation.grimoire.enumeration;

public enum AnomalieCategory {
    PIERRE("Pierre", "landslide"),
    METAL("Métal", "hardware"),
    COEUR("Cœur", "favorite"),
    ORBE("Orbe", "lens"),
    CRISTAL("Cristal", "diamond"),
    PLUME("Plume", "history_edu"),
    ECAILLE("Écaille", "waves"),
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

