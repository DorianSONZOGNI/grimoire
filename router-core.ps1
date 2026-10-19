# router-core.ps1 : source unique du routeur (utilisée par route.ps1 ET test-router.ps1).
# Toute modification du prompt ou des exemples se fait ici, nulle part ailleurs.

$RouterModel = "qwen2.5:3b"
$RouterUrl   = "http://localhost:11434/api/chat"
$RouterTimeoutSec = 30   # appels normaux ; le préchauffage du test utilise un délai plus long
$RouterColdTimeoutSec = 120   # délai accordé quand le modèle n'est pas encore chargé en mémoire
$RouterKeepAlive      = "4h"  # durée pendant laquelle Ollama garde le modèle en mémoire

$SystemPrompt = @'
Tu es un routeur de difficulté pour un projet RPG web (Java 21, Spring Boot, PostgreSQL, JS). Tu ne réponds jamais à la demande : tu donnes seulement son niveau.

1 = retouche atomique, un seul fichier, aucune réflexion : faute de frappe, texte ou valeur en dur, changement de visibilité, renommage local, suppression d'une ligne, explication d'un court extrait.
2 = brique fonctionnelle précise, ou bug dont le symptôme désigne la cause, 1 à 3 fichiers : route API classique, champ de formulaire relié au back, vérification manquante dans une règle de jeu, test, erreur avec message ou exception clairement indiquée.
3 = conception ou enquête : fonctionnalité décrite en termes vagues ou sans spécification, question ouverte du type "comment gérer..." ou "j'aimerais que...", temps réel ou multi-joueur, nouvelle mécanique multi-tables ou multi-écrans, schéma BDD, sécurité, concurrence, performance, bug silencieux ou intermittent (sans erreur, "parfois", "au bout d'un moment").
4 = EXCEPTIONNEL - changement d'échelle ou impasse :
- Migration globale d'une couche entière ou de tout le projet ("tout le front", "toutes les pages", "toute l'API", passage à GraphQL, microservices, architecture hexagonale).
- Audit de sécurité ou revue architecturale globale de toute l'application.
- Impasse de débogage explicite : le développeur précise qu'il a déjà essayé plusieurs correctifs ou qu'il cherche depuis des jours sans succès.

Règle de frontière 3 / 4 :
Une nouvelle brique complexe ou la refonte d'UNE SEULE page/fonctionnalité reste en 3. En revanche, si la demande touche TOUT le front, TOUTE l'API, change l'architecture globale ou mentionne des tentatives préalables infructueuses, choisis le niveau 4.

Réponds uniquement {"level": N}.
'@

# Garde-fou d'encodage : "é" lu en ANSI devient "Ã©". Si c'est le cas, le prompt envoyé au modèle est corrompu.
$EncodingBroken = $SystemPrompt.Contains([string][char]0x00C3)
if ($EncodingBroken) {
    Write-Warning "router-core.ps1 est lu avec le mauvais encodage (accents corrompus). Enregistre-le en UTF-8 avec BOM, ou lance-le avec PowerShell 7 (pwsh)."
}

# Exemples en tours de chat, entrelacés pour éviter qu'un niveau domine la fin du contexte
$Shots = @(
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
    @("on bascule l'intégralité du frontend sur Vue au lieu du rendu serveur", 4),
    @("après quelques minutes de jeu, les PNJ se figent et il n'y a rien dans les logs", 3),
    @("NullPointerException dans PlayerService.save quand l'inventaire est vide", 2),
    @("ça fait plusieurs fois que je te dit de réparer cette erreur qui reviens souvent sur le auth.js mais tu n'y arrive pas, répare-la définitivement", 4),
    @("quand deux joueurs échangent un objet en même temps, l'inventaire se corrompt parfois", 3),
    @("le bouton d'attaque renvoie une 404 sur /api/combat/attack", 2)
)

# Construit une seule fois : system + exemples
$BaseMessages = @(@{ role = "system"; content = $SystemPrompt })
foreach ($s in $Shots) {
    $BaseMessages += @{ role = "user";      content = $s[0] }
    $BaseMessages += @{ role = "assistant"; content = '{"level": ' + $s[1] + '}' }
}

function Get-RouteLevel {
    param(
        [Parameter(Mandatory = $true)] [string]$Prompt,
        [int]$TimeoutSec = 0    # 0 = utiliser $RouterTimeoutSec
    )

    $text     = $Prompt.Substring(0, [Math]::Min($Prompt.Length, 1200))
    $messages = $BaseMessages + @(@{ role = "user"; content = $text })

    $body = @{
        model      = $RouterModel
        messages   = $messages
        stream     = $false
        format     = @{ type = "object"; required = @("level")
                        properties = @{ level = @{ type = "integer"; enum = @(1,2,3,4) } } }
        options    = @{ temperature = 0; seed = 42; num_predict = 12; num_ctx = 3072 }
        keep_alive = $RouterKeepAlive
    } | ConvertTo-Json -Depth 8

    $params = @{
        Uri         = $RouterUrl
        Method      = "Post"
        Body        = [Text.Encoding]::UTF8.GetBytes($body)
        ContentType = "application/json; charset=utf-8"
        TimeoutSec  = $(if ($TimeoutSec -gt 0) { $TimeoutSec } else { $RouterTimeoutSec })
    }
    $response = Invoke-RestMethod @params
    $data     = $response.message.content | ConvertFrom-Json
    $level    = [int]$data.level
    if ($level -notin 1..4) { throw "Niveau invalide : '$($response.message.content)'" }
    return $level
}

# Vrai si le modèle est déjà en mémoire (appel rapide). Faux = démarrage à froid : prévoir un délai plus long.
function Test-RouterLoaded {
    try {
        $psUrl = $RouterUrl -replace '/api/chat$', '/api/ps'
        $info  = Invoke-RestMethod -Uri $psUrl -TimeoutSec 3
        return [bool]($info.models | Where-Object { $_.name -eq $RouterModel -or $_.model -eq $RouterModel })
    }
    catch { return $false }
}