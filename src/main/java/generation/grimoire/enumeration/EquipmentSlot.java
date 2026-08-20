package generation.grimoire.enumeration;

public enum EquipmentSlot {
    CASQUE("Casque",          "masks",       "#a855f7", "flip-icon", 1.0),
    PLASTRON("Plastron",      "shield",      "#3b82f6", "",          1.1),
    ARME_DEUX_MAINS("Arme 2M","swords",      "#ef4444", "",          1.1),
    ARME_GAUCHE("Arme 1M",    "colorize",    "#ef4444", "",          1.4),
    ARME_DROITE("Arme Sec.",  "security",   "#ef4444", "",          1.5),
    ANNEAU("Anneau",          "diamond",     "#f59e0b", "",          1.5),
    ANNEAU_GAUCHE("Anneau G.","diamond",     "#f59e0b", "",          1.5),
    ANNEAU_DROIT("Anneau D.", "diamond",     "#f59e0b", "",          1.5),
    BOTTES("Bottes",          "footprint",   "#10b981", "",          0.9),
    CAPE("Cape",              "carpenter",   "#ec4899", "",          1.2),
    @Deprecated
    ARME("Arme",              "swords",      "#ef4444", "",          1.0), // Gardé temporairement pour éviter le crash avec les anciens objets en BDD
    CONSOMMABLE("Consommable","inventory_2", "#854c4c", "",          1.0);

    private final String label;
    private final String icon;
    private final String colorHex;
    private final String extraClass;
    /** Multiplicateur de prix utilisé dans {@code Equipment.calculateShopPrice()}. */
    private final double shopMultiplier;

    EquipmentSlot(String label, String icon, String colorHex, String extraClass, double shopMultiplier) {
        this.label = label;
        this.icon = icon;
        this.colorHex = colorHex;
        this.extraClass = extraClass;
        this.shopMultiplier = shopMultiplier;
    }

    public String getName() { return name(); }
    public String getLabel() { return label; }
    public String getIcon() { return icon; }
    public String getColorHex() { return colorHex; }
    public String getExtraClass() { return extraClass; }
    public double getShopMultiplier() { return shopMultiplier; }
}
