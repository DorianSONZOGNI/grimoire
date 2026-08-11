# 🔍 Audit de Duplication — JavaScript (`/static/js/`)

**24 fichiers** · **~17 400 lignes** · **~900 KB** de code JS analysés.

---

## 📋 Tableau de suivi — État de l'audit

> [!NOTE]
> Mis à jour automatiquement en fonction de l'état réel du code. Dernière vérification : **2026-08-11**.

| # | Cluster | Sévérité | Statut | Lignes récupérées |
|---|---------|----------|--------|-------------------|
| 1 | Tooltip `globalFixedTooltip` — 6 fichiers | 🔴 Critique | ✅ **Fait** | ~250 lignes |
| 2 | `showNotif()` — 4 implémentations | 🔴 Critique | ✅ **Fait** | ~50 lignes |
| 3 | `loadEquipments()` — 3 versions | 🟠 Élevée | ⏳ En cours | 0 |
| 4 | `renderGrid()` — 2 copies | 🟠 Élevée | ❌ À faire | 0 |
| 5 | `loadAnomalies()` — 2 versions | 🟠 Élevée | ❌ À faire | 0 |
| 6 | Tooltip HTML Builders — 4 fonctions | 🟠 Élevée | ❌ À faire | 0 |
| 7 | Custom Select — 3 implémentations | 🟡 Moyenne | ❌ À faire | 0 |
| 8 | `RARITY_COLORS` — double définition | 🟡 Moyenne | ✅ **Fait** | ~15 lignes |
| 9 | `deleteEquipment()` — 2 versions | 🟡 Moyenne | ❌ À faire | 0 |

**Avancement global : 3 / 9 clusters traités** · ~315 lignes récupérées sur ~1 050 estimées (~30%)

```
████████░░░░░░░░░░░░░░░░░░░░  30%
```

---

## Résumé Exécutif

| Sévérité | Clusters de duplication | Lignes dupliquées (estimé) |
|----------|------------------------|----------------------------|
| 🔴 Critique | 2 | ~500 lignes |
| 🟠 Élevée | 4 | ~350 lignes |
| 🟡 Moyenne | 3 | ~200 lignes |
| **Total** | **9 clusters** | **~1 050 lignes** |

> [!IMPORTANT]
> Les 2 fichiers les plus volumineux — [combat.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/combat.js) (3 849 lignes) et [pve-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/pve-admin.js) (2 710 lignes) — concentrent la majorité de la dette technique.

---

## 🔴 Critique — Duplication massive

### 1. Système de Tooltip (`globalFixedTooltip`) — **~300 lignes dupliquées** ✅ Fait

**Le pire cas.** Un bloc de **~50 lignes identiques** copié-collé dans **6 fichiers** :

| Fichier | Références |
|---------|------------|
| [alchemy-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/alchemy-admin.js) | 3 |
| [alchemy.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/alchemy.js) | 3 |
| [combat.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/combat.js) | 3 |
| [pve-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/pve-admin.js) | 3 |
| [shop-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop-admin.js) | 3 |
| [shop.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop.js) | 3 |

Le code dupliqué inclut :
- Création du `div#globalFixedTooltip`
- 15+ lignes de `tooltip.style.*` (position, z-index, background, border, padding, etc.)
- Logique de positionnement (calcul `rect`, overflow viewport)
- Event handlers (mouseenter/mouseleave)

```javascript
// Ce bloc de ~50 lignes est copié 6 fois :
let tooltip = document.getElementById('globalFixedTooltip');
if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'globalFixedTooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '999999';
    tooltip.style.visibility = 'visible';
    tooltip.style.opacity = '1';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transform = 'none';
    tooltip.style.background = 'rgba(15, 23, 42, 0.95)';
    tooltip.style.border = '1px solid rgba(168, 85, 247, 0.5)';
    tooltip.style.borderRadius = '8px';
    // ... ~35 lignes de plus
}
```

> [!TIP]
> **Fix** : Extraire dans [ui.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/ui.js) qui a déjà `showGlobalTooltip` / `hideGlobalTooltip`. Il existe déjà une version partielle — il suffit de la compléter et d'y déléguer les 6 fichiers.

---

### 2. `showNotif()` — 4 implémentations différentes ✅ Fait

| Fichier | ID élément cible | Particularités |
|---------|-----------------|----------------|
| [combat.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/combat.js) | `combatNotif` | Hardcodé pour combat |
| [dungeons.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/dungeons.js) | `dungeonNotif` | Hardcodé pour donjon |
| [ui.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/ui.js) | `notif` (créé dynamiquement) | ✅ Version générique |
| [utils.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/utils.js) | Proxy → `ui.js` | Simple wrapper |

Le problème : `combat.js` et `dungeons.js` re-implémentent la même logique au lieu d'utiliser `ui.showNotif()`.

> [!TIP]
> **Fix** : `ui.js` version = seule source de vérité. Paramétrer l'ID ou utiliser un sélecteur global. `combat.js` et `dungeons.js` appellent `showNotif()` via import.

---

## 🟠 Élevée — Fonctions dupliquées avec variantes

### 3. `loadEquipments()` — 3 versions ⏳ En cours

| Fichier | Endpoint API | Logique spécifique |
|---------|-------------|-------------------|
| [pve-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/pve-admin.js) | `/api/shop/templates` + `/api/equipments/all` | Merge + déduplique |
| [shop-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop-admin.js) | `/api/shop/templates` | Templates uniquement |
| [vault.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/vault.js) | `/api/equipments` ou `/api/equipments/all` | Conditionnel isAdmin |

> [!TIP]
> **Fix** : Extraire dans [api.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/api.js) une seule fonction `loadEquipments({sources, isAdmin})` paramétrable.

---

### 4. `renderGrid()` — 2 copies quasi-identiques ❌ À faire

[shop-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop-admin.js) et [vault.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/vault.js) ont le **même squelette** :

```javascript
function renderGrid(equipments) {
    const container = document.getElementById('vaultGrid');
    if (equipments.length === 0) {
        container.innerHTML = `<div class="vault-empty-state">...Aucun objet...</div>`;
        return;
    }
    // Groupement par rareté, rendu HTML...
}
```

> [!TIP]
> **Fix** : Extraire un composant `EquipmentGrid` réutilisable, avec callback de rendu de carte.

---

### 5. `loadAnomalies()` — 2 versions ❌ À faire

| Fichier | Endpoint | Stockage |
|---------|----------|----------|
| [pve-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/pve-admin.js) | `/api/anomalies/all` | `pageState.allAnomalies` |
| [shop-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop-admin.js) | `/api/anomalies/all-templates` | `window.allAnomalies` |

---

### 6. Tooltip HTML Builders — 4 fonctions similaires ❌ À faire

| Fichier | Fonction |
|---------|----------|
| [alchemy.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/alchemy.js) | `buildEquipmentTooltipHTML()` |
| [alchemy.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/alchemy.js) | `buildAnomalyTooltipHTML()` |
| [combat.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/combat.js) | `generateEquipmentTooltipHTML()` |
| [utils.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/utils.js) | `getAnomalyTooltipHTML()` |

Chacune génère du HTML pour afficher les stats d'un item. Devrait être **un seul template paramétré**.

---

## 🟡 Moyenne — Patterns récurrents non centralisés

### 7. Custom Select / Dropdown — 3 implémentations ❌ À faire

| Fichier | Fonction | Occurrences `custom-select` |
|---------|----------|---------------------------|
| [pve-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/pve-admin.js) | `buildCustomSelect()` | **74** |
| [armory.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/armory.js) | `populateSelects()` | 11 |
| [ui.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/ui.js) | `makeCustomSelect()` | 3 |

`pve-admin.js` ré-implémente massivement les custom selects alors que `ui.js` a déjà une version réutilisable.

### 8. `RARITY_COLORS` — Défini 2 fois, chargé dynamiquement 1 fois ✅ Fait

| Emplacement | Mécanisme |
|------------|-----------|
| [utils.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/utils.js) | `window.RARITY_COLORS = { COMMUN: '#94a3b8', ... }` (hardcodé) |
| [constants.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/constants.js) | `window.RARITY_COLORS = {}` puis chargé depuis l'API |

Conflit potentiel : si les deux fichiers sont chargés, l'un écrase l'autre.

### 9. `deleteEquipment()` — 2 versions ❌ À faire

| Fichier | Comportement |
|---------|-------------|
| [armory.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/armory.js) | DELETE direct + refresh |
| [shop-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop-admin.js) | Confirmation modale + DELETE |

---

## 📊 Métriques détaillées par fichier

### Taille des fichiers

| Fichier | Lignes | innerHTML | fetch (globalFetch) | try/catch | addEventListener |
|---------|--------|-----------|---------------------|-----------|-----------------|
| [combat.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/combat.js) | **3 884** | 63 | 21 | 20 | 5 |
| [pve-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/pve-admin.js) | **2 708** | 32 | 15 | 16 | 8 |
| [armory.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/armory.js) | 1 401 | 30 | 13 | 12 | 9 |
| [particles.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/particles.js) | 1 109 | 0 | 0 | 0 | 4 |
| [vault.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/vault.js) | 987 | 18 | 8 | 8 | 5 |
| [alchemy.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/alchemy.js) | 929 | 8 | 7 | 3 | 2 |
| [forge.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/forge.js) | 898 | 5 | 0 | 0 | 0 |
| [shop-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop-admin.js) | 840 | 20 | 6 | 5 | 7 |
| [dungeons.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/dungeons.js) | 831 | 20 | 6 | 5 | 8 |
| [grimoire.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/grimoire.js) | 825 | 5 | 0 | 2 | 0 |
| [alchemy-admin.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/alchemy-admin.js) | 729 | 24 | 7 | 5 | 5 |
| [ui.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/ui.js) | 575 | 4 | 0 | 0 | 7 |
| [auth.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/auth.js) | 493 | 6 | 1 | 8 | 6 |
| [animations.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/animations.js) | 490 | 0 | 0 | 0 | 0 |
| [api.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/api.js) | 403 | 9 | 5 | 5 | 1 |
| [shop.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/shop.js) | 383 | 5 | 3 | 2 | 2 |

---

## 🛠️ Plan de refactoring recommandé

### Priorité 1 — Quick Wins (impact élevé, effort faible)

| Action | Fichiers impactés | Lignes économisées |
|--------|-------------------|-------------------|
| Centraliser tooltip dans `ui.js` | 6 fichiers | ~250 lignes |
| Unifier `showNotif()` → `ui.js` | 3 fichiers | ~50 lignes |
| Résoudre conflit `RARITY_COLORS` | 2 fichiers | ~15 lignes |

### Priorité 2 — Refactoring modéré

| Action | Fichiers impactés | Lignes économisées |
|--------|-------------------|-------------------|
| `loadEquipments()` → `api.js` paramétrable | 3 fichiers | ~80 lignes |
| `renderGrid()` → composant réutilisable | 2 fichiers | ~60 lignes |
| Tooltip HTML builders → 1 seul template | 3 fichiers | ~120 lignes |

### Priorité 3 — Refactoring structurel

| Action | Effort |
|--------|--------|
| Découper `combat.js` (3 884 lignes) en modules | Élevé |
| Découper `pve-admin.js` (2 708 lignes) en modules | Élevé |
| Centraliser `buildCustomSelect()` → `ui.js` | Moyen |

---

## Architecture cible suggérée

```
js/
├── components/
│   ├── modal.js          ✅ existe
│   ├── navbar.js         ✅ existe
│   ├── tooltip.js        🆕 extraire d'ui.js + 6 fichiers
│   ├── equipment-grid.js 🆕 extraire de vault.js/shop-admin.js
│   └── custom-select.js  🆕 extraire d'ui.js
├── services/
│   ├── api.js            ♻️ enrichir avec loadEquipments/loadAnomalies
│   └── auth.js           ✅ existe
├── utils/
│   ├── constants.js      ♻️ fusionner avec utils.js RARITY_COLORS
│   ├── utils.js          ♻️ garder comme façade
│   └── filters.js        ✅ existe
├── pages/
│   ├── combat.js         ♻️ découper en sous-modules
│   ├── pve-admin.js      ♻️ découper en sous-modules
│   └── ...               (reste des pages)
└── ui.js                 ♻️ hub UI (notif, modal, tooltip)
```
