# Roteiro de Testes — Semana 3 (27–28/08/2026)

**Objetivo:** hardening e robustez — firmware ESP32 (reconexão Wi-Fi, rejeições explícitas, estoque retained), servidor Node (helmet/CORS/rate limit/QoS/LWT) e correção do bug de status (`dataflow/status` vs `dataflow/status/server`).

> **Data:** 27–28/08/2026  
> **Continuação de:** [`semana_02_25_agosto.md`](semana_02_25_agosto.md)

---

## 1. Herança validada

| Marco | Data | Status |
|-------|------|--------|
| Serial Arduino ↔ ESP32 (divisor 1k/2kΩ + GND comum) | 25/08 | ✅ |
| Teste 2 — ESP32 → Broker → Node | 25/08 | ✅ |
| Teste 4 — End-to-End Dashboard | 25/08 | ✅ |
| Plano B — Simulador | 25/08 | ✅ |

---

## 2. Mudanças aplicadas (commits a validar)

### Firmware ESP32 (`35fe3d5`)
1. Reconexão Wi-Fi **não-bloqueante** (loop nunca trava)
2. Rejeições explícitas: `peca_invalida`, `ocupado`, `comando_desconhecido`
3. Estoque **retained** em `dataflow/estoque`
4. Pausa pós-entrega não-bloqueante

### Servidor Node (`9a7ce25`)
5. helmet + CSP, CORS restrito, rate limit por socket
6. QoS 1, LWT do server, health check `/api/status`
7. **Separação de tópicos:** `dataflow/status` (gateway) ≠ `dataflow/status/server` (Node)

---

## 3. Bloco 0 — Pré-voo

### 0.a — Credenciais ESP32 (NOVO fluxo)

> ⚠️ Credenciais em `secrets.h`, **não** em `gateway_mqtt.ino`.

```bash
# 1. Copiar secrets.h.example → secrets.h
# 2. Preencher:
SECRET_WIFI_SSID / SECRET_WIFI_PASS  # 2,4 GHz
SECRET_MQTT_SERVER_LOCAL              # IP do PC (ipconfig)
USE_TLS false                         # broker local
# 3. Verificar: secrets.h NÃO aparece em git status
```

### 0.b — Infraestrutura

- [ ] Fiação UART reconferida (divisor + GND comum)
- [ ] `start_services.bat` (Mosquitto + probe + server)
- [ ] Broker: `netstat -an | findstr 1883` → `0.0.0.0:1883`
- [ ] Checklist: [`checklist_pre_teste_rede_infra.md`](../validações/checklist_pre_teste_rede_infra.md)

### 0.c — Reupload obrigatório

| Arquivo | Motivo |
|---------|--------|
| `arduino/data_flow_inventory/data_flow_inventory.ino` | Timeout → **9 s** |
| `esp32/gateway_mqtt/gateway_mqtt.ino` | Hardening |
| `server/server.js` | Hardening |

---

## 4. Bloco 1 — Timeout de entrega (9 s)

### 1.1 Travessia real

- `CMD:PECA:A` → medir tempo J0 → J1
- **Critério:** tempo real ≤ 9 s (`TIMEOUT_ENTREGA = 9000`)

### 1.2 Timeout forçado

1. Segurar peça em J0 (não deixar chegar ao sensor)
2. Aguardar 9 s → FSM → `ERRO`, motores desligam
3. LCD: `TIMEOUT J1`; Dashboard: `TIMEOUT`
4. `CMD:RESET` → FSM → `IDLE`

---

## 5. Bloco 2 — Sincronismo LCD ↔ Dashboard

| Cenário | Verificar |
|---------|-----------|
| Boot do Uno | LCD e Dashboard mostram **estoque idêntico** |
| Entrega de peça | Estoque decrementa em ambos |
| ERRO + RESET | Estoque retorna ao valor anterior |
| Estresse (5 pedidos rápidos) | LCD final = Dashboard final |

---

## 6. Bloco 3 — Hardening e robustez

### 3.A — Rejeições e resiliência (MQTT Box)

| Injeção | Resposta esperada |
|---------|-------------------|
| `{"acao":"solicitar_peca","peca":"X"}` | `peca_invalida` |
| Durante entrega: `{"acao":"solicitar_peca","peca":"A"}` | `ocupado` |
| `{"acao":"qualquer"}` | `comando_desconhecido` |
| `{invalido}` | Erro de parse, **sem travamento** |

### 3.B — Estoque retained + reconciliação

1. Reiniciar broker → ESP32 e Server reconectam
2. Verificar `dataflow/estoque` retained (valor preservado)
3. LCD = Dashboard = valor no broker

### 3.C — Reconexão Wi-Fi não-bloqueante

1. Desligar Wi-Fi temporariamente
2. Bridge serial e FSM **continuam operando**
3. Restaurar Wi-Fi → ESP32 reconecta automaticamente

### 3.D — Servidor Node

| Teste | Validação |
|-------|-----------|
| Rate limit | Múltiplos comandos → `comandosRejeitados` incrementa |
| Health check | `GET /api/status` → `broker`, `estoque`, `uptime` |
| QoS 1 | Publicações com `qos: 1` |
| Helmet/CORS | Headers CSP/CORS no Network tab |
| LWT server | Server offline → `dataflow/status/server = offline` |

---

## 7. Bloco 4 — Stretch: HiveMQ Cloud (Teste 6)

⚠️ **Só se Blocos 1–3 fecharem com folga.**

1. Cluster HiveMQ + credenciais
2. `secrets.h`: `SECRET_MQTT_*_CLOUD`; `USE_TLS=true`
3. `server/.env`: `mqtts://<cluster>.s1.eu.hivemq.com:8883`
4. Validar: `[MQTT] Conectado!` (TLS/8883), pedido A E2E, LWT remoto
5. Reverter se bancada continuar local

---

## 8. Plano B — Simulador

```bash
start_services.bat
cd simulator && npm start
# Dashboard → validar sync estoque e histórico virtual
```

---

## 9. Resultados

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ✅ | IP: ____ |
| 1 — Timeout 9 s (travessia) | ✅ | Tempo: ____ s |
| 1 — Timeout → ERRO/RESET | ✅ | |
| 2 — Sync inicial (boot) | ✅ | LCD == Dashboard |
| 2 — Sync após entrega | ✅ | |
| 2 — Sync após ERRO+RESET | ✅ | |
| 2 — Estresse 5 pedidos | ✅ | LCD: ____ · Dash: ____ |
| 3 — FSM ocupada / indisponível | ✅ | |
| 3 — LWT gateway offline/online | ✅ | |
| 3 — Reconexão broker | ✅ | Retained intacto |
| 3.A — Rejeições | ✅ | |
| 3.B — Estoque retained | ✅ | |
| 3.C — Wi-Fi não-bloqueante | ✅ | |
| 3.D — Node (rate/health) | ✅ | comandosRejeitados: ____ |
| 4 — HiveMQ Cloud (stretch) | ⬜ | Adiado? ____ |
| Plano B (simulador) | ✅ | |

---

## 10. Continuação

Ver [`semana_04_01-03_setembro.md`](semana_04_01-03_setembro.md) — robustez/LWT finalizados, Teste 3 puro, HiveMQ Cloud, fix de rejeição de comandos.