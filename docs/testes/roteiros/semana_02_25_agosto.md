# Roteiro de Testes — Semana 2 (25/08/2026)

**Objetivo:** destravar os bloqueios do dia 20 — comunicação Serial Arduino ↔ ESP32 e conexão MQTT do ESP32 ao broker — e concluir os **Testes 2, 3 e 4** (End-to-End da esteira A).

> **Data:** 25/08/2026  
> **Continuação de:** [`semana_01_18-20_agosto.md`](semana_01_18-20_agosto.md)

---

## 1. Diagnóstico do dia 20/08

| Sintoma | Causa raiz | Correção (hoje) |
|---------|------------|-----------------|
| Serial Arduino ↔ ESP32 silenciosa | GND comum ausente + **divisor de tensão ausente** (TX 5V → RX 3,3V) | Bloco 0.A — montar divisor 1k/2kΩ + GND comum |
| `[MQTT] Conectado!` não aparece | Firewall bloqueia 1883, mosquitto.conf não carregado, IP errado | Bloco 0.B — smoke test + liberar porta |

---

## 2. Bloco 0.A — Bancada Serial (SEM rede)

**Sketch:** `test/esteira_peca_a/esp32_teste_serial/` (só Serial, sem Wi-Fi)

### Materiais

- Resistores: **1kΩ + 2kΩ** para divisor
- Protoboard com GND dedicada

### Fiação UART

| De | Para | Observação |
|----|------|------------|
| TX Uno (pino 1) | Divisor 1k/2k → GPIO16 ESP32 | 5V → ~3,3V |
| GPIO17 ESP32 | RX Uno (pino 0) | Direto |
| GND Uno | GND ESP32 | **Obrigatório** |
| — | — | Baud: 9600 ambos |

### Procedimento

1. Upload no Uno (ESP32 desconectado) → upload no ESP32 (`esp32_teste_serial`)
2. Conectar fiação conforme tabela
3. Abrir monitor do ESP32 (115200)
4. **Critério de liberação:** JSONs do Uno aparecem no monitor ESP32

---

## 2. Bloco 0.B — Rede e broker

### Rede

- SSID: `MATHEUSN-NB01 7089`
- IP do PC: `10.84.23.136`

### Smoke test do broker

```powershell
netstat -an | findstr 1883
# Deve mostrar 0.0.0.0:1883 (se não, liberar firewall)
```

**Scripts de validação:**
- `node test/mqtt_probe/probe.js`
- `node test/mqtt_probe/probe.js -PosSubida`
- `docs/testes/validações/checklist_pre_teste_rede_infra.md`

---

## 3. Roteiro do dia

### Bloco 1 — Testes 2 e 3

1. **Teste 2:**
   - Gateway ESP32 conectado → `online` retained em `dataflow/status`
   - JSONs do Arduino no `mqtt_probe`
   - Server Node loga (`[WS →] ...`)
   - LWT `offline` ao desligar ESP32

2. **Teste 3 — MQTT Box:**
   - `{"acao":"solicitar_peca","peca":"A"}` em `dataflow/comandos/sub`
   - Esteira aciona → confirmação em pub
   - `{"acao":"reset"}` funciona

### Bloco 2 — Teste 4 (Dashboard)

- Dashboard `http://localhost:3000`
- Solicitar Peça A → esteira executa → UI atualiza
- Erros: sem estoque, timeout → `ERRO` → Reset
- Desligar ESP32 → dashboard indica offline

### Plano B — Simulador

```bash
start_services.bat
cd simulator && npm start
# Dashboard → validar Teste 4 virtual
```

---

## 4. Resultados do dia

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0.A — Serial Uno ↔ ESP32 (divisor) | ✅ | 1k/2kΩ + GND comum |
| 0.B — Rede | ✅ | SSID: MATHEUSN-NB01 |
| 0.B — Smoke test broker | ✅ | 0.0.0.0:1883 |
| 0.B — ESP32 WiFi + MQTT | ✅ | rc=-2 corrigido |
| **2 — ESP32 → Broker → Node** | ✅ | |
| **3 — Comando MQTT Box** | ✅ | |
| **4 — End-to-End Dashboard** | ✅ | |
| Plano B (simulador) | ✅ | |

**✅ Marco do dia:** esteira A 100% integrada, sensor ao dashboard.

---

## 5. Continuação

Ver [`semana_03_27-28_agosto.md`](semana_03_27-28_agosto.md) — hardening, timeout 9s, sync LCD/Dashboard.