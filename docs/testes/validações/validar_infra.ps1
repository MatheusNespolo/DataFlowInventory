<#
.SYNOPSIS
  Validação automatizada de infraestrutura — Data Flow Inventory
.DESCRIPTION
  Verifica broker, firewall, portas e faz smoke test MQTT.
  Execute como ADMINISTRADOR.

  Rode em DUAS fases, porque metade dos checks só faz sentido com os
  serviços de pé (ver Bloco 0 dos roteiros de teste):
    1) SEM -PosSubida, ANTES de start_services.bat — valida só o que
       não depende de nada estar rodando (config, firewall).
    2) COM -PosSubida, DEPOIS de start_services.bat — valida broker,
       porta 3000 e o smoke test fim a fim.
  Rodar os checks de rede antes dos serviços subirem sempre dá FAIL
  neles mesmo com tudo certo — não é um problema do ambiente.
.EXAMPLE
  .\validar_infra.ps1                # pré-voo, antes do start_services.bat
  .\validar_infra.ps1 -PosSubida     # confirmação, depois do start_services.bat
#>
param([switch]$PosSubida)

$ErrorActionPreference = 'SilentlyContinue'
$PASS = 0; $FAIL = 0
function Check($nome, $ok) {
  if ($ok) { Write-Host "[PASS] $nome" -ForegroundColor Green; $global:PASS++ }
  else     { Write-Host "[FAIL] $nome" -ForegroundColor Red;   $global:FAIL++ }
}

Write-Host "`n=== DATA FLOW INVENTORY — Validação de Infra ===`n" -ForegroundColor Cyan
if ($PosSubida) { Write-Host "Modo: PÓS-SUBIDA (broker + server já devem estar rodando)`n" -ForegroundColor DarkGray }
else            { Write-Host "Modo: PRÉ-VOO (rode de novo com -PosSubida depois do start_services.bat)`n" -ForegroundColor DarkGray }

# ---------- Sempre verificáveis (não dependem de serviço rodando) ----------

# 1. mosquitto.conf existe
$conf = Test-Path "C:\mosquitto\mosquitto.conf"
Check "mosquitto.conf existe (C:\mosquitto\)" $conf

# 2. Firewall regra 1883
$fw = Get-NetFirewallRule -DisplayName "*Mosquitto*" -ErrorAction SilentlyContinue
Check "Firewall: regra Mosquitto 1883 existe" ($fw -ne $null)

if (-not $PosSubida) {
  Write-Host "`n[INFO] Checks de rede (broker, porta 3000, smoke test) pulados." -ForegroundColor Yellow
  Write-Host "       Rode novamente com -PosSubida depois do start_services.bat.`n" -ForegroundColor Yellow
} else {
  # ---------- Só fazem sentido com broker/server já de pé ----------

  # 3. Broker escutando 0.0.0.0:1883
  $broker = netstat -ano | findstr ":1883" | Select-String "0.0.0.0:1883.*LISTENING"
  Check "Broker MQTT em 0.0.0.0:1883 (LISTENING)" ($broker -ne $null)

  # 4. Porta 3000 (server/dashboard) escutando
  $p3000 = netstat -ano | findstr ":3000" | Select-String "LISTENING"
  Check "Porta 3000 (server/dashboard) escutando" ($p3000 -ne $null)

  # 5. Smoke test: publicar e verificar retorno via mosquitto_sub (timeout 4s)
  $job = Start-Process -FilePath "C:\Program Files\mosquitto\mosquitto_sub.exe" `
    -ArgumentList "-h localhost -t dataflow/status -C 1 -W 4" -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\sub_out.txt"
  & "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -t "dataflow/status" -m '{"type":"status","estado":"infra-check"}' | Out-Null
  Start-Sleep -Seconds 5
  $sub = Get-Content "$env:TEMP\sub_out.txt" -ErrorAction SilentlyContinue
  Check "Smoke test: publish→subscribe em dataflow/status" ($sub -match "infra-check")
  if (-not $job.HasExited) { $job.Kill() }
}

Write-Host "`n=== RESULTADO: $PASS PASS / $FAIL FAIL ===`n" -ForegroundColor Yellow
if ($FAIL -gt 0) { exit 1 } else { exit 0 }