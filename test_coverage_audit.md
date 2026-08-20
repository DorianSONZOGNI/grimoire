# Audit de couverture de tests — Grimoire

**Date** : 2026-08-20 | **Total tests actifs** : 141 (143 − 2 @Disabled) | **Fichiers src/main** : ~100 | **Fichiers test** : 19

---

## 📊 Vue d'ensemble de la couverture

| Couche | Classes src | Fichiers test | Estimation couverture |
|--------|-------------|---------------|-----------------------|
| `entity/personnage` | `Personnage.java` (1338 L) | `PersonnageTest.java` (24 tests) | ~55% — bon socle, lacunes importantes |
| `entity/spell/type/effect` | 14 classes d'effets | 4 fichiers test | ~40% — plusieurs effets non testés |
| `entity/voie/passif/specific` | 8 passifs | `PassifTest` + `CreationPassiveEffectTest` | ~60% — `ViolencePassiveEffect` absent |
| `entity/spiritualite/passif` | 3 passifs | `SpiritualitePassifTest` (3 tests) | ~30% — très partiel |
| `service/SpellService` | 641 L | `SpellIntegrationTest` (19 tests) + 3 fichiers dédiés | ~70% — bon mais edges cases manquants |
| `service/pve/CombatService` | — | `CombatServiceTest` + `CombatSimulation*` | ~50% — logique PvE largement sous-testée |
| `service/AlchemyService` | — | `AlchemyServiceTest` (9 tests) | ~60% |
| `utils/StatCalculator` | — | ❌ aucun test | 0% |
| `service/PersonnageService` | — | ❌ aucun test | 0% |
| `service/VoieService` | — | ❌ aucun test | 0% |
| `service/PassiveDispatcher` | — | ❌ aucun test | 0% |
| `security/*` | 4 classes | ❌ aucun test | 0% |
| `model/pve/*` | 5 classes | ❌ aucun test | 0% |
| `scheduler/CombatTimeoutScheduler` | — | ❌ aucun test | 0% |

---

## 🔴 Zones à tester EN PRIORITÉ (specs manquantes)

### 1. `Personnage` — méthodes non couvertes

Méthodes existantes dans `PersonnageTest.java` mais **scénarios manquants** :

| Méthode | Scénario manquant |
|---------|-------------------|
| `takeDamage()` | dégâts avec `DamageType.BURN` → résistance doublée |
| `takeDamage()` | dégâts quand `healthCurrent <= 0` → pas de dégâts négatifs |
| `takeDamage()` | absorption par bouclier partielle vs totale |
| `heal()` | soin avec `HealOverTimeEffect` actif |
| `startTurn()` | tick des DoT/HoT/MoT + expiration des buffs + regen HP/Mana |
| `canCast()` | mana insuffisant, heal insuffisant, heat insuffisant |
| `canCast()` | sorts avec `SpellCastingType.CHANNELING` déjà en canalisation |
| `setExperience()` | tous les paliers de `voieLevel` (1→5) |
| `getStatBuffMultiplier()` | cumul de plusieurs buffs sur même stat |
| `purgeAllBuffsAndDebuffs()` | purge complète des buffs/debuffs/boucliers |
| `dealDamage()` | coup critique (crit > random) |
| `dealDamage()` | coup non-critique |
| `isAlly()` | même teamId = true, teamId différent = false |
| `triggerFreeSpell()` | activation + état post-activation |
| `adjustStat()` | modification d'une stat de base |
| `hasDebuff()` | avec debuff actif vs sans |

---

### 2. `SpellService` — scénarios edge-cases manquants

> Fichier principal : `SpellService.java` (641 L)

| Méthode | Scénario à tester |
|---------|-------------------|
| `castSpell()` | sort avec `canCast()` → fail (mana insuffisant) |
| `castSpell()` | sort de type `CHANNELING` → enregistrement `channeledSpell` |
| `castSpell()` | sort de type `INSTANT` → pas de restriction de tour |
| `castSpell()` | passif modifie le type (BANAL → INSTANT via Création) |
| `castSpell()` | `choiceKey` force une variante spécifique |
| `selectVariant()` | sélection par `SpellCondition.LOW_LIFE` |
| `selectVariant()` | sélection par `SpellCondition.HIGH_LIFE` |
| `selectVariant()` | sélection par `SpellCondition.HIGHER_RESISTANCE` |
| `selectVariant()` | sélection par `SpellCondition.IS_ALLY` |
| `selectVariant()` | fallback si aucune condition matchée |
| `tickChanneling()` | tour 1 → aucun effet appliqué |
| `tickChanneling()` | tours 2+ → effets appliqués |
| `tickChanneling()` | dernier tour → `channeledSpell` remis à null |
| `payCosts()` | réduction par Consolidation Lvl 4 (-25%) |
| `resolveRecipientsGroup()` | tous les `EffectTarget` : CASTER, TARGET, ALLY, ALL_ALLIES, ALL_ENEMIES, ALL |

---

### 3. Effets de sorts — classes non testées

| Classe | Tests existants | À créer |
|--------|-----------------|---------|
| `HeatFixedEffect` | ❌ | `shouldAddHeat`, `shouldCapHeatAt100` |
| `HeatOverTimeEffect` | ❌ | `shouldTickHeatEachTurn`, `shouldExpireAfterDuration` |
| `HeatPercentageEffect` | ❌ | `shouldComputeHeatFromPercentage` |
| `ManaEffect` / `ManaFixedEffect` | ❌ | `shouldRestoreMana`, `shouldCapAtMax` |
| `ManaOverTimeEffect` | ❌ | `shouldTickMana` |
| `ManaPercentageEffect` | ❌ | `shouldComputeManaFromPercentage` |
| `PurgeEffect` | ❌ | `shouldClearAllBuffsAndDebuffs` |
| `DispelEffect` | ❌ | `shouldRemoveSpecificBuff` |
| `ShieldEffect` | ❌ | `shouldAddShield`, `shouldExpireAfterDuration` |
| `BudEffect` | ❌ | (spécifique Création, couvert indirectement ?) |
| `DamageFixedEffect` | ❌ | `shouldInflictExactDamage` |
| `DamagePercentageEffect` | ❌ | `shouldComputeDamageFromPercentage` |
| `HealPercentageEffect` | ❌ | `shouldHealFromPercentage` |

---

### 4. Passifs de Voie — lacunes

| Classe | État |
|--------|------|
| `ConsolidationPassiveEffect` | ✅ bon (PassifTest 10 tests) — manque Lvl 4 coût |
| `ConvictionPassiveEffect` | 🚫 @Disabled — **doit être réécrit** autour du comportement réel |
| `CreationPassiveEffect` | ✅ bon (9 tests dédiés) |
| `DestructionPassiveEffect` | ✅ bon (PassifTest + SpellIntegrationTest) |
| `RaisonPassiveEffect` | ✅ couvert via `SpellIntegrationTest` |
| `SuretePassiveEffect` | ✅ couvert via `SpellIntegrationTest` |
| `TrahisonPassiveEffect` | ✅ couvert via `PassifTest` + `SpellIntegrationTest` |
| **`ViolencePassiveEffect`** | ❌ **aucun test** |

**`ViolencePassiveEffect` — tests à créer :**
- Activation au premier tour (bonus dégâts)
- Cumul de stacks sur plusieurs tours
- Reset des stacks en fin de combat

---

### 5. Passifs de Spiritualité — très sous-testés

| Classe | Tests existants | Manque |
|--------|-----------------|--------|
| `EspritPassiveEffect` | 1 test | préconditions HP/Mana, sorts autorisés vs bloqués |
| `KarmaPassiveEffect` | 1 test | alignements LIGHT, DARK, NONE ; interactions Karma |
| `TenebrePassiveEffect` | 1 test | seuil HP/Mana pour activer, blocage si > seuil |

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
| Tour standard : initiative → sort → tick DoT → fin tour | `CombatServiceTest` (partiel) |
| Monstre KO → loot drop | ❌ |
| Salle avec plusieurs monstres | `CombatSimulation2Test` (partiel) |
| Monstre avec `MonsterBehavior` différent | ❌ |
| Donjon : progression de salle en salle | ❌ |
| `CombatSession` : timeout automatique | ❌ |
| Personnage KO → Cheat Death si applicable | ❌ |
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
    ├── SpellVariantTest.java            [NOUVEAU — selectVariant toutes conditions]
    ├── SpellChannelingTest.java         [ÉTENDRE — edge cases]
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
| 🔴 3 | `SpellVariantTest` — toutes conditions | Spec du système de variantes |
| 🟠 4 | `HeatEffectTest` + `ManaEffectTest` | Spec des ressources |
| 🟠 5 | `ViolencePassiveEffectTest` | Spec passif manquant |
| 🟠 6 | `ConvictionPassiveEffect` — réécrire test | Passif actuellement @Disabled |
| 🟡 7 | `CombatServiceTest` — loot, KO, Cheat Death | Spec PvE complète |
| 🟡 8 | `ShieldEffectTest` + `PurgeDispelEffectTest` | Spec des effets utilitaires |
