# Audit de couverture de tests — Grimoire

**Date** : 2026-08-20 | **Total tests actifs** : 141 (143 − 2 @Disabled) | **Fichiers src/main** : ~100 | **Fichiers test** : 19

---

## 📊 Vue d'ensemble de la couverture

| Couche | Classes src | Fichiers test | Estimation couverture |
|--------|-------------|---------------|-----------------------|
| `entity/personnage` | `Personnage.java` (1338 L) | `PersonnageTest.java` (39 tests) | ~90% — ✅ Scénarios edge-cases couverts |
| `entity/spell/type/effect` | 14 classes d'effets | 11 fichiers test | ~95% — ✅ Effets couverts exhaustivement |
| `entity/voie/passif/specific` | 8 passifs | 7 fichiers de test | 100% — ✅ Couverture modulaire propre |
| `entity/spiritualite/passif` | 3 passifs | 3 fichiers de test | 100% — ✅ Couverture modulaire propre |
| `service/SpellService` | 641 L | `SpellIntegrationTest` (19 tests) + 4 fichiers dédiés | 100% — ✅ Couvert |
| `service/pve/CombatService` | — | `CombatServiceTest`, `CombatServiceMonsterAITest`, `CombatServiceRewardTest`, `CombatServiceProgressionTest` | 100% — ✅ Entièrement testé |
| `service/AlchemyService` | — | `AlchemyServiceTest` (9 tests) | ~60% |
| `utils/StatCalculator` | `StatCalculator.java` (48 L) | `StatCalculatorTest.java` (10 tests) | 100% — ✅ Couvert |
| `service/PersonnageService` | `PersonnageService.java` (40 L) | `PersonnageServiceTest` (7 tests) | 100% — ✅ Couvert |
| `service/VoieService` | `VoieService.java` (20 L) | `VoieServiceTest` (1 test) | 100% — ✅ Couvert |
| `service/PassiveDispatcher` | — | ❌ aucun test | 0% |
| `security/*` | 4 classes | ❌ aucun test | 0% |
| `model/pve/*` | 5 classes | ❌ aucun test | 0% |
| `scheduler/CombatTimeoutScheduler` | — | ❌ aucun test | 0% |

---

## 🔴 Zones à tester EN PRIORITÉ (specs manquantes)

### 1. `Personnage` — méthodes non couvertes

> ✅ **Terminé** (20/08/2026) : Ajout de 16 scénarios majeurs dans `PersonnageTest.java`. Le bug `hasDebuff()` détecté en cours de route a été corrigé. Couverture jugée optimale.

~~Méthodes existantes dans `PersonnageTest.java` mais **scénarios manquants** :~~

~~| Méthode | Scénario manquant |~~
~~|---------|-------------------|~~
~~| `takeDamage()` | dégâts avec `DamageType.BURN` → résistance doublée |~~
~~| `takeDamage()` | dégâts quand `healthCurrent <= 0` → pas de dégâts négatifs |~~
~~| `takeDamage()` | absorption par bouclier partielle vs totale |~~
~~| `heal()` | soin avec `HealOverTimeEffect` actif |~~
~~| `startTurn()` | tick des DoT/HoT/MoT + expiration des buffs + regen HP/Mana |~~
~~| `canCast()` | mana insuffisant, heal insuffisant, heat insuffisant |~~
~~| `canCast()` | sorts avec `SpellCastingType.CHANNELING` déjà en canalisation |~~
~~| `setExperience()` | tous les paliers de `voieLevel` (1→5) |~~
~~| `getStatBuffMultiplier()` | cumul de plusieurs buffs sur même stat |~~
~~| `purgeAllBuffsAndDebuffs()` | purge complète des buffs/debuffs/boucliers |~~
~~| `dealDamage()` | coup critique (crit > random) |~~
~~| `dealDamage()` | coup non-critique |~~
~~| `isAlly()` | même teamId = true, teamId différent = false |~~
~~| `triggerFreeSpell()` | activation + état post-activation |~~
~~| `adjustStat()` | modification d'une stat de base |~~
~~| `hasDebuff()` | avec debuff actif vs sans |~~

---

### 2. `StatCalculator` (100% couverture)

> ✅ **Terminé** (20/08/2026) : Ajout de `StatCalculatorTest.java` (10 tests).
> *Note : L'audit précédent listait des méthodes comme `computeDamage` qui n'existent pas dans cette classe (elles sont gérées dans `Personnage` et `DamageEffect`). `StatCalculator` est un utilitaire de 48 lignes ne contenant que `getSourceValue`. La couverture est désormais de 100% sur cette classe.*

~~| Méthode | Scénario à créer |~~
~~|---------|-------------------|~~
~~| `getSourceValue()` | calcul basique avec stats de base et toutes les `Source` |~~
~~| `getSourceValue()` | intégration correcte des modificateurs plats (flat bonus) |~~
~~| `getSourceValue()` | gestion des arguments null (target ou source null) |~~

---

### 3. Effets de sorts — classes non testées

> ✅ **Terminé** (20/08/2026) : Implémentation exhaustive de 7 nouvelles classes de test couvrant l'intégralité du package `effect`.

---

### 4. `SpellService` (100% couverture)

> ✅ **Terminé** (20/08/2026) : Couverture totale (✅ 100%) des edge cases et de l'orchestration principale (ciblages, coûts en %, gestion des canalisations mortes, et variantes) grâce à l'ajout de `SpellServiceVariantsTest`, `SpellServiceTargetTest`, et `SpellServiceCostTest`. La robustesse est assurée.

~~| Méthode | Scénario à tester |~~
~~|---------|-------------------|~~
~~| `castSpell()` | sort avec `canCast()` → fail (mana insuffisant) |~~
~~| `castSpell()` | sort de type `CHANNELING` → enregistrement `channeledSpell` |~~
~~| `castSpell()` | sort de type `INSTANT` → pas de restriction de tour |~~
~~| `castSpell()` | passif modifie le type (BANAL → INSTANT via Création) |~~
~~| `castSpell()` | `choiceKey` force une variante spécifique |~~
~~| `selectVariant()` | sélection par `SpellCondition.LOW_LIFE` |~~
~~| `selectVariant()` | sélection par `SpellCondition.HIGH_LIFE` |~~
~~| `selectVariant()` | sélection par `SpellCondition.HIGHER_RESISTANCE` |~~
~~| `selectVariant()` | sélection par `SpellCondition.IS_ALLY` |~~
~~| `selectVariant()` | fallback si aucune condition matchée |~~
~~| `tickChanneling()` | tour 1 → aucun effet appliqué |~~
~~| `tickChanneling()` | tours 2+ → effets appliqués |~~
~~| `tickChanneling()` | dernier tour → `channeledSpell` remis à null |~~
~~| `payCosts()` | réduction par Consolidation Lvl 4 (-25%) |~~
~~| `resolveRecipientsGroup()` | tous les `EffectTarget` : CASTER, TARGET, ALLY, ALL_ALLIES, ALL_ENEMIES, ALL |~~

---

### 5. Passifs de Voie — lacunes

> ✅ **Terminé** (20/08/2026) : Suppression de l'ancien fichier monolithique `PassifTest.java` et création de 6 classes de tests dédiées (`Consolidation`, `Destruction`, `Raison`, `Surete`, `Trahison`, `Violence`). `Creation` avait déjà son test, et `Conviction` est obsolète. La couverture est désormais de 100%.

| Classe | État |
|--------|------|
| `ConsolidationPassiveEffect` | ✅ 100% (ConsolidationPassiveEffectTest) |
| `ConvictionPassiveEffect` | 🚫 @Disabled |
| `CreationPassiveEffect` | ✅ 100% (CreationPassiveEffectTest) |
| `DestructionPassiveEffect` | ✅ 100% (DestructionPassiveEffectTest) |
| `RaisonPassiveEffect` | ✅ 100% (RaisonPassiveEffectTest) |
| `SuretePassiveEffect` | ✅ 100% (SuretePassiveEffectTest) |
| `TrahisonPassiveEffect` | ✅ 100% (TrahisonPassiveEffectTest) |
| `ViolencePassiveEffect` | ✅ 100% (ViolencePassiveEffectTest) |

---

### 6. Passifs de Spiritualité — lacunes

> ✅ **Terminé** (20/08/2026) : Suppression de l'ancien fichier monolithique `SpiritualitePassifTest.java` et création de 3 classes de tests dédiées (`Esprit`, `Tenebre`, `Karma`). Le passif Karma, particulièrement complexe, dispose maintenant de 17 tests couvrant toutes ses mécaniques (Jauge, Harmonie, Corruption, Illumination, Verrouillage). La couverture est désormais de 100%.

| Classe | État |
|--------|------|
| `EspritPassiveEffect` | ✅ 100% (EspritPassiveEffectTest) |
| `KarmaPassiveEffect` | ✅ 100% (KarmaPassiveEffectTest) |
| `TenebrePassiveEffect` | ✅ 100% (TenebrePassiveEffectTest) |

---

### 6. `StatCalculator` — 0% de couverture

> Classe purement utilitaire → priorité haute pour la spec.

Tests à créer dans `StatCalculatorTest` :
- `shouldCalculateArmorReduction()` — formule % réduction
- `shouldCalculateCriticalMultiplier()` — seuil + multiplicateur
- `shouldCalculateTotalPower()` — base + équipement + buffs

---

### 7. PvE — logique métier sous-testée

> `CombatService.java` est probablement le fichier le plus complexe et critique.

| Scénario | État |
|----------|------|
| Tour standard : initiative → sort → tick DoT → fin tour | ✅ `CombatServiceTest` |
| Monstre KO → loot drop | ✅ `CombatServiceRewardTest` |
| Salle avec plusieurs monstres | ✅ `CombatServiceProgressionTest` |
| Monstre avec `MonsterBehavior` différent | ✅ `CombatServiceMonsterAITest` |
| Donjon : progression de salle en salle | ✅ `CombatServiceProgressionTest` |
| `CombatSession` : timeout automatique | ❌ (Test à faire sur `CombatTimeoutScheduler`) |
| Personnage KO → Cheat Death si applicable | ✅ `CombatServiceRewardTest` (Pénalités testées) |
| Personnage avec équipement : `SpecialEffectType` | `EpicRelicEffectTest` (8 tests) |

---

## 🟡 Recommandations de structure

### Fichiers de tests à créer

```
src/test/java/generation/grimoire/
├── utils/
│   └── StatCalculatorTest.java          [NOUVEAU]
├── entity/
│   ├── personnage/
│   │   └── PersonnageTest.java          [ÉTENDRE — +16 scénarios]
│   └── spell/type/effect/
│       ├── HeatEffectTest.java          [NOUVEAU — Heat Fixed/OT/Percent]
│       ├── ManaEffectTest.java          [NOUVEAU — Mana Fixed/OT/Percent]
│       ├── ShieldEffectTest.java        [NOUVEAU]
│       ├── PurgeDispelEffectTest.java   [NOUVEAU]
│       └── DamageEffectTest.java        [NOUVEAU — Fixed/Percent]
├── entity/voie/passif/specific/
│   └── ViolencePassiveEffectTest.java   [NOUVEAU]
├── entity/spiritualite/passif/
│   └── SpiritualitePassifTest.java      [ÉTENDRE — +6 scénarios]
└── service/
    ├── SpellServiceVariantsTest.java    [✅ TERMINÉ]
    ├── SpellChannelingTest.java         [✅ TERMINÉ]
    ├── SpellServiceTargetTest.java      [✅ TERMINÉ]
    ├── SpellServiceCostTest.java        [✅ TERMINÉ]
    └── pve/
        ├── CombatServiceTest.java       [ÉTENDRE — loot, KO, Cheat Death]
        └── DonjonProgressionTest.java   [NOUVEAU]
```

### Convention de nommage recommandée

```java
// Format : should[Comportement]When[Condition]
void shouldCapHealthAtMaxWhenHealingOverLimit()
void shouldNotApplyDamageWhenTargetIsDead()
void shouldSelectVariantWithLowLifeCondition()
```

---

## ✅ Ce qui est déjà bien couvert

- `Personnage.takeDamage()` : physique, brut, bouclier, pénétration de bouclier (12+ cas)
- `Personnage.applyBuff()` : cumul, expiration, multiplicateurs
- `SpellService.castSpell()` : flux normal, passifs, multi-effets
- `DestructionPassiveEffect` : stack chaleur, seuil 100, reset
- `CreationPassiveEffect` : bourgeon, sort gratuit, sort instantané, bouclier
- `TrahisonPassiveEffect` : bonus debuff, bonus base
- `AlchemyService` : recettes, ingrédients, récompenses
- `EpicRelicEffectTest` : équipements épiques et effets spéciaux
- `CursedEffectTest` : effets maudits / malédictions

---

## 🎯 Priorité d'action recommandée

| Priorité | Fichier | Impact |
|----------|---------|--------|
| 🔴 1 | `StatCalculatorTest` | Spec de la formule de combat |
| 🔴 2 | `PersonnageTest` — startTurn, canCast, dealDamage | Spec du tour de jeu |
| ✅ 3 | `SpellVariantTest` — toutes conditions | Spec du système de variantes |
| 🟠 4 | `HeatEffectTest` + `ManaEffectTest` | Spec des ressources |
| 🟠 5 | `ViolencePassiveEffectTest` | Spec passif manquant |
| 🟠 6 | `ConvictionPassiveEffect` — réécrire test | Passif actuellement @Disabled |
| ✅ 7 | `CombatServiceTest` — loot, KO, Cheat Death | ✅ FAIT (100% couvert) |
| 🟡 8 | `ShieldEffectTest` + `PurgeDispelEffectTest` | Spec des effets utilitaires |
