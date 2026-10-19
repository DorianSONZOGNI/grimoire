param (
    [Parameter(Mandatory=$true, Position=0)] [string]$Prompt,
    # 0 = routage auto. 1 à 5 = niveau forcé (5 = Argon high, jamais choisi par le routeur)
    [ValidateRange(0,5)] [int]$Level = 0
)

# ---- Configuration (vérifie les IDs exacts avec : agy models) ----
$Models = @{
    1 = "gemini-3.8-flash-low"
    2 = "gemini-3.8-flash-medium"
    3 = "gemini-3.8-flash-high"
    4 = "gemini-4-argon-medium"
    5 = "gemini-4-argon-high"
}
$Colors       = @{ 1 = "Green"; 2 = "Yellow"; 3 = "Red"; 4 = "Magenta"; 5 = "Magenta" }
$ArgonEnabled = $true    # $false : les niveaux 4 et 5 retombent sur Flash high
$DefaultLevel = 2        # utilisé seulement si Ollama échoue
$RouterModel  = "qwen2.5:3b"

# ---- Routage ----
if ($Level -eq 0) {
    $source = "auto"
    Write-Host "-> Routage en cours ($RouterModel)..." -ForegroundColor Cyan

    $systemPrompt = @'
Tu es un routeur de difficulté pour un projet RPG web (Java 21, Spring Boot, PostgreSQL, JS). Tu ne réponds jamais à la demande : tu donnes seulement son niveau.

1 = retouche atomique, un seul fichier, aucune réflexion : faute de frappe, texte ou valeur en dur, changement de visibilité, renommage local, suppression d'une ligne, explication d'un court extrait.
2 = brique fonctionnelle précise, ou bug dont le symptôme désigne la cause, 1 à 3 fichiers : route API classique, champ de formulaire relié au back, vérification manquante dans une règle de jeu, test, erreur avec message ou exception clairement indiquée.
3 = conception ou enquête : fonctionnalité décrite en termes vagues ou sans spécification, question ouverte du type "comment gérer..." ou "j'aimerais que...", temps réel ou multi-joueur, nouvelle mécanique multi-tables ou multi-écrans, schéma BDD, sécurité, concurrence, performance, bug silencieux ou intermittent (sans erreur, "parfois", "au bout d'un moment").
4 = EXCEPTIONNEL : refonte touchant de nombreux fichiers et couches, architecture globale, audit de sécurité complet, ou échec répété déjà signalé par le développeur.

Le niveau 4 n'est choisi que sur signe explicite : entre 3 et 4, choisis 3. Si une demande est vague, ouverte ou sans cause connue, choisis au moins 3. Réponds uniquement {"level": N}.
'@

    # Exemples en tours de chat, entrelacés pour éviter qu'un niveau domine la fin du contexte
    $shots = @(
        @("corrige la faute dans le titre de la page d'accueil", 1),
        @("génère un donjon procédural avec des salles connexes et des coffres", 3),
        @("ajoute un champ téléphone au formulaire d'inscription et sauvegarde-le en base", 2),
        @("refonte complète du moteur de combat : architecture événementielle, impact sur le front, la BDD et tous les tests", 4),
        @("passe la méthode getHp en private", 1),
        @("j'aimerais que les joueurs puissent se battre à plusieurs en même temps sur la même carte", 3),
        @("le marchand accepte un achat même quand le joueur n'a pas assez d'or", 2),
        @("comment pourrait-on gérer les effets météo sur les combats ?", 3),
        @("écris les tests Mockito de InventoryService", 2),
        @("fais un audit de sécurité complet de toute l'application", 4),
        @("change le délai de réapparition des monstres de 30 à 45 secondes", 1),
        @("après quelques minutes de jeu, les PNJ se figent et il n'y a rien dans les logs", 3),
        @("NullPointerException dans PlayerService.save quand l'inventaire est vide", 2),
        @("quand deux joueurs échangent un objet en même temps, l'inventaire se corrompt parfois", 3),
        @("le bouton d'attaque renvoie une 404 sur /api/combat/attack", 2)
    )

    $messages = @(@{ role = "system"; content = $systemPrompt })
    foreach ($s in $shots) {
        $messages += @{ role = "user";      content = $s[0] }
        $messages += @{ role = "assistant"; content = '{"level": ' + $s[1] + '}' }
    }
    $messages += @{ role = "user"; content = $Prompt.Substring(0, [Math]::Min($Prompt.Length, 1200)) }

    $body = @{
        model      = $RouterModel
        messages   = $messages
        stream     = $false
        format     = @{ type = "object"; required = @("level")
                        properties = @{ level = @{ type = "integer"; enum = @(1,2,3,4) } } }
        options    = @{ temperature = 0; seed = 42; num_predict = 12; num_ctx = 3072 }
        keep_alive = "30m"
    } | ConvertTo-Json -Depth 8

    try {
        $params = @{
            Uri         = "http://localhost:11434/api/chat"
            Method      = "Post"
            Body        = [Text.Encoding]::UTF8.GetBytes($body)
            ContentType = "application/json; charset=utf-8"
            TimeoutSec  = 20
        }
        $response = Invoke-RestMethod @params
        $data     = $response.message.content | ConvertFrom-Json
        $Level    = [int]$data.level
        if ($Level -notin 1..4) { throw "Niveau invalide : '$($response.message.content)'" }
    }
    catch {
        $detail = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        Write-Warning "Routage échoué, bascule sur le niveau $DefaultLevel. Cause : $detail"
        $Level  = $DefaultLevel
        $source = "fallback"
    }
}
else {
    $source = "manuel"
}

# Argon indisponible ou désactivé : Flash high prend le relais
if (-not $ArgonEnabled -and $Level -ge 4) { $Level = 3 }

$targetModel = $Models[$Level]
Write-Host "-> Niveau $Level ($source) -> $targetModel" -ForegroundColor $Colors[$Level]

# ---- Journal pour recalibrer le prompt (local, prompt tronqué à 200 caractères) ----
try {
    [pscustomobject]@{
        ts     = (Get-Date -Format s)
        level  = $Level
        model  = $targetModel
        source = $source
        prompt = $Prompt.Substring(0, [Math]::Min($Prompt.Length, 200))
    } | ConvertTo-Json -Compress | Add-Content -Path (Join-Path $PSScriptRoot "router.log.jsonl") -Encoding UTF8
} catch { }

# ---- Lancement d'Antigravity avec édition automatique ----
agy --model $targetModel --mode accept-edits --prompt-interactive "$Prompt"