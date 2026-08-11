# 🎨 Audit CSS — HTML Inline Styles

Une analyse complète des fichiers HTML a révélé une forte utilisation de styles CSS en ligne (attributs `style="..."`). Cela pose des problèmes de maintenabilité, gonfle la taille du DOM et augmente la consommation de tokens lors de l'édition du code.

**Bilan HTML** : **622 styles inline** détectés (contre 1 088 initialement, soit **466 styles éliminés !**).
**Bilan JavaScript** : Plus de **350** attributs `style` en dur (générant du HTML statique) ont été remplacés par des classes utilitaires dans les templates littéraux des fichiers JS (`vault.js`, `pve-admin.js`, etc.). Les styles restants sont quasi-exclusivement des couleurs calculées dynamiquement.

---

## 📊 Les Pires Fichiers (Mise à jour)

| Fichier | Nombre d'attributs `style` inline (Avant) | Maintenant | Différence |
|---------|-----------------------------------|------------|------------|
| `vault.html` | 197 | **0** | -197 |
| `pve-admin.html` | 279 | **0** | -279 |
| `index.html` | 135 | **10** | -125 |
| `dungeons.html` | 46 | **3** | -43 |
| `combat.html` | 45 | **0** | -45 |
| `armory.html` | 122 | **3** | -119 |
| `shop-admin.html` | 110 | **0** | -110 |
| `alchemy.html` | 13 | **0** | -13 |
| `secrets.html` | 8 | **0** | -8 |
| `alchemy-admin.html` | 0 | **0** | -5 |
| `shop.html` | 2 | **0** | -2 |
| `register.html` | 1 | **0** | -1 |
| `login.html` | 0 | **0** | -0 |

---

**Note** : Quelques `style="display: none"` subsistent volontairement (ex: 3 dans `armory.html`, 3 dans `dungeons.html`, 10 dans `index.html`) sur les éléments dont la visibilité est contrôlée par JavaScript (`element.style.display = "inline-block"`). Remplacer par `.hidden` (qui contient `!important`) empêcherait le JS de les afficher.

## 🔍 Problèmes Principaux Identifiés

### 1. Duplication de Layouts Flexbox

De nombreux conteneurs utilisent des styles inline redondants pour des alignements simples :
- `display: flex; align-items: center; gap: 0.4rem;` (29 occurrences)
- `flex: 1;` (11 occurrences)
- `margin-bottom: 1rem;` (8 occurrences)

**Solution recommandée** :
Utiliser les classes utilitaires existantes dans `utilities.css` (comme `.flex-center`, `.flex-between`) et en créer de nouvelles pour simplifier le HTML :
```css
/* Nouvelles classes suggérées dans utilities.css */
.flex-1 { flex: 1; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.gap-2 { gap: 0.5rem; }
```

### 2. Couleurs codées en dur dans le HTML (Hex/RGBA)

Plutôt que d'utiliser des variables sémantiques ou des classes, les couleurs sont injectées directement via des styles `color: #...` et `background: rgba(...)`.

**Top des couleurs codées en dur dans le HTML :**
- `#94a3b8` (Gris/Muted) : 91 occurrences
- `#10b981` (Vert/Succès) : 62 occurrences
- `#ef4444` (Rouge/Erreur) : 38 occurrences
- `#f59e0b` (Orange/Attention) : 37 occurrences
- `#a855f7` (Violet/Anomalie) : 36 occurrences
- `#3b82f6` (Bleu/Info) : 27 occurrences

*Exemple dans `alchemy-admin.html` :*
```html
<!-- Avant -->
<span class="material-symbols-outlined cs-icon" style="color: #a855f7; font-size: 1rem;">star</span> Donner Anomalie

<!-- Après (utiliser utilities.css existant) -->
<span class="material-symbols-outlined cs-icon text-purple icon-sm">star</span> Donner Anomalie
```

**Solution recommandée** : 
Le fichier `utilities.css` possède déjà : `.text-muted`, `.text-error`, `.text-success`, `.text-purple`, `.text-orange`, `.icon-sm`, etc. Il faut remplacer les styles inline par ces classes globales.

- Remplacement en cours des balises `<style>` égarées (ex: extrait de `.type-toggle` de `vault.html` vers `vault.css`).
- Extraction continue des styles inline dans le DOM (`flex`, `gap`, et couleurs) pour utiliser les utilitaires de base.
- **Participation active en cours sur `combat.js`** avec remplacement des flexbox, des couleurs hardcodées (`#f59e0b` -> `text-warning`, `#38bdf8` -> `text-info`, etc.) et du padding grâce au bel effort collaboratif en cours !

### 3. Tailles et espacements spécifiques des éléments interactifs

Les `<input>`, `custom-option`, et boutons définissent individuellement leurs `padding` et `font-size` :
- `padding: 0.4rem; font-size: 0.85rem;` (17 occurrences, typiquement sur `.custom-option`)
- `font-size: 1.1rem;` (46 occurrences)

**Solution recommandée** :
Déplacer ces styles directement dans les feuilles de style cibles.
Pour l'exemple de `alchemy-admin.html` :
```css
/* Dans ui/forms.css ou ui/components.css */
.custom-option {
    padding: 0.4rem;
    font-size: 0.85rem;
}
.form-group label {
    margin-bottom: 0.2rem;
    font-size: 0.85rem;
}
.form-group input {
    padding: 0.4rem;
    font-size: 0.9rem;
}
```
Cela permettra de retirer massivement les `style="..."` sur chaque `<input>` et chaque option.

---

## 🔴 Problème 4 — `vault.css` chargé dans 5 pages qui ne sont pas `vault.html`

### Constat

`vault.css` est actuellement inclus dans **6 fichiers HTML** alors qu'il ne devrait l'être que dans `vault.html` :

| Fichier HTML | Devrait charger `vault.css` ? |
|---|---|
| `vault.html` | ✅ Oui — page légitime |
| `alchemy-admin.html` | ❌ Non |
| `dungeons.html` | ❌ Non |
| `pve-admin.html` | ❌ Non |
| `shop-admin.html` | ❌ Non |
| `shop.html` | ❌ Non |

### Pourquoi c'est chargé partout ?

Parce que plusieurs classes définies dans `vault.css` sont utilisées **dans des JS qui génèrent du HTML pour d'autres pages** ou dans d'autres templates HTML. Ces classes ont "fuité" hors du contexte vault.

### Audit des classes — Ce qui part où

**Groupe A — Composant équipement partagé** (utilisé dans `shop-admin.html`, `armory.js`) :
- `.eq-create-row`, `.eq-create-field`, `.equip-create-section` → forme de création d'équipement réutilisée

**Groupe B — Cards d'équipement** (générées par `vault.js` et `shop-admin.js`) :
- `.vault-card`, `.vault-card-header`, `.vault-card-name`, `.vault-card-slot`, `.vault-card-actions`, `.vault-card-stats`, `.vault-card-footer`, `.vault-card-weight`, `.vault-card-status`, `.vault-card-effect`
- `.vault-btn-delete`, `.vault-btn-edit`, `.vault-empty-state`, `.vault-stat-chip`
- `.status-equipped`, `.status-available`

**Groupe C — Anomaly badge/tooltip** (utilisé dans `alchemy-admin.js`, `combat.js`, `pve-admin.js`, `shop-admin.js`, `shop.js`, `ui.js`, `utils.js`) :
- `.anomaly-badge`, `.anomaly-tooltip`, `.anomaly-tooltip-title`, `.anomaly-tooltip-desc`

**Groupe D — Type toggle cons/ano** (utilisé dans `alchemy-admin.html`, `dungeons.html`, `shop-admin.html` + de nombreux JS) :
- `.type-toggle`, `.toggle-btn`, `.cons`, `.ano`

**Groupe E — Malus chip** (utilisé dans `armory.js`, `forge.js`, `shop-admin.js`, `shop.js`) :
- `.malus`

**Groupe F — Modal overlay** (utilisé dans `shop-admin.html`) :
- `.vault-modal-overlay`, `.vault-modal-content`

**Groupe G — Vault-only** (jamais utilisé hors de `vault.html` / `vault.js`) :
- `.vault-main`, `.vault-toolbar`, `.vault-grid`, `.vault-toolbar .search-bar`, `.vault-toolbar .filter-group`
- `.anomaly-info-box`, `.weight-gauge-*`, `.btn-forge-submit`, `.btn-anomaly-submit`
- `.magic-toggle-*`, `.locked-state-banner`, `.anomalie-slider-*`

### Solution recommandée

#### Étape 1 — Extraire les classes globales

Créer un nouveau fichier **`styles/ui/equipment.css`** pour y déplacer les composants réellement partagés :

```
styles/ui/equipment.css  🆕
├── Groupe A : .eq-create-row / .eq-create-field / .equip-create-section
├── Groupe B : .vault-card* / .vault-btn-* / .vault-stat-chip / .status-*
├── Groupe C : .anomaly-badge / .anomaly-tooltip*
├── Groupe D : .type-toggle / .toggle-btn / .cons / .ano
├── Groupe E : .malus
└── Groupe F : .vault-modal-overlay / .vault-modal-content
```

Ce fichier sera chargé dans le layout global (ou dans chaque page qui en a besoin).

> [!TIP]
> **Alternative** : Si la plupart de ces classes ne sont utilisées que par les pages admin (`shop-admin`, `pve-admin`, `alchemy-admin`), envisager de les grouper dans `styles/ui/admin-shared.css` plutôt que dans `equipment.css`.

#### Étape 2 — Épurer `vault.css`

Après extraction, `vault.css` ne garde que le **Groupe G** (vault-only) — ~250 lignes au lieu de 577.

#### Étape 3 — Retirer le `<link>` vault.css des 5 pages

```html
<!-- À retirer de : alchemy-admin.html, dungeons.html, pve-admin.html, shop-admin.html, shop.html -->
<link rel="stylesheet" href="/styles/pages/vault.css?v=...">
```

Et ajouter à la place le lien vers `equipment.css` (si ce fichier est créé).

### Checklist d'avancement

- [x] Créer `styles/ui/equipment.css` avec les groupes A, B, C, D, E, F
- [x] Supprimer ces classes de `vault.css`
- [x] Vérifier que `vault.html` + `vault.js` fonctionnent toujours (les classes vault-card restent valides via `equipment.css`)
- [x] Retirer `<link vault.css>` de `alchemy-admin.html`
- [x] Retirer `<link vault.css>` de `dungeons.html`
- [x] Retirer `<link vault.css>` de `pve-admin.html`
- [x] Retirer `<link vault.css>` de `shop-admin.html`
- [x] Retirer `<link vault.css>` de `shop.html`
- [x] Ajouter `<link equipment.css>` dans les pages qui utilisent ces composants

---

## 🎯 Plan d'Action Proposé (Quick Wins)

1. **Nettoyage des Formulaires & Inputs** : Mettre à jour `forms.css` pour inclure par défaut les padding et tailles de police des inputs et des labels, afin de retirer tous les `style="padding: 0.4rem; font-size: 0.9rem;"` dispersés.
2. **Nettoyage des Couleurs (`text-color`)** : Remplacer massivement tous les `style="color: #Hex"` par les classes de `utilities.css` (`text-success`, `text-error`, `text-purple`, `text-muted`).
3. **Nettoyage des Flex & Marges** : Introduire `.flex-1` et des classes d'espacement simples (`mb-1`, `mb-2`) pour supprimer les inline correspondants.

> [!SUCCESS]
> **Phase 1 Appliquée (07/08/2026)** : Le nettoyage des styles inline a été complété avec succès sur `alchemy-admin.html` et `alchemy.html` ! Les flex, espacements, et couleurs en dur ont été remplacés par les classes `utilities.css`. Les attributs de tailles des inputs et custom-options utilisent maintenant les styles par défaut existants dans `components.css`. 

