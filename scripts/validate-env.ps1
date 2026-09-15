# ============================================================
# DATA FLOW INVENTORY - Validacao de Segredos (.env, secrets.h)
# PowerShell version for Windows
# ============================================================

$ErrorActionPreference = "Continue"
$errorsCount = 0

Write-Host "Validando arquivos sensiveis..." -ForegroundColor Cyan

$forbiddenFiles = @(
    "server/.env",
    "simulator/.env",
    "esp32/gateway_mqtt/secrets.h",
    ".env"
)

foreach ($file in $forbiddenFiles) {
    $tracked = git ls-files --cached "$file" 2>$null
    if ($tracked) {
        Write-Host "ERRO: Arquivo sensivel detectado em staging/rastreado: $file" -ForegroundColor Red
        Write-Host "   Remova-o do Git com: git rm --cached $file" -ForegroundColor Yellow
        $errorsCount++
    }
}

$gitignoreLines = Get-Content -Path ".gitignore" -ErrorAction SilentlyContinue
$hasEnv = $false
$hasSecrets = $false

foreach ($line in $gitignoreLines) {
    $trimmed = $line.Trim()
    if ($trimmed -eq ".env" -or $trimmed -eq "*.env") { $hasEnv = $true }
    if ($trimmed -eq "secrets.h" -or $trimmed -eq "*_secrets.h") { $hasSecrets = $true }
}

if (-not $hasEnv -or -not $hasSecrets) {
    Write-Host "ERRO: .gitignore nao cobre .env e/ou secrets.h" -ForegroundColor Red
    $errorsCount++
}

if ($errorsCount -gt 0) {
    Write-Host "`nVALIDACAO FALHOU: $errorsCount erro detectado." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Nenhum arquivo sensivel em staging - tudo certo!" -ForegroundColor Green
    exit 0
}
