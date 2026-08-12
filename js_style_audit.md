# 🎨 Audit JS — Styles Inline et `.style.prop`

Analyse complète des fichiers JS concernant l'utilisation de styles CSS directement dans le code JavaScript :
- `style="..."` dans les templates littéraux (HTML injecté via `innerHTML`)
- `.style.color = ...` / `.style.background = ...` (modification directe des propriétés CSS depuis JS)

---

## 📋 Tableau de suivi — État de l'audit

> [!NOTE]
> Mis à jour en fonction de l'état réel du code. Dernière vérification : **2026-08-11**.

| Étape | Tâche | Statut | Détail |
|-------|-------|--------|--------|
| 0 | Classes manquantes dans `utilities.css` | ✅ **Terminé** | Toutes les classes ajoutées |
| 1 | `auth.js` — 12 statiques | ✅ **Terminé** | 12 statiques migrés |
| 2 | `shop.js` — 13 statiques | ✅ **Terminé** | Statiques migrés |
| 3 | `grimoire.js` — 75 statiques | ❌ À faire | 75 restants |
| 4 | `dungeons.js` — 49 statiques | ❌ À faire | 49 restants |
| 5 | `armory.js` — 42 statiques | ❌ À faire | 42 restants |
| 6 | `forge.js` — 24 statiques | ❌ À faire | 24 restants |
| 7 | `vault.js` — 4 statiques | ❌ À faire | 4 restants |
| 8 | `shop-admin.js` — 13 statiques | ❌ À faire | 13 restants |
| 9 | `alchemy-admin.js` — 41 statiques | ❌ À faire | 41 restants |
| 10 | `alchemy.js` — 60 statiques | ❌ À faire | 60 restants |
| 11 | `pve-admin.js` — 230 statiques | ❌ À faire | 230 restants |
| 12 | `combat.js` — 280 statiques | ❌ À faire | 286 restants (+6 nouveaux) |

**Avancement global : 0 / 12 fichiers traités** · ~0 styles migrés sur ~655 statiques cibles (~0%)

> [!WARNING]
> `utilities.css` classes manquantes : (Toutes ajoutées)

```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░  5%
```

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

*(Toutes les classes manquantes ont été ajoutées)*

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

- [x] Ajouter les classes manquantes dans `utilities.css` *(Terminé)*
- [x] `auth.js` — 12 statiques
- [x] `shop.js` — 13 statiques
- [ ] `grimoire.js` — 75 statiques
- [ ] `dungeons.js` — 49 statiques
- [ ] `armory.js` — 42 statiques
- [ ] `forge.js` — 24 statiques (laisser les 32 `.style.prop` dynamiques)
- [ ] `vault.js` — 4 statiques (les `.style.prop` sont dynamiques)
- [ ] `shop-admin.js` — 13 statiques (les `.style.prop` sont dynamiques)
- [ ] `alchemy-admin.js` — 41 statiques (les `.style.prop` sont dynamiques)
- [ ] `alchemy.js` — 60 statiques
- [ ] `pve-admin.js` — 230 statiques (par sections)
- [ ] `combat.js` — 286 statiques (par sections, +6 ajoutés depuis l'audit initial)
