#!/bin/bash
# ============================================================
# DATA FLOW INVENTORY — Script de Configuração do GitHub
# ============================================================
# 
# PRÉ-REQUISITOS:
# 1. Instalar GitHub CLI: winget install GitHub.cli
#    (ou baixar de https://cli.github.com/)
# 2. Fazer login: gh auth login
#
# EXECUÇÃO:
#   cd d:\GP\TCC\Code
#   bash docs/github_setup.sh
#
# ============================================================

set -e

REPO_NAME="DataFlowInventory"
REPO_DESC="Centro de Distribuição Automatizado — Protótipo IoT em Escala Reduzida"

echo "============================================================"
echo "  Data Flow Inventory — Setup GitHub"
echo "============================================================"
echo ""

# Verifica se gh está instalado
if ! command -v gh &> /dev/null; then
    echo "[ERRO] GitHub CLI (gh) não encontrado."
    echo "Instale com: winget install GitHub.cli"
    echo "Ou baixe de: https://cli.github.com/"
    exit 1
fi

# Verifica se está logado
if ! gh auth status &> /dev/null; then
    echo "[INFO] Fazendo login no GitHub..."
    gh auth login
fi

echo "[1/5] Criando repositório..."
gh repo create "$REPO_NAME" --public --source=. --remote=origin --description "$REPO_DESC" --push 2>/dev/null || echo "Repositório já existe ou erro ao criar."

echo ""
echo "[2/5] Criando labels..."
gh label create "mecânica" --color "C5DEF0" --description "Tarefas mecânicas (esteiras, carrossel, montagem)" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "elétrica" --color "D93F0B" --description "Tarefas elétricas (sensores, motores, ligações)" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "programação" --color "0E8A16" --description "Tarefas de programação (Arduino, ESP32, Server, Frontend)" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "documentação" --color "0075CA" --description "Tarefas de documentação (artigo, diagramas)" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "frontend" --color "5319E7" --description "Tarefas do front-end web" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "mqtt" --color "FBCA04" --description "Tarefas relacionadas ao MQTT e comunicação" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "hardware" --color "BFDADC" --description "Tarefas de hardware e montagem física" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "bug" --color "D73A4A" --description "Problema encontrado" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "melhoria" --color "A2EEEF" --description "Melhoria proposta" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "prioridade:alta" --color "B60205" --description "Alta prioridade" --repo "$REPO_NAME" 2>/dev/null || true
gh label create "prioridade:media" --color "F9D0C4" --description "Média prioridade" --repo "$REPO_NAME" 2>/dev/null || true

echo ""
echo "[3/5] Criando Issues..."
gh issue create --title "Montagem mecânica das esteiras" \
  --body "## Descrição
Montar as 4 esteiras transportadoras (1 principal + 3 secundárias) em acrílico.

## Tarefas
- [ ] Montar esteira principal
- [ ] Montar esteira secundária A
- [ ] Montar esteira secundária B
- [ ] Montar esteira secundária C
- [ ] Posicionar esteiras segundo diagrama 2D
- [ ] Construir roda giratória de separação

## Materiais
- Esteiras BR Eletrônica 35cm (4x)
- Parafusos e suportes
- MDF/acrílico para base" \
  --label "mecânica,hardware" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Diagrama elétrico e ligações" \
  --body "## Descrição
Esboçar e executar o esquema elétrico completo do sistema.

## Tarefas
- [ ] Definir mapeamento de pinos no Arduino Mega
- [ ] Esquema de ligação dos drivers L298N
- [ ] Ligação dos 6 sensores TCRT5000
- [ ] Ligação do display LCD I2C
- [ ] Ligação dos botões físicos
- [ ] Organização da alimentação 12V
- [ ] Verificar conversões de tensão necessárias
- [ ] Criar esquema elétrico no Fritzing/KiCad" \
  --label "elétrica,hardware" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Implementar máquina de estados no Arduino" \
  --body "## Descrição
Implementar a FSM (Finite State Machine) com 5 estados no Arduino Mega.

## Estados
1. AGUARDANDO_PEDIDO
2. VERIFICANDO_ESTOQUE
3. ACIONANDO_ESTEIRA
4. ENTREGANDO_PECA
5. ERRO

## Tarefas
- [ ] Definir enum de estados
- [ ] Implementar cada estado no switch/case
- [ ] Configurar pinos dos motores (L298N)
- [ ] Configurar leitura dos sensores (TCRT5000)
- [ ] Implementar debounce dos botões
- [ ] Implementar timeout de entrega (3s)
- [ ] Testar com entradas simuladas (Serial Monitor)
- [ ] Integrar sensores e motores reais
- [ ] Teste completo do sistema" \
  --label "programação" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Desenvolver gateway ESP32 (Serial ↔ MQTT)" \
  --body "## Descrição
Programar o ESP32 como ponte entre a Serial do Arduino e o broker MQTT.

## Tarefas
- [ ] Configurar conexão Wi-Fi
- [ ] Configurar cliente MQTT (PubSubClient)
- [ ] Implementar recebimento de JSON pela Serial
- [ ] Implementar publicação nos tópicos MQTT
- [ ] Implementar inscrição no tópico de comandos
- [ ] Implementar envio de comandos via Serial ao Arduino
- [ ] Testar comunicação completa" \
  --label "programação,mqtt" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Configurar broker MQTT (HiveMQ Cloud)" \
  --body "## Descrição
Criar conta e configurar o broker MQTT na nuvem.

## Tarefas
- [ ] Criar conta no HiveMQ Cloud
- [ ] Criar cluster (gratuito)
- [ ] Criar credenciais de acesso
- [ ] Anotar URL, porta, user/password
- [ ] Testar conexão com ESP32
- [ ] Testar conexão com Node.js server" \
  --label "mqtt" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Criar servidor Node.js (Express + WebSocket + MQTT)" \
  --body "## Descrição
Desenvolver o servidor que serve o frontend e faz ponte entre MQTT e WebSocket.

## Tarefas
- [ ] Configurar Express com arquivos estáticos
- [ ] Configurar Socket.IO
- [ ] Conectar ao broker MQTT
- [ ] Implementar relay MQTT → WebSocket
- [ ] Implementar recebimento de comandos do frontend
- [ ] Implementar publicação de comandos via MQTT
- [ ] Criar rota de health check (/api/status)
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Testar fluxo completo" \
  --label "programação,mqtt" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Criar dashboard web (Frontend)" \
  --body "## Descrição
Desenvolver o dashboard em tempo real com HTML/CSS/JS.

## Tarefas
- [ ] Criar estrutura HTML (cards, diagrama SVG, botões)
- [ ] Implementar CSS dark theme responsivo
- [ ] Implementar conexão Socket.IO no JS
- [ ] Atualização em tempo real dos dados
- [ ] Diagrama SVG interativo do sistema
- [ ] Botões de controle remoto (solicitar peça A/B/C, reset)
- [ ] Histórico de eventos com scroll
- [ ] Animações e feedback visual
- [ ] Testar em diferentes resoluções" \
  --label "frontend,programação" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Escrever documentação e artigo" \
  --body "## Descrição
Produzir a documentação completa do projeto e o artigo acadêmico.

## Tarefas
- [ ] Documentar arquitetura MQTT
- [ ] Documentar diagrama 2D do sistema
- [ ] Documentar esquema elétrico
- [ ] Documentar fluxograma da FSM
- [ ] Escrever artigo (introdução, revisão bibliográfica, metodologia, resultados, conclusões)
- [ ] Formatar referências (ABNT)
- [ ] Revisão final" \
  --label "documentação" --repo "$REPO_NAME" 2>/dev/null || true

gh issue create --title "Testes e validação do sistema completo" \
  --body "## Descrição
Realizar testes integrados de todo o sistema.

## Tarefas
- [ ] Teste unitário: motor por motor
- [ ] Teste unitário: sensor por sensor
- [ ] Teste de integração: Arduino + ESP32
- [ ] Teste de integração: MQTT completo (ESP32 → Broker → Server → Frontend)
- [ ] Teste de controle remoto (Frontend → Server → MQTT → ESP32 → Arduino)
- [ ] Teste de timeout/erro
- [ ] Teste de estresse (múltiplos pedidos)
- [ ] Medir tempo de separação
- [ ] Documentar resultados dos testes" \
  --label "prioridade:alta" --repo "$REPO_NAME" 2>/dev/null || true

echo ""
echo "[4/5] Criando GitHub Project..."
gh project create "Data Flow Inventory — Kanban" --format "board" 2>/dev/null || echo "Projeto pode ter sido criado manualmente."

echo ""
echo "[5/5] Configuração concluída!"
echo ""
echo "============================================================"
echo "  Repositório: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
echo "============================================================"
echo ""
echo "Próximos passos:"
echo "1. Acessar o repositório no GitHub"
echo "2. Ir em Projects → Adicionar ao projeto criado"
echo "3. Configurar colunas do Kanban (Backlog, To Do, In Progress, Done)"
echo "4. Mover as issues para as colunas apropriadas"
echo ""