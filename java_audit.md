# Audit Java — Grimoire

## 🔴 Problèmes Critiques

### 1. Code mort en production : `TestRunner.java`

[TestRunner.java](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/TestRunner.java) est un `@Component` qui s'exécute au démarrage (`CommandLineRunner`). Il fait des `findById(1L)` et `findAll()` sur tous les sorts **à chaque boot**.

**Impact** : requêtes DB inutiles à chaque démarrage en prod. Logs polluants.

```diff
- @Component
  public class TestRunner implements CommandLineRunner {
```

> [!CAUTION]
> Supprimer ou conditionner avec un profil Spring : `@Profile("dev")`.

---

### 2. `DebugController` exposé en production

[DebugController.java](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/DebugController.java) expose `/api/debug-spells` (sans auth) **et écrit un fichier sur le disque dur du serveur** avec le chemin absolu hardcodé.

```java
// 🚨 Écriture sur le filesystem serveur !
java.io.PrintWriter pw = new java.io.PrintWriter(
    "c:/Users/doria/Desktop/Project/grimoire/debug_error.log");
```

> [!CAUTION]
> Chemin hardcodé sur le poste de dev. Plantera en prod. Ajouter `@Profile("dev")` ou supprimer.

---

### 3. `@PostConstruct` métier dans un `@RestController`

[WebSpellCreationController.java L50-244](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/WebSpellCreationController.java#L50-L244) contient ~200 lignes de logique d'initialisation (`initStandardEntities()`). C'est du code **service** dans un **controller**.

> [!WARNING]
> Violates SRP. Si le schéma DB est vide et que le controller échoue à démarrer (ex: FK violation), toute l'appli plante. Déplacer dans un `@Service` dédié `DataInitializerService` avec `@EventListener(ApplicationReadyEvent.class)`.

---

### 4. Duplication massive dans `SpellService`

`castSpell` (L50) et `castSpellGroup` (L260) sont **quasi-identiques** : ~200 lignes dupliquées pour le calcul des coûts, la vérification des ressources, les effets d'équipement, la mise à jour du type de casting, etc.

Même chose pour `tickChanneling` (L615) et `tickChanneling` avec groupe (L678) — ~60 lignes dupliquées.

> [!WARNING]
> Toute modification de la logique doit être faite en double. Bug source garantie à terme. Extraire une méthode `private void payCosts(...)` et `private void applyEffectsToRecipients(...)`.

---

## 🟠 Problèmes Importants

### 5. FetchType.EAGER partout = N+1 latent

| Entité | Relation EAGER |
|--------|---------------|
| [`Spell.java` L71](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Spell.java#L71) | `@OneToMany effects` |
| [`Voie.java` L38](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Voie.java#L38) | `@OneToMany passiveEffects` |
| [`SpellEffect.java` L40](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/SpellEffect.java#L40) | `@ElementCollection channelingTurns` |
| [`Equipment.java` L85](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Equipment.java#L85) | `@ElementCollection priceAnomalies` |

Quand on fait `spellRepository.findAll()`, chaque `Spell` charge ses `effects`, chaque effet charge ses `channelingTurns` → **N×M requêtes**. Le `@Fetch(SUBSELECT)` sur `Equipment` est un début mais pas appliqué partout.

> [!TIP]
> Passer en `LAZY` par défaut + utiliser des requêtes avec `JOIN FETCH` dans les repos quand nécessaire.

---

### 6. `qualifiedName` complet utilisé comme imports manuels

Partout dans `SpellService`, `GrimoireApplication`, `Equipment` : utilisation de FQN inline au lieu d'imports :

```java
// ❌ à 50+ endroits dans SpellService.java
generation.grimoire.enumeration.EquipmentEffectType.CURSED_HP_LOSS_ON_MANA
generation.grimoire.utils.StatCalculator.getSourceValue(...)
generation.grimoire.enumeration.DamageType.BRUT
```

> [!NOTE]
> Illisible, verbeux, masque les vraies dépendances. Ajouter les imports en haut de fichier.

---

### 7. `System.out.println` partout (pas de logger)

~40+ `System.out.println` dans `SpellService`, `GrimoireApplication`, les passifs. Aucun SLF4J/Logback.

**Conséquences** :
- Impossible de filtrer par niveau (DEBUG/INFO/WARN/ERROR)
- Performances légèrement dégradées (synchronisé sur stdout)
- Pas de MDC/trace en prod

```diff
- System.out.println(caster.getName() + " dépense " + costMsg);
+ log.info("{} dépense {} pour lancer {}", caster.getName(), costMsg, toCast.getNom());
```

> [!TIP]
> Ajouter `@Slf4j` (Lombok) sur chaque classe et remplacer tous les `System.out`.

---

### 8. `getWeight()` → `calculateWeight()` : double calcul inutile

Dans [`Equipment.java` L185](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Equipment.java#L185-L187), `getWeight()` appelle `calculateWeight()`, et `calculateShopPrice()` (L190) appelle aussi `calculateWeight()` en premier. Quand on appelle `calculateShopPrice()`, le poids est calculé deux fois si `getWeight()` est appelé entre-temps.

```java
// calculateShopPrice appelle calculateWeight() directement → OK
// mais getWeight() est un getter qui recalcule à chaque accès
public double getWeight() {
    return this.calculateWeight(); // recalcul à chaque appel
}
```

> [!TIP]
> Cacher le résultat avec `@Transient private Double cachedWeight` ou simplement utiliser `calculateWeight()` directement (getter trompeur car non-idempotent en performance).

---

### 9. `costs.length > 2` : vérification absurde

Dans `SpellService` L130 et L327 :
```java
actualHeatCost = costs.length > 2 ? costs[2] : actualHeatCost;
```
Le tableau `costs` est **toujours** de taille 3 (déclaré juste au-dessus). Cette vérification est du code mort.

---

### 10. `resolveRecipients` crée des `Personnage` fantômes

Dans [`SpellService.java` L765-L799](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/SpellService.java#L765), les cas `ALLY`, `ALL_ALLIES`, `ALL_COMBATANTS` créent un `new Personnage()` simulé avec des valeurs partielles. Ces Personnages fantômes reçoivent des effets (soins, dégâts) qui **disparaissent dans le vide**.

> [!WARNING]
> Comportement silencieusement incorrect. Commenter clairement que c'est une limitation du mode 1v1, ou lever une exception pour ces cas.

---

## 🟡 Bonnes Pratiques / Optimisations

### 11. `calculateShopPrice` : if-else au lieu de switch/map

[`Equipment.java` L192-L223](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Equipment.java#L192) : 15 `if-else` sur des enums. La valeur du multiplicateur appartient à l'enum elle-même.

```java
// Ajouter dans EquipmentRarity :
COMMUN("Commun", ..., 1.0),
RARE("Rare", ..., 2.0),
// ...
private final double shopMultiplier;

// Equipment.calculateShopPrice() devient :
double multiplier = this.rarity.getShopMultiplier();
```

Même chose pour le `slotMultiplier` → méthode sur `EquipmentSlot`.

---

### 12. `GrimoireApplication` contient de la logique de migration DB

[`GrimoireApplication.java` L18-L42](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/GrimoireApplication.java#L18) : migration de slots `ANNEAU_GAUCHE/DROIT → ANNEAU` dans un `@Bean ApplicationRunner`. C'est du code de migration one-shot qui s'exécute à chaque démarrage.

> [!TIP]
> Utiliser **Flyway** ou **Liquibase** pour les migrations. Si le besoin est ponctuel, supprimer après exécution ou conditionner par un flag en base.

---

### 13. `SpellService` est `@Service` non-transactionnel pour les castings

`castSpell` fait plusieurs modifications d'état (`setManaCurrent`, `setHealthCurrent`, `setPassiveState`, `heal`, `takeDamage`). Si une exception survient au milieu, l'état reste incohérent. Aucun `@Transactional` sur ces méthodes.

> [!NOTE]
> Certes le `Personnage` est en mémoire (pas en DB directement), mais si l'appel vient d'un contexte DB (ex: `AlchemyService`), l'absence de transaction peut laisser des données partielles.

---

### 14. `SpellService.selectVariant` : double requête DB

```java
// Premier appel pour trouver par choiceKey
for (Spell v : spellRepository.findByVariantId(baseSpell.getVariantId())) { ... }

// Deuxième appel pour les conditions automatiques
for (Spell variant : spellRepository.findByVariantId(vid)) { ... }

// Troisième appel en fallback (L590)
List<Spell> all = spellRepository.findByVariantId(vid);
```

Jusqu'à **3 requêtes identiques** par sort avec variante. Charger la liste une fois.

---

### 15. `Spell.java` : `@JoinColumn(nullable = true)` redondant

```java
@JoinColumn(name = "voie_id", nullable = true) // nullable=true est la valeur par défaut
```

Commentaire et annotation redondants sur `voie`, `spiritualite`, `mutation`.

---

## Résumé des priorités

| Priorité | Issue | Effort |
|----------|-------|--------|
| 🔴 Critique | Supprimer `TestRunner` ou `@Profile("dev")` | 1 min |
| 🔴 Critique | Supprimer/profiler `DebugController` | 1 min |
| 🔴 Critique | Déplacer `@PostConstruct` hors du Controller | 1h |
| 🟠 Important | Refactorer `castSpell`/`castSpellGroup` → extraire méthodes | 2h |
| 🟠 Important | Remplacer `System.out` par SLF4J (`@Slf4j`) | 1h |
| 🟠 Important | FetchType.LAZY + JOIN FETCH ciblés | 2h |
| 🟡 Optim | Déplacer multiplicateurs dans enums | 30 min |
| 🟡 Optim | Fixer la triple requête DB dans `selectVariant` | 15 min |
| 🟡 Optim | Supprimer `costs.length > 2` mort | 5 min |
