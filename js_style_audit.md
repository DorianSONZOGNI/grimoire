# 🎨 Audit JS — Styles Inline et `.style.prop`

Analyse complète des fichiers JS concernant l'utilisation de styles CSS directement dans le code JavaScript :
- `style="..."` dans les templates littéraux (HTML injecté via `innerHTML`)
- `.style.color = ...` / `.style.background = ...` (modification directe des propriétés CSS depuis JS)

---

## 📊 État des lieux

| Fichier | `style=` static | `style=` dynamic* | `.style.prop=` à corriger | **Total** |
|---------|:---:|:---:|:---:|:---:|
| `combat.js` | 280 | 63 | 61 | **404** |
| `pve-admin.js` | 230 | 85 | 5 | **320** |
| `alchemy.js` | 60 | 16 | 46 | **122** |
| `grimoire.js` | 75 | 14 | 2 | **91** |
| `alchemy-admin.js` | 41 | 23 | 22 | **86** |
| `forge.js` | 24 | 5 | 32 | **61** |
| `armory.js` | 42 | 29 | 10 | **81** |
| `dungeons.js` | 49 | 8 | 9 | **66** |
| `shop-admin.js` | 13 | 11 | 18 | **42** |
| `vault.js` | 4 | 12 | 16 | **32** |
| `ui.js` | 1 | 2 | 60 | **63** |
| `auth.js` | 12 | 0 | 4 | **16** |
| `shop.js` | 13 | 10 | 0 | **23** |
| `utils.js` | 9 | 7 | 0 | **16** |
| `api.js` | 0 | 0 | 4 | **4** |
| **TOTAL** | **855** | **287** | **289** | **~1431** |

> *dynamic = valeur calculée avec `${variable}` → la couleur/valeur vient du code, pas une constante — **parfois inévitable**

---

## 🚦 Règle d'or

| Type | Verdict | Action |
|------|---------|--------|
| `style="display: flex; align-items: center;"` | ❌ **Remplaçable** | → Utiliser `.flex-center` |
| `style="color: #ef4444"` (statique) | ❌ **Remplaçable** | → Utiliser `.text-error` |
| `style="color: ${rarity.color}"` (dynamique, valeur calculée) | ✅ **Nécessaire** | Garder tel quel |
| `element.style.display = 'block'` (show/hide) | ✅ **Acceptable** | Ou migrer vers `classList.remove('hidden')` |
| `element.style.color = rarityColor` (couleur dynamique) | ✅ **Nécessaire** | Garder tel quel |
| `element.style.background = 'rgba(16,185,129,0.2)'` (statique) | ❌ **Remplaçable** | → Classe CSS |

### Exceptions absolues (ne pas toucher)
- `animations.js` — 91 `.style.prop=` : moteur d'animation, valeurs calculées à chaque frame
- `particles.js` — 138 `.style.prop=` : moteur particules, même raison
- `ui.js` — 60 `.style.prop=` : construction dynamique du `makeCustomSelect` (DOM créé par code), difficile à extraire sans réécrire l'API

---

## 🎯 Priorités d'action

### Priorité 1 — Fichiers "petits" avec majorité de styles statiques

Ces fichiers ont peu de styles et la majorité peuvent être extraits rapidement.

| Fichier | Static | Actions |
|---------|--------|---------|
| `auth.js` | 12 | Flex, couleurs fixes → classes utilitaires |
| `shop.js` | 13 | Layouts fixes → classes |
| `vault.js` | 4 (static) + 16 (.style.prop) | `.style.color = rarityColor` et `.style.borderColor` → dynamiques, garder |
| `shop-admin.js` | 13 + 18 `.style.prop=` | `.style.color`, `.style.borderColor` sont dynamiques (rarité), garder |

### Priorité 2 — Fichiers moyens

| Fichier | Static | Actions |
|---------|--------|---------|
| `grimoire.js` | 75 | Layouts flex/gap statiques → classes. Couleurs hex statiques → `.text-error`, `.text-amber`, etc. |
| `dungeons.js` | 49 | Layouts, `font-size` fixes, couleurs fixes → classes |
| `armory.js` | 42 | Couleurs statiques (`#fbbf24` → `.text-gold`, etc.), font-sizes |
| `forge.js` | 24 + 32 `.style.prop=` | Les 32 `.style.prop=` sont dynamiques (couleurs de rareté en cascade) |

### Priorité 3 — Les Boss Finaux

| Fichier | Total | Commentaire |
|---------|-------|-------------|
| `pve-admin.js` | ~320 | Très dense d'HTML généré dynamiquement. Priorité aux styles statiques répétitifs (flex, gap, font-size) |
| `alchemy.js` | ~122 | Mix statique/dynamique. Les `.style.color/background/borderColor` sont quasi tous dynamiques (rareté anomalie) |
| `alchemy-admin.js` | ~86 | Idem alchemy.js |
| `combat.js` | ~404 | Le Boss ultime. Mix dense de layout statique ET de couleurs dynamiques (état du combat) |

---

## 🛠️ Classes à créer dans `utilities.css` (non existantes)

Les classes suivantes sont fréquemment injectées en dur dans les templates JS et n'existent pas encore :

```css
/* À ajouter dans utilities.css */

/* Font sizes manquantes */
.text-lg-num { font-size: 1.2rem; }
.text-md-num { font-size: 0.95rem; }

/* Couleurs manquantes */
.text-slate  { color: #cbd5e1; }
.text-slate-dark { color: #64748b; }
.text-white  { color: #f8fafc; }
.text-light  { color: #e2e8f0; }
.text-cyan   { color: #0ea5e9; }
.text-violet { color: #c084fc; }
.text-rose   { color: #fca5a5; }

/* Backgrounds verre manquants */
.bg-success-glass { background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.3); }
.bg-error-glass   { background: rgba(239, 68, 68, 0.2);  border: 1px solid rgba(239, 68, 68, 0.3); }
.bg-amber-glass   { background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.3); }
.bg-purple-glass  { background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.3); }
.bg-info-glass    { background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); }
.bg-black-glass   { background: rgba(0, 0, 0, 0.4); }

/* Padding utilitaires manquants */
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }

/* Border radius */
.rounded-sm  { border-radius: 4px; }
.rounded     { border-radius: 8px; }
.rounded-lg  { border-radius: 12px; }
.rounded-full { border-radius: 9999px; }

/* Autres utilitaires */
.cursor-help    { cursor: help; }
.cursor-pointer { cursor: pointer; }
.font-family-inherit { font-family: inherit; }
.min-w-0 { min-width: 0; }
.overflow-hidden { overflow: hidden; }
.whitespace-pre-wrap { white-space: pre-wrap; }
```

---

## 📋 Plan d'exécution

L'approche sera **identique à l'audit HTML** :
1. Ajouter les classes manquantes dans `utilities.css`
2. Passer fichier par fichier dans l'ordre de priorité
3. Remplacer `style="..."` statiques par des classes dans les templates
4. Migrer les `.style.color/background/border` **statiques** vers `classList.add/remove` avec des classes CSS
5. **Laisser intact** tout ce qui est dynamique (couleur venant d'une variable JS)

> [!WARNING]
> **Ne pas modifier** `animations.js`, `particles.js` et la logique de `makeCustomSelect` dans `ui.js` — ces fichiers sont des moteurs techniques dont les styles font partie du fonctionnement.

> [!IMPORTANT]
> Pour `combat.js` et `pve-admin.js`, procéder **section par section** — ces fichiers font plus de 2000 lignes et contiennent un mix dense de statique/dynamique.

---

## ✅ Avancement

- [ ] Ajouter les classes manquantes dans `utilities.css`
- [ ] `auth.js` — 12 statiques
- [ ] `shop.js` — 13 statiques  
- [ ] `grimoire.js` — 75 statiques
- [ ] `dungeons.js` — 49 statiques
- [ ] `armory.js` — 42 statiques
- [ ] `forge.js` — 24 statiques (laisser les 32 `.style.prop` dynamiques)
- [ ] `vault.js` — 4 statiques (les `.style.prop` sont dynamiques)
- [ ] `shop-admin.js` — 13 statiques (les `.style.prop` sont dynamiques)
- [ ] `alchemy-admin.js` — 41 statiques (les `.style.prop` sont dynamiques)
- [ ] `alchemy.js` — 60 statiques
- [ ] `pve-admin.js` — 230 statiques (par sections)
- [ ] `combat.js` — 280 statiques (par sections)
