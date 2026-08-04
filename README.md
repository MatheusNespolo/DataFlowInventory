# Data Flow Inventory

<p align="center">
  <strong>Centro de Distribuição Automatizado — Protótipo IoT em Escala Reduzida</strong>
</p>

<p align="center">
  SENAI São Caetano do Sul — Boa Vista<br>
  Engenharia de Controle e Automação<br>
  2026
</p>

---

## Visão Geral

O **Data Flow Inventory** é um protótipo funcional que simula um centro de distribuição automatizado em escala reduzida, controlado por microcontroladores e monitorado remotamente via dashboard web em tempo real.

O sistema é composto por:
- **4 esteiras transportadoras** (1 principal + 3 secundárias) com motores DC
- **6 sensores infravermelhos** TCRT5000 (3 no topo + 3 nas junções)
- **Roda giratória** de separação com 3 compartimentos
- **Arduino Mega** como controlador principal (FSM de 5 estados)
- **ESP32** como gateway MQTT (bridge Serial ↔ Wi-Fi)
- **Dashboard web** em tempo real (HTML/CSS/JS + Socket.IO)
- **Servidor Node.js** como ponte entre MQTT e WebSocket
- **HiveMQ Cloud** como broker MQTT

## Arquitetura

```
┌──────────────┐   Serial   ┌──────────┐   MQTT    ┌────────────────┐   WebSocket   ┌─────────────┐
│ Arduino Mega │ ────────── │   ESP32   │ ──────── │  HiveMQ Cloud  │ ──────────── │  Dashboard  │
│  (FSM + I/O) │ ←──────── │ (Gateway) │          │    (Broker)    │              │  (Frontend) │
└──────────────┘            └──────────┘          └───────┬────────┘              └─────────────┘
                                                          │ MQTT                        ↑
                                                          │                            │
                                                  ┌───────┴────────┐                   │
                                                  │  Node.js Server │ ─────────────────┘
                                                  │  (Express+WS)   │
                                                  └────────────────┘
```

## Estrutura do Repositório

```
DataFlowInventory/
├── arduino/
│   └── data_flow_inventory/
│       └── data_flow_inventory.ino    # Código Arduino (FSM + Serial JSON)
│
├── esp32/
│   └── gateway_mqtt/
│       └── gateway_mqtt.ino           # Código ESP32 (Serial ↔ MQTT)
│
├── server/
│   ├── package.json                   # Dependências Node.js
│   ├── server.js                      # Express + Socket.IO + MQTT
│   └── .env                           # Configurações (não versionado)
│
├── frontend/
│   ├── index.html                     # Dashboard principal
│   ├── css/
│   │   └── style.css                  # Estilos (dark theme)
│   └── js/
│       └── app.js                     # Lógica WebSocket + UI
│
├── docs/
│   └── arquitetura_mqtt.md            # Documentação da arquitetura MQTT
│
├── .gitignore
└── README.md
```

## Funcionamento

### Máquina de Estados (Arduino)

O Arduino opera com 5 estados:

1. **AGUARDANDO_PEDIDO** — Sistema em repouso, monitora botões e comandos remotos
2. **VERIFICANDO_ESTOQUE** — Verifica sensor do topo + contador interno
3. **ACIONANDO_ESTEIRA** — Liga motor da esteira secundária correspondente
4. **ENTREGANDO_PECA** — Monitora sensor da junção com timeout de 3s
5. **ERRO** — Sinaliza falha no LCD, aguarda reset manual

### Fluxo de Dados

**Publicação (Arduino → Dashboard):**
```
Arduino detecta evento → Serial.print(JSON) → ESP32 → MQTT Broker → Node.js → Socket.IO → Dashboard
```

**Controle Remoto (Dashboard → Arduino):**
```
Botão clicado → Socket.IO → Node.js → MQTT Broker → ESP32 → Serial → Arduino executa comando
```

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

## Como Rodar

### Pré-requisitos

- Arduino IDE (com suporte a Arduino Mega e ESP32)
- Node.js v18+
- Conta gratuita no [HiveMQ Cloud](https://cloud.hivemq.com)
- Conexão Wi-Fi para o ESP32

### 1. Configurar o Arduino

1. Abrir `arduino/data_flow_inventory/data_flow_inventory.ino`
2. Selecionar placa: **Arduino Mega 2560**
3. Fazer upload

### 2. Configurar o ESP32

1. Abrir `esp32/gateway_mqtt/gateway_mqtt.ino`
2. Alterar as credenciais Wi-Fi e MQTT no início do arquivo
3. Selecionar placa: **ESP32 Dev Module**
4. Fazer upload

### 3. Rodar o Servidor

```bash
cd server
npm install
# Editar .env com suas credenciais do HiveMQ Cloud
npm start
```

### 4. Acessar o Dashboard

Abrir [http://localhost:3000](http://localhost:3000) no navegador.

## Materiais

| Componente | Quantidade | Especificação |
|-----------|-----------|---------------|
| Esteira transportadora | 4 | BR Eletrônica 35cm, motor DC 3–6V |
| Arduino Mega 2560 | 1 | Controlador principal |
| ESP32 Dev Module | 1 | Gateway MQTT |
| Driver L298N | 2 | Controle de 2 motores cada |
| Sensor IR TCRT5000 | 6 | Detecção de peças |
| Display LCD 16x2 | 1 | Com módulo I2C (endereço 0x27) |
| Botões | 4 | 3 solicitação + 1 reset |
| Fonte 12V DC | 1 | Alimentação geral |

## Equipe

- **Henrique Moni de Souza**
- **Matheus Nespolo Silva**
- **Murilo Tolardo da Silva**
- **Vitor Marcolongo Silva**

Orientação: Prof. Dr.

## Licença

MIT License

## Referências

- AFFIA; AAMER (2022) — IoT-based smart warehouse infrastructure
- ALKHATEEB et al. (2022) — Smart Warehouse Management System
- TUBIS; ROHMAN (2023) — Intelligent Warehouse in Industry 4.0
- HUSSEIN; MUHUDIN (2024) — IoT Based Warehouse Management System
- Ver `Projeto de pesquisa - Final.docx` para referências completas