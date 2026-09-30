# ============================================================
# DATA FLOW INVENTORY - Smoke test do stack de observabilidade
# PowerShell version for Windows
# ============================================================
# Valida, COM Docker, o que os testes automaticos nao conseguem:
# que o compose sobe, que o Prometheus enxerga o servidor Node e
# que o Grafana carrega o datasource e os 3 dashboards.
#
# PRE-REQUISITOS
#   1. Docker Desktop em execucao.
#   2. observability\.env criado a partir do .env.example (com a senha).
#   3. Servidor Node rodando (cd server; npm start), padrao http://localhost:3000.
#
# Uso:
#   .\scripts\observability-smoke.ps1
#   .\scripts\observability-smoke.ps1 -ServidorUrl http://localhost:3000
#
# Sai com codigo 0 se tudo passar e 1 se alguma etapa falhar.
# ============================================================
param([string]$ServidorUrl = 'http://localhost:3000')

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$arqEnv = Join-Path $raiz 'observability\.env'
$arqCompose = Join-Path $raiz 'docker-compose.yml'
$falhas = 0

function Etapa([string]$titulo, [scriptblock]$bloco, [string]$dica = '') {
    Write-Host $titulo.PadRight(66) -NoNewline
    $ok = $false
    try { $ok = [bool](& $bloco) } catch { $ok = $false }
    if ($ok) {
        Write-Host 'PASS' -ForegroundColor Green
    } else {
        Write-Host 'FAIL' -ForegroundColor Red
        if ($dica) { Write-Host "     -> $dica" }
        $script:falhas++
    }
    return $ok
}

function LerEnv([string]$chave) {
    if (-not (Test-Path $arqEnv)) { return '' }
    $linha = Get-Content $arqEnv | Where-Object { $_ -match "^$chave=" } | Select-Object -First 1
    if ($linha) { return $linha.Substring($chave.Length + 1).Trim() }
    return ''
}

function Esperar([scriptblock]$condicao, [int]$segundos) {
    $fim = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $fim) {
        try { if (& $condicao) { return $true } } catch { }
        Start-Sleep -Seconds 2
    }
    return $false
}

# ---- 1. Servidor Node -------------------------------------------------------
[void](Etapa "Servidor Node expoe /metrics ($ServidorUrl)" {
    (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "$ServidorUrl/metrics").Content -match 'dfi_mqtt_connected'
} "Suba o servidor: cd server; npm start (o Prometheus precisa dele para o alvo ficar 'up')")

# ---- 2. Pre-requisitos (fatais) ---------------------------------------------
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker esta em execucao'.PadRight(66) -NoNewline
    Write-Host 'FAIL' -ForegroundColor Red
    Write-Host '     -> Inicie o Docker Desktop'
    exit 1
}
Write-Host 'Docker esta em execucao'.PadRight(66) -NoNewline
Write-Host 'PASS' -ForegroundColor Green

$senha = LerEnv 'GRAFANA_ADMIN_PASSWORD'
# o Compose le '$$' do .env como '$' literal; usa a senha efetiva
$senha = $senha.Replace('$$', '$')
if (-not $senha) {
    Write-Host 'observability\.env existe e tem GRAFANA_ADMIN_PASSWORD'.PadRight(66) -NoNewline
    Write-Host 'FAIL' -ForegroundColor Red
    Write-Host '     -> Copie observability\.env.example para observability\.env e defina a senha'
    exit 1
}
Write-Host 'observability\.env existe e tem GRAFANA_ADMIN_PASSWORD'.PadRight(66) -NoNewline
Write-Host 'PASS' -ForegroundColor Green

$portaProm = LerEnv 'PROMETHEUS_PORT'; if (-not $portaProm) { $portaProm = '9090' }
$portaGraf = LerEnv 'GRAFANA_PORT';    if (-not $portaGraf) { $portaGraf = '3030' }

# ---- 3. Configuracao --------------------------------------------------------
[void](Etapa 'docker compose config (YAML e variaveis validos)' {
    docker compose --env-file $arqEnv -f $arqCompose config -q *> $null
    $LASTEXITCODE -eq 0
} "Rode: docker compose --env-file observability\.env config")

$imagemProm = (Select-String -Path $arqCompose -Pattern '^\s+image:\s+(prom/prometheus:\S+)' | Select-Object -First 1).Matches[0].Groups[1].Value
[void](Etapa 'promtool check config (prometheus.yml)' {
    $cfg = Join-Path $raiz 'observability\prometheus\prometheus.yml'
    docker run --rm --entrypoint promtool -v "${cfg}:/etc/prometheus/prometheus.yml:ro" $imagemProm check config /etc/prometheus/prometheus.yml *> $null
    $LASTEXITCODE -eq 0
} "Rode o promtool manualmente para ver o erro (imagem: $imagemProm)")

# ---- 4. Subir o stack -------------------------------------------------------
$subiu = Etapa 'docker compose up -d' {
    docker compose --env-file $arqEnv -f $arqCompose up -d *> $null
    $LASTEXITCODE -eq 0
} "Rode: docker compose --env-file observability\.env up -d (e leia a saida)"
if (-not $subiu) { exit 1 }

# ---- 5. Prometheus enxerga o servidor ---------------------------------------
[void](Etapa "Prometheus: alvo dfi-server em 'up' (ate 60 s)" {
    Esperar {
        $q = [uri]::EscapeDataString('up{job="dfi-server"}')
        $r = Invoke-RestMethod -TimeoutSec 5 "http://127.0.0.1:$portaProm/api/v1/query?query=$q"
        $r.data.result.Count -gt 0 -and $r.data.result[0].value[1] -eq '1'
    } 60
} "Alvo fora do ar: servidor parado? Firewall do Windows bloqueando a 3000? Veja http://127.0.0.1:$portaProm/targets")

# ---- 6. Grafana -------------------------------------------------------------
$cred = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin:$senha"))
$auth = @{ Authorization = "Basic $cred" }

[void](Etapa 'Grafana: /api/health (ate 90 s)' {
    Esperar { (Invoke-RestMethod -TimeoutSec 5 "http://127.0.0.1:$portaGraf/api/health").database -eq 'ok' } 90
} 'Veja: docker logs dfi-grafana')

[void](Etapa 'Grafana: datasource dfi-prometheus saudavel' {
    Esperar {
        (Invoke-RestMethod -TimeoutSec 10 -Headers $auth "http://127.0.0.1:$portaGraf/api/datasources/uid/dfi-prometheus/health").status -eq 'OK'
    } 30
} 'Senha diferente da usada na 1a criacao do volume? Veja observability\README.md (Problemas comuns)')

foreach ($uid in @('dfi-visao-geral', 'dfi-performance', 'dfi-confiabilidade')) {
    [void](Etapa "Grafana: dashboard $uid carregado (api/dashboards/uid/$uid)" {
        [bool](Invoke-RestMethod -TimeoutSec 10 -Headers $auth "http://127.0.0.1:$portaGraf/api/dashboards/uid/$uid").dashboard
    } 'Dashboard ausente: confira docs\grafana\ e os logs do Grafana')
}

# ---- Resultado --------------------------------------------------------------
Write-Host ''
if ($falhas -eq 0) {
    Write-Host "TUDO OK. Grafana: http://127.0.0.1:$portaGraf  (usuario: admin)" -ForegroundColor Green
    exit 0
}
Write-Host "$falhas etapa(s) falharam." -ForegroundColor Red
exit 1
