<div align="center">

# Data Flow Inventory

**Centro de Distribuição Automatizado — Protótipo IoT em Escala Reduzida**

![Arduino](https://img.shields.io/badge/Arduino-Uno-00979D?logo=arduino&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-DevModule-000000?logo=espressif&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-5.1+-5391FE?logo=powershell&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-Mosquitto%20%7C%20HiveMQ-660066?logo=mosquitto&logoColor=white)
![School](https://img.shields.io/badge/SENAI-São%20Caetano%20do%20Sul-blue)
![Year](https://img.shields.io/badge/Ano-2026-orange)
![IoT](https://img.shields.io/badge/IoT-Arduino%20+%20ESP32-teal)
![Industria4](https://img.shields.io/badge/Indústria-4.0-red)

<br>

SENAI São Caetano do Sul — Boa Vista<br>
Engenharia de Controle e Automação

---

⭐ **Se este projeto te ajudou, deixe uma estrela no GitHub!** Sua avaliação nos motiva bastante! 🙏

</div>

## Sumário

- [Sobre](#sobre)
- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Funcionamento](#funcionamento)
- [Materiais](#materiais)
- [Como Rodar](#como-rodar)
- [Próximos Passos](#próximos-passos)
- [Equipe](#equipe)
- [Contribuindo](#contribuindo)
- [Licença](#licença)
- [Referências](#referências)

---

## Sobre

O **Data Flow Inventory** é um protótipo funcional que simula um centro de distribuição automatizado em escala reduzida, controlado por microcontroladores e monitorado remotamente via dashboard web em tempo real.

O projeto se insere no setor de **Automação Industrial da Logística**, com foco em:
- 📦 Intralogística e centros de distribuição
- 🛒 E-commerce e gestão de estoque
- 🔄 Sistemas de recebimento automático

> 📄 Para o projeto completo, consulte `Projeto de pesquisa - Final.docx` na pasta `docs/artigo/`.

## Visão Geral

O sistema é composto por:

| Componente | Função |
|------------|--------|
| 🏗️ **4 esteiras transportadoras** | 1 principal (liga direto na fonte) + 3 secundárias com driver IRF520 |
| 🔍 **6 sensores infravermelhos** | TCRT5000 — 3 no topo + 3 nas junções |
| 🎡 **Roda giratória** (melhoria) | 3 compartimentos para separação de peças |
| 🎛️ **Arduino Uno** | Controlador principal (FSM de 5 estados) |
| 📡 **ESP32** | Gateway MQTT (bridge Serial ↔ Wi-Fi) |
| 🖥️ **Dashboard web** | HTML/CSS/JS + Socket.IO em tempo real |
| ⚙️ **Servidor Node.js** | Ponte entre MQTT e WebSocket |
| ☁️ **Broker MQTT** | Mosquitto local (validado em bancada) / HiveMQ Cloud (planejado — ver [Próximos Passos](#próximos-passos)) |

> A roda giratória é um aprimoramento futuro do projeto, uma sugestão de melhoria. Atualmente existem menções ao controle no motor de passo no código, mas ele está comentado para ajustes durante o desenvolvimento até a integração final.

## Arquitetura

### Modo Simulador (sem hardware)

Para testar o dashboard sem nenhum componente físico conectado, o projeto inclui um simulador (`simulator/`) que reproduz o ciclo da máquina de estados em JavaScript — pedido → verificação de estoque → acionamento da esteira → entrega — emitindo os **mesmos eventos Socket.IO** que o servidor real (`server/`), servindo o `frontend/` sem nenhuma alteração.


Diferente do modo real, os tempos de verificação/acionamento/entrega são temporizadores fixos (não dependem de sensores físicos) e não há MQTT nem broker envolvidos. Cobre o fluxo de sucesso e a rejeição por falta de estoque; cenários de timeout e `ocupado` do firmware real ainda não são simulados.

> 🖥️ Detalhes de implementação em [`docs/arquitetura_mqtt.md`](docs/arquitetura_mqtt.md#modos-de-operação).

```
┌──────────────┐   Serial   ┌──────────┐   MQTT    ┌────────────────┐   WebSocket  ┌─────────────┐
│ Arduino Uno  │ ────────── │  ESP32   │ ────────  │ Broker MQTT    │ ──────────── │  Dashboard  │
│  (FSM + I/O) │ ←────────  │(Gateway) │           │ Mosquitto/     │              │  (Frontend) │
│              │            │          │           │ HiveMQ Cloud   │              │             │
└──────────────┘            └──────────┘           └───────┬────────┘              └─────────────┘
                                                           │ MQTT                       ↑
                                                           │                            │
                                                   ┌───────┴────────┐                   │
                                                   │ Node.js Server │ ──────────────────┘
                                                   │ (Express+WS)   │
                                                   └────────────────┘
```

**Fluxo de dados:**

- **Publicação** (Arduino → Dashboard):
  `Arduino detecta evento → Serial.print(JSON) → ESP32 → MQTT Broker → Node.js → Socket.IO → Dashboard`
- **Controle Remoto** (Dashboard → Arduino):
  `Botão clicado → Socket.IO → Node.js → MQTT Broker → ESP32 → Serial → Arduino executa comando`

## Estrutura do Repositório

```
DataFlowInventory/
├── arduino/
│   └── data_flow_inventory/
│       └── data_flow_inventory.ino        # Código Arduino (FSM + Serial JSON)
│
├── esp32/
│   └── gateway_mqtt/
│       └── gateway_mqtt.ino               # Código ESP32 (Serial ↔ MQTT)
│
├── server/
│   ├── package.json                       # Dependências Node.js
│   ├── server.js                          # Express + Socket.IO + MQTT
│   └── .env                               # Configurações (não versionado)
│
├── simulator/
│   ├── package.json                       # Dependências Node.js
│   └── server.js                          # Simulador offline (FSM em JS, mesmo frontend/)
│
├── frontend/
│   ├── index.html                         # Dashboard principal
│   ├── css/
│   │   └── style.css                      # Estilos (dark theme)
│   └── js/
│       └── app.js                         # Lógica WebSocket + UI
│
├── test/
│   ├── esteira_peca_a/                    # Códigos de teste incrementais (1 esteira)
│   ├── esteira_peca_b/                    # Teste 5: duas esteiras (A+B) com FSM completa
│   └── mqtt_probe/                        # Sonda MQTT (escuta dataflow/# com timestamp)
│
├── docs/
│   ├── arquitetura_mqtt.md                # Documentação da arquitetura MQTT
│   ├── broker_local_mosquitto.md          # Teste local com Mosquitto (sem nuvem)
│   ├── artigo/
│   │   └── Projeto de pesquisa - Final.docx   # Documentação acadêmica
│   ├── fluxogramas/
│   │   └── fluxograma_funcionamento.md    # Fluxogramas (FSM, operação, sequência)
│   └── testes/
│       ├── plano_de_testes.md             # Plano de testes de integração (Serial → E2E)
│       ├── roteiros/                      # Roteiros diários de execução dos testes
│       └── validações/                    # Checklists e automação de validação de infra
│           ├── README.md                  # Guia dos artefatos de validação
│           ├── checklist_pre_teste_rede_infra.md
│           ├── validar_infra.ps1          # Script PowerShell de validação (broker/firewall/portas)
│           └── tabela_mudancas_artigo_final.md
│
├── start_services.bat                     # Sobe broker + probe + server em sequência
├── .gitignore
└── README.md
```

## Funcionamento

### Máquina de Estados (Arduino)

O Arduino opera com **5 estados**:

| # | Estado | Descrição |
|---|--------|-----------|
| 1 | **AGUARDANDO_PEDIDO** | Sistema em repouso, monitora botões e comandos remotos |
| 2 | **VERIFICANDO_ESTOQUE** | Verifica sensor do topo + contador interno |
| 3 | **ACIONANDO_ESTEIRA** | Liga motor da esteira secundária correspondente |
| 4 | **ENTREGANDO_PECA** | Monitora sensor da junção com timeout de 12s |
| 5 | **ERRO** | Sinaliza falha no LCD, aguarda reset manual |

> 📊 Diagramas completos (máquina de estados, fluxo operacional e sequência de comunicação) em [`docs/fluxogramas/fluxograma_funcionamento.md`](docs/fluxogramas/fluxograma_funcionamento.md).
>
> 🧪 Testes de integração da cadeia de comunicação (Serial → Broker → Dashboard) em [`docs/testes/plano_de_testes.md`](docs/testes/plano_de_testes.md).

### Tópicos MQTT

| Tópico | Direção | Descrição |
|--------|---------|-----------|
| `dataflow/status` | Arduino → Cloud | Estado da FSM e uptime |
| `dataflow/estoque` | Arduino → Cloud | Quantidade de peças |
| `dataflow/eventos` | Arduino → Cloud | Pedidos, entregas, erros |
| `dataflow/sensores` | Arduino → Cloud | Leituras dos sensores IR |
| `dataflow/esteiras` | Arduino → Cloud | Status das esteiras |
| `dataflow/comandos/sub` | Cloud → ESP32 | Comandos do front-end |
| `dataflow/comandos/pub` | ESP32 → Cloud | Confirmação de comandos |

## Materiais

### Configuração Principal (Recomendada)

| Componente | Quantidade | Especificação |
|-----------|-----------|---------------|
| Esteira transportadora | 3 | BR Eletrônica 35cm, motor DC 3–6V |
| Esteira transportadora (já com fonte e motor integrados) | 1 | BR Eletrônica 35cm, motor DC 3–6V # não necessita driver |
| Arduino Uno | 1 | Controlador principal |
| ESP32 Dev Module | 1 | Gateway MQTT |
| Driver IRF520 | 3 | Controle de 1 motor cada |
| Sensor IR TCRT5000 | 6 | Detecção de peças |
| Display LCD 16x2 | 1 | Com módulo I2C (endereço 0x27) |
| Botões | 4 | 3 solicitação + 1 reset (opcionais) |
| Fonte 12V DC | 1 | Alimentação geral |

### Alternativas Técnicas (Viáveis)

> **Nota**: As configurações abaixo foram validadas tecnicamente e podem substituir a configuração principal conforme necessidade de custo ou disponibilidade de componentes.

#### Opção A — Módulos IRF520 ao invés de L298N

| Aspecto | L298N | IRF520 |
|---------|-------|--------|
| **Controle de direção** | Frente e ré (H-bridge) | Apenas um sentido (MOSFET) |
| **Motores por módulo** | 2 | 1 |
| **Quantidade necessária** | 2 | 3 *(1 esteira principal liga direto na fonte, sem driver)* |
| **PWM (velocidade)** | ✅ Sim | ✅ Sim |
| **Corrente máxima** | ~2A por canal | ~5A (com dissipador) |
| **Tensão** | 5–35V | Até 24V |
| **Custo** | Mais alto | Mais baixo |

**⚠️ Atenção**: Os motores das esteiras neste projeto operam em apenas um sentido, portanto a perda de reversão do IRF520 não impacta o funcionamento. É necessário 1 módulo IRF520 por esteira secundária (total de 3). A esteira principal é ligada diretamente na fonte 12 V e não utiliza driver.

#### Opção B — Arduino Mega ao invés de Uno (com botões físicos)

| Aspecto | Arduino Mega | Arduino Uno |
|---------|-------------|-------------|
| **Pinos digitais** | 54 | 20 (0–13 + A0–A5) |
| **Pinos PWM** | 15 | 6 (3, 5, 6, 9, 10, 11) |
| **Memória Flash** | 256 KB | 32 KB |
| **Memória RAM** | 8 KB | 2 KB |
| **Serial hardware** | 4 portas | 1 porta (pins 0/1) |

**Pinos necessários com Uno (sem botões físicos)**:

| Componente | Pinos | Alocação no Uno |
|-----------|-------|-----------------|
| 3 motores (IRF520) | 3 PWM | 9, 10, 11 |
| 6 sensores TCRT5000 | 6 digitais | A0, A1, A2, A3, 2, 4 |
| LCD I2C | 2 (SDA/SCL) | A4 (SDA), A5 (SCL) |
| Serial ESP32 | 2 (RX/TX) | 0 (RX), 1 (TX) |
| **Total** | **14** | **Uno tem 20 disponíveis ✅** |

**⚠️ Atenções com Arduino Uno**:
- Pins 0 e 1 são compartilhados com a porta USB de programação. **Desconecte o ESP32 durante upload de código**.
- Memória RAM de 2KB é suficiente para o código atual (usa `StaticJsonDocument` de tamanho fixo), mas deixa menos margem para expansões futuras.
- O uso de botões físicos requer 4 pinos adicionais, o que tornaria o Uno inadequado. Nesta configuração, todo o controle de peças deve ser feito via dashboard web.

#### Resumo das Combinações Possíveis

| Configuração | Controlador | Driver | Pinos Usados | Custo |
|-------------|-------------|--------|--------------|-------|
| **Principal** (econômica) | Uno | 3× IRF520 | 14 (sem botões) | Baixo |
| **Alternativa B** (misturada) | Mega 2560 | 3× IRF520 | 17 + 4 botões | Médio-Baixo |
| **Alternativa C** (limitada) | Uno | 2× L298N | 10 + 4 botões | *Botões não cabem ❌* |

> A **Alternativa A** (Uno + 3× IRF520) é a opção de menor custo viável para este projeto, desde que se aceite o controle exclusivamente via dashboard web (sem botões físicos).

## Como Rodar

### Caminho rápido — Simulador (sem hardware)

Para ver o dashboard funcionando sem montar nenhum componente físico:

```bash
cd simulator
npm install
npm start
```
Acessar http://localhost:3000 no navegador.
⚠️ O simulador sobe na mesma porta 3000 usada pelo servidor real (server/) — não rode os dois ao mesmo tempo sem alterar a variável PORT de um deles.

### Sistema Completo (com hardware)

#### Pré-requisitos

- [Arduino IDE](https://www.arduino.cc/en/software) (com suporte a Arduino Uno e ESP32)
- [Node.js](https://nodejs.org/) v18+
- [Mosquitto](https://mosquitto.org/) rodando localmente (porta 1883) — **caminho padrão validado em bancada**. Veja [`docs/broker_local_mosquitto.md`](docs/broker_local_mosquitto.md)
- Conexão Wi-Fi 2.4 GHz para o ESP32
- *(Opcional, futuro)* Conta gratuita no [HiveMQ Cloud](https://cloud.hivemq.com) — apenas para o Teste 6 de migração para broker remoto (TLS/8883)

#### 1. Configurar o Arduino

1. Abrir `arduino/data_flow_inventory/data_flow_inventory.ino`
2. Selecionar placa: **Arduino Uno R3**
3. Fazer upload

#### 2. Configurar o ESP32

1. Na pasta `esp32/gateway_mqtt/`, criar o arquivo de segredos a partir do exemplo (arquivo **não versionado**, ignorado pelo `.gitignore`):
   ```bash
   copy secrets.h.example secrets.h   # Windows
   cp   secrets.h.example secrets.h   # Linux/Mac
   ```
2. Preencher em `secrets.h` as credenciais de Wi-Fi (`SECRET_WIFI_*`) e do broker (`SECRET_MQTT_*_LOCAL` ou `SECRET_MQTT_*_CLOUD`). **As credenciais não ficam mais no `.ino`.**
3. Abrir `esp32/gateway_mqtt/gateway_mqtt.ino` e definir o modo de conexão pela flag `USE_TLS`:
   - `false` → broker **local** Mosquitto (porta 1883) — ideal para testes sem nuvem. Veja [`docs/broker_local_mosquitto.md`](docs/broker_local_mosquitto.md)
   - `true` → broker **nuvem** HiveMQ Cloud (porta 8883, TLS)
4. Selecionar placa: **ESP32 Dev Module**
5. Fazer upload

#### 3. Rodar o Servidor

```bash
cd server
npm install
# Editar .env conforme o broker escolhido:
#   Local (padrão):  MQTT_BROKER_URL=mqtt://localhost  | MQTT_PORT=1883
#   Nuvem (HiveMQ):  MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com | MQTT_PORT=8883 + credenciais
npm start
```

#### 4. Acessar o Dashboard

Abrir [http://localhost:3000](http://localhost:3000) no navegador.

## Próximos Passos

- 🚧 **Esteira B/C:** montagem do hardware adicional (motores + sensores) e réplica das funções da esteira A no sketch principal.
- ☁️ **Broker Remoto (HiveMQ Cloud):** o sistema hoje está validado com **Mosquitto local**. A próxima rodada de testes cobre a migração para o **HiveMQ Cloud** (MQTT sobre TLS, porta 8883), validando autenticação, certificados (`setCACert`) e a mesma cadeia end-to-end (Arduino → ESP32 → Broker → Dashboard) via internet. Ver [`docs/testes/plano_de_testes.md`](docs/testes/plano_de_testes.md) (Teste 6) e [`docs/broker_local_mosquitto.md`](docs/broker_local_mosquitto.md#etapa-e--migração-para-hivemq-cloud-futuro).
- 🧪 **Validação de infraestrutura:** script [`docs/testes/validações/validar_infra.ps1`](docs/testes/validações/validar_infra.ps1) automatiza a checagem de broker, firewall e serviços antes de cada bancada — inclui checklist manual complementar em [`checklist_pre_teste_rede_infra.md`](docs/testes/validações/checklist_pre_teste_rede_infra.md).

## Equipe

| Nome | |
|------|--|
| **Henrique Moni de Souza** | |
| **Matheus Nespolo Silva** | |
| **Murilo Tolardo da Silva** | |
| **Vitor Marcolongo Silva** | |

**Orientação:** Prof. Dr.

## Contribuindo

Contribuições são bem-vindas! Antes de abrir um PR, leia o
[**Guia de Contribuição**](CONTRIBUTING.md) — ele cobre as **regras de segurança**
(segredos em `secrets.h` / `.env`, nunca no código), convenções de commit e as
validações obrigatórias. O histórico de mudanças fica em
[`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Licença

MIT License — Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Referências

- AFFIA; AAMER (2022) — IoT-based smart warehouse infrastructure
- ALKHATEEB et al. (2022) — Smart Warehouse Management System
- TUBIS; ROHMAN (2023) — Intelligent Warehouse in Industry 4.0
- HUSSEIN; MUHUDIN (2024) — IoT Based Warehouse Management System
- Ver `docs/artigo/Projeto de pesquisa - Final.docx` para referências completas

---

<div align="center">
"A forma mais fácil de estagnar é considerar que não há nada a aprender."
</div>
