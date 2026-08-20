<div align="center">

# Data Flow Inventory

**Centro de Distribuição Automatizado — Protótipo IoT em Escala Reduzida**

![Arduino](https://img.shields.io/badge/Arduino-Uno-00979D?logo=arduino&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-DevModule-000000?logo=espressif&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-HiveMQ-660066?logo=mosquitto&logoColor=white)
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
- [Equipe](#equipe)
- [Licença](#licença)
- [Referências](#referências)

---

## Sobre

O **Data Flow Inventory** é um protótipo funcional que simula um centro de distribuição automatizado em escala reduzida, controlado por microcontroladores e monitorado remotamente via dashboard web em tempo real.

O projeto se insere no setor de **Automação Industrial da Logística**, com foco em:
- 📦 Intralogística e centros de distribuição
- 🛒 E-commerce e gestão de estoque
- 🔄 Sistemas de recebimento automático

> 📄 Para o projeto completo, consulte `Projeto de pesquisa - Final.docx` na pasta `docs/`.

## Visão Geral

O sistema é composto por:

| Componente | Função |
|------------|--------|
| 🏗️ **4 esteiras transportadoras** | 1 principal + 3 secundárias, motores DC 3–6V |
| 🔍 **6 sensores infravermelhos** | TCRT5000 — 3 no topo + 3 nas junções |
| 🎡 **Roda giratória** (melhoria) | 3 compartimentos para separação de peças |
| 🎛️ **Arduino Uno** | Controlador principal (FSM de 5 estados) |
| 📡 **ESP32** | Gateway MQTT (bridge Serial ↔ Wi-Fi) |
| 🖥️ **Dashboard web** | HTML/CSS/JS + Socket.IO em tempo real |
| ⚙️ **Servidor Node.js** | Ponte entre MQTT e WebSocket |
| ☁️ **HiveMQ Cloud** | Broker MQTT |

> A roda giratória é um aprimoramento futuro do projeto, uma sugestão de melhoria. Atualmente existem menções ao controle no motor de passo no código, mas ele está comentado para ajustes durante o desenvolvimento até a integração final.

## Arquitetura

```
┌──────────────┐   Serial   ┌──────────┐   MQTT    ┌────────────────┐   WebSocket  ┌─────────────┐
│ Arduino Uno  │ ────────── │  ESP32   │ ────────  │  HiveMQ Cloud  │ ──────────── │  Dashboard  │
│  (FSM + I/O) │ ←────────  │(Gateway) │           │    (Broker)    │              │  (Frontend) │
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
│   ├── fluxograma_funcionamento.md        # Fluxogramas (FSM, operação, sequência)
│   ├── broker_local_mosquitto.md          # Teste local com Mosquitto (sem nuvem)
│   ├── plano_de_testes.md                 # Plano de testes de integração (Serial → E2E)
│   └── Projeto de pesquisa - Final.docx   # Documentação acadêmica
│
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
| 4 | **ENTREGANDO_PECA** | Monitora sensor da junção com timeout de 8s |
| 5 | **ERRO** | Sinaliza falha no LCD, aguarda reset manual |

> 📊 Diagramas completos (máquina de estados, fluxo operacional e sequência de comunicação) em [`docs/fluxograma_funcionamento.md`](docs/fluxograma_funcionamento.md).
>
> 🧪 Testes de integração da cadeia de comunicação (Serial → Broker → Dashboard) em [`docs/plano_de_testes.md`](docs/plano_de_testes.md).

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
| Esteira transportadora (já com fonte e motor integrados) | 1 | BR Eletrônica 35cm, motor DC 3–6V | # não necessita driver
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
| **Quantidade necessária** | 2 | 4 |
| **PWM (velocidade)** | ✅ Sim | ✅ Sim |
| **Corrente máxima** | ~2A por canal | ~5A (com dissipador) |
| **Tensão** | 5–35V | Até 24V |
| **Custo** | Mais alto | Mais baixo |

**⚠️ Atenção**: Os motores das esteiras neste projeto operam em apenas um sentido, portanto a perda de reversão do IRF520 não impacta o funcionamento. É necessário 1 módulo IRF520 por motor (total de 4).

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
| **Principal** (econômica) | Uno | 4× IRF520 | 14 (sem botões) | Baixo |
| **Alternativa B** (misturada) | Mega 2560 | 4× IRF520 | 17 + 4 botões | Médio-Baixo |
| **Alternativa C** (limitada) | Uno | 2× L298N | 10 + 4 botões | *Botões não cabem ❌* |

> A **Alternativa A** (Uno + 4× IRF520) é a opção de menor custo viável para este projeto, desde que se aceite o controle exclusivamente via dashboard web (sem botões físicos).

## Como Rodar

### Pré-requisitos

- [Arduino IDE](https://www.arduino.cc/en/software) (com suporte a Arduino Uno e ESP32)
- [Node.js](https://nodejs.org/) v18+
- Conta gratuita no [HiveMQ Cloud](https://cloud.hivemq.com)
- Conexão Wi-Fi para o ESP32

### 1. Configurar o Arduino

1. Abrir `arduino/data_flow_inventory/data_flow_inventory.ino`
2. Selecionar placa: **Arduino Uno R3**
3. Fazer upload

### 2. Configurar o ESP32

1. Abrir `esp32/gateway_mqtt/gateway_mqtt.ino`
2. Definir o modo de conexão pela flag `USE_TLS`:
   - `false` → broker **local** Mosquitto (porta 1883) — ideal para testes sem nuvem. Veja [`docs/broker_local_mosquitto.md`](docs/broker_local_mosquitto.md)
   - `true` → broker **nuvem** HiveMQ Cloud (porta 8883, TLS)
3. Alterar as credenciais Wi-Fi e MQTT no início do arquivo
4. Selecionar placa: **ESP32 Dev Module**
5. Fazer upload

### 3. Rodar o Servidor

```bash
cd server
npm install
# Editar .env com suas credenciais do HiveMQ Cloud
npm start
```

### 4. Acessar o Dashboard

Abrir [http://localhost:3000](http://localhost:3000) no navegador.

## Equipe

| Nome | |
|------|--|
| **Henrique Moni de Souza** | |
| **Matheus Nespolo Silva** | |
| **Murilo Tolardo da Silva** | |
| **Vitor Marcolongo Silva** | |

**Orientação:** Prof. Dr.

## Licença

MIT License — Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Referências

- AFFIA; AAMER (2022) — IoT-based smart warehouse infrastructure
- ALKHATEEB et al. (2022) — Smart Warehouse Management System
- TUBIS; ROHMAN (2023) — Intelligent Warehouse in Industry 4.0
- HUSSEIN; MUHUDIN (2024) — IoT Based Warehouse Management System
- Ver `Projeto de pesquisa - Final.docx` para referências completas

---

<div align="center">
"A forma mais fácil de estagnar é considerar que não há nada a aprender."
</div>
