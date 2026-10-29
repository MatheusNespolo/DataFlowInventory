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
- [ ] **`SECRET_WIFI_SSID`/`SECRET_WIFI_PASS`** em `esp32/gateway_mqtt/secrets.h` corretos para a rede escolhida (credenciais NÃO ficam mais no `.ino`)

## 3. Broker MQTT (Mosquitto)

- [ ] `mosquitto.conf` existe com `listener 1883 0.0.0.0` + `allow_anonymous true`
- [ ] **Broker escutando em 0.0.0.0**: `netstat -ano | findstr :1883` → `0.0.0.0:1883 LISTENING`
- [ ] ⚠️ **UM ÚNICO broker na 1883** (crítico — ver [CHANGELOG](../../CHANGELOG.md)):
      ```powershell
      Get-NetTCPConnection -State Listen | Where-Object LocalPort -eq 1883 |
        Select-Object LocalAddress,OwningProcess
      ```
      Deve aparecer **um só PID**. Se houver dois (ex.: `0.0.0.0` num PID e
      `127.0.0.1`/`::1` noutro), o **serviço automático do Windows** está ativo e
      **particiona a rede MQTT** — o server cai num broker e o ESP32 no outro,
      travando o dashboard em "ESP32 Offline". Corrija com (admin):
      `net stop mosquitto` e `sc config mosquitto start= demand`
- [ ] Serviço do Windows desabilitado: `Get-Service mosquitto` → `Stopped` / `Manual`
- [ ] **Firewall 1883 liberado** (Admin): regra entrada TCP existe
- [ ] **Smoke test CLI**: `mosquitto_pub -h localhost -t "dataflow/status" -m '{"type":"status","estado":"ok"}'` aparece no `mqtt_probe`

## 4. ESP32 (Gateway)

- [ ] `esp32/gateway_mqtt/secrets.h` criado a partir de `secrets.h.example` (NÃO versionado — confirmar que não aparece em `git status`)
- [ ] `SECRET_MQTT_SERVER_LOCAL` em `secrets.h` = **IP do PC** na rede Wi-Fi (NÃO `localhost`, NÃO IP hardcoded antigo)
- [ ] `USE_TLS = false` no `gateway_mqtt.ino` (broker local)
- [ ] `SECRET_MQTT_USER_LOCAL`/`SECRET_MQTT_PASS_LOCAL` vazios (allow_anonymous true)
- [ ] Sketch `gateway_mqtt` (não `esp32_teste_serial`) foi feito upload
- [ ] Monitor serial (115200) mostra `[WiFi] Conectado!` + `[MQTT] Conectado!`
- [ ] `mqtt_probe` mostra retained `{"type":"gateway","status":"online"}` em `dataflow/status` **e** `{"type":"server","status":"online"}` em `dataflow/status/server` (tópicos separados)

## 5. Server Node + Frontend

- [ ] `server/.env` existe com `MQTT_BROKER_URL=mqtt://127.0.0.1` + `MQTT_PORT=1883` (use `127.0.0.1`, **não** `localhost` — ver [CHANGELOG](../../CHANGELOG.md))
- [ ] `cd server && npm install` executado (node_modules presente)
- [ ] Porta 3000 livre: `netstat -ano | findstr :3000` → nada ou server rodando
- [ ] Dashboard `http://localhost:3000` carrega com indicadores "Conectado" + "ESP32 Online"

## 6. Automação

- [ ] `validar_infra.ps1` executado como Admin (pré-voo, antes de subir os serviços) — PASS nos checks de config/firewall
- [ ] `validar_infra.ps1 -PosSubida` executado como Admin (depois do `start_services.bat`) — PASS em todos os checks de rede

## 7. Broker Remoto (opcional — HiveMQ Cloud)

> Só aplicável quando executando o Teste 6 (`plano_de_testes.md`) ou o Bloco 4 (stretch goal) dos roteiros semanais. Não é pré-requisito da bancada local.

- [ ] Cluster gratuito criado em [cloud.hivemq.com](https://cloud.hivemq.com) e credenciais (username/password) gerados
- [ ] ESP32: `USE_TLS = true` no `.ino`; em `secrets.h`, `SECRET_MQTT_SERVER_CLOUD = <cluster>.s1.eu.hivemq.com`, `SECRET_MQTT_USER_CLOUD`/`SECRET_MQTT_PASS_CLOUD` preenchidos (porta 8883 já fixada pelo `#if USE_TLS`)
- [ ] `server/.env`: `MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com`, `MQTT_PORT=8883` + credenciais
- [ ] **Não é necessário** liberar firewall/porta 1883 local nem garantir bind `0.0.0.0` — a conexão sai pela internet (TLS/8883)
- [ ] Certificado: protótipo usa `setInsecure()`; produção exigiria `setCACert()` com o certificado raiz do broker (ISRG Root X1 no HiveMQ Cloud)
- [ ] Monitor serial (115200) do ESP32 mostra `[MQTT] Conectado!` apontando para o host remoto
