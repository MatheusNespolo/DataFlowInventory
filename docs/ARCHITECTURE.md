# Arquitetura Unificada — Data Flow Inventory

> **Documento consolidado de referência técnica**  
> Data: 14/09/2026 · Revisado em 02/10/2026 · Versão: 2.1  
> Fonte única de referência técnica. Absorveu o conteúdo de `arquitetura_mqtt.md` e `fluxogramas/fluxograma_funcionamento.md` (removidos em 02/10/2026; o histórico permanece no git). Os diagramas PNG continuam em `docs/fluxogramas/`.

---

## 1. Visão Geral do Sistema

O **Data Flow Inventory** é um protótipo IoT de **intralogística automatizada em escala reduzida**, que simula um centro de distribuição com:

- **3 esteiras transportadoras secundárias** (A, B, C) + 1 principal (direto na fonte)
- **6 sensores infravermelhos** (TCRT5000) para detecção de peças
- **Roda giratória com 3 compartimentos** (motor de passo 28BYJ-48) para separação final
- **Controle centralizado via dashboard web em tempo real**
- **Comunicação bidirecional Arduino ↔ ESP32 ↔ Broker MQTT ↔ Server Node.js ↔ Frontend**

**Setor:** Indústria 4.0 · Automação Industrial · Logística  
**Instituição:** SENAI São Caetano do Sul — Engenharia de Controle e Automação  
**Ano:** 2026

---

## 2. Arquitetura de Comunicação

### 2.1 Camadas (Simplificado)

```
Arduino Uno (FSM) ←→ ESP32 (Gateway MQTT) ←→ Broker ←→ Server Node.js ←→ Dashboard
     ↑                                                            ↑
     └────────────── Simulador (Modo Offline) ─────────────────┘
```

### 2.2 Tópicos MQTT Principais

| Tópico | Direção | Retained | QoS | Descrição |
|--------|---------|----------|-----|-----------|
| `dataflow/status` | ESP32 → | ✅ | 1 | Gateway online/offline (LWT) — **exclusivo gateway** |
| `dataflow/status/server` | Server → | ✅ | 1 | Server online/offline — **não contamina dataflow/status** |
| `dataflow/estoque` | Arduino → | ✅ | 1 | `{pecaA: N, pecaB: N, pecaC: N}` — sincronismo LCD/Dashboard |
| `dataflow/eventos` | Arduino → | ❌ | 1 | Histórico de entregas |
| `dataflow/comandos/sub` | Server → | ❌ | 1 | Comandos do dashboard → Arduino |
| `dataflow/comandos/pub` | ESP32 → | ❌ | 1 | Confirmação de comandos encaminhados (`encaminhado`/`rejeitado`) |
| `dataflow/sensores` | ESP32 → | ❌ | — | Leituras dos 6 sensores IR |
| `dataflow/esteiras` | ESP32 → | ❌ | — | Estado ligada/desligada de cada esteira |

`dataflow/status` leva o estado da FSM/uptime **e** a presença do gateway (`{"type":"gateway",...}`, retained via LWT). Os nomes são configuráveis no `server/.env` e nas constantes `TOPICO_*` do `gateway_mqtt.ino`; Arduino/ESP32 e servidor devem usar os **mesmos** nomes.

> ⚠️ **Separação de status:** `dataflow/status` é **exclusivo do gateway ESP32**; o servidor publica em `dataflow/status/server`. Publicar o status do servidor no tópico do gateway sobrescreveria o retained e travaria o dashboard em "ESP32 Offline" (regressão histórica; ver `CHANGELOG.md`).

### 2.3 Fluxos de comunicação

**Dados (Arduino → Dashboard):** o Uno emite JSON pela Serial; o ESP32 lê linha a linha (não bloqueante) e publica no tópico conforme o campo `type`; o servidor recebe a mensagem MQTT e a retransmite por `io.emit(...)`; o frontend atualiza a interface.

**Comando (Dashboard → Arduino):** o frontend faz `socket.emit('solicitar_peca', {peca:'A'})`; o servidor publica em `dataflow/comandos/sub`; o ESP32 traduz para texto (`CMD:PECA:A`) na Serial2; o Uno inicia a FSM (`VERIFICANDO_ESTOQUE`); o ESP32 publica a confirmação em `dataflow/comandos/pub`.

Exemplo de comando publicado pelo servidor:

```json
{"acao":"solicitar_peca","peca":"A","origem":"frontend","clienteId":"<socket_id>"}
```

### 2.4 Formatos de mensagem

**Arduino → ESP32 (Serial JSON, 9600 baud):**

```json
{"type":"status","estado":"ENTREGANDO_PECA","pecaSolicitada":1,"uptime":3600}
{"type":"estoque","pecaA":4,"pecaB":5,"pecaC":5}
{"type":"sensores","topo":{"A":1,"B":0,"C":1},"juncao":{"J1":0,"J2":0,"J3":0}}
{"type":"evento","evento":"entrega","peca":"A","estoqueA":4,"estoqueB":5,"estoqueC":5}
{"type":"evento","evento":"erro","tipo":"timeout","peca":"B"}
{"type":"esteiras","principal":1,"secA":0,"secB":1,"secC":0}
```

Linhas que não são JSON (logs de debug do Arduino) só aparecem no monitor serial do ESP32.

**ESP32 → Arduino (Serial texto):** `CMD:PECA:A`, `CMD:PECA:B`, `CMD:PECA:C`, `CMD:RESET`.

**Frontend → Servidor (Socket.IO):** `socket.emit('solicitar_peca', { peca: 'A' })` e `socket.emit('reset_sistema')`.

### 2.5 Broker e segurança

| Opção | Uso | Detalhes |
|---|---|---|
| **Mosquitto local** | bancada/desenvolvimento | porta 1883, sem TLS, rede confiável; passo a passo e firewall em `docs/broker_local_mosquitto.md` |
| **HiveMQ Cloud** | broker remoto | TLS na porta 8883; crie as credenciais no cluster, preencha `MQTT_BROKER_URL` (`mqtts://<cluster>.s1.eu.hivemq.com`), `MQTT_PORT`, `MQTT_USERNAME` e `MQTT_PASSWORD` em `server/.env` e, no ESP32, `SECRET_MQTT_*_CLOUD` em `secrets.h` com `USE_TLS=true` |

- **Credenciais** ficam só no `server/.env` e no `secrets.h` (ambos não versionados), nunca no `.ino`.
- **Client ID único** por dispositivo (`dataflow-esp32-gateway`, `dataflow-node-server`).
- **Certificados:** o protótipo usa `setInsecure()` no ESP32; em produção, use `setCACert()` com a raiz do broker (ISRG Root X1 no HiveMQ Cloud).
- Alternativas de nuvem (não usadas): AWS IoT Core e Azure IoT Hub.

### 2.6 Bibliotecas

| Componente | Bibliotecas |
|---|---|
| Arduino Uno | `ArduinoJson`, `Wire`, `LiquidCrystal_I2C` |
| ESP32 | `WiFi`, `WiFiClientSecure`, `PubSubClient`, `ArduinoJson` |
| Servidor Node.js | `express`, `socket.io`, `mqtt`, `dotenv`, `prom-client` |
| Frontend | Socket.IO Client, JavaScript vanilla, CSS3 (sem build) |

---

## 3. Máquina de Estados (Arduino)

**5 estados:**
1. **AGUARDANDO_PEDIDO** → recebe comando
2. **VERIFICANDO_ESTOQUE** → verifica se há peça
3. **ACIONANDO_ESTEIRA** → liga motor, aguarda sensores
4. **ENTREGANDO_PECA** → pausa, decrementa, publica
5. **ERRO** → timeout ou rejeição (requer CMD:RESET)

**Rejeições explícitas:**
- `peca_indisponivel` — Peça não existe (ex.: "C" sem estoque)
- `ocupado` — Comando durante acionamento
- `comando_desconhecido` — Inválido

**Diagramas:**

![Máquina de estados (FSM) - Arduino Uno](fluxogramas/maquina_de_estados_fsm_arduino_uno.png)

![Fluxograma operacional — ciclo de um pedido](fluxogramas/fluxograma_operacional_ciclo_pedido.png)

**Observações:**
- **Botões físicos desabilitados:** o controle é feito exclusivamente pelo dashboard (comandos via MQTT). Os botões permanecem no hardware para eventual fallback.
- **Modo simulador:** no `simulator/`, a FSM roda em JavaScript e as etapas de MQTT/ESP32/Arduino são substituídas por temporizadores; o frontend recebe os mesmos eventos Socket.IO.
- **Separador (roda giratória):** ainda não incluído no fluxo; será adicionado quando o motor for definido e o código habilitado.

---

## 4. Hardware

| Componente | Qtd | Arduino Pins | Alimentação |
|-----------|-----|-------------|-------------|
| Motor DC (esteiras) | 3 | PWM 9, 10, 11 | 12V (via IRF520) |
| Sensor IR TCRT5000 | 6 | A0, A1, A2, A3, 2, 4 | 5V |
| LCD 16x2 I2C | 1 | SDA/SCL (A4/A5) | 5V |
| Motor de Passo 28BYJ-48 (Separador) | 1 | 5, 6, 7, 8 (ULN2003) | 5V |

**Ligação serial Uno ↔ ESP32 (9600 baud):**

| Arduino Uno | ESP32 | Observação |
|---|---|---|
| TX (pino 1) | RX2 (GPIO16) | **via divisor de tensão** 1 kΩ + 2 kΩ (Uno é 5 V, ESP32 é 3,3 V) |
| RX (pino 0) | TX2 (GPIO17) | direto (3,3 V é lido como HIGH pelo Uno) |
| GND | GND | comum obrigatório |

> ⚠ **Upload no Uno:** os pinos 0/1 são compartilhados com o USB. Desconecte o ESP32 desses pinos durante o upload.

> 📐 **Diagrama elétrico completo:** [`docs/fluxogramas/Diagrama elétrico.png`](fluxogramas/Diagrama%20el%C3%A9trico.png) — esquema unifilar com todos os componentes, pinagem, alimentação e proteções recomendadas (fusível 12V, diodos flyback nos motores DC). Fonte editável: [`Diagrama elétrico.pptx`](fluxogramas/Diagrama%20el%C3%A9trico.pptx). *(Publicado em 23/09/2026)*

---

## 5. Modos de Operação

- **Modo 1:** Hardware Real + MQTT Local (Mosquitto)
- **Modo 2:** Hardware Real + MQTT Remoto (HiveMQ Cloud / TLS 8883)
- **Modo 3:** Simulador Offline (sem hardware, Node.js)
  - Modo Beckhoff: `MQTT_PUBLISH=true npm start` (publica estoque em MQTT opcionalmente)

---

## 6. Integrações Planejadas

### 6.1 Beckhoff CX9240 (Historiador Local MQTT → SQLite)

**Status:** ✅ **CONCLUÍDO E VALIDADO (15/09/2026)**

- **Hardware/OS:** Beckhoff CX9240 rodando TwinCAT 3 em RT Linux ARM64.
- **Banco de Dados:** SQLite local (`/var/lib/dfi/historian.db`) em modo WAL, operado via TF6420 Database Server (SQL Expert Mode).
- **Assinatura MQTT:** TF6701 IoT Communication assinando `dataflow/estoque` e `dataflow/eventos` (QoS 1).
- **Tabelas:** `estoque_hist` (snapshots por alteração e amostragem periódica) e `eventos_hist` (histórico de entregas, erros e alarmes).
- **Integração:** Validado de ponta a ponta com o simulador `DataFlowInventory` (`MQTT_PUBLISH=true`).
- **Contrato do simulador:** tópico `dataflow/estoque`, payload `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}`, QoS 1, retained (o CX9240 recebe o último estoque mesmo conectando depois). A publicação é **opcional** (`MQTT_PUBLISH=true npm start` ou `npm run start:mqtt` em `simulator/`) e não bloqueia o dashboard se o broker falhar. É unidirecional: o simulador não assina nenhum tópico do Beckhoff.

  | Variável (simulador) | Padrão | Descrição |
  |---|---|---|
  | `MQTT_PUBLISH` | `false` | habilita a publicação do estoque |
  | `MQTT_BROKER_URL` / `MQTT_PORT` | `mqtt://127.0.0.1` / `1883` | broker |
  | `MQTT_USER` / `MQTT_PASS` | — | credenciais, se houver |
  | `MQTT_TOPIC_ESTOQUE` | `dataflow/estoque` | tópico de publicação |

  Passo a passo do lado Beckhoff (DDL SQL, TwinCAT 3): `docs/INTEGRATION_GUIDE.md`.

### 6.2 Separador — Roda de Separação

**Status:** Código comentado; integração em Sprint 5–6

**Hardware:** Motor 28BYJ-48 + ULN2003 (pinos 5-8)  
**Integração:** Nova etapa FSM após ENTREGANDO_PECA

---

## 7. Observabilidade

> **Escopo:** métricas de **performance e infraestrutura** do servidor Node.js. Elas **complementam** (não substituem) o historiador SQLite do Beckhoff CX9240 (§6.1), que guarda os dados de **negócio** — estoque e eventos com precisão por evento.

### 7.1 Arquitetura

`server.js` (métricas em memória) ← `GET /metrics`, consulta a cada 5 s ← **Prometheus** (Docker) → **Grafana** (Docker, dashboards em `docs/grafana/`).

- O servidor **nunca empurra dados**: se o stack estiver desligado, nada muda no `server.js`. O stack é opcional e voltado a desenvolvimento.
- `GET /metrics` fica na mesma porta do servidor (3000) e segue o padrão aberto do `/api/status`. Nenhum rótulo carrega `brokerUrl`, usuário ou senha.
- A lógica é isolada em `server/metrics.js` (fachada sobre `prom-client`, com registro próprio); o `server.js` só chama ganchos. **Todo método da fachada é à prova de falha** (`try/catch` interno), porque o servidor encerra o processo em qualquer `uncaughtException`.

### 7.2 Catálogo de métricas (prefixo `dfi_`)

Os rótulos de evento, tópico, tipo de erro, resultado, peça e esteira só recebem valores de listas permitidas (qualquer outro vira `outro`); `rota` usa o caminho registrado no Express (ou `estatico`/`nao_encontrada`), sempre um conjunto finito.

| Métrica | Tipo | Rótulos | O que mede |
|---|---|---|---|
| `dfi_mqtt_publish_ack_seconds` | histograma | `topic` | tempo do `publish` até o PUBACK do broker (QoS 1) |
| `dfi_command_confirmation_seconds` | histograma | `acao`, `status` | comando aceito → confirmação do gateway ESP32 |
| `dfi_http_request_duration_seconds` | histograma | `rota`, `metodo`, `codigo` | tempo de resposta da API (o `/metrics` não entra) |
| `dfi_events_total` | contador | `evento` | eventos do Arduino por tipo (`pedido`, `entrega`, `erro`, `inicio`) |
| `dfi_mqtt_messages_total` | contador | `topic` | mensagens MQTT recebidas (throughput) |
| `dfi_mqtt_connected` | gauge | — | 1 se conectado ao broker |
| `dfi_mqtt_uptime_seconds` | gauge | — | tempo conectado sem cair (0 se offline) |
| `dfi_mqtt_reconnects_total` | contador | — | conexões restabelecidas após uma queda (a primeira conexão não conta) |
| `dfi_mqtt_errors_total` | contador | `tipo` | erros MQTT (`conexao`, `json_invalido`, `publicacao`, `inscricao`) |
| `dfi_gateway_online` | gauge | — | 1 se o gateway ESP32 está online (LWT) |
| `dfi_gateway_offline_total` | contador | — | vezes em que o LWT do gateway foi disparado (transição online → offline) |
| `dfi_commands_total` | contador | `resultado` | comandos: `publicado`, `falha_publicacao`, `peca_invalida`, `rate_limit`, `broker_offline` |
| `dfi_command_unconfirmed_total` | contador | — | comandos sem confirmação do gateway dentro do timeout |
| `dfi_command_confirmation_orphan_total` | contador | — | confirmações do gateway sem comando pendente |
| `dfi_websocket_clients` | gauge | — | dashboards conectados por WebSocket |
| `dfi_stock_pieces` | gauge | `peca` | peças em estoque (A, B, C) |
| `dfi_conveyor_on` | gauge | `esteira` | 1 se a esteira está ligada (`principal`, `secA`, `secB`, `secC`) |

Também são expostas as métricas padrão do `prom-client` (`process_*` e `nodejs_*`: CPU, memória, atraso do event loop), que mostram o overhead do próprio servidor.

### 7.3 Como cada medição é feita

- **Publish → ack:** cronometra o callback do `publish` QoS 1 do comando.
- **Comando → confirmação:** o firmware do ESP32 confirma em `dataflow/comandos/pub` com `acao`, `peca` e `status` (`encaminhado`/`rejeitado`), **sem id de correlação** (e a rejeição nem ecoa a peça). O servidor casa por ordem de chegada (fila FIFO por `acao|peca`; sem peça, com o pendente mais antigo da ação). Comandos sem resposta em `METRICS_CONFIRMACAO_TIMEOUT_MS` (padrão 10000) contam em `dfi_command_unconfirmed_total`; confirmações sem pendente, em `dfi_command_confirmation_orphan_total`.
- **Gateway offline:** só a transição online → offline conta. O LWT retido que o servidor recebe ao reconectar não é uma queda nova.
- **Estoque:** gauge atualizado a cada mensagem MQTT de estoque (o Prometheus lê o último valor a cada scrape de 5 s). A variação exata por evento fica no SQLite do CX9240.

### 7.4 Stack e dashboards

- `docker-compose.yml` (raiz): Prometheus `v3.15.0` e Grafana OSS `12.4.3`, portas presas ao `127.0.0.1` (9090 e 3030), senha do Grafana obrigatória (`GRAFANA_ADMIN_PASSWORD` em `observability/.env`).
- Dashboards versionados em `docs/grafana/`: **Visão Geral**, **Performance** (p50/p95/p99) e **Confiabilidade**.
- Passo a passo, smoke test e problemas comuns: `observability/README.md`.

### 7.5 Limitações conhecidas

- O casamento comando → confirmação é aproximado enquanto o firmware não devolver um id de correlação.
- Percentis só existem quando há amostras na janela (sem comandos, os painéis de latência ficam vazios).
- A execução real do stack e a renderização dos painéis foram validadas em 01/10/2026; o roteiro de verificação é `scripts/observability-smoke.*`; os testes automatizados (`test/server_metrics`) não usam Docker.

## 8. Documentação Correlata

- `README.md` — Visão geral + quick start
- `docs/fluxogramas/Diagrama elétrico.png` — **[NOVO]** Esquema unifilar completo do protótipo *(23/09/2026)*
- `docs/broker_local_mosquitto.md` — Setup Mosquitto + firewall
- `docs/testes/plano_de_testes.md` — Testes B0–6 completos
- `docs/CI-CD.md` — **[NOVO]** GitHub Actions, validações, pipelines
- `docs/INTEGRATION_GUIDE.md` — **[NOVO]** Integração Beckhoff + Separador
- `CONTRIBUTING.md` — Fluxo de trabalho, PRs, validações
- `docs/CHANGELOG.md` — Histórico de mudanças
- `observability/README.md` — **[NOVO]** Stack de observabilidade (Prometheus + Grafana): passo a passo, smoke test e problemas comuns
- `docs/grafana/` — **[NOVO]** Dashboards do Grafana versionados (Visão Geral, Performance, Confiabilidade)

