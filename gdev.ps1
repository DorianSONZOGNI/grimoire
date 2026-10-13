param (
    [Parameter(Mandatory=$true, Position=0)] [string]$Prompt
)

Write-Host "-> Routage en cours via Qwen 2.5..." -ForegroundColor Cyan

$body = @{
    model = "qwen2.5:1.5b"
    prompt = "Tu es un routeur. Classe la complexité de cette tâche : 1 (simple/syntaxe/javadoc), 2 (CRUD/métier standard), 3 (architecture/refactoring). Réponds UNIQUEMENT un JSON formaté ainsi: {`"level`": 1}. Tâche: $Prompt"
    format = "json"
    stream = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
    $data =$response.response | ConvertFrom-Json
    $level = [int]$data.level
} catch {
    Write-Warning "Ollama inaccessible, bascule par défaut sur Medium."
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