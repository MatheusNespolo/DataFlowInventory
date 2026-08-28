# Roteiro de Testes — 27/08/2026

Continuação do [`roteiro_teste_2026-08-25.md`](roteiro_teste_2026-08-25.md). Referências: [`plano_de_testes.md`](../plano_de_testes.md), [`broker_local_mosquitto.md`](../../broker_local_mosquitto.md), [checklist de infra](../validações/checklist_pre_teste_rede_infra.md), [CHANGELOG](../../CHANGELOG.md), gateway `esp32/gateway_mqtt/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** validar a **rodada de endurecimento (hardening) e robustez** aplicada nos commits recentes — firmware do ESP32 (`35fe3d5`: reconexão Wi-Fi não-bloqueante, rejeições explícitas de comando, estoque retained), servidor Node (`9a7ce25`: helmet/CSP, CORS, rate limit, QoS 1, LWT do server, health check enriquecido) e a **correção do bug de status** (separação de tópicos `dataflow/status` × `dataflow/status/server` — ver [CHANGELOG](../../CHANGELOG.md)). Consolidar a esteira A como subsistema 100% estável antes de escalar para múltiplas esteiras.

---

## 1. Onde estamos — herança dos testes já validados

Antes de executar, relembrar o que já está **fechado** para não retrabalhar:

| Marco | Data | Status | Card |
|-------|------|--------|------|
| Serial Arduino ↔ ESP32 (com divisor 1k/2kΩ + GND comum) | 25/08 | ✅ Validado | #1 |
| Teste 2 — ESP32 → Broker → Node (JSONs em `dataflow/#`) | 25/08 | ✅ Validado | #4 |
| Teste 3 — Comando via MQTT Box (isolado) | 25/08 | ⚠️ Parcial (via Dashboard, não via MQTT Box puro) | #9 |
| Teste 4 — End-to-End Dashboard (pedido A → entrega) | 25/08 | ✅ Validado | #7 |
| Timeout de entrega 12 s + sincronismo de estoque LCD ↔ Dashboard | 26/08 | ✅ Validado | #11, #12 |
| Plano B — Simulador (frontend sem hardware) | 25/08 | ✅ Validado | #7 |

**Mudanças aplicadas na última rodada — a serem validadas neste roteiro:**

*Firmware ESP32 (`gateway_mqtt.ino`, commit `35fe3d5`):*
1. **Reconexão Wi-Fi não-bloqueante** (máquina de estados em `manterWiFi()`): o `loop()` nunca trava durante queda de Wi-Fi; `mqtt.loop()` e `lerSerial2()` seguem rodando.
2. **Rejeições explícitas de comando** encaminhadas ao Arduino: `peca_invalida`, `ocupado`, `comando_desconhecido` (antes eram silenciosas).
3. **Estoque publicado como RETAINED** (`dataflow/estoque`): quem conecta depois recebe o último estoque conhecido sem esperar entrega.
4. **Pausa pós-entrega não-bloqueante.**

*Servidor Node (`server.js`, commit `9a7ce25`):*
5. **helmet + CSP**, **CORS restrito** (`ALLOWED_ORIGIN`), **rate limit** por socket (`COMANDO_INTERVALO_MS`).
6. **QoS 1** em publish/subscribe, **LWT do próprio server**, **health check** `/api/status` enriquecido (503 quando broker offline).

*Correção de bug — status do gateway (ver [CHANGELOG](../../CHANGELOG.md)):*
7. **Separação de tópicos:** o status do server foi movido para `dataflow/status/server`. Antes, o publish retained do server em `dataflow/status` sobrescrevia o retained do gateway ESP32 → o Dashboard ficava travado em **"ESP32 Offline"** mesmo com o hardware online. Agora `dataflow/status` é **exclusivo do gateway**.

> ⚠️ **Ponto crucial recorrente:** o divisor de tensão 1k/2kΩ + GND comum na UART foi a causa-raiz de 3 bloqueios anteriores (19–20/08). **Sempre reconferir a fiação antes de energizar** — é o item nº 1 de silêncio total na Serial.

---

## 2. Bloco 0 — Pré-voo (credenciais + checklist de infra)

> Regra herdada: **não ligar Wi-Fi/MQTT antes de a Serial Arduino ↔ ESP32 estar comprovadamente viva.**

### 0.a — Credenciais do ESP32 via `secrets.h` (NOVO fluxo)

> ⚠️ **Mudou desde 25/08:** as credenciais de Wi-Fi/MQTT **não são mais editadas dentro de `gateway_mqtt.ino`**. Agora ficam em `esp32/gateway_mqtt/secrets.h` — arquivo **não versionado** (ignorado pelo `.gitignore`). O `.ino` inclui `#include "secrets.h"`.

- [ ] Na pasta `esp32/gateway_mqtt/`, criar o `secrets.h` a partir do exemplo (uma vez por máquina):
  - Windows: `copy secrets.h.example secrets.h`
  - Linux/Mac: `cp secrets.h.example secrets.h`
- [ ] Preencher em `secrets.h` os valores de **hoje**:
  - [ ] `SECRET_WIFI_SSID` / `SECRET_WIFI_PASS` — rede da bancada de hoje
  - [ ] `SECRET_MQTT_SERVER_LOCAL` — **IP do PC com Mosquitto** (`ipconfig`; ESP32 e PC na MESMA rede)
  - [ ] `SECRET_MQTT_USER_LOCAL` / `SECRET_MQTT_PASS_LOCAL` — vazios se `allow_anonymous true`
  - [ ] (Só se for usar nuvem no Bloco 4) `SECRET_MQTT_*_CLOUD`
- [ ] Confirmar no `.ino`: `USE_TLS false` para broker local (Mosquitto), `true` para HiveMQ Cloud
- [ ] Confirmar que `secrets.h` **NÃO** aparece em `git status` (deve estar ignorado)

### 0.b — Infra e reupload

- [ ] Executar [`validar_infra.ps1`](../validações/validar_infra.ps1) como Admin (pré-voo, antes dos serviços) → PASS nos checks de config/firewall
- [ ] Rodar o [checklist de rede/infra](../validações/checklist_pre_teste_rede_infra.md) (seções 1 a 5)
- [ ] Fiação UART reconferida (TX→divisor→GPIO16 / GPIO17→RX / GND comum)
- [ ] `server/.env` criado a partir de `server/.env.example` (uma vez) com `ALLOWED_ORIGIN` cobrindo a URL do Dashboard de hoje (`http://localhost:3000` e/ou `http://<IP-do-PC>:3000`)
- [ ] **Reupload dos sketches:**
  - [ ] `arduino/data_flow_inventory/` no Uno (ESP32 fora dos pinos 0/1 durante upload)
  - [ ] `esp32/gateway_mqtt/` no ESP32 (agora lendo de `secrets.h`)
- [ ] Subir serviços: `start_services.bat` (broker + probe + server) + Dashboard em `http://localhost:3000`
- [ ] Executar `validar_infra.ps1 -PosSubida` como Admin (depois dos serviços de pé) → PASS em todos os checks de rede

### 0.c — Ordem de subida (evita o bug de retained)

> Contexto: `dataflow/status` (gateway) e `dataflow/status/server` agora são separados, então a ordem **não é mais crítica**. Ainda assim, subir o server **antes** de o ESP32 conectar garante que o Node já esteja inscrito quando o gateway publicar `online`.

- [ ] Mosquitto → probe → server Node → **por último** energizar o ESP32

Critério de liberação do Bloco 0:
- [ ] `mqtt_probe` mostra JSONs periódicos do Uno em `dataflow/status`, `dataflow/sensores`, `dataflow/esteiras`
- [ ] `mqtt_probe` mostra retained `{"type":"gateway","status":"online"}` em `dataflow/status` **e** `{"type":"server","status":"online"}` em `dataflow/status/server` (tópicos **separados**, sem sobrescrita)
- [ ] Dashboard indica **WebSocket conectado** + **ESP32 Online** (badge verde)
- [ ] `curl http://localhost:3000/api/status` retorna `"gateway":"online"` e `"mqtt":true`

---

## 3. Bloco 1 — Validação da correção do TIMEOUT (12 s)

**Objetivo:** confirmar que o novo tempo permite a peça sair completamente da esteira secundária.

1. Colocar peça A no sensor do topo, garantir `estoque[A] > 0`.
2. **Solicitar Peça A** pelo Dashboard.
3. Cronometrar e observar:
   - [ ] Motor da esteira A liga (soft-start)
   - [ ] Peça atravessa e **sai fisicamente** da esteira secundária (não apenas chega ao sensor)
   - [ ] Evento `entrega` publicado antes de estourar o timeout
   - [ ] LCD mostra `Entrega OK!` e o novo estoque
4. **Teste de timeout real** (segurar a peça sobre o sensor de junção):
   - [ ] Após **~12 s**, estado vira `ERRO` tipo `timeout`, motor para
   - [ ] `CMD:RESET` (botão Reset do Dashboard) recupera para `AGUARDANDO_PEDIDO`

📝 **Registrar:** tempo real de travessia (s) da peça A. Se ainda insuficiente, calibrar `TIMEOUT_ENTREGA` novamente.

---

## 4. Bloco 2 — Validação do SINCRONISMO de estoque (LCD ↔ Dashboard)

**Objetivo:** confirmar que LCD e Dashboard mostram sempre o **mesmo** valor de estoque, em todas as situações.

1. **Sincronismo inicial:** reiniciar o Uno (botão reset físico) e observar:
   - [ ] Dashboard recebe o estoque inicial (`A:5 B:5 C:5`) **sem precisar de um pedido** — valida `publicarEstoque()` no `setup()`
   - [ ] LCD e Dashboard idênticos após boot
2. **Sincronismo após entrega bem-sucedida:**
   - [ ] Solicitar A → após entrega, LCD e Dashboard decrementam **juntos** (ex.: ambos vão a `A:4`)
3. **Sincronismo após ERRO + RESET** (o cenário que falhou em 25/08):
   - [ ] Forçar timeout (segurar peça) → `ERRO`
   - [ ] `CMD:RESET` pelo Dashboard → LCD e Dashboard voltam a mostrar o **mesmo** estoque — valida `publicarEstoque()` no `CMD:RESET`
4. **Teste de estresse do relato de 25/08** (5 pedidos, alguns falhos):
   - [ ] Executar 5 solicitações de A (misturar sucessos e timeouts forçados)
   - [ ] Ao final, **LCD == Dashboard** (o bug era LCD=3 / Dashboard=0)

📝 **Registrar:** valores finais de LCD e Dashboard após a sequência de 5 pedidos.

---

## 5. Bloco 3 — Testes de robustez (esteira A)

Aproveitar que a esteira A está integrada para cobrir cenários de borda antes de escalar.

1. **Pedido com FSM ocupada:** solicitar A e, durante a entrega, solicitar A de novo:
   - [ ] Segundo pedido é rejeitado **com feedback explícito** (`ocupado`) — comportamento novo do commit `35fe3d5`; antes era silencioso
   - [ ] FSM não trava e a entrega em curso conclui normalmente
2. **Peça indisponível:** solicitar B ou C (sem esteira/estoque):
   - [ ] Evento `sem_estoque` / `peca_indisponivel` sem acionar motor
3. **Reset fora do estado ERRO:** enviar `CMD:RESET` em `AGUARDANDO_PEDIDO`:
   - [ ] Sistema permanece estável (reset só age em `ERRO`)
4. **Resiliência de rede (LWT)** — os itens que ficaram pendentes em 25/08:
   - [ ] Desligar o ESP32 → `mqtt_probe` recebe `{"type":"gateway","status":"offline"}` (LWT) em `dataflow/status`
   - [ ] Dashboard indica **ESP32 Offline** (badge vermelho) e registra o evento no histórico
   - [ ] Religar o ESP32 → volta a `online` e o Dashboard reconecta **sozinho** (sem F5 e sem `mosquitto_pub` manual)
5. **Reconexão do broker:** derrubar o Mosquitto e subir de novo:
   - [ ] Server Node e ESP32 reconectam automaticamente (reconnectPeriod 5 s)
   - [ ] Após a volta, `dataflow/status` ainda tem o retained do **gateway** (não sobrescrito pelo server)

📝 **Registrar:** qualquer estado inconsistente ou necessidade de reset manual.

---

## 5.2. Bloco 3.A — Robustez de comandos (firmware `35fe3d5`)

**Objetivo:** validar as **rejeições explícitas** que substituíram o descarte silencioso de comandos.

> Enviar os comandos direto no broker isola a camada de firmware do Dashboard (fecha também parte do Teste 3 puro, card #9).

1. **Peça inválida** — publicar em `dataflow/comandos/sub`:
   ```
   "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -t dataflow/comandos/sub -m "{\"acao\":\"solicitar_peca\",\"peca\":\"Z\"}"
   ```
   - [ ] Monitor serial do ESP32 mostra o comando recebido
   - [ ] Retorno `peca_invalida` (não silencioso), motor **não** aciona
2. **Comando desconhecido** — `{"acao":"voar"}`:
   - [ ] Retorno `comando_desconhecido`, sistema estável
3. **JSON malformado** — publicar `{{{`:
   - [ ] ESP32 loga erro de parse e **não trava** (segue respondendo a comandos válidos depois)
4. **Comando durante entrega** (FSM ocupada) — ver Bloco 3 item 1:
   - [ ] Retorno `ocupado`
5. **Comando válido logo após as rejeições:**
   - [ ] `{"acao":"solicitar_peca","peca":"A"}` funciona normalmente (sem estado residual)

📝 **Registrar:** qual retorno apareceu em cada caso (`peca_invalida` / `ocupado` / `comando_desconhecido`).

---

## 5.3. Bloco 3.B — Estoque retained e reconciliação de estado

**Objetivo:** validar que o `dataflow/estoque` retained (commit `35fe3d5`) reconcilia o Dashboard sem esperar uma entrega.

1. **Dashboard tardio:** com o sistema já rodando e estoque diferente do inicial (ex.: após 2 entregas), abrir o Dashboard em uma **aba nova**:
   - [ ] Estoque correto aparece **imediatamente**, sem precisar solicitar peça
2. **Restart do server Node** (`Ctrl+C` + `npm start`), sem mexer no Arduino/ESP32:
   - [ ] Dashboard volta com o estoque correto (veio do retained, não de uma nova publicação)
   - [ ] Badge **ESP32 Online** volta sozinho — valida a correção de tópicos separados
3. **Inspeção direta do retained:**
   ```
   "C:\Program Files\mosquitto\mosquitto_sub.exe" -h localhost -t "dataflow/estoque" -v -W 3
   ```
   - [ ] Retorna o último estoque conhecido imediatamente (não fica esperando)
4. **Consistência tripla:** LCD == Dashboard == retained do broker
   - [ ] Os três valores batem

📝 **Registrar:** valores de LCD / Dashboard / retained no momento da conferência.

---

## 5.4. Bloco 3.C — Reconexão Wi-Fi não-bloqueante (firmware `35fe3d5`)

**Objetivo:** provar que a queda de Wi-Fi **não congela** o loop do ESP32 (antes, a reconexão era bloqueante).

1. **Derrubar o Wi-Fi** (desligar o AP/hotspot ou tirar o PC da rede) com o sistema ocioso:
   - [ ] Monitor serial mostra `[WiFi] Conexao perdida — retomando tentativas...`
   - [ ] Mensagens do Arduino **continuam** sendo lidas na Serial2 durante a queda — prova do não-bloqueio
   - [ ] ESP32 **não** reinicia sozinho
2. **Restaurar o Wi-Fi:**
   - [ ] `[WiFi] Conectado! IP: ...` e em seguida `[MQTT] Conectado!`
   - [ ] Gateway volta a `online` e o Dashboard reflete sem intervenção manual
3. **Queda de Wi-Fi durante uma entrega** (cenário crítico):
   - [ ] A entrega física **conclui** normalmente (o Arduino é autônomo)
   - [ ] Ao reconectar, o estoque no Dashboard reconcilia com o LCD

📝 **Registrar:** tempo aproximado até a reconexão automática (s) e se houve necessidade de reset.

---

## 5.5. Bloco 3.D — Camada Node: validação, rate limit e health check (commit `9a7ce25`)

**Objetivo:** validar o endurecimento do servidor **sem** depender do hardware (pode rodar com o simulador).

1. **Validação de peça (só A/B/C):** no console do navegador (F12), no Dashboard:
   ```js
   socket.emit('solicitar_peca', { peca: 'Z' });
   socket.emit('solicitar_peca', { peca: '../../etc' });
   ```
   - [ ] Servidor **rejeita** e loga; nada é publicado no broker (conferir no `mqtt_probe`)
   - [ ] Contador `comandosRejeitados` sobe em `/api/status`
2. **Rate limit por socket** (`COMANDO_INTERVALO_MS`, padrão 500 ms):
   ```js
   for (let i = 0; i < 10; i++) socket.emit('solicitar_peca', { peca: 'A' });
   ```
   - [ ] Apenas o primeiro passa; os demais são barrados
   - [ ] Dashboard recebe `comando_erro` (feedback, não silêncio)
3. **Health check enriquecido:**
   ```
   curl http://localhost:3000/api/status
   ```
   - [ ] Retorna `mqtt`, `gateway`, `clientesWs`, `metricas`, `uptime`
   - [ ] Com o **broker parado**, retorna **HTTP 503**
4. **Cabeçalhos de segurança (helmet/CSP):**
   ```
   curl -I http://localhost:3000
   ```
   - [ ] Presentes `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`
   - [ ] Dashboard continua funcionando normalmente (CSP não quebrou o front)
5. **CORS restrito:** abrir o Dashboard por uma origem **não** listada em `ALLOWED_ORIGIN` (ex.: `http://127.0.0.1:3000` se só `localhost` estiver liberado):
   - [ ] WebSocket é **recusado** (erro de CORS no console)
   - [ ] Ajustar `ALLOWED_ORIGIN` no `.env` e reiniciar → volta a conectar
6. **Graceful shutdown:** `Ctrl+C` no server:
   - [ ] Log de encerramento limpo (`[SYS] Sinal ... recebido — encerrando...`)
   - [ ] `dataflow/status/server` fica com `{"type":"server","status":"offline"}` retained
   - [ ] `dataflow/status` **permanece** com o retained do gateway (intocado)

📝 **Registrar:** `comandosRejeitados` final e se o CSP causou algum bloqueio no front.

---

## 5.1. Bloco 4 — Stretch goal (opcional): broker remoto HiveMQ Cloud

⚠️ **Não bloqueia o dia.** Só executar se os Blocos 0–3 fecharem com folga de tempo, pois a esteira B ainda não está montada.

**Pré-condição:** Blocos 1 e 2 ✅ (sistema estável no broker local).

1. Criar cluster gratuito em [cloud.hivemq.com](https://cloud.hivemq.com) + credenciais (username/password)
2. **ESP32:** em `secrets.h`, preencher `SECRET_MQTT_SERVER_CLOUD` (=`<cluster>.s1.eu.hivemq.com`), `SECRET_MQTT_USER_CLOUD`, `SECRET_MQTT_PASS_CLOUD`; no `.ino` mudar `USE_TLS=true` → reupload (a porta 8883 já é fixada pelo `#if USE_TLS`)
3. **`server/.env`:** `MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com`, `MQTT_PORT=8883` + credenciais → `npm start`
4. Validar:
   - [ ] ESP32 conecta ao broker remoto via TLS (`[MQTT] Conectado!`)
   - [ ] Servidor Node conecta ao broker remoto
   - [ ] Dashboard reflete pedido de peça A end-to-end pela nuvem
   - [ ] LWT continua funcionando (desligar ESP32 → gateway offline)
5. Ao final, reverter para `USE_TLS=false` (broker local) se a bancada continuar em uso hoje

📝 **Se NÃO executado hoje:** manter registrado como Teste 6 pendente em [`plano_de_testes.md`](../plano_de_testes.md).

---

## 6. Plano B — progresso garantido em software (se o hardware travar)

1. `start_services.bat` (broker + probe + server)
2. `cd simulator && npm start` — publica nos mesmos tópicos `dataflow/...`
3. Dashboard em `http://localhost:3000` → revalidar sincronismo de estoque e histórico no modo virtual

> Mesmo com hardware OK, rodar ao menos uma vez como evidência formal do card #7.

> ⚠️ Nota: Migração para broker remoto (HiveMQ Cloud) está formalmente prevista como Teste 6 (`plano_de_testes.md`) e rodada futura (Bloco 4 opcional neste roteiro).
---

## 7. Próximos passos após o marco (rumo à continuidade do projeto)

Pontos **cruciais** para prosseguir depois de estabilizar a esteira A:

1. **Esteira B (Teste 5):** montar hardware adicional (+1 IRF520, +2 TCRT5000: topo B + junção J2 no pino D2). Sketches em `test/esteira_peca_b/`.
2. **Incorporar B ao sketch principal:** o protocolo já suporta as 3 peças — a mudança é essencialmente pinagem + replicação das funções da esteira A. O sketch principal **já tem** MOTOR_B (pino 10) e J2 (pino 2) mapeados.
3. **Esteira C + separador:** o código do separador (roda giratória) está comentado no sketch principal — decidir implementação futura.
4. **Fechar o Teste 3 puro** (MQTT Box isolado) para evidência formal, hoje só validado via Dashboard.
5. **Broker remoto (HiveMQ Cloud — Teste 6):** hoje o sistema opera com Mosquitto local. Se não executado como stretch goal (Bloco 4), formalizar como rodada dedicada assim que a esteira A estiver 100% estável — isola a variável rede/TLS da lógica de FSM.

---

## 8. Documentação e board

- [ ] Registrar resultados na tabela abaixo
- [ ] Transferir aprovados/reprovados para o [`plano_de_testes.md`](../plano_de_testes.md)
- [ ] **Atualizar os cards do GitHub Projects:**
  - **#11** Sincronismo estoque LCD/Dashboard → Done após Bloco 2
  - **#12** Timeout 12 s → Done após Bloco 1
  - **#10** Teste 5 (esteira B) → continua Blocked (aguarda hardware)
  - Novo card: Robustez/LWT esteira A → conforme Bloco 3

---

## 9. Registro de resultados do dia (preencher durante os testes)

| Etapa | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| 0 — Pré-voo (infra + reupload) | ⬜ | IP do PC hoje: ____ · rede: ____ |
| 1 — Timeout 12 s (travessia real) | ⬜ | Tempo real de travessia: ____ s |
| 1 — Timeout forçado → ERRO/RESET | ⬜ | |
| 2 — Sync inicial (boot do Uno) | ⬜ | LCD == Dashboard no boot? ____ |
| 2 — Sync após entrega | ⬜ | |
| 2 — Sync após ERRO + RESET | ⬜ | |
| 2 — Estresse 5 pedidos | ⬜ | LCD final: ____ · Dashboard final: ____ |
| 3 — FSM ocupada (retorno `ocupado`) / peça indisponível | ⬜ | |
| 3 — LWT gateway offline/online (reconecta sozinho) | ⬜ | |
| 3 — Reconexão do broker (retained do gateway intacto) | ⬜ | |
| 3.A — Robustez de comandos (`peca_invalida`/`comando_desconhecido`/JSON malformado) | ⬜ | Retornos observados: ____ |
| 3.B — Estoque retained + reconciliação (LCD==Dash==broker) | ⬜ | Valores: ____ |
| 3.C — Reconexão Wi-Fi não-bloqueante (loop segue vivo) | ⬜ | Tempo até reconectar: ____ s |
| 3.D — Node: validação/rate limit/health 503/helmet/CORS/shutdown | ⬜ | `comandosRejeitados`: ____ |
| 4 — Broker remoto HiveMQ (opcional) | ⬜ | Executado ou adiado para Teste 6 futuro? ____ |
| Plano B (simulador) | ⬜ | |

> Ao final: transferir resultados para o [`plano_de_testes.md`](../plano_de_testes.md) e atualizar os cards do board.

