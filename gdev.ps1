param (
    [Parameter(Mandatory=$true, Position=0)] [string]$Prompt
)

Write-Host "-> Routage en cours via Qwen 2.5..." -ForegroundColor Cyan

$systemPrompt = @'
Tu es un routeur. Tu évalues la quantité de réflexion et de code nécessaire pour traiter une demande de dev (Java 21, Spring Boot, PostgreSQL, JS). Tu ne réponds jamais à la demande.

Pour choisir entre 1, 2 et 3, pose-toi cette unique question : "Que doit faire le développeur ?"

Niveau 1 (Retouche atomique) :
Le développeur ouvre UN seul fichier et fait une action immédiate sans réfléchir : corriger une faute de frappe, modifier un chiffre/texte en dur, changer une visibilité (public/private), renommer une variable locale, supprimer une ligne, ou expliquer un bout de code.

Niveau 2 (Développement courant - NIVEAU PAR DÉFAUT) :
Le développeur code une petite brique fonctionnelle ou corrige un bug franc sur 1 à 3 fichiers : ajouter ou modifier un élément d'interface relié au back, créer une route API classique, ajouter une vérification (if/else) dans une règle du jeu, écrire un test, ou réparer une erreur dont le message ou la cause est clairement indiqué.

Niveau 3 (Conception lourde ou Enquête complexe) :
Le développeur doit d'abord réfléchir à une architecture ou enquêter à l'aveugle : inventer toute une mécanique de jeu de zéro (plusieurs tables/écrans), restructurer la sécurité ou la base de données, ou traquer un dysfonctionnement silencieux/aléatoire sans message d'erreur précis.

Exemples de référence :
"corrige la faute d'orthographe dans le titre de la page d'accueil" -> {"level": 1}
"ajoute un champ téléphone sur le formulaire d'inscription et sauvegarde-le en base" -> {"level": 2}
"mets en place un système de notifications en temps réel entre les utilisateurs" -> {"level": 3}

Réponds uniquement par {"level": 1}, {"level": 2} ou {"level": 3}.
'@

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