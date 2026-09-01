# Roteiro de Testes — 01/09/2026

Continuação do [`roteiro_teste_2026-08-27.md`](roteiro_teste_2026-08-27.md). Referências: [`plano_de_testes.md`](../plano_de_testes.md), [`broker_local_mosquitto.md`](../../broker_local_mosquitto.md), [checklist de infra](../validações/checklist_pre_teste_rede_infra.md), [CHANGELOG](../../CHANGELOG.md), gateway `esp32/gateway_mqtt/`, sketches em `test/esteira_peca_b/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** avançar o que **ainda está aberto** após a esteira A ter sido consolidada — robustez/LWT da esteira A, Teste 3 puro (MQTT Box), e Teste 5 (esteira B) **somente se o hardware extra estiver na bancada**. Não repetir timeout nem sincronismo LCD/Dashboard (já aprovados em 27–28/08). HiveMQ Cloud permanece stretch / Teste 6.

---

## 1. Onde estamos — herança dos testes já validados

Antes de executar, relembrar o que já está **fechado** para não retrabalhar:

| Marco | Data | Status | Card |
|-------|------|--------|------|
| Serial Arduino ↔ ESP32 (divisor 1k/2kΩ + GND comum) | 25/08 | ✅ Validado | #1 |
| Teste 2 — ESP32 → Broker → Node (`dataflow/#`) | 25/08 | ✅ Validado | #4 |
| Teste 4 — End-to-End Dashboard (pedido A → entrega) | 25/08 | ✅ Validado | #7 |
| Plano B — Simulador | 25/08 | ✅ Validado | #7 |
| Timeout de entrega (recalibrado para **9 s**) + `CMD:RESET` | 27–28/08 | ✅ Validado | #12 |
| Sincronismo estoque LCD ↔ Dashboard | 27–28/08 | ✅ Validado | #11 |
| Teste 3 — Comando via MQTT Box (isolado) | 25/08 | ⚠️ Parcial (via Dashboard, não via MQTT Box puro) | #9 |
| Robustez / LWT esteira A (queda de gateway, reconexão, comandos inválidos) | 27/08 | ⬜ Pendente (itens do Bloco 3 em aberto) | novo |
| Teste 5 — Duas esteiras (A + B) | — | ⬜ Pendente / Blocked (aguarda hardware) | #10 |
| Teste 6 — HiveMQ Cloud (TLS/8883) | — | ⬜ Pendente (após esteira A 100% estável) | — |

**Firmware vigente (não retestar o valor, só usar):**

- `TIMEOUT_ENTREGA = 9000` ms (`arduino/data_flow_inventory/data_flow_inventory.ino`)
- `TEMPO_SAIDA_ESTEIRA_MS = 3000` (fase de saída após o sensor de junção; ~5 s até o sensor + 3 s de saída cabem nos 9 s)
- Rejeições explícitas no gateway: `peca_invalida`, `ocupado`, `comando_desconhecido`
- Tópicos separados: `dataflow/status` (gateway) × `dataflow/status/server` (Node)

> ⚠️ **Ponto crucial recorrente:** divisor 1k/2kΩ + GND comum na UART. Sempre reconferir a fiação antes de energizar.

---

## 2. Bloco 0 — Pré-voo (não é reteste funcional)

> Regra herdada: **não ligar Wi-Fi/MQTT antes de a Serial Arduino ↔ ESP32 estar comprovadamente viva.**

### 0.a — Credenciais

- [ ] `esp32/gateway_mqtt/secrets.h` existe (cópia de `secrets.h.example`) e **não** aparece em `git status`
- [ ] `SECRET_WIFI_SSID` / `SECRET_WIFI_PASS` da rede de hoje (2,4 GHz)
- [ ] `SECRET_MQTT_SERVER_LOCAL` = **IP do PC** (`ipconfig`; nunca `localhost`)
- [ ] `USE_TLS false` no `.ino` (broker local)

### 0.b — Infra

- [ ] Fiação UART reconferida (TX Uno → divisor → GPIO16 / GPIO17 → RX Uno / GND comum)
- [ ] `start_services.bat` (Mosquitto com conf + mqtt_probe + server)
- [ ] Um único listener na 1883 (`Get-NetTCPConnection -LocalPort 1883`); se o serviço Windows do Mosquitto estiver no loopback, pará-lo
- [ ] Checklist: [`checklist_pre_teste_rede_infra.md`](../validações/checklist_pre_teste_rede_infra.md)
- [ ] Opcional: `validar_infra.ps1` e `validar_infra.ps1 -PosSubida`

### 0.c — Critério de liberação

- [ ] `mqtt_probe` mostra JSONs periódicos em `dataflow/status`, `dataflow/sensores`, `dataflow/esteiras`
- [ ] Retained `{"type":"gateway","status":"online"}` em `dataflow/status` **e** `{"type":"server","status":"online"}` em `dataflow/status/server`
- [ ] Dashboard: WebSocket conectado + **ESP32 Online**
- [ ] `curl http://localhost:3000/api/status` → `"gateway":"online"` e `"mqtt":true`

**Não executar hoje:** pedido de peça A “feliz”, timeout forçado, sync LCD/Dashboard no boot/entrega/reset. Isso já está no registro de 27–28/08.

---

## 3. Bloco 1 — Robustez e LWT da esteira A (prioridade)

Herdado do Bloco 3 / 3.A–3.C do roteiro de 27/08, **somente os itens que ficaram em ⬜**.

### 1.1 LWT do gateway (queda e volta)

1. Com o sistema ocioso, **desligar o ESP32** (USB):
   - [ ] `mqtt_probe` recebe `{"type":"gateway","status":"offline"}` em `dataflow/status`
   - [ ] Dashboard indica **ESP32 Offline** (badge vermelho) e registra o evento
2. **Religar o ESP32:**
   - [ ] Volta a `online` e o Dashboard reconecta **sozinho** (sem F5 e sem `mosquitto_pub` manual)

### 1.2 Reconexão do broker

1. Derrubar o Mosquitto e subir de novo (`start_services.bat` ou a janela do broker):
   - [ ] Server Node e ESP32 reconectam automaticamente
   - [ ] `dataflow/status` permanece com o retained do **gateway** (não sobrescrito pelo server)

### 1.3 FSM ocupada + rejeições explícitas (fecha parte do Teste 3)

Publicar em `dataflow/comandos/sub` (MQTT Box, MQTT Explorer ou `mosquitto_pub`) — **não** pelo Dashboard, para evidência isolada:

```
{"acao":"solicitar_peca","peca":"A"}
```

Durante a entrega, publicar de novo o mesmo comando:

- [ ] Segundo pedido retorna `ocupado`; a entrega em curso **conclui**
- [ ] `{"acao":"solicitar_peca","peca":"Z"}` → `peca_invalida`, motor não aciona
- [ ] `{"acao":"voar"}` → `comando_desconhecido`
- [ ] Payload `{{{` → ESP32 loga erro de parse e **não trava**
- [ ] Depois das rejeições, um pedido válido de A ainda funciona

### 1.4 Reconexão Wi-Fi não-bloqueante (se der tempo)

1. Derrubar o AP/hotspot com o sistema ocioso:
   - [ ] Serial do ESP32: `[WiFi] Conexao perdida...`
   - [ ] Leituras Serial2 do Arduino **continuam** (loop não congela)
2. Restaurar o Wi-Fi:
   - [ ] `[WiFi] Conectado!` + `[MQTT] Conectado!`
   - [ ] Dashboard volta a Online sem reset manual

📝 **Registrar:** tempo até reconectar (s) e se precisou de reset.

---

## 4. Bloco 2 — Teste 3 puro (MQTT Box / probe)

Fecha a evidência formal que em 25/08 só passou via Dashboard.

1. MQTT Box/Explorer em `127.0.0.1:1883` (ou o IP do PC):
   - Subscribe: `dataflow/#`
   - Publish em `dataflow/comandos/sub`: `{"acao":"solicitar_peca","peca":"A"}`
2. Critérios:
   - [ ] ESP32 loga `[MQTT ←]` e envia `CMD:PECA:A`
   - [ ] Esteira A executa a entrega (já calibrada em 9 s — **não** é reteste do timeout)
   - [ ] Confirmação em `dataflow/comandos/pub`
   - [ ] `{"acao":"reset"}` só é necessário se a FSM tiver ido a `ERRO`

---

## 5. Bloco 3 — Teste 5 (esteira B) — só se o hardware estiver na mesa

> Se **não** houver o 2º IRF520 + sensores topo B / J2, **pular este bloco** e manter o card #10 Blocked. Não improvisar com a esteira A.

**Materiais:** ver [`test/esteira_peca_b/README.md`](../../../test/esteira_peca_b/README.md).

### 3.1 Fase 1 — só Arduino (monitor serial 9600)

Upload de `test/esteira_peca_b/arduino_esteiras_ab/` (ESP32 fora dos pinos 0/1):

- [ ] `CMD:PECA:A` → ciclo completo
- [ ] `CMD:PECA:B` → ciclo completo na esteira B
- [ ] `CMD:PECA:C` → `peca_indisponivel`, motor não liga
- [ ] Pedido durante entrega → `ocupado`
- [ ] Timeout (peça não chega em J1/J2) → `ERRO` → `CMD:RESET` recupera
- 📝 Registrar `tempo_ms` de A e de B (o timeout vigente no sketch principal é **9 s**)

### 3.2 Fase 2 — ESP32 + broker

Upload de `test/esteira_peca_b/esp32_esteiras_ab/` (ou o gateway principal, se a pinagem do Uno já estiver no sketch final):

- [ ] Pedidos A e B via `dataflow/comandos/sub` decrementam estoque
- [ ] Status periódico em `dataflow/#`
- [ ] LWT ao desligar o ESP32

---

## 6. Bloco 4 — Stretch: HiveMQ Cloud (Teste 6)

⚠️ **Não bloqueia o dia.** Só se os Blocos 1–2 fecharem com folga **e** a esteira A continuar estável. Isola TLS/nuvem da FSM.

1. Cluster em [cloud.hivemq.com](https://cloud.hivemq.com) + credenciais
2. `secrets.h`: `SECRET_MQTT_*_CLOUD`; no `.ino` `USE_TLS=true` → reupload
3. `server/.env`: `MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com`, `MQTT_PORT=8883` + user/pass
4. Validar:
   - [ ] `[MQTT] Conectado!` no ESP32 (TLS/8883)
   - [ ] Pedido A end-to-end no Dashboard via nuvem
   - [ ] LWT offline/online no broker remoto
5. Reverter `USE_TLS=false` se a bancada continuar local no mesmo dia

📝 Se não executar: permanece Teste 6 pendente no plano.

---

## 7. Plano B — se o hardware travar

1. `start_services.bat`
2. `cd simulator && npm start`
3. Dashboard em `http://localhost:3000` — revalidar rejeição de comando / health `/api/status` sem esteira física

O simulador **não** substitui LWT do ESP32 nem o Teste 5.

---

## 8. Documentação e board

- [ ] Preencher a tabela da seção 9 durante a bancada
- [ ] Transferir aprovados/reprovados para [`plano_de_testes.md`](../plano_de_testes.md)
- [ ] Cards:
  - **#11** Sincronismo LCD/Dashboard → Done (já validado 27–28/08; só confirmar no board)
  - **#12** Timeout → Done em **9 s** (não 12 s)
  - **#10** Teste 5 → Done se Bloco 3 passar; senão continua Blocked
  - **#9** Teste 3 puro → Done se Bloco 2 passar
  - Novo card Robustez/LWT esteira A → Done se Bloco 1 passar

---

## 9. Registro de resultados do dia (preenchido)

| Etapa | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| 0 — Pré-voo (infra + um único broker) | ✅ | Mosquitto local + probe + server operando normalmente na porta 1883 |
| 1.1 — LWT gateway offline/online | ✅ | Desconexão do ESP32 dispara `offline` no Dashboard; reconexão automática e status `online` sem reload |
| 1.2 — Reconexão do broker (retained intacto) | ✅ | Broker reiniciado; ESP32 e Server reconectam; retained intacto |
| 1.3 — `ocupado` / `peca_invalida` / `comando_desconhecido` / JSON malformado | ✅ | Respostas explícitas geradas pelo ESP32 sem travamento do parser ou da FSM |
| 1.4 — Wi-Fi não-bloqueante | ✅ | Bridge serial e FSM continuam operando durante perda momentânea de sinal |
| 2 — Teste 3 puro (MQTT Box) | ✅ | Comando publicado diretamente em `dataflow/comandos/sub` via MQTT Box executa com sucesso |
| B0.2 — Sensores esteiras B e C | ✅ | Sensores TCRT5000 (topo e junção) das esteiras B e C testados e calibrados isoladamente |
| 3 — Teste 5 esteira B (se hardware) | ⬜ | Mantido como Blocked (aguardando disponibilização do 2º módulo IRF520 na bancada) |
| 4 — HiveMQ Cloud (stretch) | ⬜ | Mantido em Backlog como stretch goal (Teste 6) |
| Plano B (simulador), se usado | — | Não necessário nesta rodada (hardware principal da esteira A operando) |

> Resultados transferidos para o [`plano_de_testes.md`](../plano_de_testes.md). Timeout 9 s e sync LCD/Dashboard já constam validados no registro de 27–28/08.


