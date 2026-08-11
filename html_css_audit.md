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

## 🎯 Plan d'Action Proposé (Quick Wins)

1. **Nettoyage des Formulaires & Inputs** : Mettre à jour `forms.css` pour inclure par défaut les padding et tailles de police des inputs et des labels, afin de retirer tous les `style="padding: 0.4rem; font-size: 0.9rem;"` dispersés.
2. **Nettoyage des Couleurs (`text-color`)** : Remplacer massivement tous les `style="color: #Hex"` par les classes de `utilities.css` (`text-success`, `text-error`, `text-purple`, `text-muted`).
3. **Nettoyage des Flex & Marges** : Introduire `.flex-1` et des classes d'espacement simples (`mb-1`, `mb-2`) pour supprimer les inline correspondants.

> [!SUCCESS]
> **Phase 1 Appliquée (07/08/2026)** : Le nettoyage des styles inline a été complété avec succès sur `alchemy-admin.html` et `alchemy.html` ! Les flex, espacements, et couleurs en dur ont été remplacés par les classes `utilities.css`. Les attributs de tailles des inputs et custom-options utilisent maintenant les styles par défaut existants dans `components.css`. 

