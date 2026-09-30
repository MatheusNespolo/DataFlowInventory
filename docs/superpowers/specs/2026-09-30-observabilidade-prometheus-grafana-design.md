# Telemetria histórica de performance — Prometheus + Grafana — Design

- **Data:** 30/09/2026
- **Branch:** `feat/observabilidade-prometheus-grafana` (worktree isolado, base `origin/main` @ `5aaf44f`)
- **Origem:** card `docs/cards_comments/card_telemetria_historica_grafana.md` (P3, Backlog)
- **Status:** design aprovado seção a seção em brainstorming; aguardando revisão do spec escrito

---

## 1. Objetivo e escopo

Adicionar uma camada de observabilidade de **performance e infraestrutura** ao servidor Node.js (`server/server.js`): latência MQTT, tempo de resposta da API, throughput de eventos, confiabilidade da conexão e histórico de estoque, com dashboards Grafana. Ela **complementa** o historiador SQLite do Beckhoff CX9240, que guarda dados de **negócio** (estoque e eventos com precisão por evento) e não muda.

### Dentro do escopo
- Instrumentação do `server/server.js` por um módulo novo `server/metrics.js` e endpoint `GET /metrics`.
- Stack Docker de desenvolvimento: Prometheus + Grafana, provisionados como código.
- Três dashboards versionados: Visão Geral, Performance, Confiabilidade.
- Testes automatizados sem Docker (unitários, integração com broker MQTT em processo, estáticos de infraestrutura) e job de CI.
- Documentação: `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `observability/README.md`, `server/.env.example`.
- Nota no Obsidian Vault (`Backend/Telemetria Histórica - Prometheus e Grafana.md`) e linhas inversas nas notas existentes (seção 10).

### Fora do escopo
- Qualquer mudança em firmware (`.ino`), `simulator/` ou `frontend/`.
- Mosquitto dentro do compose (o card pede só os serviços de observabilidade).
- Alertas do Prometheus/Alertmanager, exporters de MQTT, métricas do CX9240.
- `docs/DEPLOYMENT.md` (card vizinho; o passo a passo fica em `observability/README.md` até lá).
- Burn-in test, screenshots dos dashboards e mover o card para Done (dependem de hardware e do usuário).

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Prometheus** (pull), não InfluxDB | O servidor só expõe métricas; se o stack cair, nada muda no `server.js` (sem fila, retry nem backpressure). Casa com o risco do card ("opcional, não obrigatório"). Histogramas dão p50/p95/p99 com `histogram_quantile`. |
| D2 | `GET /metrics` na **mesma porta (3000)**, sempre ligado, sem autenticação | Mesmo padrão do `/api/status`, que já é aberto e expõe `brokerUrl`. Sem listener novo. Rótulos nunca carregam `brokerUrl`, usuário ou senha. |
| D3 | "Tempo de processamento de comando" = **comando aceito → confirmação do gateway** em `dataflow/comandos/pub` | O firmware confirma com `acao`, `peca`, `status` (`encaminhado`/`rejeitado`), sem id de correlação. Sem mudar firmware, o casamento é FIFO por `acao\|peca`. |
| D4 | "Mensagens perdidas (LWT)" = **quantas vezes o gateway caiu** (transição online → offline do LWT do ESP32) | O cliente MQTT com QoS 1 não expõe contagem de mensagens perdidas; esse é o sinal real. |
| D5 | Estoque como **gauge amostrado** (a cada scrape de 5 s) | A precisão por evento fica no SQLite do CX9240 (divisão de responsabilidades do card). |
| D6 | Timeout de confirmação **configurável** (`METRICS_CONFIRMACAO_TIMEOUT_MS`, padrão 10000) | Sem isso, testar a expiração custaria 10 s por teste. |

## 3. Arquitetura

```
server.js (métricas em memória, prom-client)
        ▲  GET /metrics, scrape a cada 5 s
   Prometheus (Docker)  ──►  Grafana (Docker)  ◄── dashboards em docs/grafana/*.json
```

O servidor **nunca empurra dados**. A lógica de métricas fica isolada em `server/metrics.js`; o `server.js` só ganha ganchos finos. O objeto `metricas` existente e o `/api/status` **não mudam**.

## 4. Catálogo de métricas (prefixo `dfi_`)

Valores de rótulo vêm de **listas permitidas**; qualquer valor desconhecido vira `outro`. Payloads do broker nunca criam séries sem limite.

| Métrica | Tipo | Rótulos (valores) | Observação |
|---|---|---|---|
| `dfi_mqtt_publish_ack_seconds` | histograma | `topic` (`TOPICS.cmdSub`, `TOPICS.statusServer`) | do `publish` até o PUBACK do QoS 1 |
| `dfi_command_confirmation_seconds` | histograma | `acao` (`solicitar_peca`, `reset`), `status` (`encaminhado`, `rejeitado`, `outro`) | comando aceito → confirmação do gateway |
| `dfi_http_request_duration_seconds` | histograma | `rota` (`req.route.path`, `estatico`, `nao_encontrada`), `metodo`, `codigo` | exclui `/metrics` |
| `dfi_events_total` | contador | `evento` (`pedido`, `entrega`, `erro`, `inicio`, `outro`) | eventos por tipo |
| `dfi_mqtt_messages_total` | contador | `topic` (todos os `TOPICS`, `outro`) | throughput; conta antes do parse do JSON |
| `dfi_mqtt_connected` | gauge | — | 0/1 |
| `dfi_mqtt_uptime_seconds` | gauge | — | tempo conectado sem cair (calculado no scrape); 0 se offline |
| `dfi_mqtt_reconnects_total` | contador | — | conexões **restabelecidas** (conexão após já ter conectado uma vez); tentativas não contam |
| `dfi_mqtt_errors_total` | contador | `tipo` (`conexao`, `json_invalido`, `publicacao`, `inscricao`) | |
| `dfi_gateway_online` | gauge | — | 0/1 |
| `dfi_gateway_offline_total` | contador | — | só transição online → offline; o LWT retido recebido ao reconectar não conta em duplicidade |
| `dfi_commands_total` | contador | `resultado` (`publicado`, `falha_publicacao`, `peca_invalida`, `rate_limit`, `broker_offline`) | |
| `dfi_command_unconfirmed_total` | contador | — | sem confirmação dentro do timeout |
| `dfi_command_confirmation_orphan_total` | contador | — | confirmação sem comando pendente |
| `dfi_websocket_clients` | gauge | — | `io.engine.clientsCount` no scrape |
| `dfi_stock_pieces` | gauge | `peca` (`A`, `B`, `C`) | só números finitos |
| `dfi_conveyor_on` | gauge | `esteira` (`principal`, `secA`, `secB`, `secC`) | 0/1 |

Além disso, as métricas padrão do `prom-client` (`process_*`, `nodejs_*`) mostram o overhead do próprio servidor.

**Buckets:** `dfi_mqtt_publish_ack_seconds` e `dfi_command_confirmation_seconds`: `0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10`. `dfi_http_request_duration_seconds`: `0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5`.

## 5. Módulo `server/metrics.js`

`criarMetricas({ relogio = () => Date.now(), timeoutConfirmacaoMs = 10000, clientesWs = () => 0 })` devolve uma fachada. Cada chamada cria um **`Registry` próprio** (sem registro global). O módulo não importa `mqtt`, `express` nem `socket.io`.

| Método | Efeito |
|---|---|
| `mensagemMqtt(topic)` | `dfi_mqtt_messages_total` |
| `mqttConectou()` / `mqttCaiu()` / `mqttErro(tipo)` | conexão, uptime, reconexões, erros |
| `gateway(status)` | `dfi_gateway_online`; conta `offline_total` só na transição online → offline |
| `evento(nome)`, `estoque(msg)`, `esteiras(msg)` | contador de eventos e gauges; ignoram valores não numéricos |
| `comandoAceito(acao, peca)` → `token` | registra t0 na fila FIFO `acao\|peca` **antes** do `publish` |
| `comandoFalhou(token)` | cancela a entrada e conta `falha_publicacao` |
| `publishAck(topic, segundos)` | histograma de PUBACK e `resultado="publicado"` quando é comando |
| `comandoRecusado(motivo)` | `peca_invalida`, `rate_limit`, `broker_offline` |
| `confirmacaoGateway({acao, peca, status})` | tira a entrada mais antiga da fila; se vazia, conta órfã |
| `varrerPendentes()` | expira entradas mais velhas que o timeout → `command_unconfirmed_total` |
| `middlewareHttp()` | mede duração no evento `finish` da resposta |
| `texto()` / `contentType` | exposição para `GET /metrics` |

**Filas:** limite de 100 entradas por chave (a mais antiga é descartada e contada como não confirmada). O varredor roda a cada 1 s com `setInterval(...).unref()`.

**Rótulo `rota`:** `req.route.path` quando há rota; `nao_encontrada` para 404; `estatico` para o resto (`express.static`). Nenhuma URL arbitrária vira série.

**Segurança contra falha (crítico).** O `server.js` encerra o processo em qualquer `uncaughtException`. Por isso **todo método da fachada é embrulhado num `try/catch` interno**: um bug de métrica nunca chega ao chamador (no máximo um `console.warn`). `GET /metrics` responde 500 em caso de erro, sem lançar.

## 6. Ganchos no `server.js`

Nenhuma lógica existente é removida. Cada gancho é uma linha no ponto indicado.

| Ponto existente | Gancho |
|---|---|
| `mqttClient.on('connect')` | `mqttConectou()` |
| `on('offline')`, `on('error')` | `mqttCaiu()`, `mqttErro('conexao')` |
| erro no callback de `subscribe` | `mqttErro('inscricao')` |
| início de `on('message')` | `mensagemMqtt(topic)`; JSON inválido → `mqttErro('json_invalido')` |
| `case TOPICS.status` com `type === 'gateway'` | `gateway(msgJson.status)` |
| `case TOPICS.estoque` / `esteiras` / `eventos` | `estoque(msg)` / `esteiras(msg)` / `evento(msg.evento)` |
| `case TOPICS.cmdPub` | `confirmacaoGateway({ acao, peca, status })` |
| `publicarComando()` | `comandoAceito` antes do `publish`; no callback: `publishAck` ou `comandoFalhou` + `mqttErro('publicacao')` |
| os pontos que hoje fazem `metricas.comandosRejeitados++` | `comandoRecusado(motivo)` |
| antes das rotas | `app.use(metrics.middlewareHttp())` |
| nova rota | `app.get('/metrics', ...)` |
| inicialização | `setInterval(varrerPendentes, 1000).unref()` |

Dependência nova em `server/package.json`: `prom-client` (`^15`). Variável nova em `server/.env.example`: `METRICS_CONFIRMACAO_TIMEOUT_MS`.

## 7. Stack Docker

```
docker-compose.yml                    raiz do repositório
observability/
  .env.example                        GRAFANA_ADMIN_PASSWORD (obrigatória), portas
  prometheus/prometheus.yml           job dfi-server, scrape 5 s, timeout 3 s
  grafana/provisioning/datasources/   Prometheus, uid fixo "dfi-prometheus"
  grafana/provisioning/dashboards/    provider lendo /var/lib/grafana/dashboards (= docs/grafana)
  README.md                           passo a passo
docs/grafana/                         visao-geral.json · performance.json · confiabilidade.json
scripts/observability-smoke.ps1/.sh   validação "ping/pong" e saúde do stack
```

- **Imagens:** `prom/prometheus` e `grafana/grafana-oss` com **versão fixada** (sem `latest`); a tag estável atual é confirmada na implementação.
- **Portas:** Prometheus `127.0.0.1:9090`, Grafana `127.0.0.1:3030` (3000 é do servidor). O README explica como abrir para a rede da bancada.
- **Senha:** `GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:?...}`; o compose recusa iniciar sem ela. O `.env` da pasta `observability/` entra no `.gitignore`; só o `.env.example` é versionado.
- **Scrape:** `host.docker.internal:3000` (o servidor roda no host, como no `start_services.bat`), com `extra_hosts: host.docker.internal:host-gateway`.
- **Dados:** volumes nomeados para Prometheus e Grafana; retenção do Prometheus de 30 dias.
- **Dashboards como código:** montados de `docs/grafana/` (somente leitura), `allowUiUpdates: false`. Fluxo de edição: editar na UI → Export JSON → sobrescrever o arquivo.

### Smoke script
Exige o servidor em `localhost:3000`. Executa: `docker compose config -q`; `promtool check config` pelo container do Prometheus; `docker compose up -d`; espera `up{job="dfi-server"} == 1` na API do Prometheus; `GET /api/health` do Grafana; saúde do datasource `dfi-prometheus`; lista os 3 dashboards. Imprime PASS/FAIL por etapa e sai com código ≠ 0 se algo falhar.

## 8. Dashboards (uids `dfi-visao-geral`, `dfi-performance`, `dfi-confiabilidade`; atualização 5 s; janela padrão 15 min; datasource `dfi-prometheus`)

| Dashboard | Painéis |
|---|---|
| **Visão Geral** | status de servidor (`up`), MQTT e gateway; estoque A/B/C atual (limiares do frontend: ≥4 normal, 3 aviso, 2 alerta, ≤1 crítico) e ao longo do tempo; linha do tempo das 4 esteiras; clientes WebSocket |
| **Performance** | p50/p95/p99 de `dfi_command_confirmation_seconds`, `dfi_mqtt_publish_ack_seconds` e `dfi_http_request_duration_seconds` (por rota); mensagens por tópico e eventos por tipo (taxa); CPU, memória e atraso do event loop |
| **Confiabilidade** | uptime MQTT; reconexões, erros e quedas do gateway (`increase` de 1 h); comandos por resultado; sem resposta e órfãos |

## 9. Testes (TDD, sem Docker)

Pacote novo `test/server_metrics/` (mesmo padrão de `mqtt_probe` e `frontend_smoke`): `package.json` próprio, devDependencies `aedes`, `mqtt`, `socket.io-client`, `yaml`; execução com `node --test`.

1. **Unitários de `metrics.js`** (relógio falso): casamento FIFO; órfã; expiração; cancelamento por falha de publish; limite de 100; reconexão só após a primeira conexão; `gateway_offline` só na transição online → offline; listas permitidas e `outro`; valores não numéricos ignorados; **nenhum método lança exceção**; `texto()` em formato de exposição válido; rótulo `rota`.
2. **Integração:** `aedes` em processo (porta aleatória) + `server/server.js` como processo filho + gateway falso (cliente `mqtt`) + `socket.io-client`. Verifica pelo texto de `/metrics`: ack do publish; confirmação `encaminhado` e `rejeitado`; timeout curto por env → `command_unconfirmed_total`; eventos por tipo; estoque e esteiras; reconexão derrubando e subindo o broker; LWT do gateway via `will` com queda forçada; `/metrics` com broker inalcançável (`mqtt_connected 0`, servidor vivo); payload lixo não derruba o servidor.
3. **Estáticos:** compose e `prometheus.yml` são YAML válido, sem `latest`, com senha obrigatória, portas presas a `127.0.0.1`, `host.docker.internal`; provisionamento coerente (uid do datasource); dashboards são JSON válido, usam o uid `dfi-prometheus`, e **toda métrica `dfi_*` citada nas consultas existe no registro** (trava o desvio silencioso).
4. **Regressão:** `test/frontend_smoke` continua passando.
5. **CI:** job novo `server-metrics-tests` em `.github/workflows/lint-and-security.yaml` (Node 22, `npm ci` em `server/` e `test/server_metrics/`, `node --test`). O smoke com Docker **não** roda no CI.

## 10. Documentação e Vault

### No repositório
- `docs/ARCHITECTURE.md`: nova seção "Observabilidade" (a atual "Documentação Correlata" é renumerada; os links passam a incluir `observability/README.md` e `docs/grafana/`).
- `observability/README.md`: pré-requisitos, `.env`, subir o stack, smoke, importar/editar dashboards, problemas comuns, como o Deployment Guide deve absorver isto.
- `docs/CHANGELOG.md`: entrada da telemetria histórica.
- `server/.env.example`: `METRICS_CONFIRMACAO_TIMEOUT_MS`.
- `.gitignore`: `observability/.env`.

### No Obsidian Vault (`C:\Users\matheusn\Documents\GitHub\ObsidianVault`)
- **Nota nova** `Backend/Telemetria Histórica - Prometheus e Grafana.md`, escrita **ao final** com fatos reais (o que foi validado e o que não foi), no formato das notas de Backend: linha de tags; linhas de relação `~~…~~` do vocabulário de `Convenção de links.md`; `> [!info] Objetivo da nota`; Sumário; seções; `### Vault` e `### Externas`. Se algo não foi executado, entra um `> [!warning]`.
  - Relações: `Pressupõe: [[Docker]], [[Docker Compose - Stacks de dados]]`; `Aprofunda: [[Data Flow Inventory]]`; `Relaciona-se com: [[TF6420 - Database Server]], [[Funcionalidades de Conectividade - TF6100 vs TF6250 vs TF6420]], [[Publisher-Subscriber (Beckhoff RT Linux - CX8290)]], [[Docker CI-CD com GitHub Actions]]`.
  - Conteúdo: por que performance é diferente de dados de negócio (Prometheus × historiador do CX9240/TF6420); como foi integrada (pull, catálogo, casamento de comandos, stack); como rodar e verificar; por que Prometheus e não InfluxDB.
- **Linhas inversas** (autorizadas pelo usuário), só acrescentadas: `~~Base para: [[Telemetria Histórica - Prometheus e Grafana]]~~` em `Automation/Data Flow Inventory.md` e em `Backend/Docker Compose - Stacks de dados.md`, e um item em "Próximos Passos" do Data Flow Inventory. Verificar se `Jornada/Jornada de Aprendizagem.md` indexa notas de Backend e, se sim, acrescentar a linha correspondente.
- O Vault **não recebe commit** (o backup automático do plugin já faz isso).

### Relatório ao usuário no fim
Lista do que **não** foi documentado em `docs/` (candidatos: `README.md` da raiz, `docs/INTEGRATION_GUIDE.md`, `docs/testes/plano_de_testes.md` e o roteiro do burn-in, `docs/fluxogramas/board_github_projects.md`, `docs/cards_comments/card_telemetria_historica_grafana.md`), para o usuário fazer manualmente ou pedir a outro agente.

## 11. Riscos e limitações

| Risco / limitação | Tratamento |
|---|---|
| Sem Docker nesta máquina: `compose up`, ingestão real, PromQL e renderização dos painéis **não são executados** pelo agente | Validação estática + smoke script para o usuário; dito explicitamente na descrição do PR e na nota do Vault |
| Erro de PromQL não detectado offline | `promtool check config` no smoke cobre a configuração, não as consultas dos painéis; o teste estático só garante que as métricas existem |
| Casamento FIFO pode trocar confirmações se dois comandos iguais estiverem pendentes | A FSM atende um pedido por vez e há rate limit de 500 ms por cliente; órfãs e não confirmados viram contadores visíveis |
| Bug de métrica derrubar o servidor | Fachada com `try/catch` em todos os métodos, coberta por teste |
| Cardinalidade | Listas permitidas + `outro`; rótulo `rota` derivado da rota, nunca da URL |
| Overhead | Contadores em memória; nenhuma E/S no caminho do MQTT; métricas padrão mostram o custo |
| Exposição de `/metrics` | Mesmo padrão do `/api/status`; sem `brokerUrl`, usuário ou senha nos rótulos |

## 12. Entregáveis

1. Código: `server/metrics.js` e ganchos, `docker-compose.yml`, `observability/`, `docs/grafana/*.json`, `scripts/observability-smoke.*`, `test/server_metrics/`, job de CI.
2. Documentação do repositório (seção 10).
3. Nota nova e linhas inversas no Vault.
4. Relatório final: rulings tomados, o que não foi validado e o que não foi documentado em `docs/`.
