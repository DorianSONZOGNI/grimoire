# Plan — Refonte Chasse Hebdomadaire

## Récap du changement demandé

**Ancien système :** Weekly = le plus de victoires (completionCount). Top 3 gagne.
**Nouveau système :** Weekly = terminer le donjon en le **moins de tours possible**. Départage par timestamp (plus tôt = mieux). **Top 20%** gagne la récompense, récupérable en fin de semaine.

## Modifications

### 1. `CombatSession.java` — Ajouter compteur de tours global
- Ajouter `private int globalTurnCount = 0;`
- Incrémenter à chaque tour (toutes salles confondues), pas reset par salle

### 2. `CombatTurnService.java` — Incrémenter globalTurnCount
- À chaque `setTurnNumber(+1)`, ajouter aussi `session.setGlobalTurnCount(session.getGlobalTurnCount() + 1);`

### 3. `HuntingQuestEntry.java` — Ajouter champ `bestTurnCount`
- `private Integer bestTurnCount;` — meilleur nombre de tours pour terminer le donjon
- Remplace `completionCount` comme critère de classement weekly

### 4. `HuntingQuestService.java`
- `recordCompletion(dungeonId, accountName)` → `recordCompletion(dungeonId, accountName, int totalTurns)`
- Weekly: enregistrer `bestTurnCount = min(current, totalTurns)` + update `firstCompletionTime` si meilleur score
- `recalculateWeeklyRanks()`: trier par `bestTurnCount ASC, firstCompletionTime ASC`
- `claimReward()`: changer top 3 → top 20% (`rank <= ceil(totalEntries * 0.2)`)
- `getWeeklyQuestData()`: inclure `totalParticipants` dans la réponse

### 5. `HuntingQuestEntryRepository.java`
- Ajouter `findByQuestIdOrderByBestTurnCountAscFirstCompletionTimeAsc`

### 6. `CombatRoomService.java` — Passer totalTurns à recordCompletion
- `huntingQuestService.recordCompletion(session.getDungeonId(), owner, session.getGlobalTurnCount())`

### 7. `countClaimable` query — Adapter le seuil
- Ne plus hard-coder `rank <= 3`, utiliser le top 20%

### 8. Frontend `hunting.js`
- Weekly leaderboard: afficher "X tours" au lieu de "N victoires"
- Récompense: "Top 20%" au lieu de "Top 3"
- Claim button: adapter la condition

### 9. `entryToMap()` — Exposer bestTurnCount
- Ajouter `bestTurnCount` dans le map

## Ordre d'exécution
1. CombatSession + CombatTurnService (globalTurnCount)
2. HuntingQuestEntry (bestTurnCount)
3. HuntingQuestEntryRepository (nouvelle query)
4. HuntingQuestService (record + ranks + claim + data)
5. CombatRoomService (passer totalTurns)
6. Frontend hunting.js
