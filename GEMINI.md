<!-- GRIMOIRE_START -->
## Grimoire — Projet RPG Navigateur

**Stack:** Java 21 · Spring Boot 3.4.4 · Hibernate JPA · Vanilla JS/CSS · Canvas

### Philosophie SSOT
- Backend = cerveau (100% logique métier, formules, équilibrage, textes). Frontend = affichage pur (reçoit, affiche, capte clics).
- Backend ignore couleurs/styles. Frontend ignore formules/calculs.

### Règles Back-End
- DTO = `record` Java. Jamais de classe POJO pour les DTOs.
- DTOs "actifs": pré-calculer données dérivées (poids total, dégâts finaux) dans le DTO. Le front ne calcule rien.
- Pattern: Controller → Service → Repository. Pas de logique dans les controllers.
- Hibernate: `FetchType.LAZY` par défaut + `@EntityGraph` pour fetch sélectif. Zéro EAGER.
- Mapper: entité→DTO via classes dédiées dans `/mapper/`. Jamais d'exposition directe des entités.
- Zéro CSS/HTML en BDD. Stocker donnée sémantique + classes CSS sémantiques (`stat-mana`), pas de `style="..."`.
- Rich Enums: enums exposent `label`, `description`, `icon` via `@JsonFormat(Shape.OBJECT)`. Pas de simple string.
- Endpoints simulation: `POST /api/.../simulate` pour preview calculs complexes. Le front ne devine pas formules.
- REST: ressources au pluriel (`/api/equipments`), admin sous `/api/admin/`, verbes HTTP corrects (GET/POST/PUT/DELETE).
- Sécurité: routes admin protégées `@PreAuthorize("hasRole('ADMIN')")`. RBAC front = cosmétique uniquement.
- Erreurs API: JSON structuré `{ "error": "message" }`, jamais de stacktrace. `@ControllerAdvice` global.
- CSRF désactivé (API stateless same-origin). Protéger via header `X-Requested-With` vérifié côté serveur.

### Règles Front-End (CRITIQUES)
- **Navigateurs Evergreen UNIQUEMENT.** Zéro polyfill. Zéro framework (pas de jQuery).
- **Zéro logique métier en JS.** Pas de constantes d'équilibrage, dictionnaires de traduction, ni formules. Si donnée manque → appel API ou enrichir DTO.
- **INTERDIT: `style=` et `.style.` en JS/HTML.** Utiliser exclusivement des classes CSS existantes.
  - Toggle visibilité: `.is-hidden` / `.is-visible`. PAS `display:none` inline.
  - Toggle état: `.is-active`, `.is-disabled`, `.is-loading`. PAS de manipulation `.style.*`.
  - **Seule exception:** animations procédurales (`transform`, `left`, `top` calculés en runtime).
- **Avant de créer une classe CSS:** vérifier `utilities.css` et `components.css`. Réutiliser l'existant.
- Appels API: passer par `js/services/api.js`. Zéro `fetch()` direct.
- Erreurs: `showNotif(msg, isError)`. Jamais `alert()`.
- État page: objet `const pageState = {}`. Pas de `let` globals éparpillés.
- HTML dynamique: fonctions `createElement()` + classes CSS. Si `innerHTML` nécessaire, zéro attribut `style`.
- **Sécurité XSS:** données utilisateur → `textContent`. Jamais `innerHTML` avec input non-sanitisé.
- Arborescence CSS: `variables.css` → `ui/` (réutilisable) → `pages/` (spécifique) → `sprites/` (animations).
- **Modularité JS:** un fichier JS par domaine fonctionnel. Éviter les god files (>500 lignes = splitter).
<!-- GRIMOIRE_END -->