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

    // === DONJONS LIBRES & ÉTAPES DES SECRETS ===
    DONJONS_LIBRES(
        "DONJONS_LIBRES",
        "Pionnier des Terres Libres",
        "Terminer tous les donjons libres.",
        "explore",
        AchievementCategory.COMBAT,
        "L'Explorateur",
        0,
        false,
        null,
        0,
        true
    ),

    // 1. Secret du Chaos
    SECRET_CHAOS_1(
        "SECRET_CHAOS_1",
        "Éveil du Chaos",
        "Terminer tous les donjons du Secret du Chaos (Niveau 1).",
        "local_fire_department",
        AchievementCategory.COMBAT,
        "Étincelle Chaotique",
        0,
        false,
        "Secret du Chaos",
        1,
        false
    ),
    SECRET_CHAOS_2(
        "SECRET_CHAOS_2",
        "Embrasement du Chaos",
        "Terminer tous les donjons du Secret du Chaos (Niveau 2).",
        "local_fire_department",
        AchievementCategory.COMBAT,
        "Seigneur du Chaos",
        0,
        false,
        "Secret du Chaos",
        2,
        false
    ),
    SECRET_CHAOS_3(
        "SECRET_CHAOS_3",
        "Apocalypse",
        "Terminer tous les donjons du Secret du Chaos (Niveau 3).",
        "local_fire_department",
        AchievementCategory.COMBAT,
        "Avatar du Chaos",
        0,
        false,
        "Secret du Chaos",
        3,
        false
    ),

    // 2. Secret de l'Abondance
    SECRET_ABONDANCE_1(
        "SECRET_ABONDANCE_1",
        "Pousse d'Abondance",
        "Terminer tous les donjons du Secret de l'Abondance (Niveau 1).",
        "eco",
        AchievementCategory.COMBAT,
        "Fleurissant",
        0,
        false,
        "Secret de l'Abondance",
        1,
        false
    ),
    SECRET_ABONDANCE_2(
        "SECRET_ABONDANCE_2",
        "Floraison",
        "Terminer tous les donjons du Secret de l'Abondance (Niveau 2).",
        "eco",
        AchievementCategory.COMBAT,
        "Seigneur de la Nature",
        0,
        false,
        "Secret de l'Abondance",
        2,
        false
    ),
    SECRET_ABONDANCE_3(
        "SECRET_ABONDANCE_3",
        "Apogée Sylvestre",
        "Terminer tous les donjons du Secret de l'Abondance (Niveau 3).",
        "eco",
        AchievementCategory.COMBAT,
        "Gardien Primordial",
        0,
        false,
        "Secret de l'Abondance",
        3,
        false
    ),

    // 3. Secret de la Préservation
    SECRET_PRESERVATION_1(
        "SECRET_PRESERVATION_1",
        "Rempart du mépris",
        "Terminer tous les donjons du Secret de la Préservation (Niveau 1).",
        "foundation",
        AchievementCategory.COMBAT,
        "Sentinelle",
        0,
        false,
        "Secret de la Préservation",
        1,
        false
    ),
    SECRET_PRESERVATION_2(
        "SECRET_PRESERVATION_2",
        "Forteresse de solitude",
        "Terminer tous les donjons du Secret de la Préservation (Niveau 2).",
        "foundation",
        AchievementCategory.COMBAT,
        "Garde Éternel",
        0,
        false,
        "Secret de la Préservation",
        2,
        false
    ),
    SECRET_PRESERVATION_3(
        "SECRET_PRESERVATION_3",
        "Bastion Inébranlable",
        "Terminer tous les donjons du Secret de la Préservation (Niveau 3).",
        "foundation",
        AchievementCategory.COMBAT,
        "Dwayne Johnson",
        0,
        false,
        "Secret de la Préservation",
        3,
        false
    ),

    // 4. Secret de la Sérénité
    SECRET_SERENITE_1(
        "SECRET_SERENITE_1",
        "Besoin de calme",
        "Terminer tous les donjons du Secret de la Sérénité (Niveau 1).",
        "water_drop",
        AchievementCategory.COMBAT,
        "Âme Apaisée",
        0,
        false,
        "Secret de la Sérénité",
        1,
        false
    ),
    SECRET_SERENITE_2(
        "SECRET_SERENITE_2",
        "Océan du repos",
        "Terminer tous les donjons du Secret de la Sérénité (Niveau 2).",
        "water_drop",
        AchievementCategory.COMBAT,
        "Cœur Immuable",
        0,
        false,
        "Secret de la Sérénité",
        2,
        false
    ),
    SECRET_SERENITE_3(
        "SECRET_SERENITE_3",
        "Plénitude",
        "Terminer tous les donjons du Secret de la Sérénité (Niveau 3).",
        "water_drop",
        AchievementCategory.COMBAT,
        "Bouddha",
        0,
        false,
        "Secret de la Sérénité",
        3,
        false
    ),

    // 5. Secret de la Chasse
    SECRET_CHASSE_1(
        "SECRET_CHASSE_1",
        "Pisteur silencieux",
        "Terminer tous les donjons du Secret de la Chasse (Niveau 1).",
        "visibility_off",
        AchievementCategory.COMBAT,
        "Traqueur",
        0,
        false,
        "Secret de la Chasse",
        1,
        false
    ),
    SECRET_CHASSE_2(
        "SECRET_CHASSE_2",
        "Maître de la Chasse",
        "Terminer tous les donjons du Secret de la Chasse (Niveau 2).",
        "visibility_off",
        AchievementCategory.COMBAT,
        "Assassin",
        0,
        false,
        "Secret de la Chasse",
        2,
        false
    ),
    SECRET_CHASSE_3(
        "SECRET_CHASSE_3",
        "Dans l'ombre",
        "Terminer tous les donjons du Secret de la Chasse (Niveau 3).",
        "visibility_off",
        AchievementCategory.COMBAT,
        "Prédateur méthodique",
        0,
        false,
        "Secret de la Chasse",
        3,
        false
    ),

    // 6. Secret du Carnage
    SECRET_CARNAGE_1(
        "SECRET_CARNAGE_1",
        "Fureur du Carnage",
        "Terminer tous les donjons du Secret du Carnage (Niveau 1).",
        "explosion",
        AchievementCategory.COMBAT,
        "Brutal",
        0,
        false,
        "Secret du Carnage",
        1,
        false
    ),
    SECRET_CARNAGE_2(
        "SECRET_CARNAGE_2",
        "Cataclysme de rage",
        "Terminer tous les donjons du Secret du Carnage (Niveau 2).",
        "explosion",
        AchievementCategory.COMBAT,
        "Fléau Vivant",
        0,
        false,
        "Secret du Carnage",
        2,
        false
    ),
    SECRET_CARNAGE_3(
        "SECRET_CARNAGE_3",
        "Massacre sanglant",
        "Terminer tous les donjons du Secret du Carnage (Niveau 3).",
        "explosion",
        AchievementCategory.COMBAT,
        "Seigneur de Guerre",
        0,
        false,
        "Secret du Carnage",
        3,
        false
    ),

    // 7. Secret de la Joie
    SECRET_JOIE_1(
        "SECRET_JOIE_1",
        "Frisson volcanique",
        "Terminer tous les donjons du Secret de la Joie (Niveau 1).",
        "volcano",
        AchievementCategory.COMBAT,
        "Exalté",
        0,
        false,
        "Secret de la Joie",
        1,
        false
    ),
    SECRET_JOIE_2(
        "SECRET_JOIE_2",
        "Éruption",
        "Terminer tous les donjons du Secret de la Joie (Niveau 2).",
        "volcano",
        AchievementCategory.COMBAT,
        "Héros embrasé",
        0,
        false,
        "Secret de la Joie",
        2,
        false
    ),
    SECRET_JOIE_3(
        "SECRET_JOIE_3",
        "Inarrêtable",
        "Terminer tous les donjons du Secret de la Joie (Niveau 3).",
        "volcano",
        AchievementCategory.COMBAT,
        "L'être suprême",
        0,
        false,
        "Secret de la Joie",
        3,
        false
    ),

    // 8. Secret du Savoir
    SECRET_SAVOIR_1(
        "SECRET_SAVOIR_1",
        "Espoir ou folie",
        "Terminer tous les donjons du Secret du Savoir (Niveau 1).",
        "psychology",
        AchievementCategory.COMBAT,
        "Le crève-œil",
        0,
        false,
        "Secret du Savoir",
        1,
        false
    ),
    SECRET_SAVOIR_2(
        "SECRET_SAVOIR_2",
        "Omniscience",
        "Terminer tous les donjons du Secret du Savoir (Niveau 2).",
        "psychology",
        AchievementCategory.COMBAT,
        "Érudit Éclairé",
        0,
        false,
        "Secret du Savoir",
        2,
        false
    ),
    SECRET_SAVOIR_3(
        "SECRET_SAVOIR_3",
        "Prophétie des Anciens",
        "Terminer tous les donjons du Secret du Savoir (Niveau 3).",
        "psychology",
        AchievementCategory.COMBAT,
        "Maîtrise des arcanes",
        0,
        false,
        "Secret du Savoir",
        3,
        false
    ),

    // 9. Secret du Destin
    SECRET_DESTIN_1(
        "SECRET_DESTIN_1",
        "Fil du Destin",
        "Terminer tous les donjons du Secret du Destin (Niveau 1).",
        "all_inclusive",
        AchievementCategory.COMBAT,
        "Présage",
        0,
        false,
        "Secret du Destin",
        1,
        false
    ),
    SECRET_DESTIN_2(
        "SECRET_DESTIN_2",
        "Trame du Destin",
        "Terminer tous les donjons du Secret du Destin (Niveau 2).",
        "all_inclusive",
        AchievementCategory.COMBAT,
        "Tisseur de Sort",
        0,
        false,
        "Secret du Destin",
        2,
        false
    ),
    SECRET_DESTIN_3(
        "SECRET_DESTIN_3",
        "Déni divin",
        "Terminer tous les donjons du Secret du Destin (Niveau 3).",
        "all_inclusive",
        AchievementCategory.COMBAT,
        "Oracle des Âges",
        0,
        false,
        "Secret du Destin",
        3,
        false
    ),

    // 10. Secret de l'Éther
    SECRET_ETHER_1(
        "SECRET_ETHER_1",
        "Souffle d'Éther",
        "Terminer tous les donjons du Secret de l'Éther (Niveau 1).",
        "blur_on",
        AchievementCategory.COMBAT,
        "Embrumé",
        0,
        false,
        "Secret de l'Éther",
        1,
        false
    ),
    SECRET_ETHER_2(
        "SECRET_ETHER_2",
        "Ascension éthérée",
        "Terminer tous les donjons du Secret de l'Éther (Niveau 2).",
        "blur_on",
        AchievementCategory.COMBAT,
        "Être Astral",
        0,
        false,
        "Secret de l'Éther",
        2,
        false
    ),
    SECRET_ETHER_3(
        "SECRET_ETHER_3",
        "Nirvana",
        "Terminer tous les donjons du Secret de l'Éther (Niveau 3).",
        "blur_on",
        AchievementCategory.COMBAT,
        "Transcendant",
        0,
        false,
        "Secret de l'Éther",
        3,
        false
    ),

    // 11. Secret des Abysses
    SECRET_ABYSSES_1(
        "SECRET_ABYSSES_1",
        "Pénombre insondable",
        "Terminer tous les donjons du Secret des Abysses (Niveau 1).",
        "dark_mode",
        AchievementCategory.COMBAT,
        "Ombre Rampante",
        0,
        false,
        "Secret des Abysses",
        1,
        false
    ),
    SECRET_ABYSSES_2(
        "SECRET_ABYSSES_2",
        "Profondeurs abyssales",
        "Terminer tous les donjons du Secret des Abysses (Niveau 2).",
        "dark_mode",
        AchievementCategory.COMBAT,
        "Seigneur du Néant",
        0,
        false,
        "Secret des Abysses",
        2,
        false
    ),
    SECRET_ABYSSES_3(
        "SECRET_ABYSSES_3",
        "Gouffre sans fond",
        "Terminer tous les donjons du Secret des Abysses (Niveau 3).",
        "dark_mode",
        AchievementCategory.COMBAT,
        "Terreur Abyssale",
        0,
        false,
        "Secret des Abysses",
        3,
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
    private final String requiredSecret;
    private final int requiredSecretLevel;
    private final boolean freeDungeons;

    AchievementType(String code, String label, String description, String icon,
                    AchievementCategory category, String rewardTitle, int goalValue, boolean hidden) {
        this(code, label, description, icon, category, rewardTitle, goalValue, hidden, null, 0, false);
    }

    AchievementType(String code, String label, String description, String icon,
                    AchievementCategory category, String rewardTitle, int goalValue, boolean hidden,
                    String requiredSecret, int requiredSecretLevel, boolean freeDungeons) {
        this.code = code;
        this.label = label;
        this.description = description;
        this.icon = icon;
        this.category = category;
        this.rewardTitle = rewardTitle;
        this.goalValue = goalValue;
        this.hidden = hidden;
        this.requiredSecret = requiredSecret;
        this.requiredSecretLevel = requiredSecretLevel;
        this.freeDungeons = freeDungeons;
    }
}
