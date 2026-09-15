# ============================================================
# DATA FLOW INVENTORY - Pre-commit Hook (Validações Locais)
# PowerShell version for Windows
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host "Executando validacoes pre-commit..." -ForegroundColor Cyan

# 1. Validacao de Segredos
Write-Host "[1/2] Validando arquivos sensiveis..." -ForegroundColor Cyan
& "$PSScriptRoot\validate-env.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit bloqueado: segredos detectados em staging." -ForegroundColor Red
    exit 1
}

# 2. Syntax Check
Write-Host "[2/2] Verificando sintaxe JavaScript..." -ForegroundColor Cyan
$jsFiles = Get-ChildItem -Path "server\*.js", "simulator\*.js" -ErrorAction SilentlyContinue

if (Get-Command node -ErrorAction SilentlyContinue) {
    foreach ($file in $jsFiles) {
        & node --check $file.FullName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erro de sintaxe em $($file.FullName)" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "Sintaxe JavaScript valida" -ForegroundColor Green
} else {
    Write-Host "Node.js nao encontrado - pulando verificacao de sintaxe" -ForegroundColor Yellow
}

Write-Host "`nTodas as validacoes passaram - commit permitido!" -ForegroundColor Green
exit 0

