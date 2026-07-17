package generation.grimoire.enumeration;


public enum EquipmentSlot {
    CASQUE("Casque", "masks", "#a855f7", "flip-icon"),
    PLASTRON("Plastron", "shield", "#3b82f6", ""),
    ARME_DEUX_MAINS("Arme 2M", "swords", "#ef4444", ""),
    ARME_GAUCHE("Arme 1M", "colorize", "#ef4444", ""),
    ARME_DROITE("Arme Sec.", "security", "#ef4444", ""),
    ANNEAU_GAUCHE("Anneau G.", "diamond", "#f59e0b", ""),
    ANNEAU_DROIT("Anneau D.", "diamond", "#f59e0b", ""),
    BOTTES("Bottes", "footprint", "#10b981", ""),
    CAPE("Cape", "carpenter", "#ec4899", ""),
    @Deprecated
    ARME("Arme", "swords", "#ef4444", ""), // Gardé temporairement pour éviter le crash avec les anciens objets en BDD
    CONSOMMABLE("Consommable", "inventory_2", "#854c4c", "");

    private final String label;
    private final String icon;
    private final String colorHex;
    private final String extraClass;

    EquipmentSlot(String label, String icon, String colorHex, String extraClass) {
        this.label = label;
        this.icon = icon;
        this.colorHex = colorHex;
        this.extraClass = extraClass;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getIcon() { return icon; }
    public String getColorHex() { return colorHex; }
    public String getExtraClass() { return extraClass; }
}


