# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adota versionamento por marcos de bancada (ainda sem releases semânticas
publicadas — o protótipo está em desenvolvimento ativo).

Convenção de seções: `Adicionado`, `Alterado`, `Corrigido`, `Segurança`, `Removido`.

---

## [Não publicado]

### Adicionado

- **Frontend — Redesign do Painel Anunciador Industrial (02/09/2026)**
  - Painel anunciador com indicadores visuais IEC-60073 (LED status: verde/amarelo/vermelho).
  - Tipografia IBM Plex Sans (UI) e IBM Plex Mono (readouts de estado).
  - Roteamento hash de vistas: `#/` (painel principal) e `#/status` (histórico/equipamentos).
  - Depth panorâmico CSS-only (sem three.js) com parallax controller.
  - Single-row layout para o painel principal: Estado | Diagrama | Controle em uma banda horizontal.
  - Deduplicação de eventos em reconexão Socket.IO.
  - Alertas de estoque graduados: aviso (=3), alerta (=2), crítico (≤1).
  - Responsividade testada: 1920x1080, 1366x768, ≤720px.
  - **PR #19 mergeada**: `feat/dashboard-split-status-page` (commits e2669d7, 346f5b7, 55c82cb, 886cd04, 741e211).

### Corrigido

- **Comando inválido (ex.: `CMD:PECA:Z`) aparecia como "Comando enviado" no
  histórico do Dashboard, mesmo sendo rejeitado pelo gateway ESP32** *(03/09/2026)*.

  **Sintoma:** ao enviar um comando com peça inválida diretamente via MQTT Box
  (`{"acao":"solicitar_peca","peca":"Z"}` em `dataflow/comandos/sub`), o gateway
  ESP32 corretamente rejeitava o comando (`status: "rejeitado"`, `motivo:
  "peca_invalida"`) e publicava a rejeição em `dataflow/comandos/pub`. No
  entanto, o servidor Node.js emitia *todos* os payloads de `cmdPub` como evento
  `comando` para o frontend, que os adicionava ao histórico como
  `"comando_enviado"` — sem distinguir entre `status: "encaminhado"` e `status:
  "rejeitado"`. Adicionalmente, a função `solicitarPeca()` no frontend adicionava
  o registro ao histórico *antes* de o servidor confirmar ou rejeitar.

  **Causa-raiz (2 camadas):**
  1. `server/server.js` — handler `TOPICS.cmdPub`: emitia `io.emit('comando', msgJson)`
     sem checar `msgJson.status`, tratando rejeições do ESP32 idênticas a confirmações.
  2. `frontend/js/app.js` — `solicitarPeca()` e `resetSistema()`: chamavam
     `adicionarHistorico('comando_enviado', ...)` imediatamente ao clicar o botão,
     *antes* de qualquer validação. Além disso, o handler `socket.on('comando')`
     não inspecionava `data.status` para distinguir `encaminhado` de `rejeitado`.

  **Correção:**
  - `server/server.js`: o handler de `cmdPub` agora verifica `msgJson.status`.
    Se `"rejeitado"`, emite `comando_erro` (não `comando`) com `motivo` e `peca`.
  - `frontend/js/app.js`: `solicitarPeca()` e `resetSistema()` não adicionam mais
    registro ao histórico prematuramente — o registro é criado somente quando o
    servidor emite `comando` (confirmação) ou `comando_erro` (rejeição/erro).
  - `frontend/js/app.js`: o handler `comando` agora verifica `data.status`:
    se `"rejeitado"`, exibe como erro (borda vermelha) em vez de "comando enviado".
  - `frontend/js/app.js`: o handler `comando_erro` agora inclui `data.peca` (se
    disponível) na mensagem, melhorando a rastreabilidade do erro.

  **Comportamento esperado agora:**
  - Dashboard: peças A/B/C clicadas → "Comando enviado" aparece SOMENTE após
    confirmação do servidor/ESP32.
  - MQTT Box `peca: "Z"` → Histórico mostra "Erro: peca_invalida — Peça Z" com
    borda vermelha, NÃO "Comando enviado".
  - Servidor rejeita peça inválida no Socket.IO → `comando_erro` sem chegar ao MQTT.
  - `simulator/server.js`: o evento `pedido` passou a ser registrado somente apos a validacao de estoque (antes era emitido antes, seguido de `erro` quando a peca estava sem estoque) - alinhando o simulador ao fix aplicado no servidor real.



- **Dashboard travado em "ESP32 Offline" mesmo com o gateway online** — *regressão
  introduzida em `9a7ce25`*.

  **Sintoma:** ao abrir o Dashboard, o badge do gateway ficava permanentemente
  vermelho ("ESP32 Offline"), mesmo com o ESP32 conectado, publicando telemetria
  normalmente e com o `mqtt_probe` recebendo os JSONs. Um `F5` não resolvia.

  **Causa-raiz:** colisão de **mensagens retidas (retained)** no tópico
  `dataflow/status`. Tanto o ESP32 (via LWT + publish `online`) quanto o servidor
  Node publicavam status **retained no mesmo tópico**. Como o broker guarda apenas
  **uma** mensagem retida por tópico, quem publicasse por último "vencia". No
  `start_services.bat` o servidor sobe **depois** do ESP32, então o retained do
  servidor (`{"type":"server","status":"online"}`) sobrescrevia o do gateway
  (`{"type":"gateway","status":"online"}`). Ao conectar, o Dashboard recebia apenas
  o retained do *server*, que cai no ramo `else` do roteamento — o evento
  `io.emit('gateway', ...)` nunca era disparado no carregamento inicial.

  **Correção:** separação de tópicos seguindo a convenção hierárquica MQTT:
  - `dataflow/status` → **exclusivo do gateway ESP32** (telemetria da FSM + presença via LWT)
  - `dataflow/status/server` → **exclusivo do servidor Node** (presença + LWT), configurável
    por `MQTT_TOPIC_STATUS_SERVER`

  O servidor continua **inscrito** em `dataflow/status` (apenas consome, não publica).
  Os três pontos que publicavam o status do server (LWT `will`, publish no `connect`
  e o `shutdown` gracioso) passaram a usar o novo tópico.

  **Validação em bancada:** com o broker real, confirmado que os dois retained passam
  a coexistir sem sobrescrita, que o log do servidor exibe `[WS →] Gateway ESP32: online`
  ao receber o retained do gateway, e que `GET /api/status` retorna `"gateway":"online"`.

  > **Limpeza necessária uma única vez:** brokers que já rodaram a versão com o bug
  > guardam um retained "envenenado" em `dataflow/status`. Limpe com:
  > ```
  > mosquitto_pub -h localhost -t dataflow/status -r -q 1 -n
  > ```
  > (publicar payload vazio com `-r` apaga a mensagem retida do tópico).

- **Dashboard AINDA em "ESP32 Offline" após a correção acima — segunda causa: broker
  MQTT duplicado / rede particionada.**

  Mesmo com a separação de tópicos, o badge continuava vermelho. O diagnóstico ao vivo
  (`Get-NetTCPConnection` na porta 1883) revelou **dois processos `mosquitto.exe`**
  escutando simultaneamente:
  - O **serviço automático do Windows** (`StartType: Automatic`), iniciado **sem** o
    `mosquitto.conf`, tomava a 1883 **apenas em loopback** (`127.0.0.1` + `::1`).
  - O broker do `start_services.bat` (com `-c mosquitto.conf`) subia em `0.0.0.0`
    (toda a rede) — sem conflito, porque o primeiro só ocupava o loopback.

  Com isso a rede MQTT ficava **particionada**:
  - O **servidor Node** conectava em `mqtt://localhost` → resolvido para `::1` (IPv6) →
    caía no broker **loopback-only**.
  - O **ESP32** conectava no IP `192.168.x.x` → caía no broker **`0.0.0.0`**.

  Os dois publicavam/assinavam em brokers **diferentes**: o retained
  `{"type":"gateway","status":"online"}` do ESP32 nunca chegava ao servidor,
  `estadoAtual.gateway` ficava `{}` e o `estado_inicial` enviado ao dashboard não
  trazia o gateway — o badge permanecia no estado padrão do HTML ("ESP32 Offline").

  **Correção:** desabilitar o serviço automático do Windows para que exista **um único
  broker** (o do `start_services.bat`):
  ```
  net stop mosquitto
  sc config mosquitto start= demand
  ```
  **Confirmação:** após a correção, `Get-NetTCPConnection` mostrou server, `mqtt_probe`
  e ESP32 todos conectados ao **mesmo** PID de broker, e `GET /api/status` passou a
  retornar `"gateway":"online"` com contadores crescentes em `dataflow/status`.

  **Endurecimentos aplicados para evitar recorrência:**
  - `server/.env` e `.env.example`: `MQTT_BROKER_URL` passou de `mqtt://localhost` para
    `mqtt://127.0.0.1` (IPv4 explícito) — remove a ambiguidade `localhost`→`::1` que
    ajudou a mascarar a partição.
  - `start_services.bat`: **checagem de pré-voo** — se a porta 1883 já estiver em uso
    por outro processo, o script aborta com instruções em vez de subir um segundo broker
    silenciosamente.
  - `checklist_pre_teste_rede_infra.md`: passo "garantir um único listener na 1883".

### Alterado

- `server/.env.example`: documentada a nova variável `MQTT_TOPIC_STATUS_SERVER`
  (padrão `dataflow/status/server`).
- **Documentação de credenciais atualizada** para o fluxo `secrets.h` introduzido em
  `35fe3d5`. Os textos ainda mandavam editar SSID/senha dentro do `.ino`:
  - `README.md` — passo "Configurar o ESP32"
  - `docs/arquitetura_mqtt.md` — "Como Rodar", seção HiveMQ Cloud e árvore de diretórios
  - `docs/testes/validações/checklist_pre_teste_rede_infra.md` — seções 2, 4 e 7
  - `docs/testes/roteiros/semana_03_27-28_agosto.md` — novo Bloco 0.a (setup do `secrets.h`)
- `docs/arquitetura_mqtt.md`: tabela de tópicos agora identifica quais são **retained**
  e qual componente é o **dono** de cada tópico de status.
- `docs/testes/roteiros/semana_03_27-28_agosto.md`: título corrigido (estava
  "26/08/2026" em um arquivo de 27/08) e roteiro reescrito para cobrir as mudanças
  de `35fe3d5` e `9a7ce25` — novos blocos **3.A** (rejeições explícitas de comando),
  **3.B** (estoque retained/reconciliação), **3.C** (reconexão Wi-Fi não-bloqueante)
  e **3.D** (validação, rate limit, health check 503, helmet/CSP, CORS e shutdown).

---

## [35fe3d5] — Firmware: segredos externos e loop não-bloqueante

### Segurança

- Credenciais de Wi-Fi e MQTT movidas de `gateway_mqtt.ino` para
  `esp32/gateway_mqtt/secrets.h`, ignorado pelo `.gitignore`, com modelo versionado
  em `secrets.h.example`.

  > ⚠️ **Atenção:** as credenciais antigas **permanecem no histórico do Git**. Trate a
  > senha de Wi-Fi anterior como comprometida e **troque-a**. Para expurgar o histórico,
  > use `git filter-repo` ou BFG — em acordo com o time, pois reescreve os hashes.

### Alterado

- **Reconexão Wi-Fi não-bloqueante:** `manterWiFi()` virou máquina de estados; o `loop()`
  não trava mais durante quedas de rede, mantendo `mqtt.loop()` e a leitura da Serial2 vivas.
- **Pausa pós-entrega não-bloqueante** (substitui `delay()`).
- `dataflow/estoque` passou a ser publicado como **retained**, permitindo que clientes
  que conectam depois recebam o último estoque conhecido sem esperar uma nova entrega.

### Adicionado

- Rejeições **explícitas** de comando encaminhadas ao Arduino: `peca_invalida`,
  `ocupado` e `comando_desconhecido` (antes, comandos inválidos eram descartados
  em silêncio, dificultando o diagnóstico em bancada).

---

## [9a7ce25] — Servidor: segurança, resiliência e telemetria

### Segurança

- `helmet` + **CSP** aplicados ao Express.
- **CORS restrito** por `ALLOWED_ORIGIN` (lista separada por vírgulas) no Express e no Socket.IO.
- **Rate limit por socket** para comandos (`COMANDO_INTERVALO_MS`, padrão 500 ms).
- **Validação de entrada** dos comandos vindos do front-end (apenas peças `A`, `B`, `C`).

### Adicionado

- **QoS 1** em publicações e assinaturas MQTT.
- **LWT do próprio servidor** + publicação de presença retida.
- **Health check** `/api/status` enriquecido (estado do broker, gateway, clientes WebSocket,
  métricas e uptime), respondendo **HTTP 503** quando o broker está indisponível.
- **Shutdown gracioso** em `SIGINT`/`SIGTERM`, publicando `offline` antes de encerrar.

> ⚠️ Esta entrega introduziu a regressão do status do gateway corrigida na seção
> **[Não publicado] → Corrigido** acima.
>
> 📝 Nota de processo: a mensagem deste commit ficou poluída com o texto de um prompt
> de ferramenta. Ver as convenções em [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## [b2ec47d] — Timeout de entrega e sincronismo de estoque

### Corrigido

- `TIMEOUT_ENTREGA` ajustado de **8000 ms → 12000 ms**: a peça chegava ao sensor de
  junção, mas não tinha tempo de sair fisicamente da esteira secundária, gerando
  falsos positivos de `ERRO`.
- **Dessincronismo de estoque LCD × Dashboard** (LCD mostrava 3, Dashboard mostrava 0):
  `publicarEstoque()` passou a ser chamado no `setup()` e no tratamento de `CMD:RESET`.
