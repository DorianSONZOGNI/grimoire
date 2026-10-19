param (
    [Parameter(Mandatory=$true, Position=0)] [string]$Prompt,
    # 0 = routage auto. 1 à 5 = niveau forcé (5 = Argon high, jamais choisi par le routeur)
    [ValidateRange(0,5)] [int]$Level = 0,
    # Affiche le modèle choisi sans lancer agy (et sans écrire dans le journal)
    [switch]$DryRun
)

. (Join-Path $PSScriptRoot "router-core.ps1")

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

# ---- Routage ----
if ($Level -eq 0) {
    $source = "auto"
    Write-Host "-> Routage en cours ($RouterModel)..." -ForegroundColor Cyan
    try {
        $timeout = $RouterTimeoutSec
        if (-not (Test-RouterLoaded)) {
            $timeout = $RouterColdTimeoutSec
            Write-Host "   Modèle de routage à charger : le premier appel peut prendre jusqu'à environ 1 min." -ForegroundColor DarkGray
        }
        $Level = Get-RouteLevel -Prompt $Prompt -TimeoutSec $timeout
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

if ($DryRun) {
    Write-Host "(DryRun) agy --model $targetModel --mode accept-edits --prompt-interactive <prompt>" -ForegroundColor DarkGray
    return
}

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
# Windows PowerShell 5.1 perd les guillemets doubles passés à un exécutable natif ; PowerShell 7.3+ les gère seul
$agyPrompt = if ($PSVersionTable.PSVersion -lt [version]"7.3") { $Prompt -replace '"', '\"' } else { $Prompt }
agy --model $targetModel --mode accept-edits --prompt-interactive $agyPrompt