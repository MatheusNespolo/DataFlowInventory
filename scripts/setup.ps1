# ============================================================
# DATA FLOW INVENTORY - Setup Automatizado
# PowerShell version for Windows
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DATA FLOW INVENTORY - Setup Automatizado" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ferramentas
Write-Host "[1/5] Verificando ferramentas instaladas..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js nao encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm nao encontrado." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git nao encontrado." -ForegroundColor Red
    exit 1
}

$nodeVer = node -v
$npmVer = npm -v
$gitVer = git --version
Write-Host "Node.js $nodeVer | npm $npmVer | $gitVer" -ForegroundColor Green

# 2. Instalacao de dependencias
Write-Host "`n[2/5] Instalando dependencias Node.js..." -ForegroundColor Cyan
$dirs = @("server", "simulator", "test/mqtt_probe")
foreach ($dir in $dirs) {
    if (Test-Path "$dir/package.json") {
        Write-Host "  -> $dir" -ForegroundColor Yellow
        Push-Location $dir
        npm install --quiet
        Pop-Location
    }
}
Write-Host "Dependencias instaladas" -ForegroundColor Green

# 3. Criacao de arquivos de configuracao
Write-Host "`n[3/5] Criando arquivos de configuracao..." -ForegroundColor Cyan

if (-not (Test-Path "server/.env")) {
    Copy-Item "server/.env.example" "server/.env"
    Write-Host "  server/.env criado" -ForegroundColor Green
} else {
    Write-Host "  server/.env ja existe - pulando" -ForegroundColor Yellow
}

if (-not (Test-Path "simulator/.env")) {
    Copy-Item "simulator/.env.example" "simulator/.env"
    Write-Host "  simulator/.env criado" -ForegroundColor Green
} else {
    Write-Host "  simulator/.env ja existe - pulando" -ForegroundColor Yellow
}

if (-not (Test-Path "esp32/gateway_mqtt/secrets.h")) {
    if (Test-Path "esp32/gateway_mqtt/secrets.h.example") {
        Copy-Item "esp32/gateway_mqtt/secrets.h.example" "esp32/gateway_mqtt/secrets.h"
        Write-Host "  esp32/gateway_mqtt/secrets.h criado" -ForegroundColor Green
    }
} else {
    Write-Host "  esp32/gateway_mqtt/secrets.h ja existe - pulando" -ForegroundColor Yellow
}

# 4. Verificacao de segredos
Write-Host "`n[4/5] Verificando que segredos nao estao rastreados no Git..." -ForegroundColor Cyan
& "$PSScriptRoot\validate-env.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha na validacao de segredos." -ForegroundColor Red
    exit 1
}

# 5. Conclusao
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  SETUP CONCLUIDO!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "1. Editar configuracoes:"
Write-Host "     - server/.env  -> MQTT_BROKER_URL + credenciais"
Write-Host "     - esp32/gateway_mqtt/secrets.h -> Wi-Fi + MQTT"
Write-Host "2. Iniciar servicos:"
Write-Host "     .\start_services.bat"
Write-Host "3. Ou rodar apenas o simulador (sem hardware):"
Write-Host "     cd simulator; npm start"
Write-Host "4. Acessar dashboard: http://localhost:3000`n"
exit 0

