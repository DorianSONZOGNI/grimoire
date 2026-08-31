# 🎨 Audit JS — Styles Inline et `.style.prop`

Analyse complète des fichiers JS concernant l'utilisation de styles CSS directement dans le code JavaScript :
- `style="..."` dans les templates littéraux (HTML injecté via `innerHTML`)
- `.style.color = ...` / `.style.background = ...` (modification directe des propriétés CSS depuis JS)

---

## 📋 Tableau de suivi — État de l'audit

> [!NOTE]
> Mis à jour en fonction de l'état réel du code. Dernière vérification : **2026-08-14** (comptage automatique via regex sur les sources).

| Étape | Tâche | Statut | Détail |
|-------|-------|--------|--------|
| 0 | Classes manquantes dans `utilities.css` | ✅ **Terminé** | Toutes les classes ajoutées |
| 1 | `auth.js` — 12 statiques | ✅ **Terminé** | Reste 4 `style=` (dynamiques, OK) |
| 2 | `shop.js` — 13 statiques | ✅ **Terminé** | Reste 10 `style=` (dynamiques, OK) |
| 3 | `grimoire.js` — 75 statiques | ✅ **Terminé** | Reste 55 `style=` (dynamiques + residuels) |
| 4 | `dungeons.js` — 49 statiques | ✅ **Terminé** | Reste 9 `style=` (dynamiques, OK) |
| 5 | `armory.js` — 42 statiques | ✅ **Terminé** | Reste 29 `style=` (dynamiques, OK) |
| 6 | `forge.js` — 24 statiques | ✅ **Terminé** | Reste 6 `style=` (dynamiques, OK) |
| 7 | `vault.js` — 4 statiques | ✅ **Terminé** | Reste 11 `style=` (dynamiques, OK) |
| 8 | `shop-admin.js` — 13 statiques | ✅ **Terminé** | Reste 9 `style=` (dynamiques, OK) |
| 9 | `alchemy-admin.js` — 41 statiques | ✅ **Terminé** | Reste 35 `style=` (dynamiques badge colors, OK) |
| 10 | `alchemy.js` — 60 statiques | ✅ **Terminé** | Reste 39 `style=` (dynamiques rareté/anomalie, OK) |
| 11 | `pve-admin.js` — 230 statiques | ✅ **Terminé** | Reste ~85 `style=` (dynamiques, OK) |
| 12 | `combat.js` — 261 statiques | ✅ **Terminé** | Reste 224 `style=` + 62 `.style.` (dynamiques + animations, OK) |

**Avancement global : 12 / 12 fichiers traités** 🎉

> [!WARNING]
> `utilities.css` classes manquantes : (Toutes ajoutées)

```
████████████████████████████  100%
```

---

## 📊 État des lieux

| Fichier | `style=` restants (réel) | Dont dynamiques | Statiques migrés | Statut |
|---------|:---:|:---:|:---:|:---:|
| `combat.js` | **224** `style=` + **62** `.style.` | ~224+62 | 261 ✅ | ✅ Terminé |
| `pve-admin.js` | **85** | ~85 | 230 ✅ | ✅ Terminé |
| `grimoire.js` | **55** | ~55 | 75 ✅ | ✅ Terminé |
| `alchemy.js` | **39** | ~39 | 60 ✅ | ✅ Terminé |
| `alchemy-admin.js` | **35** | ~35 | 41 ✅ | ✅ Terminé |
| `armory.js` | **29** | ~29 | 42 ✅ | ✅ Terminé |
| `vault.js` | **11** | ~11 | 4 ✅ | ✅ Terminé |
| `shop.js` | **10** | ~10 | 13 ✅ | ✅ Terminé |
| `shop-admin.js` | **9** | ~9 | 13 ✅ | ✅ Terminé |
| `dungeons.js` | **9** | ~9 | 49 ✅ | ✅ Terminé |
| `forge.js` | **6** | ~6 | 24 ✅ | ✅ Terminé |
| `auth.js` | **4** | ~4 | 12 ✅ | ✅ Terminé |

> *Les `style=` restants dans les fichiers « Terminé » sont des valeurs dynamiques calculées depuis JS (rarité, spiritualité, couleur anomalie) — **intentionnels et conformes à la règle d'or**.*

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

> [!CAUTION]
> **Piège JIT Tailwind** : Le compilateur Tailwind ne détecte pas les classes arbitraires (ex: `px-[0.6rem]`, `bg-amber-500/20`) injectées dynamiquement via `innerHTML`. 
> - N'utilisez **QUE** les classes déjà compilées et définies dans `utilities.css` (ex: `.btn-edit`, `.btn-delete-small`, `.text-cyan-400`).
> - Utilisez les classes de composants globales (ex: `.anomaly-badge`) pour le layout complexe.
> - Si une couleur dépend d'une variable JavaScript (ex: `rarityColor`), elle **DOIT** rester en inline `style="color: ${rarityColor};"`.

---

## ✅ Avancement

- [x] Ajouter les classes manquantes dans `utilities.css` *(Terminé)*
- [x] `auth.js` — 12 statiques
- [x] `shop.js` — 13 statiques
- [x] `grimoire.js` — 75 statiques
- [x] `dungeons.js` — 49 statiques
- [x] `armory.js` — 42 statiques
- [x] `forge.js` — 24 statiques (laisser les 32 `.style.prop` dynamiques)
- [x] `vault.js` — 4 statiques (les `.style.prop` sont dynamiques)
- [x] `shop-admin.js` — 13 statiques (les `.style.prop` sont dynamiques)
- [x] `alchemy-admin.js` — 41 statiques (les `.style.prop` sont dynamiques)
- [x] `alchemy.js` — 60 statiques
- [x] `pve-admin.js` — 230 statiques (Terminé)
- [x] `combat.js` — 261 statiques (Terminé — 2026-08-17)
