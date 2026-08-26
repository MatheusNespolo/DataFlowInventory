# Checklist de Validação Pré-Teste — Rede / Infraestrutura

⚠️ Execute ESTE checklist ANTES de iniciar a bancada física. Cada item deve estar ✅ antes de prosseguir.

## 1. Camada Física (Arduino ↔ ESP32 — UART)

- [ ] **Divisor de tensão montado**: 1kΩ (série no TX do Uno) + 2kΩ (nó → GND)
- [ ] **GND comum**: multímetro confirma continuidade < 1 Ω entre GND do Uno e GND do ESP32
- [ ] **Nível lógico**: medir na saída do divisor (nó 1k/2k) com Uno transmitindo → ~3.3V (NÃO 5V)
- [ ] **Jumpers não invertidos**:
  - RX Uno (pino 0) ← TX2 ESP32 (GPIO17) — direto
  - TX Uno (pino 1) → divisor → RX2 ESP32 (GPIO16)
- [ ] **Baud rate**: 9600 dos dois lados (Uno `Serial.begin(9600)` / ESP32 `Serial2.begin(9600)`)
- [ ] **ESP32 DESCONECTADO dos pinos 0/1** durante upload no Uno
- [ ] **Serial Monitor do Uno FECHADO** durante operação (conflita com ESP32 na UART)

## 2. Rede Wi-Fi

- [ ] **Rede 2.4 GHz** (ESP32 não suporta 5 GHz) — hotspot Windows ou rede externa
- [ ] **IP do PC anotado**: `ipconfig` → IPv4 da interface Wi-Fi/Ethernet usada
- [ ] **SSID/SENHA** no `gateway_mqtt.ino` corretos para a rede escolhida

## 3. Broker MQTT (Mosquitto)

- [ ] `mosquitto.conf` existe com `listener 1883 0.0.0.0` + `allow_anonymous true`
- [ ] **Broker escutando em 0.0.0.0**: `netstat -ano | findstr :1883` → `0.0.0.0:1883 LISTENING`
- [ ] **Firewall 1883 liberado** (Admin): regra entrada TCP existe
- [ ] **Smoke test CLI**: `mosquitto_pub -h localhost -t "dataflow/status" -m '{"type":"status","estado":"ok"}'` aparece no `mqtt_probe`

## 4. ESP32 (Gateway)

- [ ] `MQTT_SERVER` = **IP do PC** na rede Wi-Fi (NÃO `localhost`, NÃO IP hardcoded antigo)
- [ ] `USE_TLS = false` (broker local)
- [ ] `MQTT_USER`/`MQTT_PASS` vazios (allow_anonymous true)
- [ ] Sketch `gateway_mqtt` (não `esp32_teste_serial`) foi feito upload
- [ ] Monitor serial (115200) mostra `[WiFi] Conectado!` + `[MQTT] Conectado!`
- [ ] `mqtt_probe` mostra LWT retained `{"type":"gateway","status":"online"}` em `dataflow/status`

## 5. Server Node + Frontend

- [ ] `server/.env` existe com `MQTT_BROKER_URL=mqtt://localhost` + `MQTT_PORT=1883`
- [ ] `cd server && npm install` executado (node_modules presente)
- [ ] Porta 3000 livre: `netstat -ano | findstr :3000` → nada ou server rodando
- [ ] Dashboard `http://localhost:3000` carrega com indicadores "Conectado" + "ESP32 Online"

## 6. Automação

- [ ] `validar_infra.ps1` executado como Admin — todos os testes PASS