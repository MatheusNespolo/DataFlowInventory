<#
.SYNOPSIS
    Cria no repositório as issues dos cards #11, #12 e dos novos cards do Teste 6
    (HiveMQ Cloud), adiciona-as ao GitHub Projects e fecha as já validadas.

.DESCRIPTION
    Complementa docs/gestao_projeto/board_github_projects.md.

    Os cards #11 (Sincronismo LCD <-> Dashboard) e #12 (Timeout de entrega 9 s)
    foram validados em bancada em 28/08/2026 e por isso são criados e
    imediatamente FECHADOS (o workflow padrão do Projects move itens fechados
    para a coluna Done).

    Os cards do Teste 6 (HiveMQ Cloud) são criados abertos, para permanecerem
    em Backlog / Todo.

.PREREQUISITOS
    1. GitHub CLI instalado:   winget install --id GitHub.cli
    2. Autenticado com escopo de projeto:
       gh auth login --scopes "repo,project,read:org"

.EXEMPLO
    .\docs\gestao_projeto\criar_cards_board.ps1 -DryRun
    .\docs\gestao_projeto\criar_cards_board.ps1
#>

[CmdletBinding()]
param(
    [string] $Repo        = 'MatheusNespolo/DataFlowInventory',
    [string] $ProjectOwner = 'MatheusNespolo',
    [int]    $ProjectNumber = 3,
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# --- Verificação de pré-requisitos -----------------------------------------
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error @"
GitHub CLI (gh) não encontrado no PATH.
Instale com:  winget install --id GitHub.cli
Depois autentique:  gh auth login --scopes "repo,project,read:org"
"@
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function New-BoardCard {
    param(
        [Parameter(Mandatory)][string]   $Title,
        [Parameter(Mandatory)][string]   $BodyFile,
        [Parameter(Mandatory)][string[]] $Labels,
        [switch] $CloseAsDone
    )

    Write-Host ""
    Write-Host "-> $Title" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host "   [dry-run] issue não criada. Corpo: $BodyFile" -ForegroundColor DarkGray
        return
    }

    $labelArgs = @()
    foreach ($l in $Labels) { $labelArgs += @('--label', $l) }

    $url = gh issue create `
        --repo $Repo `
        --title $Title `
        --body-file $BodyFile `
        @labelArgs

    Write-Host "   Issue criada: $url" -ForegroundColor Green

    gh project item-add $ProjectNumber --owner $ProjectOwner --url $url | Out-Null
    Write-Host "   Adicionada ao Projects #$ProjectNumber" -ForegroundColor Green

    if ($CloseAsDone) {
        gh issue close $url --repo $Repo --reason completed `
            --comment "Validado em bancada em 28/08/2026. Movido para Done." | Out-Null
        Write-Host "   Fechada como concluída (-> Done)" -ForegroundColor Green
    }
}

# --- Labels necessárias -----------------------------------------------------
$labels = @(
    @{ name = 'area:firmware-uno';    color = '00979D'; desc = 'Firmware do Arduino Uno' },
    @{ name = 'area:firmware-esp32';  color = '000000'; desc = 'Firmware do gateway ESP32' },
    @{ name = 'area:backend';         color = '339933'; desc = 'Servidor Node.js' },
    @{ name = 'area:frontend';        color = 'E34F26'; desc = 'Dashboard web' },
    @{ name = 'area:infra';           color = '660066'; desc = 'Rede, broker e infraestrutura' },
    @{ name = 'tipo:bug';             color = 'D73A4A'; desc = 'Correcao de defeito' },
    @{ name = 'tipo:teste';           color = '0E8A16'; desc = 'Teste ou validacao de bancada' },
    @{ name = 'tipo:hardening';       color = 'FBCA04'; desc = 'Robustez e resiliencia' },
    @{ name = 'stretch:hivemq-cloud'; color = '1D76DB'; desc = 'Teste 6 - broker remoto (stretch)' }
)

Write-Host "Garantindo labels no repositório $Repo ..." -ForegroundColor Yellow
foreach ($l in $labels) {
    if ($DryRun) {
        Write-Host "   [dry-run] label $($l.name)" -ForegroundColor DarkGray
        continue
    }
    gh label create $l.name --repo $Repo --color $l.color --description $l.desc --force | Out-Null
    Write-Host "   ok: $($l.name)" -ForegroundColor DarkGreen
}

# --- Criação dos cards ------------------------------------------------------
Write-Host ""
Write-Host "=== Cards validados em 28/08/2026 (serão criados em Done) ===" -ForegroundColor Yellow

New-BoardCard `
    -Title 'Sincronismo de estoque LCD <-> Dashboard' `
    -BodyFile (Join-Path $scriptDir 'cards\card_11_sincronismo_lcd_dashboard.md') `
    -Labels @('area:firmware-uno', 'area:frontend', 'tipo:bug', 'tipo:teste') `
    -CloseAsDone

New-BoardCard `
    -Title 'Calibracao do timeout de entrega (9 s) e recuperacao via CMD:RESET' `
    -BodyFile (Join-Path $scriptDir 'cards\card_12_timeout_entrega_9s.md') `
    -Labels @('area:firmware-uno', 'tipo:hardening', 'tipo:teste') `
    -CloseAsDone

Write-Host ""
Write-Host "=== Novos cards - Teste 6: HiveMQ Cloud (permanecem abertos) ===" -ForegroundColor Yellow

New-BoardCard `
    -Title 'Teste 6.1 - Provisionar cluster e credenciais HiveMQ Cloud' `
    -BodyFile (Join-Path $scriptDir 'cards\card_15_hivemq_cluster.md') `
    -Labels @('area:infra', 'tipo:teste', 'stretch:hivemq-cloud')

New-BoardCard `
    -Title 'Teste 6.2 - Firmware ESP32 com suporte TLS/8883 (HiveMQ Cloud)' `
    -BodyFile (Join-Path $scriptDir 'cards\card_16_esp32_tls.md') `
    -Labels @('area:firmware-esp32', 'tipo:teste', 'stretch:hivemq-cloud')

New-BoardCard `
    -Title 'Teste 6.3 - Validacao end-to-end remota via HiveMQ Cloud' `
    -BodyFile (Join-Path $scriptDir 'cards\card_17_hivemq_end_to_end.md') `
    -Labels @('area:infra', 'area:backend', 'tipo:teste', 'stretch:hivemq-cloud')

Write-Host ""
Write-Host "Concluido. Board: https://github.com/users/$ProjectOwner/projects/$ProjectNumber" -ForegroundColor Green
Write-Host "Ajuste manualmente os campos Area / Prioridade / Bloco de Teste / Data Validacao no Projects." -ForegroundColor Yellow
