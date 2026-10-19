param (
    # Pour comparer des modèles sans toucher au code : .\test-router.ps1 -Model qwen2.5:7b
    [string]$Model = ""
)

# Même code que route.ps1 : prompt, exemples, schéma, options. Aucune copie à maintenir.
. (Join-Path $PSScriptRoot "router-core.ps1")
if ($Model) { $RouterModel = $Model }

# ============ Jeux de tests ============

# A. Rappel : les exemples du prompt doivent revenir avec leur propre niveau
$recall = @($Shots | ForEach-Object { @{ Prompt = $_[0]; Expected = $_[1] } })

# B. Régression : tes 12 cas initiaux (en partie "vus" : le prompt contient des motifs voisins)
$regression = @(
    @{ Prompt = "le texte du bouton dit 'Se conecter' avec un seul n, corrige la faute"; Expected = 1 },
    @{ Prompt = "mets le prix de la potion rouge à 25 pièces"; Expected = 1 },
    @{ Prompt = "passe la méthode calculateCrit en private dans DamageUtils"; Expected = 1 },
    @{ Prompt = "explique-moi ce que fait le stream ligne 80 dans GuildService"; Expected = 1 },
    @{ Prompt = "affiche une icône de bouclier sur le portrait quand le perso a un buff de défense"; Expected = 2 },
    @{ Prompt = "ajoute une route pour supprimer un personnage avec son id"; Expected = 2 },
    @{ Prompt = "le coffre s'ouvre même quand le joueur n'a pas la clé dans son sac"; Expected = 2 },
    @{ Prompt = "la requête qui récupère la guilde plante avec une LazyInitializationException"; Expected = 2 },
    @{ Prompt = "j'aimerais bien que les joueurs puissent s'échanger des objets entre eux en direct"; Expected = 3 },
    @{ Prompt = "au bout d'un moment les ennemis arrêtent de bouger sur la carte sans erreur dans les logs"; Expected = 3 },
    @{ Prompt = "sépare toute l'authentification dans un module à part avec des tokens JWT"; Expected = 3 },
    @{ Prompt = "comment on pourrait gérer le brouillard de guerre sur la carte d'exploration ?"; Expected = 3 }
)

# C. Hors-échantillon : cas JAMAIS montrés au modèle. Ne les colle jamais dans le prompt.
$heldout = @(
    # Niveau 1
    @{ Prompt = "mets le nombre max de potions dans l'inventaire à 20 au lieu de 10"; Expected = 1 },
    @{ Prompt = "renomme la variable tmp en totalDamage dans la méthode applyHit"; Expected = 1 },
    @{ Prompt = "supprime le console.log oublié dans inventory.js"; Expected = 1 },
    @{ Prompt = "que veut dire le @Transactional au dessus de cette méthode ?"; Expected = 1 },
    # Niveau 2
    @{ Prompt = "ajoute un endpoint pour renommer une guilde, seul le chef peut le faire"; Expected = 2 },
    @{ Prompt = "le total d'XP affiché dans la barre ne se met pas à jour après un combat alors que le fetch renvoie la bonne valeur"; Expected = 2 },
    @{ Prompt = "écris la validation du DTO de création d'un personnage : nom entre 3 et 20 caractères, classe obligatoire"; Expected = 2 },
    @{ Prompt = "ça plante avec une ConstraintViolationException sur la colonne guild_id à la création d'un perso"; Expected = 2 },
    @{ Prompt = "affiche une liste déroulante des classes disponibles dans le formulaire, chargée depuis l'API"; Expected = 2 },
    # Niveau 3
    @{ Prompt = "je voudrais un système de quêtes quotidiennes qui se réinitialisent chaque jour pour tout le monde"; Expected = 3 },
    @{ Prompt = "le serveur ralentit de plus en plus au fil des heures et la mémoire grimpe"; Expected = 3 },
    @{ Prompt = "comment faire pour que deux joueurs ne ramassent pas le même butin au même instant ?"; Expected = 3 },
    @{ Prompt = "les points de vie de certains joueurs reviennent à leur ancienne valeur de temps en temps"; Expected = 3 },
    @{ Prompt = "on devrait pouvoir reprendre une partie là où on l'a laissée, avec la carte et les monstres"; Expected = 3 },
    # Frontière 3/4 : doivent rester en 3, sinon on gaspille le quota Argon
    @{ Prompt = "refais le système de combat pour gérer les effets de statut"; Expected = 3 },
    @{ Prompt = "ajoute un chat en temps réel entre les joueurs"; Expected = 3 },
    @{ Prompt = "ajoute une file d'attente de matchmaking pour les combats entre joueurs"; Expected = 3 },
    @{ Prompt = "optimise les requêtes lentes de la page classement"; Expected = 3 },
    @{ Prompt = "Migre la page de création de personnage vers SolidJS"; Expected = 3 },
    # Niveau 4
    @{ Prompt = "réécris tout le backend en architecture hexagonale en migrant contrôleurs, services, repositories et tests"; Expected = 4 },
    @{ Prompt = "audite toute l'application : sécurité des endpoints, injections SQL, sessions, dépendances vulnérables"; Expected = 4 },
    @{ Prompt = "je cherche depuis trois jours pourquoi le client et le serveur se désynchronisent et tous mes essais ont échoué"; Expected = 4 },
    @{ Prompt = "migre tout le front vers React"; Expected = 4 }
    @{ Prompt = "découpe le monolithe en microservices : auth, combat et inventaire, chacun avec sa propre base"; Expected = 4 },
    @{ Prompt = "refais entièrement le schéma de base de données et migre toutes les entités, repositories et requêtes"; Expected = 4 },
    @{ Prompt = "migre tout le front de JS vanilla vers React, toutes les pages"; Expected = 4 },
    @{ Prompt = "passe toute l'API de REST à GraphQL, côté serveur comme côté client"; Expected = 4 },
    @{ Prompt = "j'ai essayé trois correctifs pour la corruption de l'inventaire et aucun ne tient, trouve la vraie cause"; Expected = 4 }

)

# ============ Exécution ============

function Invoke-Suite {
    param([string]$Title, [array]$Cases)
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
    $rows = foreach ($t in $Cases) {
        $sw  = [Diagnostics.Stopwatch]::StartNew()
        $got = 0
        $err = $null
        try   { $got = Get-RouteLevel -Prompt $t.Prompt }
        catch { $err = $_.Exception.Message }
        $sw.Stop()

        $ok = ($got -eq $t.Expected)
        if     ($err)                { $tag = " [ERR]   "; $color = "Yellow" }
        elseif ($ok)                 { $tag = " [OK]    "; $color = "Green" }
        elseif ($got -lt $t.Expected){ $tag = " [SOUS]  "; $color = "Red" }
        else                         { $tag = " [SUR]   "; $color = "DarkYellow" }

        Write-Host $tag -ForegroundColor $color -NoNewline
        Write-Host ("attendu {0} | reçu {1} | {2,4} ms | {3}" -f $t.Expected, $got, $sw.ElapsedMilliseconds, $t.Prompt)
        if ($err) { Write-Host "          $err" -ForegroundColor Yellow }

        [pscustomobject]@{ Expected = $t.Expected; Got = $got; Ok = $ok; Ms = $sw.ElapsedMilliseconds }
    }
    return @($rows)
}

function Show-Summary {
    param([string]$Name, [array]$Rows, [int]$Target)
    $n     = $Rows.Count
    $ok    = @($Rows | Where-Object { $_.Ok }).Count
    $err   = @($Rows | Where-Object { $_.Got -eq 0 }).Count
    $under = @($Rows | Where-Object { $_.Got -gt 0 -and $_.Got -lt $_.Expected }).Count
    $over  = @($Rows | Where-Object { $_.Got -gt $_.Expected }).Count
    $pct   = [Math]::Round(100 * $ok / $n)
    $color = if ($pct -ge $Target) { "Green" } elseif ($pct -ge 60) { "Yellow" } else { "Red" }
    Write-Host ("{0,-16}: {1}/{2} ({3} %) | sous-routés : {4} | sur-routés : {5} | erreurs : {6}" -f $Name, $ok, $n, $pct, $under, $over, $err) -ForegroundColor $color
}

Write-Host "Routeur : $RouterModel, $($Shots.Count) exemples dans le prompt" -ForegroundColor Cyan
Write-Host "Préchauffage du modèle..." -NoNewline
try { [void](Get-RouteLevel -Prompt "ping"); Write-Host " ok" }
catch {
    Write-Host ""
    Write-Warning "Ollama injoignable ou modèle absent : $($_.Exception.Message)"
    return
}

$rA = Invoke-Suite "A. RAPPEL : les exemples du prompt (doit être 100 %)" $recall
$rB = Invoke-Suite "B. RÉGRESSION : tes 12 cas initiaux (en partie vus)" $regression
$rC = Invoke-Suite "C. HORS-ÉCHANTILLON : $($heldout.Count) cas jamais montrés au modèle" $heldout

Write-Host "`n=== RÉSUMÉ ===" -ForegroundColor Cyan
Show-Summary "A. Rappel"          $rA 100
Show-Summary "B. Régression"      $rB 80
Show-Summary "C. Hors-échantillon" $rC 80

$all = @($rB) + @($rC)
Write-Host "`nMatrice de confusion (B + C) : lignes = attendu, colonnes = reçu" -ForegroundColor Cyan
Write-Host ("{0,-10}{1,6}{2,6}{3,6}{4,6}" -f "", "->1", "->2", "->3", "->4")
foreach ($e in 1..4) {
    $line = "{0,-10}" -f "attendu $e"
    foreach ($g in 1..4) {
        $c = @($all | Where-Object { $_.Expected -eq $e -and $_.Got -eq $g }).Count
        $line += "{0,6}" -f $c
    }
    Write-Host $line
}

$avg = [Math]::Round(($all | Measure-Object -Property Ms -Average).Average)
Write-Host "`nLatence moyenne du routeur (modèle chaud) : $avg ms" -ForegroundColor Cyan

$recallOk = @($rA | Where-Object { $_.Ok }).Count
if ($recallOk -lt $rA.Count) {
    Write-Host "`nLe rappel échoue : le modèle ne reproduit même pas ses propres exemples. Corrige ça avant tout le reste (modèle, Ollama, contexte tronqué)." -ForegroundColor Red
}