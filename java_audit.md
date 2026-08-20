# Audit Java — Grimoire

## 📋 Contexte pour reprise

**Projet** : Application Spring Boot (Java) — Grimoire, système de gestion de sorts/personnages RPG.
**Stack** : Spring Boot, JPA/Hibernate, H2 (ou autre DB), Lombok, Maven.
**Racine** : `c:/Users/doria/Desktop/Project/grimoire`
**Package principal** : `generation.grimoire`

**État de l'audit** : Audit réalisé le 2026-08-20. **Aucun fix appliqué à ce jour.**
Toutes les issues sont encore ouvertes (⬜ = à faire, ✅ = corrigé).

**Comment reprendre** : Parcourir chaque section, choisir une issue, appliquer le fix, puis marquer `⬜` → `✅` et noter la date/commit dans le Journal des corrections en bas de page.

---

## 🔴 Problèmes Critiques

### 1. ⬜ Code mort en production : `TestRunner.java`

**Fichier** : [TestRunner.java](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/TestRunner.java)

`@Component` + `CommandLineRunner` → s'exécute à chaque boot. Fait des `findById(1L)` et `findAll()` sur tous les sorts **à chaque démarrage**.

**Impact** : requêtes DB inutiles en prod. Logs polluants.

```diff
- @Component
+ @Profile("dev")
+ @Component
  public class TestRunner implements CommandLineRunner {
```

> **CAUTION** : Ajouter `@Profile("dev")` ou supprimer la classe entièrement.

**Effort** : ~1 min.

---

### 2. ⬜ `DebugController` exposé en production

**Fichier** : [DebugController.java](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/DebugController.java)

Expose `/api/debug-spells` (sans auth) **et écrit un fichier sur le disque dur du serveur** avec chemin hardcodé.

```java
// SECURITE : Ecriture sur le filesystem serveur !
java.io.PrintWriter pw = new java.io.PrintWriter(
    "c:/Users/doria/Desktop/Project/grimoire/debug_error.log");
```

> **CAUTION** : Chemin hardcodé sur le poste de dev → plante en prod. Ajouter `@Profile("dev")` ou supprimer.

**Effort** : ~1 min.

---

### 3. ⬜ `@PostConstruct` métier dans un `@RestController`

**Fichier** : [WebSpellCreationController.java L50-244](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/WebSpellCreationController.java#L50-L244)

~200 lignes de logique d'initialisation (`initStandardEntities()`) dans un Controller.

> **WARNING** : Viole SRP. Si la DB est vide et que le controller échoue (ex: FK violation), toute l'appli plante. Déplacer dans un `@Service` dédié `DataInitializerService` avec `@EventListener(ApplicationReadyEvent.class)`.

**Effort** : ~1h.

---

### 4. ⬜ Duplication massive dans `SpellService`

**Fichier** : [SpellService.java](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/service/SpellService.java)

- `castSpell` (L50) et `castSpellGroup` (L260) : ~200 lignes dupliquées (calcul coûts, vérif ressources, effets équipement, mise à jour type de casting).
- `tickChanneling` (L615) et `tickChanneling` groupe (L678) : ~60 lignes dupliquées.

> **WARNING** : Toute modif de logique doit être faite en double → source de bugs garantie. Extraire :
> - `private void payCosts(...)`
> - `private void applyEffectsToRecipients(...)`

**Effort** : ~2h.

---

## 🟠 Problèmes Importants

### 5. ⬜ `FetchType.EAGER` partout = N+1 latent

| Entité | Relation EAGER |
|--------|---------------|
| [Spell.java L71](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Spell.java#L71) | `@OneToMany effects` |
| [Voie.java L38](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Voie.java#L38) | `@OneToMany passiveEffects` |
| [SpellEffect.java L40](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/SpellEffect.java#L40) | `@ElementCollection channelingTurns` |
| [Equipment.java L85](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Equipment.java#L85) | `@ElementCollection priceAnomalies` |

`findAll()` → chaque `Spell` charge ses `effects`, chaque effet charge ses `channelingTurns` → **N×M requêtes**. Le `@Fetch(SUBSELECT)` sur `Equipment` est un début mais pas appliqué partout.

> **TIP** : Passer en `LAZY` par défaut + utiliser des requêtes avec `JOIN FETCH` dans les repos quand nécessaire.

**Effort** : ~2h.

---

### 6. ⬜ FQN complets utilisés comme imports manuels

Dans `SpellService`, `GrimoireApplication`, `Equipment` : FQN inline au lieu d'imports.

```java
// A 50+ endroits dans SpellService.java
generation.grimoire.enumeration.EquipmentEffectType.CURSED_HP_LOSS_ON_MANA
generation.grimoire.utils.StatCalculator.getSourceValue(...)
generation.grimoire.enumeration.DamageType.BRUT
```

> **NOTE** : Illisible, verbeux, masque les vraies dépendances. Ajouter les imports en haut de fichier.

**Effort** : ~30 min (find & replace + IDE organize imports).

---

### 7. ⬜ `System.out.println` partout (pas de logger)

~40+ `System.out.println` dans `SpellService`, `GrimoireApplication`, les passifs. Aucun SLF4J/Logback.

**Conséquences** :
- Impossible de filtrer par niveau (DEBUG/INFO/WARN/ERROR)
- Performances légèrement dégradées (synchronisé sur stdout)
- Pas de MDC/trace en prod

```diff
- System.out.println(caster.getName() + " depense " + costMsg);
+ log.info("{} depense {} pour lancer {}", caster.getName(), costMsg, toCast.getNom());
```

> **TIP** : Ajouter `@Slf4j` (Lombok) sur chaque classe et remplacer tous les `System.out`.

**Effort** : ~1h.

---

### 8. ⬜ `getWeight()` → double calcul inutile

[Equipment.java L185](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Equipment.java#L185-L187) : `getWeight()` appelle `calculateWeight()`, et `calculateShopPrice()` (L190) appelle aussi `calculateWeight()`. Double calcul si les deux sont appelés.

```java
// recalcul a chaque acces
public double getWeight() {
    return this.calculateWeight();
}
```

> **TIP** : `@Transient private Double cachedWeight` ou appeler directement `calculateWeight()` (getter trompeur car non-idempotent en perf).

**Effort** : ~15 min.

---

### 9. ⬜ `costs.length > 2` : vérification dead code

Dans `SpellService` L130 et L327 :
```java
actualHeatCost = costs.length > 2 ? costs[2] : actualHeatCost;
```
Le tableau `costs` est **toujours** de taille 3 (déclaré juste au-dessus). Cette condition est toujours vraie → code mort.

**Effort** : ~5 min.

---

### 10. ⬜ `resolveRecipients` crée des `Personnage` fantômes

[SpellService.java L765-L799](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/service/SpellService.java#L765) : cas `ALLY`, `ALL_ALLIES`, `ALL_COMBATANTS` créent un `new Personnage()` simulé avec des valeurs partielles. Ces Personnages fantômes reçoivent des effets (soins, dégâts) qui **disparaissent dans le vide**.

> **WARNING** : Comportement silencieusement incorrect. Commenter clairement que c'est une limitation du mode 1v1, ou lever une exception pour ces cas.

**Effort** : ~30 min.

---

## 🟡 Bonnes Pratiques / Optimisations

### 11. ⬜ `calculateShopPrice` : if-else au lieu de switch/map

[Equipment.java L192-L223](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/entity/Equipment.java#L192) : 15 `if-else` sur des enums. La valeur du multiplicateur appartient à l'enum elle-même.

```java
// Ajouter dans EquipmentRarity :
COMMUN("Commun", ..., 1.0),
RARE("Rare", ..., 2.0),
// ...
private final double shopMultiplier;

// Equipment.calculateShopPrice() devient :
double multiplier = this.rarity.getShopMultiplier();
```

Même chose pour `slotMultiplier` → méthode sur `EquipmentSlot`.

**Effort** : ~30 min.

---

### 12. ⬜ `GrimoireApplication` contient de la logique de migration DB

[GrimoireApplication.java L18-L42](file:///c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/GrimoireApplication.java#L18) : migration de slots `ANNEAU_GAUCHE/DROIT → ANNEAU` dans un `@Bean ApplicationRunner`. S'exécute à **chaque démarrage**.

> **TIP** : Utiliser **Flyway** ou **Liquibase** pour les migrations. Si one-shot, supprimer après exécution ou conditionner par flag en base.

**Effort** : ~1h (Flyway setup) ou ~5 min (supprimer si déjà migré).

---

### 13. ⬜ `SpellService` : méthodes de casting non-transactionnelles

`castSpell` fait plusieurs modifications d'état (`setManaCurrent`, `setHealthCurrent`, `setPassiveState`, `heal`, `takeDamage`). Si une exception survient au milieu, l'état reste incohérent. Aucun `@Transactional` sur ces méthodes.

> **NOTE** : Certes le `Personnage` est en mémoire, mais si l'appel vient d'un contexte DB (ex: `AlchemyService`), l'absence de transaction peut laisser des données partielles.

**Effort** : ~15 min.

---

### 14. ⬜ `SpellService.selectVariant` : triple requête DB identique

```java
// 1er appel pour trouver par choiceKey
for (Spell v : spellRepository.findByVariantId(baseSpell.getVariantId())) { ... }

// 2ème appel pour les conditions automatiques
for (Spell variant : spellRepository.findByVariantId(vid)) { ... }

// 3ème appel en fallback (L590)
List<Spell> all = spellRepository.findByVariantId(vid);
```

Jusqu'à **3 requêtes identiques** par sort avec variante.

**Fix** : Charger la liste une fois en début de méthode.
**Effort** : ~15 min.

---

### 15. ⬜ `Spell.java` : `@JoinColumn(nullable = true)` redondant

```java
@JoinColumn(name = "voie_id", nullable = true) // nullable=true est la valeur par defaut
```

Commentaire et annotation redondants sur `voie`, `spiritualite`, `mutation`.

**Effort** : ~5 min (cosmétique).

---

## Résumé des priorités

| Priorité | # | Issue | Effort | Statut |
|----------|---|-------|--------|--------|
| 🔴 Critique | 1 | Profiler `TestRunner` (`@Profile("dev")`) | 1 min | ⬜ |
| 🔴 Critique | 2 | Profiler/supprimer `DebugController` | 1 min | ⬜ |
| 🔴 Critique | 3 | Déplacer `@PostConstruct` hors du Controller | 1h | ⬜ |
| 🔴 Critique | 4 | Refactorer duplication `castSpell`/`castSpellGroup` | 2h | ⬜ |
| 🟠 Important | 5 | FetchType.LAZY + JOIN FETCH ciblés | 2h | ⬜ |
| 🟠 Important | 6 | Remplacer FQN inline par imports | 30 min | ⬜ |
| 🟠 Important | 7 | Remplacer `System.out` par SLF4J (`@Slf4j`) | 1h | ⬜ |
| 🟠 Important | 8 | Cacher `calculateWeight()` | 15 min | ⬜ |
| 🟠 Important | 9 | Supprimer `costs.length > 2` mort | 5 min | ⬜ |
| 🟠 Important | 10 | Documenter Personnages fantômes dans `resolveRecipients` | 30 min | ⬜ |
| 🟡 Optim | 11 | Multiplicateurs dans enums (`EquipmentRarity`, `EquipmentSlot`) | 30 min | ⬜ |
| 🟡 Optim | 12 | Migration DB → Flyway/Liquibase | 1h | ⬜ |
| 🟡 Optim | 13 | Ajouter `@Transactional` sur `castSpell` | 15 min | ⬜ |
| 🟡 Optim | 14 | Triple requête `selectVariant` → 1 seule | 15 min | ⬜ |
| 🟡 Optim | 15 | Supprimer `nullable = true` redondant dans `Spell.java` | 5 min | ⬜ |

---

## Journal des corrections

| Date | # Issue | Description du fix | Commit/Note |
|------|---------|--------------------|-------------|
| — | — | Aucun fix appliqué pour l'instant | — |
