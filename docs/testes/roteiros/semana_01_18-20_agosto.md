# Roteiro de Testes — Semana 1 (18–20/08/2026)

**Objetivo:** integrar completamente a **esteira A** com toda a cadeia (sensor → Arduino → ESP32 → Broker → Server → Dashboard).

> **Data consolidada:** 18–20/08/2026  
> **Cards:** #1, #2, #3, #4, #5, #6, #7, #9

---

## 1. Diagnóstico dos dias 18–20

| Dia | Sintoma | Causa raiz | Correção |
|-----|---------|------------|----------|
| 18 | Build/upload ESP32 lento | Primeira compilação sem cache; Windows Defender | Exclusões Defender + Upload Speed 921600 |
| 18–19 | Serial Arduino ↔ ESP32 silenciosa | GND comum ausente; divisor de tensão ausente | Divisor 1k/2kΩ + GND comum no dia 25 |
| 19 | WiFi não conecta em 5 GHz | Hotspot iPhone em 5 GHz; ESP32 só 2,4 GHz | Hotspot Windows 2,4 GHz |
| 20 | MQTT fails após inicialização | Mosquitto sem `mosquitto.conf` (local-only) | Usar `start_services.bat` com config fixo |

---

## 2. Bloco 0 — Montagem e preparação

### 0.A — Serial Arduino ↔ ESP32

**Fiação (conferir ANTES de energizar):**

| De | Para | Observação |
|----|------|------------|
| TX Uno (pino 1) | Divisor 1k+2k → GPIO16 (RX2) ESP32 | 5V → 3,3V |
| GPIO17 (TX2) ESP32 | RX Uno (pino 0) | Direto |
| GND Uno | GND ESP32 | **Obrigatório** |
| — | — | Baud: 9600 ambos |

### 0.B — Ambiente ESP32

- Exclusões Windows Defender: `%LOCALAPPDATA%\Arduino15`
- Upload Speed = 921600
- Fechar Serial Monitor antes do upload

### 0.C — Rede (Hotspot Windows)

1. Configurações → Ponto de acesso móvel → Ativar
2. Banda: **2,4 GHz**
3. IP PC: **192.168.137.1** (fixo)

---

## 3. Bancada: B1 → B2 → B3 (sem rede)

| Teste | Objetivo | Aprovação |
|-------|----------|-----------|
| **B1** | Ciclo completo | `CMD:PECA:A` → motor → peça sai → para |
| **B2** | Peça inexistente | `CMD:PECA:B` → erro + reset funciona |
| **B3** | LCD I2C | Endereço 0x27 + comandos funcionam |

**Calibrações obtidas (18–19/08):**
- `tempo_ms`: 5000 ms
- PWM mínimo: 150
- LCD addr: 0x27

---

## 4. Testes 2 e 3 — Rede

### 4.1 Teste 2 — ESP32 → Broker → Node.js

- `USE_TLS=false`, `MQTT_SERVER` = IP PC
- Validar: `online` retained + JSONs nos tópicos + Server logando + LWT offline

### 4.2 Teste 3 — MQTT Box

- `{"acao":"solicitar_peca","peca":"A"}` em `dataflow/comandos/sub`
- Esteira aciona + confirmação em pub

---

## 5. Teste 4 — Dashboard End-to-End

- Dashboard `http://localhost:3000`
- Clicar Peça A → esteira executa → UI atualiza
- Erro e reset funcionam

**✅ Marco:** esteira A 100% integrada, sensor ao dashboard.

---

## 6. Plano B — Simulador

Se hardware travar:
1. `start_services.bat`
2. `cd simulator && npm start`
3. Dashboard → validar virtual

---

## 7. Resultados finais

| Marco | Data | Status | Card |
|-------|------|--------|------|
| B1 — Ciclo completo | 18/08 | ✅ | B1 |
| B2 — Peça inexistente | 18/08 | ✅ | B2 |
| B3 — LCD I2C | 18/08 | ✅ | B3 |
| Teste 2 | 25/08 | ✅ | #4 |
| Teste 3 | 25/08 | ⚠️ Parcial | #9 |
| Teste 4 | 25/08 | ✅ | #7 |
| Simulador | 25/08 | ✅ | #7 |

---

## 8. Próximos passos

- Esteira B (Teste 5): hardware +1 IRF520, +2 TCRT5000
- Esteira C: replicação direta
- Broker remoto HiveMQ Cloud (Teste 6): trocar `USE_TLS=true`

---

## 9. Continuacao

Ver [`semana_02_25_agosto.md`](semana_02_25_agosto.md) — destrava a Serial (divisor 1k/2k + GND comum) e o MQTT, concluindo os Testes 2–4 (25/08).