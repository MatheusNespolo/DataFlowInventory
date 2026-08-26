<#
.SYNOPSIS
  Validação automatizada de infraestrutura — Data Flow Inventory
.DESCRIPTION
  Verifica broker, firewall, portas e faz smoke test MQTT.
  Execute como ADMINISTRADOR.
#>
$ErrorActionPreference = 'SilentlyContinue'
$PASS = 0; $FAIL = 0
function Check($nome, $ok) {
  if ($ok) { Write-Host "[PASS] $nome" -ForegroundColor Green; $global:PASS++ }
  else     { Write-Host "[FAIL] $nome" -ForegroundColor Red;   $global:FAIL++ }
}

Write-Host "`n=== DATA FLOW INVENTORY — Validação de Infra ===`n" -ForegroundColor Cyan

# 1. Broker escutando 0.0.0.0:1883
$broker = netstat -ano | findstr ":1883" | Select-String "0.0.0.0:1883.*LISTENING"
Check "Broker MQTT em 0.0.0.0:1883 (LISTENING)" ($broker -ne $null)

# 2. Firewall regra 1883
$fw = Get-NetFirewallRule -DisplayName "*Mosquitto*" -ErrorAction SilentlyContinue
Check "Firewall: regra Mosquitto 1883 existe" ($fw -ne $null)

# 3. Porta 3000 livre ou server rodando
$p3000 = netstat -ano | findstr ":3000" | Select-String "LISTENING"
Check "Porta 3000 (server/dashboard) escutando" ($p3000 -ne $null)

# 4. mosquitto.conf existe
$conf = Test-Path "C:\mosquitto\mosquitto.conf"
Check "mosquitto.conf existe (C:\mosquitto\)" $conf

# 5. Smoke test: publicar e verificar retorno via mosquitto_sub (timeout 4s)
$job = Start-Process -FilePath "C:\Program Files\mosquitto\mosquitto_sub.exe" `
  -ArgumentList "-h localhost -t dataflow/status -C 1 -W 4" -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\sub_out.txt"
& "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -t "dataflow/status" -m '{"type":"status","estado":"infra-check"}' | Out-Null
Start-Sleep -Seconds 5
$sub = Get-Content "$env:TEMP\sub_out.txt" -ErrorAction SilentlyContinue
Check "Smoke test: publish→subscribe em dataflow/status" ($sub -match "infra-check")
if (-not $job.HasExited) { $job.Kill() }

Write-Host "`n=== RESULTADO: $PASS PASS / $FAIL FAIL ===`n" -ForegroundColor Yellow
if ($FAIL -gt 0) { exit 1 } else { exit 0 }