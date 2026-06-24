package generation.grimoire.enumeration;

public enum MonsterBehavior {
    NORMAL, // Cible aléatoire
    PREDATEUR, // Toujours la même cible tant qu'elle est vivante
    CORRUPTEUR, // Cible le joueur avec le plus de Mana restant et lui retire 5% de son mana
                // actuel
    LEADER, // Force tous les alliés monstres à attaquer la même cible
    ASSASSIN, // Cible le joueur avec le moins de Résistance
    INSENSIBLE, // Dégâts bruts (ignore armure/résistance)
    TRANSCENDANT // Attaque toutes les cibles adverse à la fois
}
