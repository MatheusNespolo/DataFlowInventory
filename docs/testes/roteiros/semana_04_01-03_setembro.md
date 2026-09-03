# Roteiro de Testes — Semana 4 (01–03/09/2026)

**Objetivo:** fechar robustez/LWT esteira A, Teste 3 puro, avançar **Teste 6 — HiveMQ Cloud** (02/09), validar **fix de rejeição de comandos** (03/09).

> **Data:** 01–03/09/2026  
> **Continuação de:** [`semana_03_27-28_agosto.md`](semana_03_27-28_agosto.md)  
> **Cards:** #9, #10, #15–17  
> **Commit ref (02/09):** `628182d` · Cluster HiveMQ: s1.eu.hivemq.cloud

---

## 1. Herança validada

| Marco | Data | Status |
|-------|------|--------|
| Serial Arduino ↔ ESP32 (divisor 1k/2kΩ + GND) | 25/08 | ✅ |
| Teste 2 — ESP32 → Broker → Node | 25/08 | ✅ |
| Teste 4 — End-to-End Dashboard | 25/08 | ✅ |
| Timeout 9s + CMD:RESET | 27–28/08 | ✅ #12 |
| Sync estoque LCD ↔ Dashboard | 27–28/08 | ✅ #11 |
| Plano B — Simulador | 25/08 | ✅ #7 |
| Teste 5 — Esteiras A+B | — | ⬜ Blocked (2º IRF520) |
| **Teste 6 — HiveMQ Cloud** | 02/09 | ⚠️ **Parcial** |

### Teste 6 (02/09) — progresso parcial

| Bloco | Etapa | Resultado |
|-------|-------|-----------|
| 0 | Segurança + pré-voo | ✅ |
| 1 | ESP32 TLS/8883 HiveMQ | ✅ |
| 2 | Node.js TLS/8883 HiveMQ | ✅ |
| 3 | Retained + tópicos separados | ✅ |
| 3.2 | MQTT Box desacoplado | ✅ |
| **4** | **Dashboard E2E remoto** | ⬜ Pendente (firewall) |
| **5.1–5.3** | **LWT/reconexão remoto** | ⬜ Pendente |

> **Bloqueio 02/09:** firewall abortado → E2E e LWT remoto pendentes para 03/09.

---

## 2. Bloco 0 — Pré-voo

> Mosquitto local primeiro (sanity), depois HiveMQ.

### 0.a — Credenciais

```bash
# esp32/gateway_mqtt/secrets.h (não versionar)
SECRET_WIFI_SSID / SECRET_WIFI_PASS  # 2,4 GHz
SECRET_MQTT_SERVER_LOCAL              # IP do PC
USE_TLS=false                         # local primeiro
```

### 0.b — Infra

- [ ] Fiação UART reconferida (divisor + GND comum)
- [ ] `start_services.bat` → Mosquitto + probe + server
- [ ] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [ ] Esteira A operando no broker local
- [ ] Checklist: [`checklist_pre_teste_rede_infra.md`](../validações/checklist_pre_teste_rede_infra.md)

---

## 3. Bloco 1 — Robustez / LWT ✅ (01/09)

| Injeção | Resposta | Status |
|---------|----------|--------|
| `peca:"Z"` | `peca_invalida` | ✅ |
| Durante entrega: `peca:"A"` | `ocupado` | ✅ |
| `{"acao":"qualquer"}` | `comando_desconhecido` | ✅ |
| JSON malformado | Erro parse, sem travamento | ✅ |
| Desligar/religar ESP32 | LWT offline → online | ✅ |
| Reiniciar Mosquitto | Retained intacto | ✅ |

**B0.2 Sensores B/C:** TCRT5000 top/junção calibrados ✅

---

## 4. Bloco 2 — Teste 3 puro ✅ (01/09)

- MQTT Box → `dataflow/comandos/sub` → `{"acao":"solicitar_peca","peca":"A"}` → esteira aciona
- `{"acao":"reset"}` → FSM volta AGUARDANDO_PEDIDO

---

## 5. Bloco 3 — Teste 5 (Esteira B)

⬜ **Bloqueado** — aguardando 2º IRF520. Sketches: `test/esteira_peca_b/`.

---

## 6. Bloco 4 — Teste 6: HiveMQ Cloud (02–03/09)

### 6.1 Setup

1. `secrets.h`: `USE_TLS=true` + credenciais CLOUD
2. `server/.env`: `mqtts://<cluster>.s1.eu.hivemq.com:8883`
3. [ ] ESP32: `[MQTT] Conectado!` (TLS/8883)
4. [ ] Node.js: `mqtts://` sem erro de certificado

### 6.2 Dashboard E2E remoto (pendente de 02/09)

- [ ] Clicar Peça A → esteira aciona → ciclo completo na UI
- [ ] Estoque consistente (LCD ↔ Dashboard)
- [ ] Latência local × nuvem: ____ ms

### 6.3 LWT e reconexão remota

| Teste | Critério | Status |
|-------|----------|--------|
| 5.1 LWT gateway | Desligar ESP32 → `offline` → religar → `online` | ⬜ |
| 5.2 Wi-Fi | Remover rede → FSM não trava → reconecta sem reflash | ⬜ |
| 5.3 Backend | Reiniciar Node.js → reconecta HiveMQ | ⬜ |

### 6.4 Reversão obrigatória

`USE_TLS=false` + reupload + `server/.env` → `mqtt://127.0.0.1`

---

## 7. Bloco 5 — Fix de rejeição de comandos (03/09)

> **Bug:** `CMD:PECA:Z` e rejeições (`peca_invalida`/`sem_estoque`) apareciam como "Comando enviado".

**Causa raiz:** (1) `server.js` emitia todo `cmdPub` como `comando` sem checar `status`; (2) `app.js` adicionava histórico antes da confirmação.

**Correção:** `server.js` roteia `status=rejeitado` → `comando_erro`; `app.js` só escreve após evento do servidor.

### 7.1 Via MQTT Box

- `{"acao":"solicitar_peca","peca":"Z"}` em `dataflow/comandos/sub`
  - [ ] Server loga `[WS →] Comando rejeitado: peca_invalida`
  - [ ] Dashboard: "Erro: peca_invalida" (vermelho), **não** "Comando enviado"
- `{"acao":"solicitar_peca","peca":"A"}` → [ ] "Comando enviado" (verde)

### 7.2 Via Dashboard

- [ ] Clicar Peça A → "Comando enviado" só **após** confirmação
- [ ] Peça sem estoque → "Erro" (não "enviado")

### 7.3 Via Socket.IO

```js
socket.emit('solicitar_peca', {peca: 'Z'})
// → comando_erro (não publica MQTT)
```
- [ ] `GET /api/status` → `comandosRejeitados` incrementa

---

## 8. Plano B — Simulador

```bash
start_services.bat
cd simulator && npm start
# Dashboard → validar fix via simulador
```

---

## 9. Resultados

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ⬜ | IP: ____ |
| 1 — Robustez/LWT local | ✅ (01/09) | |
| 2 — Teste 3 puro | ✅ (01/09) | |
| B0.2 — Sensores B/C | ✅ (01/09) | |
| 3 — Teste 5 | ⬜ Blocked | 2º IRF520 |
| 4.1 — HiveMQ TLS/8883 | ✅ (02/09) | |
| 4.2 — E2E remoto | ⬜ | Latência: ____ ms |
| 4.3 — LWT/reconexão | ⬜ | |
| 5.1 — Fix peca Z via MQTT Box | ⬜ | Erro ≠ enviado? |
| 5.2 — Fix via Dashboard | ⬜ | Após confirmação? |
| 5.3 — Fix Socket.IO | ⬜ | comandosRejeitados: ____ |
| Plano B | — | Se usado |

---

## 10. Documentação

- [x] `CHANGELOG.md` (fix de rejeição — seção "Corrigido")
- [x] `plano_de_testes.md` (observações 01/09, 02/09, 03/09)
- [x] Roteiros semanais reorganizados
- [ ] Cards: #9 → Done; #10 → Blocked; #15–17 → conforme Teste 6

> Transferir para [`plano_de_testes.md`](../plano_de_testes.md) ao final.
