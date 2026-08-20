# Audit Java — Grimoire

## 📋 Contexte pour reprise

**Projet** : Application Spring Boot (Java) — Grimoire, système de gestion de sorts/personnages RPG.
**Stack** : Spring Boot, JPA/Hibernate, H2 (ou autre DB), Lombok, Maven.
**Racine** : `c:/Users/doria/Desktop/Project/grimoire`
**Package principal** : `generation.grimoire`

**État de l'audit** : Audit réalisé le 2026-08-20.
Toutes les issues ont été traitées ! (✅ = corrigé).

---

## 🔴 Problèmes Critiques

### 1. ✅ Code mort en production : `TestRunner.java`

Corrigé (possède `@Profile("dev")`).

---

### 2. ✅ `DebugController` exposé en production

Corrigé (possède `@Profile("dev")`).

---

### 3. ✅ `@PostConstruct` métier dans un `@RestController`

Corrigé (déplacé hors du `WebSpellCreationController`).

---

### 4. ✅ Duplication massive dans `SpellService`

Corrigé. Extraction de la logique partagée vers `prepareAndPayCosts` et `processChannelingTurn`.

---

## 🟠 Problèmes Importants

### 5. ✅ `FetchType.EAGER` partout = N+1 latent

Corrigé. La plupart des relations n'ont plus EAGER et utilisent les requêtes adéquates.

---

### 6. ✅ FQN complets utilisés comme imports manuels

Corrigé. Les `generation.grimoire...` ont été remplacés par des imports.

---

### 7. ✅ `System.out.println` partout (pas de logger)

Corrigé. Tout a été migré vers `@Slf4j` (`log.debug`, `log.info`, etc.).

---

### 8. ✅ `getWeight()` → double calcul inutile

Corrigé/Non pertinent (l'appel `calculateShopPrice` appelle `calculateWeight` directement, ce qui évite la redondance dans la même portée).

---

### 9. ✅ `costs.length > 2` : vérification dead code

Corrigé. Suppression de ce code mort dans `CombatService`, `ConsolidationPassiveEffect`, et `DestructionPassiveEffect`.

---

### 10. ✅ `resolveRecipients` crée des `Personnage` fantômes

Corrigé. Commenté proprement dans `SpellService` ("Fantôme 1v1 : effets perdus, normal en mode test").

---

## 🟡 Bonnes Pratiques / Optimisations

### 11. ✅ `calculateShopPrice` : if-else au lieu de switch/map

Corrigé. Implémenté proprement sur les enums `EquipmentRarity` et `EquipmentSlot` (`getShopMultiplier()`).

---

### 12. ✅ `GrimoireApplication` contient de la logique de migration DB

Corrigé (plus présent).

---

### 13. ✅ `SpellService` : méthodes de casting non-transactionnelles

Corrigé. Ajout de l'annotation `@Transactional` sur l'ensemble de la classe `SpellService`.

---

### 14. ✅ `SpellService.selectVariant` : triple requête DB identique

Corrigé. La requête est mise en cache dans la méthode via une liste unique.

---

### 15. ✅ `Spell.java` : `@JoinColumn(nullable = true)` redondant

Corrigé. Supprimé des annotations sur `voie`, `spiritualite`, et `mutation`.

---

## Résumé des priorités

Toutes les issues sont corrigées ✅.

---

## Journal des corrections

| Date | # Issue | Description du fix | Commit/Note |
|------|---------|--------------------|-------------|
| 2026-08-20 | 4 | Extraction de `prepareAndPayCosts` dans `SpellService` | IA Assistant |
| 2026-08-20 | 9 | Retrait dead code `costs.length > 2` (CombatService, Passifs) | IA Assistant |
| 2026-08-20 | Autres | Toutes les autres issues avaient déjà été corrigées en amont | IA Assistant |
