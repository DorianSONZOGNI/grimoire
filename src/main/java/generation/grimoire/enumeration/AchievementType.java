package generation.grimoire.enumeration;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;

@Getter
@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum AchievementType {
    // === COMBAT & DONJONS ===
    MIRACULE(
        "MIRACULE",
        "C'était calculé",
        "Gagner un combat avec moins de 3% de PV sur au moins un de vos héros.",
        "health_and_safety",
        AchievementCategory.COMBAT,
        "Le Miraculé",
        1,
        false
    ),
    POINT_FAIBLE_TROP_FORT(
        "POINT_FAIBLE_TROP_FORT",
        "Point faible, trop fort",
        "Terminer un donjon sans jamais avoir perdu plus de 5% de PV max sur aucun de vos héros.",
        "shield_with_heart",
        AchievementCategory.COMBAT,
        "L'Intouchable",
        1,
        false
    ),
    TUEUR_DE_GEANTS(
        "TUEUR_DE_GEANTS",
        "Tueur de Géants",
        "Battre un boss de secret de niveau 3 avec des héros niveau 3 maximum.",
        "swords",
        AchievementCategory.COMBAT,
        "Tueur de Géants",
        1,
        false
    ),
    COURAGE_FUYONS(
        "COURAGE_FUYONS",
        "Courage, fuyons !",
        "Fuir 10 combats.",
        "directions_run",
        AchievementCategory.COMBAT,
        "Froussard",
        10,
        false
    ),

    // === ALCHIMIE & SECRETS ===
    GRAND_TRANSMUTATEUR(
        "GRAND_TRANSMUTATEUR",
        "Grand Transmutateur",
        "Réussir 50 transmutations.",
        "science",
        AchievementCategory.ALCHEMY,
        "Le primordial",
        50,
        false
    ),
    MAITRE_DE_LA_VERITE(
        "MAITRE_DE_LA_VERITE",
        "Maître de la Vérité",
        "Monter tous les secrets au niveau 3.",
        "auto_stories",
        AchievementCategory.ALCHEMY,
        "Architecte",
        11,
        false
    ),
    GRAND_GOURMET(
        "GRAND_GOURMET",
        "Grand gourmet",
        "Débloquer toutes les recettes de consommables.",
        "restaurant",
        AchievementCategory.ALCHEMY,
        "Grand Gourmet",
        0,
        false
    ),
    COLLECTIONNEUR(
        "COLLECTIONNEUR",
        "Collectionneur",
        "Débloquer toutes les recettes d'équipements.",
        "inventory_2",
        AchievementCategory.ALCHEMY,
        "Le Collecteur",
        0,
        false
    ),
    MYSTICISME(
        "MYSTICISME",
        "Mysticisme",
        "Débloquer toutes les recettes d'anomalies.",
        "psychology",
        AchievementCategory.ALCHEMY,
        "Prophète des dieux",
        0,
        false
    ),

    // === COFFRES & LOOTS ===
    BENI_DES_DIEUX(
        "BENI_DES_DIEUX",
        "Béni des Dieux",
        "Obtenir un item Mythique dans un coffre.",
        "auto_awesome",
        AchievementCategory.LOOT,
        "Béni des Dieux",
        1,
        false
    ),
    SET_PARFAIT(
        "SET_PARFAIT",
        "Set Parfait",
        "Équiper 4 pièces légendaires sur un héros et terminer un donjon avec.",
        "stars",
        AchievementCategory.LOOT,
        "L'Impeccable",
        1,
        false
    ),
    PILLEUR_INSATIABLE(
        "PILLEUR_INSATIABLE",
        "Pilleur Insatiable",
        "Ouvrir 100 coffres de donjon.",
        "lock_open",
        AchievementCategory.LOOT,
        "Pilleur Insatiable",
        100,
        false
    ),
    ZERO_DECHET(
        "ZERO_DECHET",
        "Zéro Déchet",
        "Recycler ou vendre 50 équipements.",
        "delete_sweep",
        AchievementCategory.LOOT,
        "Écolo",
        50,
        false
    ),

    // === FORTUNE & ÉCONOMIE ===
    CERCUEIL_DORE(
        "CERCUEIL_DORE",
        "Un cercueil doré",
        "Accumuler 10 000 pièces d'or.",
        "payments",
        AchievementCategory.ECONOMY,
        "Crésus",
        10000,
        false
    ),
    CLIENT_VIP(
        "CLIENT_VIP",
        "Client VIP",
        "Dépenser 5 000 or chez le Marchand.",
        "storefront",
        AchievementCategory.ECONOMY,
        "VIP",
        5000,
        false
    ),
    CLIENT_FIDELE(
        "CLIENT_FIDELE",
        "Client fidèle",
        "Améliorer la boutique au niveau maximum.",
        "loyalty",
        AchievementCategory.ECONOMY,
        "Mécène",
        1,
        false
    ),

    // === SUCCÈS CACHÉS ===
    MALEDICTION(
        "MALEDICTION",
        "Malédiction",
        "Obtenir un item maudit dans un coffre.",
        "dangerous",
        AchievementCategory.HIDDEN,
        "L'imprononçable",
        1,
        true
    ),
    POINT_FORT_TROP_FAIBLE(
        "POINT_FORT_TROP_FAIBLE",
        "Point fort, trop faible",
        "Mourir au premier tour de combat.",
        "skull",
        AchievementCategory.HIDDEN,
        "L'Éphémère",
        1,
        true
    );

    private final String code;
    private final String label;
    private final String description;
    private final String icon;
    private final AchievementCategory category;
    private final String rewardTitle;
    private final int goalValue;
    private final boolean hidden;

    AchievementType(String code, String label, String description, String icon,
                    AchievementCategory category, String rewardTitle, int goalValue, boolean hidden) {
        this.code = code;
        this.label = label;
        this.description = description;
        this.icon = icon;
        this.category = category;
        this.rewardTitle = rewardTitle;
        this.goalValue = goalValue;
        this.hidden = hidden;
    }
}
