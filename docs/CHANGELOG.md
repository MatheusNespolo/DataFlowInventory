# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adota versionamento por marcos de bancada (ainda sem releases semânticas
publicadas — o protótipo está em desenvolvimento ativo).

Convenção de seções: `Adicionado`, `Alterado`, `Corrigido`, `Segurança`, `Removido`.

---

## [Não publicado]

### Adicionado

- **Diagrama Elétrico Consolidado — Publicação Formal (23/09/2026)**
  - Diagrama elétrico do protótipo finalizado e publicado em:
    - `docs/fluxogramas/Diagrama elétrico.png` — renderização PNG (visualização direta no GitHub)
    - `docs/fluxogramas/Diagrama elétrico.pptx` — fonte editável (PowerPoint) para revisões futuras
  - Cobre esquema completo com todos os subsistemas:
    - **Arduino Uno** (pinos PWM 9/10/11 → IRF520, A0–A3/2/4 → sensores TCRT5000, A4/A5 → LCD I²C, pinos 5–8 → ULN2003)
    - **ESP32** (TX1/RX0 → divisor 1 kΩ/2 kΩ → Arduino UART; pinos 16/17 = bridge serial)
    - **3× drivers IRF520** — alimentação 12 V + sinal PWM 5 V por esteira (A, B, C)
    - **6× sensores TCRT5000** — entrada e junção de cada esteira
    - **LCD 16×2 I²C**, motor de passo **28BYJ-48 + ULN2003**, fonte 12 V/5 A
  - Referências cruzadas adicionadas em: `README.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATION_GUIDE.md`, `docs/cards_comments/card_bom_bill_of_materials.md`, `docs/cards_comments/card_deployment_guide.md`
  - **Gap resolvido:** "Diagrama elétrico não publicado" (identificado em `semana_06_22-26_setembro.md` §7.2)
  - Commits: `0f0782c`, `8d191fa`

- **Avanços de Bancada — Semana 6, Dia 22/09/2026**
  - **Soldagem das placas de passagem (IRF520 B/C) concluída** com sucesso
  - **Teste de continuidade elétrica** (multímetro) aprovado para ambos os módulos:
    - Continuidade VCC/GND verificada ✅
    - Continuidade GND driver ↔ GND fonte ✅
    - Resistência de ponte > 100 kΩ (motor desconectado) ✅
  - **Montagem da base de MDF** (≈60×40 cm) quase concluída — estrutura, fixação de esteiras e motores realizados; resta o acabamento visual
  - **Ajuste mecânico de esteira identificado:** costura da fita das esteiras apresenta ponto de atrito com a estrutura MDF, gerando eventual erro de processo → solução identificada (desbaste local) **reagendada para 25–27/09**, aguardando janela de desmontagem
  - **Teste de funcionamento completo** do sistema com os novos elementos (IRF520 B/C soldados) agendado para **23/09**

- **Roteiro de Testes — Semana 6 (22–26/09/2026)**
  - Documento completo em `docs/testes/roteiros/semana_06_22-26_setembro.md` com 5 blocos de trabalho:
    - **Bloco 1:** Verificação de soldagem dos módulos IRF520 (B/C) — testes elétricos com multímetro, validação de sinal PWM e testes funcionais
    - **Bloco 2:** Diagrama elétrico consolidado — levantamento de esquema, documentação CAD (unifilar + blocos), especificação de proteção (fusíveis/diodos)
    - **Bloco 3:** Montagem mecânica — base MDF 60×40 cm, fixação de esteiras/motores/sensores, organização de fiação, acabamento visual
    - **Bloco 4:** Validação integrada (burn-in test) — 7 cenários de stress test (sequência simples, carga concorrente, estoque vazio, reset durante operação, reconexão de rede, stress alta frequência, telemetria remota HiveMQ+CX9240)
    - **Bloco 5:** Documentação e gaps — mapeamento de pendências (BOM, deployment guide, testes E2E automatizados, firmware versioning)
  - Cronograma estruturado 22–26/09 com distribuição de tarefas por dia (manhã/tarde)
  - Identificados **7 gaps prioritários** com classificação de impacto (Alta/Média/Baixa): BOM ausente, diagrama elétrico não publicado, deployment guide ausente, firmware sem versioning, testes E2E manuais, documentação inline mínima, performance telemetria ausente
  - Sugestão de 5 cards para próxima sprint: BOM, Deployment Guide, Testes E2E Automatizados, Firmware Versioning, Telemetria Histórica (Grafana/InfluxDB)

### Adicionado

- **Hardening CI/CD — Upgrade Node.js v22 + Otimizações (17/09/2026)**
  - **NPM Audit:** Threshold alterado de `moderate` para `critical` (foco em vulnerabilidades reais CVSS ≥ 7.0)
  - **Node.js LTS:** Upgrade de v18 para v22 (v20 EOL em 04/2026; v22 suportado até 04/2028)
  - **Otimizações:**
    - npm caching em workflows (~80% mais rápido em downloads)
    - Arduino cache para cores/bibliotecas (~60% redução de tempo)
    - TruffleHog simplificado com `--only-verified`
  - **Documentação:** Nova seção "Estratégia: Gerenciamento de Vulnerabilidades npm" em `docs/CI-CD.md`
  - **Compatibilidade:** Express 4.22+, Socket.IO 4+, mqtt 5.0+ validados em Node.js v22.23.2

- **Historiador Beckhoff CX9240 — TwinCAT 3 + SQLite Local (15/09/2026)**
  - Projeto TwinCAT 3 (`CX9240_DataFlowInventory`) comissionado e testado com sucesso no CLP Beckhoff CX9240 rodando RT Linux ARM64.
  - Implementada assinatura dos tópicos `dataflow/estoque` e `dataflow/eventos` via **TF6701 IoT Communication**.
  - Persistência transacional em banco **SQLite local (`/var/lib/dfi/historian.db`)** com suporte a WAL mode via **TF6420 Database Server** em SQL Expert Mode, gravando nas tabelas `estoque_hist` e `eventos_hist`.
  - Integração validada de ponta a ponta contra o simulador `DataFlowInventory` (`MQTT_PUBLISH=true`), confirmando armazenamento fiel de `pecaA`, `pecaB`, `pecaC` e timestamps sincronizados.

- **Bancada de Hardware — Avanços Mecânicos e Replanejamento de Solda (15/09/2026)**
  - Realizados avanços estruturais na fixação, suporte e alinhamento mecânico das esteiras B e C na bancada de testes.
  - Testes elétricos e soldagem final dos módulos IRF520 (B/C) reprogramados para a rodada seguinte devido à restrição de tempo no dia 15/09.

- **CI/CD + Automação Multiplataforma — Sprint 5 (14–15/09/2026)**
  - **GitHub Actions** `.github/workflows/lint-and-security.yaml` criado com 4 jobs:
    - `lint-javascript`: ESLint em `server/` e `simulator/`
    - `secret-detection`: truffleHog detecta credenciais versionadas (`.env`, `secrets.h`)
    - `npm-audit`: npm audit em `server/`, `simulator/` e `test/mqtt_probe/`
    - `arduino-compile`: arduino-cli compila 4 sketches (Uno principal, ESP32 gateway, teste AB)
  - **Scripts de setup e validação multiplataforma** em `scripts/`:
    - `setup.sh` / `setup.ps1` — onboarding automatizado (instala deps, cria `.env`/`secrets.h`, valida segredos)
    - `validate-env.sh` / `validate-env.ps1` — detecta arquivos sensíveis em staging (segredos, `.env`)
    - `precommit-checks.sh` / `precommit-checks.ps1` — hook Git pré-commit (segredos + sintaxe JS)
  - **Limpeza do repositório:**
    - Remoção de `node_modules` rastreados acidentalmente no índice git (`test/mqtt_probe/node_modules/` e `simulator/node_modules/`) e reforço no `.gitignore`.
  - **Documentação consolidada:**
    - `docs/ARCHITECTURE.md` — **novo arquivo unificado** (substitui `arquitetura_mqtt.md` como referência técnica central; arquivo original mantido para histórico)
    - `docs/CI-CD.md` — **novo arquivo** com pipelines, workflows, troubleshooting e roadmap de testes automatizados
    - `docs/INTEGRATION_GUIDE.md` — **novo arquivo** com passo a passo para integração Beckhoff CX9240 (incluindo DDL SQL e especificação TwinCAT 3) + Separador (roda de separação)
    - `simulator/.env.example` — **novo arquivo** (similar ao `server/.env.example`; documenta variáveis MQTT para modo Beckhoff)
    - `docs/cards_comments/` — **nova pasta** com comentários prontos para aplicar nos cards do GitHub Projects (CI/CD, Separador, Beckhoff)
  - **Validação dos scripts concluída (15/09/2026):** todos os itens S1 a S6 do Bloco 5 validados com sucesso em ambientes Linux e Windows.

- **Simulador — Publicação MQTT opcional para integração Beckhoff CX9240 (15/09/2026)**
  - `simulator/server.js`: novo modo opcional (`MQTT_PUBLISH=true`, desativado por padrão) que
    publica o estoque no broker MQTT via cliente `mqtt` (nova dependência `^5.10.0`).
  - Tópico `dataflow/estoque`, payload `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}`,
    QoS 1 e **retained** — publica a cada mudança de estoque e imediatamente ao conectar,
    reproduzindo o mesmo contrato usado pelo gateway ESP32 real.
  - Validado localmente contra broker Mosquitto: mensagem confirmada como retained via
    `mosquitto_sub`. Publicação é não-bloqueante (falhas de conexão MQTT não afetam o
    funcionamento offline padrão via Socket.IO).
  - Variáveis de ambiente: `MQTT_PUBLISH`, `MQTT_BROKER_URL`, `MQTT_PORT`, `MQTT_USER`,
    `MQTT_PASS`, `MQTT_TOPIC_ESTOQUE`. Script `npm run start:mqtt` adicionado.
  - Documentação: nova seção "Integração Beckhoff CX9240" em `docs/arquitetura_mqtt.md`;
    `simulator/README.md` atualizado; critério de aceite do card de melhoria (lado simulador)
    marcado como concluído em `docs/testes/plano_de_testes.md`.
  - Persistência em banco (MySQL/MariaDB/PostgreSQL) e o programa do lado Beckhoff CX9240
    continuam fora do escopo — a cargo de outro agente, a validar em bancada própria.

- **Documentação — Reorganização dos roteiros de teste (03/09/2026)**
  - Consolidação de 8 arquivos diários em 4 arquivos semanais (`semana_01` a `semana_04`).
  - Atualização de todas as referências internas em `README.md`, `arquitetura_mqtt.md`,
    `board_github_projects.md`, `checklist_pre_teste_rede_infra.md` e `validações/README.md`.
  - READMEs adicionados em `simulator/`, `server/` e `frontend/` para melhor navegação.

- **Documentação — Reorganização do roteiro da Semana 4 (08/09/2026)**
  - Roteiro `semana_04_01-03_setembro.md` renomeado para `semana_04_08-12_setembro.md`,
    com início em 08/09 (hardware das esteiras B/C chegou no fim de semana).
  - Prioridade da semana realinhada: integração das esteiras **B e C** (Teste 5 completo
    A+B+C), desbloqueando o card #9.
  - **HiveMQ Cloud (Teste 6)** rebaixado a **subtarefa** da semana — execução condicionada
    a folga de tempo; cards #15/#16 concluídos e #17 (E2E remoto) pendente.
  - Referências ao nome antigo atualizadas em `board_github_projects.md` e
    `semana_03_27-28_agosto.md`.

- **Melhoria planejada — Integração do Simulador com o PC industrial Beckhoff CX9240 (08/09/2026)**
  - Proposta de melhoria futura para **persistência dos dados de estoque em banco
    MySQL/PostgreSQL** via comunicação MQTT entre o simulador e o PC Beckhoff CX9240.
  - Contrato proposto (tópicos/payload) documentado no roteiro
    `semana_04_08-12_setembro.md` (seção 7), a ser validado de forma cruzada com o agente
    responsável pelo programa do CX9240, que será desenvolvido por outro agente.
  - Validação prevista para **bancada de testes própria** (desacoplada da esteira A);
    a implementação completa fica para sprints/agentes futuros.
  - Sugerida a criação de card de melhoria (Template A / backlog) para rastreabilidade no
    GitHub Projects.

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
