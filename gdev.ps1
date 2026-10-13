param (
    [Parameter(Mandatory=$true, Position=0)] [string]$Prompt
)

Write-Host "-> Routage en cours via Qwen 2.5..." -ForegroundColor Cyan

$systemPrompt = @"
Tu es un routeur. Tu évalues l'EFFORT DE RAISONNEMENT nécessaire pour une demande de développement (Java 21, Spring Boot, PostgreSQL, JS vanilla). Tu ne réponds jamais à la demande.

Niveaux :
1 = modification mécanique, une seule zone, aucune décision de conception (typo, renommage, Javadoc, commentaire, record/DTO trivial, explication d'un court extrait).
2 = fonctionnalité ou correctif standard, 1 à 3 fichiers, pattern connu (endpoint CRUD, service, test JUnit/Mockito, validation, fetch/DOM, bug dont la cause est déjà identifiée).
3 = conception ou raisonnement multi-étapes : architecture, génération procédurale, schéma/migration BDD, concurrence, pathfinding/combat/IA, sécurité (Spring Security/JWT), performance, bug à cause inconnue, refactoring multi-couches, ou demande vague/ouverte.

Règles :
- Juge la difficulté, pas le vocabulaire.
- En cas de doute entre deux niveaux, choisis le plus élevé.
- Une demande courte mais vague ("fais marcher le combat") est niveau 3.

Exemples :
"Ajoute une Javadoc à cette méthode" -> {"level": 1}
"Renomme hp en healthPoints dans le record Monster" -> {"level": 1}
"Crée un endpoint GET /heroes/{id} avec un DTO de réponse" -> {"level": 2}
"Écris les tests Mockito pour InventoryService" -> {"level": 2}
"Le bouton d'attaque ne déclenche pas le fetch, erreur 404" -> {"level": 2}
"Génère un donjon procédural en garantissant que toutes les salles sont connexes" -> {"level": 3}
"Deadlocks sur la table inventory quand deux joueurs échangent des objets" -> {"level": 3}
"Refais le système de combat pour gérer les effets de statut" -> {"level": 3}

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

    $data  = $response.response | ConvertFrom-Json
    $level = [int]$data.level
    if ($level -notin 1,2,3) { throw "Niveau invalide : '$($response.response)'" }
}
catch {
    $detail = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    Write-Warning "Routage échoué, bascule sur Medium. Cause : $detail"
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

# Lancement d'Antigravity avec le modèle sélectionné
agy --model $targetModel --prompt-interactive "$Prompt"