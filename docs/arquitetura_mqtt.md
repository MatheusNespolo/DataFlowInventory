# Arquitetura de Comunicação MQTT — Data Flow Inventory

## Visão Geral

O sistema de comunicação conecta o protótipo físico (Arduino Mega + sensores + motores) a um dashboard web em tempo real, utilizando MQTT como protocolo de transporte entre o dispositivo IoT e o servidor local.

**Nota sobre hospedagem:** Esta arquitetura utiliza um broker MQTT local (Mosquitto) para fins de demonstração e desenvolvimento. A implantação é totalmente viável em ambiente de nuvem (HiveMQ Cloud, AWS IoT Core, Azure IoT Hub, etc.), bastando alterar o endpoint do broker e as credenciais de acesso.

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FÍSICO (Protótipo)                          │
│                                                                     │
│  ┌──────────────┐      Serial       ┌──────────────┐               │
│  │ Arduino Mega │ ────────────────  │     ESP32    │               │
│  │              │                    │   (Gateway)  │               │
│  │ • FSM (5     │ ←────────────── │              │               │
│  │   estados)   │    Serial         │ • WiFi       │               │
│  │ • 4 motores  │                    │ • MQTT Pub/Sub│              │
│  │ • 6 sensores │                    │ • Bridge     │               │
│  │ • LCD 16x2   │                    └──────┬───────┘               │
│  │ • 4 botões   │                           │                       │
│  └──────────────┘                           │ Wi-Fi                 │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                                              │ MQTT (porta 1883)
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL (Máquina / Servidor)                       │
│                                                                     │
│  ┌──────────────────────────────────────┐                          │
│  │         Mosquitto (Broker)           │                          │
│  │                                      │                          │
│  │  • Roda localmente (localhost)       │                          │
│  │  • Porta padrão: 1883                │                          │
│  │  • Sem TLS (rede local)              │                          │
│  │                                      │                          │
│  │  Tópicos:                            │                          │
│  │  ├── dfi/status                      │                          │
│  │  ├── dfi/estoque                     │                          │
│  │  ├── dfi/eventos                     │                          │
│  │  ├── dfi/sensores                    │                          │
│  │  ├── dfi/esteiras                    │                          │
│  │  └── dfi/comando ←─────────────     │ ← (ESP32 se inscreve)   │
│  └──────────────┬───────────────────────┘                          │
│                  │                                                   │
│                  │ MQTT                                              │
│                  ▼                                                   │
│  ┌──────────────────────────────────────┐                          │
│  │     Node.js Server                   │                          │
│  │                                      │                          │
│  │  • Express (HTTP)                    │                          │
│  │  • Socket.IO (WebSocket)             │                          │
│  │  • mqtt.js (Subscriber)              │                          │
│  │  • Relay MQTT → WebSocket            │                          │
│  │                                      │                          │
│  │  Roda em: localhost:3001             │                          │
│  └──────────────┬───────────────────────┘                          │
│                  │                                                   │
│                  │ WebSocket (Socket.IO)                            │
│                  ▼                                                   │
│  ┌──────────────────────────────────────┐                          │
│  │     Front-end (HTML/CSS/JS)          │                          │
│  │                                      │                          │
│  │  • Dashboard em tempo real           │                          │
│  │  • Diagrama SVG interativo           │                          │
│  │  • Botões de controle remoto         │                          │
│  │  • Histórico de eventos              │                          │
│  │                                      │                          │
│  │  Roda em: localhost:3000             │                          │
│  └──────────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modos de Operação

### Modo Simulador (offline, sem hardware)

O simulador (`simulator/`) reproduz inteiramente a FSM do Arduino Mega em JavaScript, sem necessidade de dispositivos físicos nem de broker MQTT. É ideal para testes do frontend e para demonstração do fluxo de dados.

```
Frontend (localhost:3000) ──WebSocket──> server.js (simulador, porta 3000)
```

### Modo Real (com hardware físico)

Com os dispositivos conectados, o fluxo completo envolve MQTT:

```
Arduino Mega ──Serial──> ESP32 ──MQTT:1883──> Mosquitto ──> Node.js Server ──WebSocket──> Frontend
```

---

## Fluxos de Comunicação

### Fluxo 1: Dados do Arduino → Dashboard (Publicação)

```
Arduino Mega detecta evento (entrega, erro, mudança de estado)
    │
    ▼ Serial.print(JSON)
ESP32 recebe JSON pela Serial
    │
    ▼ mqtt.publish(tópico, JSON)
Mosquitto recebe e distribui (localhost:1883)
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
    ▼ mqtt.publish('dfi/comando', JSON)
Mosquitto recebe e distribui
    │
    ▼ mqtt.on('message')
ESP32 recebe comando MQTT
    │
    ▼ Serial.println('CMD:PECA:A')
Arduino Mega recebe comando pela Serial
    │
    ▼ Inicia máquina de estados (VERIFICANDO_ESTOQUE)
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
| `dfi/status` | ESP32 → Server | Estado atual da FSM e uptime |
| `dfi/estoque` | ESP32 → Server | Quantidade de peças A, B, C |
| `dfi/eventos` | ESP32 → Server | Pedidos, entregas, erros, inicialização |
| `dfi/sensores` | ESP32 → Server | Leituras dos 6 sensores IR |
| `dfi/esteiras` | ESP32 → Server | Status de ligada/desligada de cada esteira |
| `dfi/comando` | Server → ESP32 | Comandos recebidos do front-end |

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

## Configuração do Mosquitto (Local)

### Instalação

- **Windows:** [mosquitto.org/download](https://mosquitto.org/download/)
- **Linux:** `sudo apt install mosquitto mosquitto-clients`
- **macOS:** `brew install mosquitto`

### Iniciar o broker

```bash
# Iniciar em background
mosquitto -d

# Ou com verbose para debug
mosquitto -v
```

O broker escuta na porta **1883** (MQTT sem TLS) por padrão.

### Testar com clientes CLI

```bash
# Terminal 1 — inscrever nos tópicos
mosquitto_sub -h localhost -t "dfi/#"

# Terminal 2 — publicar mensagem de teste
mosquitto_pub -h localhost -t "dfi/status" -m '{"estado":"Teste"}'
```

### Alternativa: HiveMQ Cloud (nuvem)

Para implantação em nuvem, o broker pode ser substituído por:
- **HiveMQ Cloud** (gratuito para testes): [cloud.hivemq.com](https://cloud.hivemq.com)
- **AWS IoT Core** (requer conta AWS)
- **Azure IoT Hub** (requer conta Azure)

Basta alterar as variáveis de ambiente no `server/.env`:
```
MQTT_BROKER=hivemq-endpoint.s1.eu.hivemq.com
MQTT_PORT=8883
MQTT_USER=seu_usuario
MQTT_PASS=sua_senha
```

---

## Segurança

### Modo Local (desenvolvimento/demo)

- **Sem autenticação** (rede local confiável)
- **Sem TLS** (porta 1883)
- Adequado para bancada de testes e demonstração presencial

### Modo Nuvem (produção)

- **TLS/SSL**: Conexão criptografada na porta 8883
- **Autenticação**: Username/password para o broker
- **Client ID único**: Cada dispositivo tem seu ID
- **Tópicos dedicados**: Separação por função

---

## Bibliotecas Utilizadas

### Arduino Mega
- `ArduinoJson` — Serialização/deserialização JSON
- `Wire` / `LiquidCrystal_I2C` — Comunicação I2C com LCD

### ESP32
- `WiFi` — Conexão Wi-Fi (builtin)
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
│       └── data_flow_inventory.ino    # Código Arduino (FSM + MQTT Serial)
│
├── esp32/
│   └── gateway_mqtt/
│       └── gateway_mqtt.ino           # Código ESP32 (Serial ↔ MQTT)
│
├── server/
│   ├── package.json                   # Dependências Node.js
│   ├── server.js                      # Express + Socket.IO + MQTT
│   └── .env                           # Configurações (Mosquitto local, porta, etc.)
│
├── simulator/
│   ├── package.json                   # Dependências Node.js
│   ├── server.js                      # Simulador offline (FSM em JS)
│   └── frontend/                      # Interface do simulador
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js
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

#### 1. Instalar e iniciar o Mosquitto

```bash
# Instalar (conforme SO)
mosquitto -d
```

#### 2. Configurar o Arduino

1. Abrir `arduino/data_flow_inventory/data_flow_inventory.ino` na Arduino IDE
2. Selecionar placa: Arduino Mega 2560
3. Fazer upload

#### 3. Configurar o ESP32

1. Abrir `esp32/gateway_mqtt/gateway_mqtt.ino` na Arduino IDE
2. Alterar SSID, senha Wi-Fi e IP do broker MQTT (seu IP local)
3. Selecionar placa: ESP32 Dev Module
4. Fazer upload

#### 4. Instalar e rodar o Server

```bash
cd server
npm install
# Editar .env com IP do Mosquitto e porta
npm start
```

#### 5. Acessar o Dashboard

Abrir no navegador: `http://localhost:3000`