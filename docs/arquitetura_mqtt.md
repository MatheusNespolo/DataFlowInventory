# Arquitetura de Comunicação MQTT — Data Flow Inventory

## Visão Geral

O sistema de comunicação conecta o protótipo físico (Arduino Uno + sensores + motores) a um dashboard web em tempo real, utilizando MQTT como protocolo de transporte entre o dispositivo IoT e o servidor.

**Nota sobre hospedagem:** Esta arquitetura suporta tanto um broker MQTT local (Mosquitto) para desenvolvimento/demonstração quanto brokers em nuvem (HiveMQ Cloud, AWS IoT Core, Azure IoT Hub). A escolha é feita pela configuração no `server/.env` e nas constantes do ESP32.

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FÍSICO (Protótipo)                           │
│                                                                     │
│  ┌──────────────┐   Serial (9600)   ┌──────────────┐               │
│  │ Arduino Uno  │ ────────────────→ │     ESP32    │               │
│  │              │  TX(1) → RX2(16)* │   (Gateway)  │               │
│  │ • FSM (5     │ ←──────────────── │              │               │
│  │   estados)   │  RX(0) ← TX2(17)  │ • WiFi       │               │
│  │ • 4 motores  │                   │ • MQTT Pub/Sub│              │
│  │   (IRF520)   │  *divisor de      │ • Bridge     │               │
│  │ • 6 sensores │   tensão 5V→3,3V  └──────┬───────┘               │
│  │ • LCD 16x2   │                          │                       │
│  └──────────────┘                          │ Wi-Fi                 │
└────────────────────────────────────────────┼───────────────────────┘
                                             │
                                             │ MQTT
                                             │ (1883 local / 8883 TLS nuvem)
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BROKER (Local ou Nuvem)                          │
│                                                                     │
│  ┌──────────────────────────────────────┐                          │
│  │   Mosquitto (local) ou HiveMQ Cloud  │                          │
│  │                                      │                          │
│  │  Tópicos:                            │                          │
│  │  ├── dataflow/status                 │                          │
│  │  ├── dataflow/estoque                │                          │
│  │  ├── dataflow/eventos                │                          │
│  │  ├── dataflow/sensores               │                          │
│  │  ├── dataflow/esteiras               │                          │
│  │  ├── dataflow/comandos/sub  ←────── │ ← (ESP32 se inscreve)    │
│  │  └── dataflow/comandos/pub          │ ← (confirmações)         │
│  └──────────────┬───────────────────────┘                          │
│                 │                                                   │
│                 │ MQTT                                              │
│                 ▼                                                   │
│  ┌──────────────────────────────────────┐                          │
│  │     Node.js Server                   │                          │
│  │                                      │                          │
│  │  • Express (HTTP + arquivos estáticos)│                         │
│  │  • Socket.IO (WebSocket)             │                          │
│  │  • mqtt.js (Pub/Sub)                 │                          │
│  │  • Relay MQTT ↔ WebSocket            │                          │
│  │                                      │                          │
│  │  Roda em: localhost:3000             │                          │
│  └──────────────┬───────────────────────┘                          │
│                 │                                                   │
│                 │ WebSocket (Socket.IO)                             │
│                 ▼                                                   │
│  ┌──────────────────────────────────────┐                          │
│  │     Front-end (HTML/CSS/JS)          │                          │
│  │                                      │                          │
│  │  • Dashboard em tempo real           │                          │
│  │  • Diagrama SVG interativo           │                          │
│  │  • Botões de controle remoto         │                          │
│  │  • Histórico de eventos              │                          │
│  │                                      │                          │
│  │  Servido pelo Node em localhost:3000 │                          │
│  └──────────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hardware do Protótipo

| Componente | Especificação |
|------------|---------------|
| Microcontrolador | Arduino Uno |
| Gateway IoT | ESP32 (Wi-Fi + MQTT) |
| Drivers de motor | 4x módulo MOSFET IRF520 (1 pino PWM por motor) |
| Motores | 4x DC 3–6V (esteira principal + A, B, C) |
| Sensores | 6x IR TCRT5000 (3 topo + 3 junções J1/J2/J3) |
| Display | LCD 16x2 I2C (0x27) |
| Botões físicos | Desabilitados — controle exclusivo via dashboard |
| Separador (roda) | Código comentado — implementação futura |

### Ligação Serial Arduino Uno ↔ ESP32

| Arduino Uno | ESP32 | Observação |
|-------------|-------|------------|
| TX (pino 1) | RX2 (GPIO16) | **Via divisor de tensão** (1kΩ + 2kΩ): Uno é 5V, ESP32 é 3,3V |
| RX (pino 0) | TX2 (GPIO17) | Direto (3,3V é lido como HIGH pelo Uno) |
| GND | GND | Comum obrigatório |

> ⚠ **Upload no Uno:** os pinos 0/1 são compartilhados com o USB. Desconecte o ESP32 desses pinos durante o upload do sketch no Uno.

---

## Modos de Operação

### Modo Simulador (offline, sem hardware)

O simulador (`simulator/`) reproduz inteiramente a FSM do Arduino em JavaScript, sem necessidade de dispositivos físicos nem de broker MQTT. É ideal para testes do frontend e para demonstração do fluxo de dados.

```
Frontend ──WebSocket──> server.js (simulador, porta 3000)
```

### Modo Real (com hardware físico)

Com os dispositivos conectados, o fluxo completo envolve MQTT:

```
Arduino Uno ──Serial 9600──> ESP32 ──MQTT──> Broker (Mosquitto/HiveMQ) ──> Node.js Server ──WebSocket──> Frontend
```

---

## Fluxos de Comunicação

### Fluxo 1: Dados do Arduino → Dashboard (Publicação)

```
Arduino Uno detecta evento (entrega, erro, mudança de estado)
    │
    ▼ Serial.println(JSON)
ESP32 recebe JSON pela Serial2 (leitura não-bloqueante, linha a linha)
    │
    ▼ mqtt.publish(tópico conforme campo "type", JSON)
Broker recebe e distribui
    │
    ▼ mqtt.on('message')
Node.js Server recebe mensagem MQTT
    │
    ▼ io.emit('evento', JSON)
Front-end recebe via Socket.IO e atualiza a UI
```

**Exemplo de mensagem:**
```json
{
  "type": "evento",
  "evento": "entrega",
  "peca": "A",
  "estoqueA": 4,
  "estoqueB": 5,
  "estoqueC": 5
}
```

### Fluxo 2: Comando do Dashboard → Arduino (Controle Remoto)

```
Usuário clica "Solicitar Peça A" no dashboard
    │
    ▼ socket.emit('solicitar_peca', {peca: 'A'})
Node.js Server recebe evento Socket.IO
    │
    ▼ mqtt.publish('dataflow/comandos/sub', JSON)
Broker recebe e distribui
    │
    ▼ mqtt.on('message') / callbackMQTT
ESP32 recebe comando MQTT e traduz para texto
    │
    ▼ Serial2.println('CMD:PECA:A')
Arduino Uno recebe comando pela Serial
    │
    ▼ Inicia máquina de estados (VERIFICANDO_ESTOQUE)
    
ESP32 publica confirmação em 'dataflow/comandos/pub'
```

**Exemplo de comando:**
```json
{
  "acao": "solicitar_peca",
  "peca": "A",
  "origem": "frontend",
  "clienteId": "socket_id_aqui"
}
```

---

## Tópicos MQTT

| Tópico | Direção | Descrição |
|--------|---------|-----------|
| `dataflow/status` | ESP32 → Server | Estado atual da FSM e uptime |
| `dataflow/estoque` | ESP32 → Server | Quantidade de peças A, B, C |
| `dataflow/eventos` | ESP32 → Server | Pedidos, entregas, erros, inicialização |
| `dataflow/sensores` | ESP32 → Server | Leituras dos 6 sensores IR |
| `dataflow/esteiras` | ESP32 → Server | Status ligada/desligada de cada esteira |
| `dataflow/comandos/sub` | Server → ESP32 | Comandos enviados pelo front-end |
| `dataflow/comandos/pub` | ESP32 → Server | Confirmação de comandos encaminhados |

> Os nomes dos tópicos são configuráveis no `server/.env` e nas constantes `TOPICO_*` do `gateway_mqtt.ino`. Arduino/ESP32 e servidor devem usar os **mesmos** nomes.

---

## Formatos de Mensagem

### Arduino → ESP32 (Serial JSON)

**Status:**
```json
{"type":"status","estado":"ENTREGANDO_PECA","pecaSolicitada":1,"uptime":3600}
```

**Estoque:**
```json
{"type":"estoque","pecaA":4,"pecaB":5,"pecaC":5}
```

**Sensores:**
```json
{"type":"sensores","topo":{"A":1,"B":0,"C":1},"juncao":{"J1":0,"J2":0,"J3":0}}
```

**Evento (entrega):**
```json
{"type":"evento","evento":"entrega","peca":"A","estoqueA":4,"estoqueB":5,"estoqueC":5}
```

**Evento (erro):**
```json
{"type":"evento","evento":"erro","tipo":"timeout","peca":"B"}
```

**Esteiras:**
```json
{"type":"esteiras","principal":1,"secA":0,"secB":1,"secC":0}
```

O ESP32 roteia cada mensagem para o tópico correspondente com base no campo `type`. Linhas que não são JSON (logs de debug do Arduino) são apenas exibidas no monitor serial do ESP32.

### ESP32 → Arduino (Serial Text)

```
CMD:PECA:A
CMD:PECA:B
CMD:PECA:C
CMD:RESET
```

### Front-end → Server (Socket.IO)

```javascript
// Solicitar peça
socket.emit('solicitar_peca', { peca: 'A' });

// Reset do sistema
socket.emit('reset_sistema');
```

---

## Configuração do Broker

### Opção 1: Mosquitto (local)

**Instalação:**
- **Windows:** [mosquitto.org/download](https://mosquitto.org/download/)
- **Linux:** `sudo apt install mosquitto mosquitto-clients`
- **macOS:** `brew install mosquitto`

**Iniciar:**
```bash
mosquitto -d      # background
mosquitto -v      # verbose (debug)
```

Porta padrão: **1883** (sem TLS).

**Testar com clientes CLI:**
```bash
# Terminal 1 — inscrever nos tópicos
mosquitto_sub -h localhost -t "dataflow/#"

# Terminal 2 — publicar mensagem de teste
mosquitto_pub -h localhost -t "dataflow/status" -m "{\"type\":\"status\",\"estado\":\"Teste\"}"
```

### Opção 2: HiveMQ Cloud (nuvem, TLS)

1. Criar conta gratuita em [cloud.hivemq.com](https://cloud.hivemq.com)
2. Criar credenciais (username/password) no cluster
3. Configurar o `server/.env`:
```
MQTT_BROKER_URL=mqtts://<SEU_CLUSTER>.s1.eu.hivemq.com
MQTT_PORT=8883
MQTT_USERNAME=<SEU_USERNAME>
MQTT_PASSWORD=<SUA_SENHA>
```
4. Configurar as constantes no `gateway_mqtt.ino` (`MQTT_SERVER`, `MQTT_USER`, `MQTT_PASS`). O ESP32 usa `WiFiClientSecure` para a conexão TLS na porta 8883.

### Outras opções de nuvem

- **AWS IoT Core** (requer conta AWS e certificados X.509)
- **Azure IoT Hub** (requer conta Azure)

---

## Segurança

### Modo Local (desenvolvimento/demo)

- Sem TLS (porta 1883), rede local confiável
- Autenticação opcional via `mosquitto_passwd`
- Adequado para bancada de testes e demonstração presencial

### Modo Nuvem (produção)

- **TLS/SSL**: Conexão criptografada na porta 8883
- **Autenticação**: Username/password para o broker
- **Client ID único**: Cada dispositivo tem seu ID (`dataflow-esp32-gateway`, `dataflow-node-server`)
- **Certificados**: No protótipo o ESP32 usa `setInsecure()`; em produção, usar `setCACert()` com o certificado raiz do broker (ISRG Root X1 no HiveMQ Cloud)

---

## Bibliotecas Utilizadas

### Arduino Uno
- `ArduinoJson` — Serialização/deserialização JSON
- `Wire` / `LiquidCrystal_I2C` — Comunicação I2C com LCD

### ESP32
- `WiFi` / `WiFiClientSecure` — Conexão Wi-Fi e TLS (builtin)
- `PubSubClient` — Cliente MQTT
- `ArduinoJson` — Serialização/deserialização JSON

### Node.js Server
- `express` — Servidor HTTP e arquivos estáticos
- `socket.io` — WebSocket para tempo real
- `mqtt` — Cliente MQTT
- `dotenv` — Variáveis de ambiente

### Front-end
- `Socket.IO Client` (CDN) — Conexão WebSocket
- JavaScript vanilla — Lógica de UI
- CSS3 — Estilização e animações

---

## Estrutura de Diretórios

```
DataFlowInventory/
├── arduino/
│   └── data_flow_inventory/
│       └── data_flow_inventory.ino    # Código Arduino Uno (FSM + JSON Serial)
│
├── esp32/
│   └── gateway_mqtt/
│       └── gateway_mqtt.ino           # Código ESP32 (Serial2 ↔ MQTT)
│
├── server/
│   ├── package.json                   # Dependências Node.js
│   ├── server.js                      # Express + Socket.IO + MQTT
│   └── .env                           # Configurações (broker, tópicos, porta)
│
├── simulator/
│   ├── package.json                   # Dependências Node.js
│   └── server.js                      # Simulador offline (FSM em JS)
│
├── frontend/
│   ├── index.html                     # Dashboard principal
│   ├── css/
│   │   └── style.css                  # Estilos (dark theme)
│   └── js/
│       └── app.js                     # Lógica WebSocket + atualização UI
│
└── docs/
    └── arquitetura_mqtt.md            # Este documento
```

---

## Como Rodar

### Simulador (offline, sem hardware)

```bash
cd simulator
npm install
npm start
# Acessar http://localhost:3000
```

### Sistema Completo (com hardware)

#### 1. Iniciar o broker

```bash
# Mosquitto local
mosquitto -d
# OU configurar HiveMQ Cloud (ver seção "Configuração do Broker")
```

#### 2. Configurar o Arduino Uno

1. Abrir `arduino/data_flow_inventory/data_flow_inventory.ino` na Arduino IDE
2. Selecionar placa: **Arduino Uno**
3. **Desconectar o ESP32 dos pinos 0/1** e fazer upload
4. Reconectar o ESP32 após o upload

#### 3. Configurar o ESP32

1. Abrir `esp32/gateway_mqtt/gateway_mqtt.ino` na Arduino IDE
2. Alterar `SSID`, `SENHA` (Wi-Fi) e `MQTT_SERVER`/`MQTT_USER`/`MQTT_PASS` (broker)
3. Selecionar placa: **ESP32 Dev Module**
4. Fazer upload

#### 4. Instalar e rodar o Server

```bash
cd server
npm install
# Editar .env com os dados do broker
npm start
```

#### 5. Acessar o Dashboard

Abrir no navegador: `http://localhost:3000`