# Arquitetura de Comunicação MQTT — Data Flow Inventory

## Visão Geral

O sistema de comunicação conecta o protótipo físico (Arduino Mega + sensores + motores) a um dashboard web em tempo real, utilizando MQTT como protocolo de transporte entre o dispositivo IoT e o servidor na nuvem.

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
                                              │ MQTT (TLS, port 8883)
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NUVEM (Cloud)                                │
│                                                                     │
│  ┌──────────────────────────────────────┐                          │
│  │         HiveMQ Cloud (Broker)        │                          │
│  │                                      │                          │
│  │  Tópicos:                            │                          │
│  │  ├── dataflow/status                 │                          │
│  │  ├── dataflow/estoque                │                          │
│  │  ├── dataflow/eventos                │                          │
│  │  ├── dataflow/sensores               │                          │
│  │  ├── dataflow/esteiras               │                          │
│  │  ├── dataflow/comandos/sub ←─────   │ ← (ESP32 se inscreve)   │
│  │  └── dataflow/comandos/pub ──────→ │ → (ESP32 publica)       │
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
│  └──────────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
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
HiveMQ Cloud recebe e distribui
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
HiveMQ Cloud recebe e distribui
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
| `dataflow/status` | Arduino → Cloud | Estado atual da FSM e uptime |
| `dataflow/estoque` | Arduino → Cloud | Quantidade de peças A, B, C |
| `dataflow/eventos` | Arduino → Cloud | Pedidos, entregas, erros, inicialização |
| `dataflow/sensores` | Arduino → Cloud | Leituras dos 6 sensores IR |
| `dataflow/esteiras` | Arduino → Cloud | Status de ligada/desligada de cada esteira |
| `dataflow/comandos/sub` | Cloud → ESP32 | Comandos recebidos do front-end (inscrito) |
| `dataflow/comandos/pub` | ESP32 → Cloud | Confirmação de comandos encaminhados |

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

## Configuração do HiveMQ Cloud

1. Criar conta gratuita em [cloud.hivemq.com](https://cloud.hivemq.com)
2. Criar um cluster (gratuito para testes)
3. Criar credenciais de acesso (username/password)
4. Anotar a URL do broker (ex: `mqtt://xxx.s1.eu.hivemq.com`)
5. Configurar no `.env` do server e no código do ESP32

**Credenciais necessárias:**
- Broker URL
- Porta: 8883 (TLS)
- Username
- Password

---

## Segurança

- **TLS/SSL**: Conexão criptografada na porta 8883
- **Autenticação**: Username/password para o broker
- **Client ID único**: Cada dispositivo tem seu ID
- **Tópicos dedicados**: Separação por função (status, comandos, etc.)

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
Code/
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
│   └── .env                           # Configurações (HiveMQ, porta, etc.)
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

### 1. Configurar o Arduino
1. Abrir `arduino/data_flow_inventory/data_flow_inventory.ino` na Arduino IDE
2. Selecionar placa: Arduino Mega 2560
3. Fazer upload

### 2. Configurar o ESP32
1. Abrir `esp32/gateway_mqtt/gateway_mqtt.ino` na Arduino IDE
2. Alterar SSID, senha Wi-Fi e credenciais MQTT
3. Selecionar placa: ESP32 Dev Module
4. Fazer upload

### 3. Instalar e rodar o Server
```bash
cd server
npm install
# Editar .env com credenciais do HiveMQ Cloud
npm start
```

### 4. Acessar o Dashboard
Abrir no navegador: `http://localhost:3000`