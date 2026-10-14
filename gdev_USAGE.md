# 🧭 Guide Complet : Routeur Dynamique Antigravity (Architecture System One / JEV)

Ce document détaille l'architecture, l'installation des dépendances, la configuration du script d'aiguillage et les commandes d'usage quotidien pour le projet **Grimoire** (Java 21, Spring Boot, PostgreSQL, Vanilla JS).

---

## 1. Vue d'Ensemble & Architecture

Le système s'inspire de l'architecture **System One** (popularisée par JEV / TypeSafe AI). L'objectif est de supprimer la latence et de réduire les coûts en évitant de solliciter un modèle surdimensionné pour des tâches triviales, tout en allouant la puissance de calcul maximale aux tâches d'architecture complexes.

### Schéma de Fonctionnement

```text
                     Prompt Développeur
                ex: gdev "Ajoute une Javadoc"
                             │
                             ▼
       ┌───────────────────────────────────────────┐
       │       SYSTEM 1 : ÉVALUATION LOCALE        │
       │   Ollama + Qwen 2.5 (1.5B) - Port 11434   │
       │   Latence : ~150 ms | Coût : 0.00$        │
       │   Classification JSON : { "level": 1|2|3 }│
       └─────────────────────┬─────────────────────┘
                             │
                             ▼
       ┌───────────────────────────────────────────┐
       │          AIGUILLAGE DU WORKER             │
       │         Antigravity CLI (`agy`)           │
       └───────┬─────────────┼─────────────┬───────┘
               │             │             │
        (Level 1)        (Level 2)     (Level 3)
               │             │             │
               ▼             ▼             ▼
      ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
      │   Flash (Low)   │  │  Flash (Medium) │  │   Flash (High)  │
      │                 │  │                 │  │                 │
      │ - Syntaxe       │  │ - Endpoints     │  │ - Architecture  │
      │ - Javadoc       │  │ - CRUD standard │  │ - Donjons / RPG │
      │ - Records Java  │  │ - Tests JUnit 5 │  │ - Concurrence   │
      └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. Benchmark & Justification des Modèles

Les benchmarks spécialisés en programmation démontrent la supériorité de la série Flash récente sur les anciennes générations Pro :

* **Pourquoi Gemini 3.8 Flash et non Gemini 3.1 Pro ?**  
  Gemini 3.8 Flash surclasse Gemini 3.1 Pro sur l'ensemble des benchmarks de génération de code, de refactoring et d'architecture. De plus, il intègre un curseur d'effort de raisonnement ajustable (`low`, `medium`, `high`) qui optimise le temps de réponse et l'allocation des tokens. Gemini 3.1 Pro est réservé à l'analyse de corpus documentaires littéraires massifs et n'est pas retenu dans ce pipeline de code.
* **Pourquoi Qwen 2.5 (1.5B) en local ?**  
  Avec une empreinte mémoire inférieure à 1 Go, ce modèle s'exécute instantanément sur CPU ou GPU via Ollama. Il sert exclusivement d'aiguilleur sans générer de code, ce qui garantit un coût nul et une réactivité immédiate.

---

## 3. Matrice de Complexité

| Niveau | Profil Antigravity | Effort | Cas d'Usage Typiques (Grimoire) |
| :--- | :--- | :--- | :--- |
| **Niveau 1 (Faible)** | `gemini-3.8-flash-low` | `low` | Javadoc, formatage, records Java 21 immuables, renommages, getters/setters, petits DTOs. |
| **Niveau 2 (Standard)** | `gemini-3.8-flash-medium` | `medium` | Endpoints REST Spring Boot, services métier, requêtes JPA/PostgreSQL, tests JUnit 5, liaisons DOM Vanilla JS. |
| **Niveau 3 (Élevé)** | `gemini-3.8-flash-high` | `high` | Conception architecturale, génération procédurale des donjons, boucles d'effets périodiques (DoT), gestion de la concurrence, refactorings transversaux. |

---

## 4. Étape 1 : Préparation de l'Environnement

### A. Vérifier Antigravity CLI (`agy`)
Ouvrez PowerShell et assurez-vous que les profils nécessaires sont disponibles :
```powershell
agy models
```
Les profils suivants doivent être listés :
* `gemini-3.8-flash-low`
* `gemini-3.8-flash-medium`
* `gemini-3.8-flash-high`

### B. Installer et Configurer Ollama
1. Téléchargez et installez Ollama depuis [ollama.com](https://ollama.com).
2. Téléchargez le modèle compact Qwen 2.5 (1.5B) :
   ```powershell
   ollama pull qwen2.5:1.5b
   ```
3. Vérifiez la présence du modèle en local :
   ```powershell
   ollama list
   ```
   *(Le modèle pèse environ 986 Mo et reste en écoute sur `http://localhost:11434`).*

---

## 5. Étape 2 : Le Script Routeur (`gdev.ps1`)

Créez le fichier **`gdev.ps1`** à la racine de votre projet `grimoire` (à côté de `pom.xml`) avec le contenu suivant :

```powershell
param (
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Prompt
)

Write-Host "-> Évaluation de la complexité via Qwen 2.5..." -ForegroundColor Cyan

# 1. Payload JSON strict pour Ollama
$body = @{
    model = "qwen2.5:1.5b"
    prompt = "Tu es un routeur d'architecture logicielle pour le projet Grimoire (Java 21, Spring Boot, Vanilla JS). Analyse la requête suivante et classe sa complexité technique : 1 (simple: syntaxe, javadoc, record simple, renommage), 2 (standard: endpoint CRUD, tests unitaires, logique métier courante, liaison DOM), 3 (complexe: architecture système, refactoring lourd, génération procédurale, mécaniques complexes, multithreading). Réponds UNIQUEMENT avec un JSON strict: {`"level`": 1}. Tâche : $Prompt"
    format = "json"
    stream = $false
} | ConvertTo-Json

# 2. Appel à l'API locale avec mécanisme de repli (fallback)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
    $data = $response.response | ConvertFrom-Json
    $level = [int]$data.level
} catch {
    Write-Warning "Ollama inaccessible sur le port 11434. Bascule de secours sur le profil Medium."
    $level = 2
}

# 3. Association avec le profil Antigravity approprié
switch ($level) {
    1 { 
        $targetModel = "gemini-3.8-flash-low"
        Write-Host "-> [Niveau 1 : Tâche Simple] Modèle sélectionné : $targetModel" -ForegroundColor Green 
    }
    3 { 
        $targetModel = "gemini-3.8-flash-high"
        Write-Host "-> [Niveau 3 : Architecture / Complexe] Modèle sélectionné : $targetModel" -ForegroundColor Red 
    }
    Default { 
        $targetModel = "gemini-3.8-flash-medium"
        Write-Host "-> [Niveau 2 : Logique Standard] Modèle sélectionné : $targetModel" -ForegroundColor Yellow 
    }
}

# 4. Lancement d'Antigravity en mode interactif
# Note : Les guillemets autour de "$Prompt" sont indispensables pour éviter l'erreur d'interprétation des flags.
agy --model $targetModel --prompt-interactive "$Prompt"
```

---

## 6. Étape 3 : Rendre la Commande Globale dans PowerShell

Pour exécuter `gdev` depuis n'importe quel dossier sans préfixer par `.\` :

1. Ouvrez votre profil utilisateur PowerShell :
   ```powershell
   notepad $PROFILE
   ```
   *(Si Windows vous demande de créer le fichier, acceptez).*

2. Ajoutez la fonction suivante à la fin du fichier :
   ```powershell
   function gdev {
       param([Parameter(Mandatory=$true)][string]$Prompt)
       & "C:\Users\doson\IdeaProjects\grimoire\gdev.ps1" $Prompt
   }
   ```

3. Sauvegardez le fichier et rechargez votre session PowerShell :
   ```powershell
   . $PROFILE
   ```

---

## 7. Étape 4 : Guide de Test et de Validation

Exécutez successivement ces trois commandes pour vérifier l'ensemble du cycle de routage :

### Test 1 : Validation Niveau 1 (Faible)
```powershell
gdev "Ajoute une Javadoc claire et des commentaires sur la classe Personnage.java"
```
* **Résultat attendu :** Log vert `[Niveau 1 : Tâche Simple] -> gemini-3.8-flash-low` et ouverture de l'interface `agy` avec le niveau d'effort calé sur `low`.

### Test 2 : Validation Niveau 2 (Moyen)
```powershell
gdev "Crée un endpoint POST /api/personnages pour enregistrer un nouveau joueur avec validation Jakarta"
```
* **Résultat attendu :** Log jaune `[Niveau 2 : Logique Standard] -> gemini-3.8-flash-medium` et ouverture de l'interface `agy` avec le niveau d'effort calé sur `medium`.

### Test 3 : Validation Niveau 3 (Élevé)
```powershell
gdev "Conçois l'architecture de génération procédurale des salles du donjon avec gestion des anomalies et graines aléatoires"
```
* **Résultat attendu :** Log rouge `[Niveau 3 : Architecture / Complexe] -> gemini-3.8-flash-high` et ouverture de l'interface `agy` avec le niveau d'effort calé sur `high`.

---

## 8. Dépannage & Bonnes Pratiques

| Problème rencontré | Cause | Solution |
| :--- | :--- | :--- |
| `flags provided but not defined: -i$Prompt` | Espace manquant entre le drapeau et la variable dans la ligne de commande `agy`. | Utiliser impérativement `--prompt-interactive "$Prompt"` avec un espace net et des guillemets doubles. |
| `Ollama inaccessible sur le port 11434` | Le service Ollama n'est pas actif en arrière-plan. | Démarrer l'application Ollama ou lancer `ollama serve` dans un terminal dédié. Le script bascule automatiquement sur `medium` en secours. |
| Caractères accentués mal affichés (`dÃ©tectÃ©`) | Le fichier `gdev.ps1` a été enregistré avec un encodage ANSI ou UTF-16. | Réenregistrer le fichier sous VS Code ou Notepad avec l'encodage **UTF-8**. |
| Classification imprécise de Qwen | La requête est ambiguë ou utilise un vocabulaire trop générique. | Préciser les mots-clés de la stack dans votre prompt (ex: "Record Java 21", "Service Spring Boot", "Refactoring d'architecture"). |