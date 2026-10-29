param([switch]$PosSubida)

$ErrorActionPreference = 'SilentlyContinue'
$global:PASS = 0
$global:FAIL = 0

function Check($nome, $ok, $dica = "") {
  if ($ok) {
    Write-Host "[PASS] $nome" -ForegroundColor Green
    $global:PASS++
  } else {
    Write-Host "[FAIL] $nome" -ForegroundColor Red
    if ($dica) {
      Write-Host "       Dica: $dica" -ForegroundColor Yellow
    }
    $global:FAIL++
  }
}

Write-Host ""
Write-Host "=== DATA FLOW INVENTORY - Validacao de Infraestrutura ===" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "[AVISO] PowerShell nao esta como Administrador. Checks de Firewall podem ser imprecisos." -ForegroundColor Yellow
  Write-Host ""
}

if ($PosSubida) {
  Write-Host "Modo: POS-SUBIDA (broker e server devem estar rodando)" -ForegroundColor DarkGray
  Write-Host ""
} else {
  Write-Host "Modo: PRE-VOO (verificacao previa antes de start_services.bat)" -ForegroundColor DarkGray
  Write-Host ""
}

# Localizacao de executaveis Mosquitto
$mosquittoDir = "C:\Program Files\mosquitto"
$subExe = Join-Path $mosquittoDir "mosquitto_sub.exe"
$pubExe = Join-Path $mosquittoDir "mosquitto_pub.exe"

if (-not (Test-Path $subExe)) {
  $cmdSub = Get-Command "mosquitto_sub" -ErrorAction SilentlyContinue
  if ($cmdSub) { $subExe = $cmdSub.Source }
}
if (-not (Test-Path $pubExe)) {
  $cmdPub = Get-Command "mosquitto_pub" -ErrorAction SilentlyContinue
  if ($cmdPub) { $pubExe = $cmdPub.Source }
}

# ---------- Verificacoes de Pre-Voo ----------

# 1. mosquitto.conf existe
$confPath = "C:\mosquitto\mosquitto.conf"
$conf = Test-Path $confPath
Check "mosquitto.conf existe ($confPath)" $conf "Crie com 'listener 1883 0.0.0.0' e 'allow_anonymous true'"

# 2. Firewall regra 1883
$fwName = Get-NetFirewallRule -DisplayName "*Mosquitto*" -ErrorAction SilentlyContinue
$fwPort = $null
try {
  $fwPort = Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq "1883" -or $_.LocalPort -eq 1883 } -ErrorAction SilentlyContinue
} catch {}
$fwOk = ($fwName -ne $null) -or ($fwPort -ne $null)
Check "Firewall: regra TCP 1883 existe" $fwOk "Execute (Admin): New-NetFirewallRule -DisplayName 'Mosquitto MQTT' -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow"

if (-not $PosSubida) {
  Write-Host ""
  Write-Host "[INFO] Checks de servicos ativos pulados (modo pre-voo)." -ForegroundColor Yellow
  Write-Host "       Execute '.\start_services.bat' e depois rode '.\validar_infra.ps1 -PosSubida'" -ForegroundColor Yellow
  Write-Host ""
} else {
  # ---------- Verificacoes Pos-Subida ----------

  # 3. Broker escutando 0.0.0.0:1883
  $broker = netstat -ano | findstr ":1883" | Select-String "0.0.0.0:1883.*LISTENING"
  Check "Broker MQTT escutando em 0.0.0.0:1883 (LISTENING)" ($broker -ne $null) "Inicie o Mosquitto com start_services.bat"

  # Diagnostico de conflito na 1883
  try {
    $pids1883 = (Get-NetTCPConnection -State Listen -LocalPort 1883 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($pids1883 -and $pids1883.Count -gt 1) {
      Write-Host "       [ALERTA] Multiplos processos na porta 1883!" -ForegroundColor Red
      Write-Host "       Execute (Admin): net stop mosquitto; sc.exe config mosquitto start= demand" -ForegroundColor Yellow
    }
  } catch {}

  # 4. Porta 3000 (server/dashboard) escutando
  $p3000 = netstat -ano | findstr ":3000" | Select-String "LISTENING"
  Check "Porta 3000 (server/dashboard) escutando" ($p3000 -ne $null) "Inicie o server Node com npm start na pasta server/"

  # 5. Smoke test: publicar e verificar retorno via mosquitto_sub
  if ((Test-Path $subExe) -and (Test-Path $pubExe)) {
    $tempFile = Join-Path $env:TEMP "sub_out.txt"
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }

    $job = Start-Process -FilePath $subExe `
      -ArgumentList "-h 127.0.0.1 -t dataflow/status -C 1 -W 4" -NoNewWindow -PassThru -RedirectStandardOutput $tempFile
    
    Start-Sleep -Milliseconds 500
    & $pubExe -h 127.0.0.1 -t "dataflow/status" -m '{"type":"status","estado":"infra-check"}' | Out-Null
    Start-Sleep -Seconds 3

    $sub = Get-Content $tempFile -ErrorAction SilentlyContinue
    Check "Smoke test: publish -> subscribe em dataflow/status (127.0.0.1)" ($sub -match "infra-check") "Broker nao respondeu em 127.0.0.1:1883"
    if (-not $job.HasExited) { Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue }
  } else {
    Check "Smoke test MQTT executavel encontrado" $false "mosquitto_sub.exe ou mosquitto_pub.exe nao encontrados"
  }
}

Write-Host ""
Write-Host "=== RESULTADO: $global:PASS PASS / $global:FAIL FAIL ===" -ForegroundColor Yellow
Write-Host ""
if ($global:FAIL -gt 0) { exit 1 } else { exit 0 }