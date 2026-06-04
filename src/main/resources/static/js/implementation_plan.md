# Modularisation du Frontend Grimoire

## État actuel

| Fichier | Lignes | Poids |
|---|---|---|
| [index.html](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/index.html) | 730 | 49 Ko |
| [scripts.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/js/scripts.js) | 4024 | 230 Ko |
| [styles.css](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/styles/styles.css) | 2298 | 83 Ko |

Le HTML est déjà raisonnable (730 lignes). Le gros du travail porte sur **JS (4024 lignes)** et **CSS (2298 lignes)**.

---

## Arborescence cible

```
src/main/resources/static/
├── index.html                      (730 lignes — inchangé, seuls les <script>/<link> changent)
├── favicon.svg
│
├── styles/
│   ├── variables.css               ← :root, tokens, reset
│   ├── layout.css                  ← header, main grid, panels, responsive
│   ├── forms.css                   ← inputs, selects, labels, buttons (.btn, .btn-*)
│   ├── effects-panel.css           ← .effect-item, .target-selector, .effect-type-badge
│   ├── spell-cards.css             ← .spell-card, niveaux lvl-1→5, badges, .spell-meta
│   ├── spell-cards-animations.css  ← @keyframes lvl5-*, .lvl5-particle (le plus gros bloc ~750 lignes)
│   ├── sandbox.css                 ← .modal-overlay, .sandbox-*, .combatant-*, stats panels
│   └── components.css              ← custom-select, notifications, tooltips, switches, toggles, floating-preview
│
├── js/
│   ├── app.js                      ← Point d'entrée : imports + DOMContentLoaded bootstrap
│   ├── state.js                    ← Variables globales partagées (metaData, currentEffects, loadedSpells, etc.)
│   ├── constants.js                ← GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode
│   ├── api.js                      ← fetchMeta(), loadSpells(), submitSpell(), deleteSpell(), configureSandboxHero(), castSandboxSpell(), passSandboxTurn(), resetSandbox()
│   ├── forge.js                    ← Logique du formulaire de création : addEffectPanel(), removeEffect(), renderEffects(), updateEffectProp(), toggleChannelingFields(), updateRankTitle(), updateSpecialVoieConfig(), updateSpecialSpiritConfig(), violence/karma UI
│   ├── grimoire.js                 ← Rendu de la liste des sorts : renderFilteredSpells(), getSpellCardHtml(), getSpellEffectsSummaryHtml(), editSpell(), cancelEditSpell(), updateEditingPreview()
│   ├── filters.js                  ← renderOriginButtons(), toggleFilterVoie(), toggleFilterSpirit(), resetFilters(), getVoieButtonColor(), getSpiritButtonColor()
│   ├── sandbox.js                  ← Toute la logique Banc d'Essai : trySpell(), updateSandboxUI(), renderSandboxSpells(), toggleHeroConfig(), populateHeroConfigSelectors(), syncHeroConfigForm(), renderHeroConfigBadges(), updateLiveHeroStats(), closeSimulationModal()
│   ├── particles.js                ← Toutes les fonctions fx_*_enter/leave (vent, eau, poison, terre, lave, plante, feu, explosion, esprit, tenebres, karma, generic), spellCardEnter/Leave, attachLvl5CardEffects(), createSparkles(), mkp()
│   ├── animations.js               ← playForgeAnimation(), createBetrayalSlash()
│   └── ui.js                       ← makeCustomSelect(), showNotif(), showGlobalTooltip(), hideGlobalTooltip(), adjustGrimoireHeight(), initResizeObserver(), updateDisplayModeUI(), toggleDisplayMode(), getSpellColor(), hexToRgb(), getVoieIcon(), getSpiritIcon(), renderOptions(), renderSourceOptions(), renderStatOptions(), formatStat(), formatSrc()
```

---

## Mapping détaillé fonctions → modules

### `state.js` (~15 lignes)
Exporte les variables mutables partagées entre modules.
```
metaData, currentEffects, editingSpellId, loadedSpells,
selectedFilterVoieId, selectedFilterSpiritId, grimoireDisplayMode, sandboxSpellIds
```

### `constants.js` (~50 lignes)
Exporte les constantes immuables.
```
GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode
```

### `api.js` (~250 lignes)
Toutes les interactions `fetch()` avec le backend Spring.
```
fetchMeta(), loadSpells(), submitSpell(), deleteSpell(),
configureSandboxHero(), castSandboxSpell(), passSandboxTurn(), resetSandbox()
```

### `forge.js` (~550 lignes)
Le formulaire de création/édition de sorts (panneau gauche).
```
addEffectPanel(), removeEffect(), setEffectTarget(), updateEffectProp(),
toggleEffectChannelingTurn(), renderEffects(), toggleChannelingFields(),
updateRankTitle(), updateSpecialVoieConfig(), updateSpecialSpiritConfig(),
setViolenceType(), updateViolenceLabel(), setKarmaAlignment(), updateKarmaLabel()
```

### `grimoire.js` (~400 lignes)
Le rendu du grimoire (panneau droit) et la logique d'édition.
```
renderFilteredSpells(), getSpellCardHtml(), getSpellEffectsSummaryHtml(),
editSpell(), cancelEditSpell(), updateEditingPreview(), getLvl5Origin()
```

### `filters.js` (~130 lignes)
Gestion des filtres et boutons d'origine.
```
renderOriginButtons(), toggleFilterVoie(), toggleFilterSpirit(),
resetFilters(), getVoieButtonColor(), getSpiritButtonColor()
```

### `sandbox.js` (~450 lignes)
Tout le Banc d'Essai / Simulateur Live.
```
trySpell(), updateSandboxUI(), renderSandboxSpells(), renderSandboxSpellSelector(),
addSelectedSpellToSandbox(), removeSpellFromSandbox(), toggleHeroConfig(),
populateHeroConfigSelectors(), configureSandboxHero(), syncHeroConfigForm(),
renderHeroConfigBadges(), updateLiveHeroStats(), closeSimulationModal()
```

### `particles.js` (~950 lignes)
Les effets de particules des cartes lvl-5 (le plus gros module, mais très isolé).
```
spellCardEnter(), spellCardLeave(), attachLvl5CardEffects(),
fx_vent_enter/leave(), fx_eau_enter/leave(), fx_poison_enter/leave(),
fx_terre_enter/leave(), fx_lave_enter/leave(), fx_plante_enter/leave(),
fx_feu_enter/leave(), fx_explosion_enter/leave(), fx_esprit_enter/leave(),
fx_tenebres_enter/leave(), fx_karma_enter/leave(), fx_generic_enter/leave(),
createSparkles(), mkp()
```

### `animations.js` (~480 lignes)
Animations de la forge (création de sort).
```
playForgeAnimation(), createBetrayalSlash()
```

### `ui.js` (~350 lignes)
Utilitaires UI réutilisables (custom select, notifications, helpers de rendu).
```
makeCustomSelect(), showNotif(), showGlobalTooltip(), hideGlobalTooltip(),
adjustGrimoireHeight(), initResizeObserver(), updateDisplayModeUI(), toggleDisplayMode(),
getSpellColor(), hexToRgb(), getVoieIcon(), getSpiritIcon(),
renderOptions(), renderSourceOptions(), renderStatOptions(), formatStat(), formatSrc()
```

### `app.js` (~30 lignes)
Point d'entrée — importe tout, lance le bootstrap au `DOMContentLoaded`.

---

## Mapping CSS → fichiers cibles

| Fichier cible | Contenu | Lignes estimées |
|---|---|---|
| `variables.css` | `:root`, `*`, `body` | ~35 |
| `layout.css` | `header`, `main`, `@media`, `.panel`, `.panel-title` | ~80 |
| `forms.css` | `input`, `select`, `textarea`, `label`, `.btn*`, `.cost-*`, `.form-*` | ~250 |
| `effects-panel.css` | `.effect-item`, `.effect-header`, `.effect-type-badge`, `.target-*` | ~100 |
| `spell-cards.css` | `.spell-card*`, `.spell-name`, `.badge*`, `.spell-meta`, `.spell-effects-summary`, `.spells-list`, `.indicator`, `.empty-state` | ~200 |
| `spell-cards-animations.css` | Tous les `@keyframes lvl5-*`, `.lvl5-*`, `.lvl5-particle` | ~750 |
| `sandbox.css` | `.modal-overlay`, `.live-stats-panel`, `.sandbox-*`, `.combatant-*`, `.hp-bar*`, hero config | ~550 |
| `components.css` | `.custom-select-*`, `.notification`, `.helper-text`, switch/toggle, floating-preview, tooltip | ~330 |

---

## Plan d'exécution itératif

> [!IMPORTANT]
> Chaque phase est autonome et testable. On ne passe à la suivante qu'après ta validation.

### Phase 1 — Infra : `state.js` + `constants.js` + `app.js`
Créer les 3 fichiers fondamentaux. Modifier `index.html` pour charger `app.js` en `type="module"`. Vérifier que l'app fonctionne toujours.

### Phase 2 — `ui.js` : Extraire les utilitaires
Déplacer `makeCustomSelect()`, `showNotif()`, tooltips, helpers de rendu, display mode. Ce module n'a aucune dépendance métier.

### Phase 3 — `api.js` : Extraire la couche réseau
Isoler tous les `fetch()`. Chaque fonction retourne les données, le caller gère le DOM.

### Phase 4 — `forge.js` + `filters.js` + `grimoire.js`
Le cœur métier. Découper en 3 modules : formulaire, filtres, liste de sorts.

### Phase 5 — `sandbox.js`
Extraire toute la logique du Banc d'Essai (simulateur live).

### Phase 6 — `particles.js` + `animations.js`
Le plus gros en lignes mais le plus isolé. Aucun impact fonctionnel sur le reste.

### Phase 7 (optionnel) — CSS split
Découper `styles.css` en 8 fichiers. Modifier `index.html` pour les charger.

---

## Contrainte technique : ES Modules sans bundler

Puisqu'il s'agit d'une app Spring Boot servant des fichiers statiques (pas de Vite/Webpack), on utilisera les **ES Modules natifs du navigateur** (`type="module"` + `import`/`export`).

Les fonctions appelées depuis le HTML inline (`onclick="..."`) devront être exposées sur `window` dans `app.js` :
```js
// app.js
import { submitSpell } from './api.js';
window.submitSpell = submitSpell;
```

> [!WARNING]
> **Point d'attention** : Le code actuel utilise massivement des `onclick` inline dans le HTML. L'approche `window.xxx = xxx` dans `app.js` est la plus pragmatique pour ne pas réécrire tout le HTML. À terme, on pourra migrer vers des `addEventListener` si souhaité.

---

## Open Questions

1. **Priorité CSS vs JS ?** Je recommande de commencer par le JS (plus de gain en tokens). Le CSS peut attendre la Phase 7. Tu confirmes ?

2. **Fichiers legacy ?** Il existe aussi un [style.css](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/style.css) et un [script.js](file:///c:/Users/doson/IdeaProjects/grimoire/src/main/resources/static/script.js) à la racine de `static/`. Ce sont des copies/anciens fichiers ? Doivent-ils être supprimés ?

3. **`temp.js`** à la racine du projet (220 Ko) — est-ce un backup temporaire à supprimer ?
