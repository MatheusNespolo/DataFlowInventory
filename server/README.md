# Servidor — Data Flow Inventory

Servidor Node.js (Express + Socket.IO + MQTT) que funciona como **ponte** entre o broker MQTT e o dashboard web em tempo real.

## Funcionalidades

- **WebSocket ↔ MQTT**: recebe eventos do gateway ESP32 via MQTT e repassa ao frontend via Socket.IO
- **Health check**: `GET /api/status` retorna estado do broker, gateway e clientes conectados (HTTP 503 se broker indisponível)
- **Segurança**: Helmet + CSP, CORS restrito, rate limit por socket, validação de entrada
- **LWT**: Last Will and Testament para monitoramento de presença do gateway
- **Shutdown gracioso**: publica `offline` antes de encerrar em SIGINT/SIGTERM

## Como rodar

```bash
# Configurar o broker MQTT
copy .env.example .env   # Windows
cp   .env.example .env   # Linux/Mac
# Editar .env conforme o broker (Mosquitto local ou HiveMQ Cloud)

npm install
npm start
```

O servidor fica disponível em [http://localhost:3000](http://localhost:3000) (porta configurável via `PORT` no `.env`).

## Configuração

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do servidor HTTP |
| `MQTT_BROKER_URL` | `mqtt://127.0.0.1` | URL do broker MQTT |
| `MQTT_PORT` | `1883` | Porta do broker |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Origens permitidas (separadas por vírgula) |
| `COMANDO_INTERVALO_MS` | `500` | Intervalo mínimo entre comandos (anti-flood) |

## Estrutura

```
server/
├── server.js          # Express + Socket.IO + MQTT
├── package.json       # Dependências Node.js
├── .env               # Configurações (não versionado)
└── .env.example       # Modelo de configuração
```

> 📖 Para testes sem hardware, use `../simulator/`.
