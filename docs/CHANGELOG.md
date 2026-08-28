# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adota versionamento por marcos de bancada (ainda sem releases semânticas
publicadas — o protótipo está em desenvolvimento ativo).

Convenção de seções: `Adicionado`, `Alterado`, `Corrigido`, `Segurança`, `Removido`.

---

## [Não publicado]

### Corrigido

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

### Alterado

- `server/.env.example`: documentada a nova variável `MQTT_TOPIC_STATUS_SERVER`
  (padrão `dataflow/status/server`).
- **Documentação de credenciais atualizada** para o fluxo `secrets.h` introduzido em
  `35fe3d5`. Os textos ainda mandavam editar SSID/senha dentro do `.ino`:
  - `README.md` — passo "Configurar o ESP32"
  - `docs/arquitetura_mqtt.md` — "Como Rodar", seção HiveMQ Cloud e árvore de diretórios
  - `docs/testes/validações/checklist_pre_teste_rede_infra.md` — seções 2, 4 e 7
  - `docs/testes/roteiros/roteiro_teste_2026-08-27.md` — novo Bloco 0.a (setup do `secrets.h`)
- `docs/arquitetura_mqtt.md`: tabela de tópicos agora identifica quais são **retained**
  e qual componente é o **dono** de cada tópico de status.
- `docs/testes/roteiros/roteiro_teste_2026-08-27.md`: título corrigido (estava
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
