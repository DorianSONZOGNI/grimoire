param (
    [Parameter(Mandatory=$true, Position=0)] [string]$Prompt
)

Write-Host "-> Routage en cours via Qwen 2.5..." -ForegroundColor Cyan

$systemPrompt = @"
Tu es un routeur. Tu classes les demandes de développement (Java 21, Spring Boot, PostgreSQL, JS) en 3 niveaux d'effort. Tu ne réponds jamais à la demande.

Niveaux :
1 (Trivial - 1 seul fichier) : renommage (même partout dans une même classe/fichier), suppression de log ou code mort, modification d'une constante/valeur, ajout de commentaire/Javadoc, création d'un DTO/record simple, explication d'un court extrait.
2 (Standard - 1 à 3 fichiers, NIVEAU PAR DÉFAUT) : petite fonctionnalité de bout en bout (afficher une info, ajouter un bouton, vider une liste, créer un endpoint CRUD), règle métier locale (ex: vérifier si un monstre est mort avant d'agir), bug ciblé avec indice (erreur 404/500, NPE, bouton inactif), tests unitaires (JUnit/Mockito).
3 (Complexe - architecture ou flou total) : concevoir un système complet de zéro (système d'équipement, tables de loot, génération procédurale), bug mystérieux sans piste technique (freeze, fuite mémoire, perte de données au F5, concurrence/deadlock), refactoring lourd multi-couches (migrer une logique du client vers le serveur).

Règles strictes :
- Ne classe PAS en 3 juste parce que la phrase contient les mots "combat", "attaque", "monstre" ou "inventaire". Une condition simple, un bouton ou une 404 sur une attaque est de niveau 2. Un renommage reste niveau 1.
- Quand l'utilisateur décrit un comportement attendu ("je veux que...", "rajoute un bouton...", "fais en sorte que...") sans nommer les fichiers, choisis le niveau 2 tant que ça ne demande pas de créer une nouvelle architecture.
- Réserve le niveau 3 aux grosses conceptions multi-tables ou aux bugs d'origine inconnue.

Exemples :
"vire le console.log dans inventory.js" -> {"level": 1}
"passe les PV de départ du guerrier à 150 au lieu de 100" -> {"level": 1}
"renomme la méthode attack en executeAttack partout dans Player" -> {"level": 1}
"corrige la faute d'orthographe dans le titre de la page d'accueil" -> {"level": 1}
"ajoute un champ sur le formulaire d'inscription et sauvegarde-le en base" -> {"level": 2}
"Je veux que le personnage ait le niveau affiché sur son profil" -> {"level": 2}
"quand on clique sur Attaquer, rien ne se passe et ya une 404 dans la console" -> {"level": 2}
"rajoute un bouton pour vider tout l'inventaire d'un coup" -> {"level": 2}
"fais en sorte que les monstres morts ne puissent plus attaquer" -> {"level": 2}
"faudrait un système d'équipement pour mettre des armes et des armures" -> {"level": 3}
"fais marcher le loot aléatoire à la fin des combats" -> {"level": 3}
"l'or se duplique parfois quand on clique deux fois vite sur vendre" -> {"level": 3}
"le jeu freeze complètement quand il y a plus de 10 monstres à l'écran" -> {"level": 3}
"mets en place un système de notifications en temps réel entre les utilisateurs" -> {"level": 3}

Réponds uniquement par {"level": 1}, {"level": 2} ou {"level": 3}.
"@

$body = @{
    model      = "qwen2.5:3b"
    system     = $systemPrompt
    prompt     = $Prompt.Substring(0, [Math]::Min($Prompt.Length, 1500))
    stream     = $false
    format     = @{ type = "object"; required = @("level")
                    properties = @{ level = @{ type = "integer"; enum = @(1,2,3) } } }
    options    = @{ temperature = 0; seed = 42; num_predict = 20; num_ctx = 4096 }
    keep_alive = "30m"
} | ConvertTo-Json -Depth 6

try {
    $params = @{
        Uri         = "http://localhost:11434/api/generate"
        Method      = "Post"
        Body        = [Text.Encoding]::UTF8.GetBytes($body)
        ContentType = "application/json; charset=utf-8"
        TimeoutSec  = 20
    }
    $response = Invoke-RestMethod @params

    $data  =$response.response | ConvertFrom-Json
    $level = [int]$data.level
    if ($level -notin 1,2,3) { throw "Niveau invalide : '$($response.response)'" }
}
catch {
    $detail = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else {$_.Exception.Message }
    Write-Warning "Routing failed, fallback on Medium. Cause : $detail"
    $level = 2
}

switch ($level) { 1 {$targetModel = "gemini-3.8-flash-low"
        Write-Host "-> Niveau 1 -> $targetModel" -ForegroundColor Green
    }
    3 {
        $targetModel = "gemini-3.8-flash-high"
        Write-Host "-> Niveau 3 -> $targetModel" -ForegroundColor Red
    }
    Default {
        $targetModel = "gemini-3.8-flash-medium"
        Write-Host "-> Niveau 2 -> $targetModel" -ForegroundColor Yellow
    }
}

# Lancement d'Antigravity avec édition automatique
agy --model $targetModel --mode accept-edits --prompt-interactive "$Prompt"