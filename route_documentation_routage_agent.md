# Grimoire — Environnement Agent & Routage LLM Local

Ce document détaille l'architecture, l'installation et l'utilisation du système de développement assisté par IA pour le projet **Grimoire** (Java 21, Spring Boot, PostgreSQL, Vanilla JS).

L'objectif est d'optimiser la consommation de tokens, d'éliminer les dépendances Node/npm superflues et de garantir une exécution autonome sans interruptions intempestives de permissions.

---

## 1. Architecture globale

```text
                                  +-------------------------------------+
                                  |         Requête Développeur         |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |         route.ps1 (Wrapper)         |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  | Ollama (qwen2.5:3b / router-core)   |
                                  | Classification Niveau 1 à 5         |
                                  +-------------------------------------+
                                                     |
                        +----------------------------+----------------------------+
                        |                                                         |
                        v                                                         v
             [Niveaux 1 à 3 : Flash]                                   [Niveaux 4 et 5 : Argon]
        • 1 : gemini-3.8-flash-low                                • 4 : gemini-4-argon-medium
        • 2 : gemini-3.8-flash-medium                             • 5 : gemini-4-argon-high
        • 3 : gemini-3.8-flash-high                                (ou repli Flash High)
                        |                                                         |
                        +----------------------------+----------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |       Antigravity CLI (agy)         |
                                  |       Mode : accept-edits           |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |         Serena MCP Server           |
                                  |   Contexte headless (antigravity)   |
                                  |   Language Server Protocol (LSP)    |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |    Projet Grimoire (AST Java/JS)    |
                                  +-------------------------------------+
```

---

## 2. Paliers de complexité (Niveaux 1 à 5)

| Niveau | Modèle Gemini cible | Usage typique | Portée & Réflexion |
| :---: | :--- | :--- | :--- |
| **1** | `gemini-3.8-flash-low` | Typo, renommage local, modification de constante, log, DTO/record simple, explication de code. | 1 fichier, action mécanique directe sans choix de conception. |
| **2** | `gemini-3.8-flash-medium` | Endpoint CRUD, binding UI/DOM, validation, règle de gestion ciblée, test Mockito, bug avec stack trace claire. | 1 à 3 fichiers, patterns connus (niveau par défaut). |
| **3** | `gemini-3.8-flash-high` | Concurrence (deadlock, duplication), performance/freeze, bug silencieux/intermittent, question ouverte, système complet (loot, météo). | Multi-couches, conception ou enquête à l'aveugle. |
| **4** | `gemini-4-argon-medium` | Refonte d'architecture (hexagonale), migration de module, audit de sécurité complet de l'application, bug bloquant récurrent. | Restructuration majeure transversale. |
| **5** | `gemini-4-argon-high` | Migration complète de stack (ex: Spring Boot vers Quarkus), refonte intégrale de la persistance ou crise bloquante critique. | Ultime niveau (choix manuel recommandé). |

---

## 3. Prérequis

* **Système d'exploitation** : Windows avec PowerShell 5.1 ou PowerShell 7+ (`pwsh`).
* **Antigravity CLI** : `agy` installé et authentifié sur le projet GCP.
* **Ollama** : installé localement avec le modèle léger de routage :
  ```powershell
  ollama pull qwen2.5:3b
  ```
  *(Vérifier avec `ollama ls`. Si `qwen2.5:1.5b` est présent et inutile : `ollama rm qwen2.5:1.5b`).*
* **Python / uv** : pour le serveur MCP Serena :
  ```powershell
  uv tool install serena
  ```

---

## 4. Configuration pas à pas

### Étape 1 : Initialiser Serena et le Language Server

1. Télécharger les dépendances LSP Java requises :
   ```powershell
   serena download-ls-dependencies
   ```
2. Enregistrer le projet Grimoire :
   ```powershell
   serena project register --path "C:\Users\doson\IdeaProjects\grimoire" --name grimoire
   ```
3. Activer le contexte headless (sans interface graphique) pour éviter que le dashboard ne s'ouvre :
   ```powershell
   serena context activate antigravity
   ```

### Étape 2 : Déclarer Serena dans Antigravity

Enregistre le serveur MCP dans `agy` avec le contexte headless et le chemin du workspace :
```powershell
agy mcp add serena serena start-mcp-server --context antigravity --project "C:\Users\doson\IdeaProjects\grimoire"
```

Vérifie l'enregistrement :
```powershell
agy mcp list
```

### Étape 3 : Set IA function

En powershell : 

```powershell
if (!(Test-Path $PROFILE)) { New-Item -Path $PROFILE -ItemType File -Force } notepad $PROFILE
```
Puis dans le fichier coller :

```powershell
function ai {
    [CmdletBinding(PositionalBinding = $false)]
    param(
        [ValidateRange(0,5)] [int]$Level = 0,
        [switch]$DryRun,
        [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)] [string[]]$Words
    )
    & "C:\Users\doson\IdeaProjects\grimoire\route.ps1" -Prompt ($Words -join " ") -Level $Level -DryRun:$DryRun
}
```

Après ça vous pouvez lancer directement dans le terminal powershell :

```powershell
ai "requete à insérer ici"
```

Après ça vous pouvez lancer directement dans le terminal powershell :

```powershell
ai "requete à insérer ici"
```

---

## 5. Description des scripts

Les trois scripts PowerShell doivent être placés dans le même dossier :

* **`router-core.ps1`** : Cœur du routeur. Contient le prompt système, les *few-shots* entrelacés, l'appel à l'API Ollama (`/api/chat`), la fonction `Get-RouteLevel` et la détection de mise en cache mémoire (`Test-RouterLoaded`).
* **`route.ps1`** : Point d'entrée pour lancer une tâche. Interroge le routeur, gère les replis, consigne les requêtes dans `router.log.jsonl` et lance `agy`.
* **`test-router.ps1`** : Banc d'essai automatisé avec jeux de tests (Rappel, Régression, Hors-échantillon) et matrice de confusion.

---

## 6. Guide des commandes

### Utilisation quotidienne (`route.ps1`)

#### 1. Routage automatique (recommandé)
Le routeur analyse l'intention et choisit le modèle adapté :
```powershell
.\route.ps1 "Passe le cooldown de la potion de soin de 10 à 5 secondes"
```
```powershell
.\route.ps1 "Ajoute un endpoint DELETE pour supprimer un personnage avec son id"
```
```powershell
.\route.ps1 "Les PV du joueur repassent à fond quand on fait F5, trouve le bug"
```

#### 2. Simulation sans exécution (`-DryRun`)
Affiche le niveau calculé, le modèle sélectionné et la ligne de commande `agy` générée, sans lancer l'agent ni écrire dans les logs :
```powershell
.\route.ps1 "Refais le système de combat pour supporter les altérations d'état" -DryRun
```

#### 3. Forçage manuel d'un niveau (`-Level 1..5`)
Bypasse Ollama et force un modèle précis (idéal pour les urgences ou pour déclencher Argon High) :
```powershell
# Forcer Flash Low (Niveau 1)
.\route.ps1 "Renomme hp en hitPoints dans Monster" -Level 1

# Forcer Flash High (Niveau 3)
.\route.ps1 "Pourquoi la quête ne se valide pas ?" -Level 3

# Forcer Argon High (Niveau 5)
.\route.ps1 "Refonte complète de l'architecture réseau et multi-joueur" -Level 5
```

---

### Exécution du banc d'essai (`test-router.ps1`)

Pour vérifier la précision du modèle local et détecter d'éventuelles régressions :

```powershell
# Lancer la suite de tests complète avec le modèle par défaut (qwen2.5:3b)
.\test-router.ps1

# Comparer avec une variante plus puissante (ex: 7B)
.\test-router.ps1 -Model qwen2.5:7b
```

#### Lecture des résultats du test :
* **`[OK]`** : Niveau prédit identique au niveau attendu.
* **`[SOUS]`** : Sous-routage (modèle trop faible affecté). Dangereux pour la qualité du code.
* **`[SUR]`** : Sur-routage (modèle plus fort que nécessaire). Impacte uniquement la consommation de quota/tokens.
* **Matrice de confusion** : Permet de repérer instantanément les confusions récurrentes (ex: 2 pris pour un 3).

---

## 7. Dépannage fréquent

### Le dashboard Serena s'ouvre à chaque requête
* **Cause** : Le contexte actif est resté sur `desktop-app`.
* **Solution** : Exécute `serena context activate antigravity` et vérifie que l'argument `--context antigravity` est présent dans la déclaration MCP d'`agy`.

### Antigravity redemande la confirmation des commandes
* **Cause** : Règle sandbox manquante ou trop restrictive dans `settings.json`.
* **Solution** : Vérifie la présence de `"unsandboxed(*)"` dans `permissions.allow`.

### Antigravity demande confirmation avant de créer un fichier (`Allow creation...?`)
* **Cause** : Le mode d'édition automatique n'est pas activé.
* **Solution** : Vérifie que `"agentMode": "accept-edits"` est présent à la racine de `settings.json` ou que le flag `--mode accept-edits` est passé à `agy`.

### Erreurs d'encodage PowerShell (accents corrompus `Ã©`)
* **Cause** : Le script a été enregistré en UTF-8 sans BOM et exécuté sous Windows PowerShell 5.1.
* **Solution** : Enregistre `router-core.ps1` en **UTF-8 with BOM** via VS Code / Notepad++, ou lance tes scripts sous **PowerShell 7 (`pwsh`)**.