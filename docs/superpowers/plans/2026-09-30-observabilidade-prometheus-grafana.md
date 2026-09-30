# Telemetria histórica de performance (Prometheus + Grafana) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumentar o `server/server.js` com métricas Prometheus (`GET /metrics`) e entregar um stack Docker (Prometheus + Grafana) com três dashboards versionados, testado sem Docker.

**Architecture:** Um módulo isolado `server/metrics.js` (fachada à prova de falha sobre `prom-client`, com registro próprio) recebe ganchos finos do `server.js`; o casamento comando → confirmação vive num módulo puro `server/metrics-correlacao.js`. O Prometheus faz *pull* de `GET /metrics` (o servidor nunca empurra dados); o Grafana lê dele, provisionado como código, com dashboards em `docs/grafana/`. A validação sem Docker usa um broker MQTT em processo (`aedes`) e testes estáticos.

**Tech Stack:** Node.js 22, `prom-client` 15, Express 4, `mqtt` 5, Socket.IO 4; testes com `node --test`, `aedes` 1.2 (ESM), `socket.io-client`, `yaml`; Docker Compose, Prometheus v3.15.0, Grafana OSS 12.4.3.

**Spec:** `docs/superpowers/specs/2026-09-30-observabilidade-prometheus-grafana-design.md` — ler antes de cada tarefa; as seções citadas (§) referem-se a ele.

## Refinamentos em relação ao spec (decididos ao escrever o plano)

1. `criarMetricas` recebe também `topicos` (o objeto `TOPICS` do `server.js`), de onde vêm as listas permitidas de tópico.
2. A fila de correlação sai de `metrics.js` para um módulo puro, `server/metrics-correlacao.js` (sem `prom-client`, sem timers), testável isoladamente.
3. `publishAck(topic, segundos, ehComando = false)`: o terceiro argumento faz a métrica `dfi_commands_total{resultado="publicado"}` subir.
4. O `.gitignore` **não muda**: o padrão `*.env` (linha 13) já ignora `observability/.env`, e um teste da Task 7 garante isso com `git check-ignore`.
5. O compose lê a senha de `observability/.env`; o comando é `docker compose --env-file observability/.env up -d`.
6. Os dashboards são escritos por um gerador descartável (fora do repositório); só o JSON é versionado, e a fonte da verdade passa a ser o JSON.
7. Ordem: a verificação final (Task 11) vem antes da nota do Vault (Task 12), que precisa de fatos reais.

## Global Constraints

- Trabalhar **somente** no worktree `C:\Users\matheusn\Documents\GitHub\DataFlowInventory-obs` (branch `feat/observabilidade-prometheus-grafana`). O checkout principal `C:\Users\matheusn\Documents\GitHub\DataFlowInventory` e a `main` não são tocados. Único acesso fora do worktree: o Obsidian Vault (`C:\Users\matheusn\Documents\GitHub\ObsidianVault`), **somente na Task 12**.
- **Proibido alterar:** `arduino/`, `esp32/`, `simulator/`, `frontend/`, `test/frontend_smoke/`, `test/mqtt_probe/`. Em `docs/`, só `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md` e `docs/grafana/*.json`.
- O objeto `metricas` do `server.js` e a resposta de `/api/status` **não mudam**.
- Rótulos só recebem valores de **listas permitidas**; qualquer outro valor vira `outro`. Nenhum rótulo carrega `brokerUrl`, usuário ou senha.
- **Todo método da fachada de métricas tem `try/catch` interno** (o `server.js` encerra o processo em `uncaughtException`).
- Imagens Docker fixadas: `prom/prometheus:v3.15.0` e `grafana/grafana-oss:12.4.3`; nunca `latest`.
- Portas do compose presas ao localhost: `127.0.0.1:9090` (Prometheus) e `127.0.0.1:3030` (Grafana). `GRAFANA_ADMIN_PASSWORD` é obrigatória (`:?`), sem senha padrão.
- **Docker não está instalado nesta máquina:** nenhuma tarefa pode executar `docker`, e nenhum texto pode afirmar que o stack foi executado ou que os painéis foram renderizados.
- Testes sem portas fixas: broker em porta 0 e servidor em porta livre. A porta 3000 pode estar ocupada por um processo do usuário; **nunca finalizar processos que você não iniciou**.
- Node ≥ 22. Dependências: `prom-client@^15.1.3` (em `server/`); `aedes@^1.2.0`, `mqtt@^5.16.0`, `socket.io-client@^4.8.4`, `yaml@^2.9.1` (em `test/server_metrics/`). Os `package-lock.json` são versionados.
- Comentários, mensagens de log e de commit em **pt-BR**, com o estilo de banner `// ====` dos arquivos existentes.
- Todo commit termina com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Avisos `LF will be replaced by CRLF` do git são ignorados.
- **Nunca colar linhas ``` (cercas de markdown) em arquivos-fonte** (um erro assim já quebrou o CSS de um projeto irmão). Antes de cada commit: `grep -rn --exclude-dir=node_modules '```' server/metrics.js server/metrics-correlacao.js server/server.js test/server_metrics scripts docker-compose.yml observability/prometheus observability/grafana observability/.env.example` deve não imprimir nada. (`observability/README.md` e os demais `.md` são markdown e podem ter cercas.)
- Toda tarefa termina com `cd test/server_metrics && npm test` **passando** antes do commit (a partir da Task 2).
- Não dar commit no Vault.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `server/metrics.js` | Criar (Tasks 2–4) | Fachada de métricas sobre `prom-client` |
| `server/metrics-correlacao.js` | Criar (Task 3) | Fila FIFO comando → confirmação (pura) |
| `server/server.js` | Modificar (Tasks 5–6) | Ganchos + `GET /metrics` |
| `server/package.json`, `server/package-lock.json` | Modificar (Task 2) | `prom-client` |
| `server/.env.example` | Modificar (Task 5) | `METRICS_CONFIRMACAO_TIMEOUT_MS` |
| `test/server_metrics/package.json` (+ lock) | Criar (Task 1) | Pacote de testes |
| `test/server_metrics/helpers/*.mjs` | Criar (Task 1) | `prom`, `esperar`, `broker`, `servidor`, `gateway`, `dashboard` |
| `test/server_metrics/unit/*.test.mjs` | Criar (Tasks 2–4) | Unitários |
| `test/server_metrics/integracao/*.test.mjs` | Criar (Tasks 1, 5, 6) | Integração com broker em processo |
| `test/server_metrics/infra/*.test.mjs` | Criar (Tasks 7–8) | Estáticos de compose, Prometheus, Grafana e dashboards |
| `docker-compose.yml` | Criar (Task 7) | Prometheus + Grafana |
| `observability/**` | Criar (Tasks 7, 9) | Configs, `.env.example`, README |
| `docs/grafana/*.json` | Criar (Task 8) | Três dashboards |
| `scripts/observability-smoke.sh`, `.ps1` | Criar (Task 9) | Validação com Docker (executada pelo usuário) |
| `.github/workflows/lint-and-security.yaml` | Modificar (Task 10) | Job `server-metrics-tests` |
| `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md` | Modificar (Task 10) | Documentação |
| Vault: `Backend/Telemetria Histórica - Prometheus e Grafana.md` + 2 notas | Criar/Modificar (Task 12) | Nota de estudo e links inversos |

---

### Task 1: Pacote de testes e harness com broker MQTT em processo

Cria o pacote `test/server_metrics/` e os helpers que sobem um broker (`aedes`), o `server/server.js` real como processo filho, um gateway ESP32 falso e um cliente Socket.IO. Um teste de **caracterização** prova que o harness funciona contra o servidor **ainda sem métricas** (não há RED: nenhum comportamento novo).

**Files:**
- Create: `test/server_metrics/package.json` (+ `package-lock.json` gerado)
- Create: `test/server_metrics/helpers/prom.mjs`, `esperar.mjs`, `broker.mjs`, `servidor.mjs`, `gateway.mjs`, `dashboard.mjs`
- Create: `test/server_metrics/integracao/harness.test.mjs`

**Interfaces:**
- Produces (todos ESM):
  - `prom.mjs`: `valor(texto: string, nome: string, rotulos?: Record<string,string>): number | null` (soma das amostras cujos rótulos contêm todos os pares; `null` se nenhuma) e `familias(texto: string): Map<string,string>` (nome da família → tipo, lido de `# TYPE`).
  - `esperar.mjs`: `esperar(fn: () => Promise<any>, opts?: { timeoutMs = 10000, intervaloMs = 100, descricao = 'condição' }): Promise<any>` (repete até `fn` devolver algo verdadeiro; lança com a descrição no timeout).
  - `broker.mjs`: `iniciarBroker(portaFixa = 0): Promise<{ porta: number, parar(): Promise<void>, reiniciar(): Promise<void> }>` (`reiniciar` sobe um broker novo NA MESMA porta).
  - `servidor.mjs`: `iniciarServidor({ brokerPorta: number, env?: Record<string,string> }): Promise<{ url: string, porta: number, log: string, metricas(): Promise<{status:number, tipo:string|null, texto:string}>, texto(): Promise<string>, status(): Promise<{status:number, corpo:any}>, parar(): Promise<void> }>`.
  - `gateway.mjs`: `criarGateway(brokerPorta: number, opts?: { modo: 'confirmar'|'rejeitar'|'mudo' = 'confirmar', anunciarOnline = true }): Promise<{ recebidos: object[], publicar(topico: string, corpo: object|string, opcoes?: object): Promise<void>, online(): Promise<void>, cair(): void, fechar(): void }>`.
  - `dashboard.mjs`: `conectarDashboard(url: string): Promise<{ socket, erros: object[], fechar(): void }>`.

- [ ] **Step 1: Instalar as dependências do servidor no worktree**

```bash
cd server && npm ci && cd ..
```
Expected: instala sem erros (o worktree novo não tem `node_modules`).

- [ ] **Step 2: Criar o pacote de testes**

`test/server_metrics/package.json`:

```json
{
  "name": "dataflow-server-metrics-tests",
  "version": "1.0.0",
  "private": true,
  "description": "Testes das métricas de performance do servidor: unitários, integração com broker MQTT em processo (aedes) e verificações estáticas da infraestrutura de observabilidade. Não exigem Docker.",
  "type": "module",
  "scripts": {
    "test": "node --test --test-concurrency=2 \"unit/*.test.mjs\" \"integracao/*.test.mjs\" \"infra/*.test.mjs\""
  }
}
```

```bash
cd test/server_metrics && npm install --save-dev aedes@^1.2.0 mqtt@^5.16.0 socket.io-client@^4.8.4 yaml@^2.9.1
```
Expected: `package-lock.json` criado; as quatro dependências aparecem em `devDependencies`.

- [ ] **Step 3: Helper `prom.mjs`**

```js
// ============================================================
// Leitura do texto de exposição do Prometheus (text/plain 0.0.4)
// ============================================================

/**
 * Soma as amostras de `nome` cujos rótulos contêm TODOS os pares de `rotulos`.
 * Devolve null se nenhuma amostra casar. `nome` é exato: "dfi_x" não casa "dfi_x_total".
 */
export function valor(texto, nome, rotulos = {}) {
  const exigidos = Object.entries(rotulos).map(([k, v]) => `${k}="${v}"`);
  let soma = null;
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(nome)) continue;
    const m = linha.slice(nome.length).match(/^(?:\{(.*)\})?\s+(\S+)$/);
    if (!m) continue;
    const presentes = m[1] ? m[1].split(/,(?=[a-zA-Z_][a-zA-Z0-9_]*=")/) : [];
    if (exigidos.every((e) => presentes.includes(e))) soma = (soma ?? 0) + Number(m[2]);
  }
  return soma;
}

/** Mapa nome-da-família → tipo (counter, gauge, histogram...), lido das linhas "# TYPE". */
export function familias(texto) {
  const mapa = new Map();
  for (const m of texto.matchAll(/^# TYPE (\S+) (\S+)$/gm)) mapa.set(m[1], m[2]);
  return mapa;
}
```

- [ ] **Step 4: Helper `esperar.mjs`**

```js
// Repete `fn` até devolver um valor verdadeiro ou estourar o tempo.
export async function esperar(fn, { timeoutMs = 10000, intervaloMs = 100, descricao = 'condição' } = {}) {
  const fim = Date.now() + timeoutMs;
  let ultimoErro = null;
  while (Date.now() < fim) {
    try {
      const resultado = await fn();
      if (resultado) return resultado;
    } catch (err) {
      ultimoErro = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
  throw new Error(`Tempo esgotado esperando: ${descricao}${ultimoErro ? ` (último erro: ${ultimoErro.message})` : ''}`);
}
```

- [ ] **Step 5: Helper `broker.mjs`**

```js
import { Aedes } from 'aedes';
import net from 'node:net';

/**
 * Broker MQTT em processo (aedes) para os testes de integração.
 * porta 0 = porta livre escolhida pelo SO. reiniciar() sobe um broker NOVO na MESMA porta
 * (mensagens retidas e sessões se perdem, como num restart real do Mosquitto).
 */
export async function iniciarBroker(portaFixa = 0) {
  let aedes = null;
  let servidor = null;
  let porta = portaFixa;
  const sockets = new Set();

  async function subir() {
    aedes = await Aedes.createBroker();
    servidor = net.createServer(aedes.handle);
    servidor.on('connection', (s) => {
      sockets.add(s);
      s.on('close', () => sockets.delete(s));
    });
    await new Promise((resolve, reject) => {
      servidor.once('error', reject);
      servidor.listen(porta, '127.0.0.1', resolve);
    });
    porta = servidor.address().port;
  }

  async function parar() {
    if (!aedes) return;
    const a = aedes;
    const s = servidor;
    aedes = null;
    servidor = null;
    for (const sock of sockets) sock.destroy();
    await new Promise((resolve) => a.close(resolve));
    await new Promise((resolve) => s.close(resolve));
  }

  await subir();
  return {
    get porta() { return porta; },
    parar,
    async reiniciar() {
      await parar();
      await subir();
    },
  };
}
```

- [ ] **Step 6: Helper `servidor.mjs`**

```js
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { esperar } from './esperar.mjs';

const SERVER_JS = fileURLToPath(new URL('../../../server/server.js', import.meta.url));

function portaLivre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/**
 * Sobe o server/server.js REAL como processo filho, apontando para o broker de teste.
 * cwd = tmpdir para o dotenv não carregar o server/.env de quem roda os testes.
 */
export async function iniciarServidor({ brokerPorta, env = {} } = {}) {
  const porta = await portaLivre();
  const filho = spawn(process.execPath, [SERVER_JS], {
    cwd: os.tmpdir(),
    env: {
      ...process.env,
      PORT: String(porta),
      ALLOWED_ORIGIN: `http://localhost:${porta}`,
      MQTT_BROKER_URL: 'mqtt://127.0.0.1',
      MQTT_PORT: String(brokerPorta),
      MQTT_USERNAME: '',
      MQTT_PASSWORD: '',
      MQTT_CLIENT_ID: `dfi-teste-${porta}`,
      COMANDO_INTERVALO_MS: '50',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let log = '';
  filho.stdout.on('data', (d) => { log += d; });
  filho.stderr.on('data', (d) => { log += d; });
  let encerrou = false;
  filho.once('exit', () => { encerrou = true; });

  const url = `http://127.0.0.1:${porta}`;
  try {
    await esperar(async () => {
      if (encerrou) throw new Error('o processo do servidor encerrou');
      const r = await fetch(`${url}/api/status`);
      return r.status > 0;
    }, { timeoutMs: 15000, descricao: 'o servidor responder em /api/status' });
  } catch (err) {
    filho.kill();
    throw new Error(`${err.message}\n--- log do servidor ---\n${log}`);
  }

  return {
    url,
    porta,
    get log() { return log; },
    async metricas() {
      const r = await fetch(`${url}/metrics`);
      return { status: r.status, tipo: r.headers.get('content-type'), texto: await r.text() };
    },
    async texto() {
      return (await this.metricas()).texto;
    },
    async status() {
      const r = await fetch(`${url}/api/status`);
      return { status: r.status, corpo: await r.json() };
    },
    async parar() {
      if (encerrou) return;
      filho.kill();
      await new Promise((resolve) => {
        filho.once('exit', resolve);
        setTimeout(resolve, 3000).unref();
      });
    },
  };
}
```

- [ ] **Step 7: Helper `gateway.mjs`**

```js
import mqtt from 'mqtt';

const T = {
  status: 'dataflow/status',
  cmdSub: 'dataflow/comandos/sub',
  cmdPub: 'dataflow/comandos/pub',
};

/**
 * Gateway ESP32 falso. Anuncia-se online (retido) e registra o LWT em dataflow/status.
 * Ao receber um comando em dataflow/comandos/sub, responde em dataflow/comandos/pub como o
 * firmware real (gateway_mqtt.ino):
 *  - 'confirmar' → { status: 'encaminhado', acao, peca? }
 *  - 'rejeitar'  → { status: 'rejeitado', acao, motivo } SEM peca (o firmware não ecoa a peça)
 *  - 'mudo'      → não responde
 */
export async function criarGateway(brokerPorta, { modo = 'confirmar', anunciarOnline = true } = {}) {
  const recebidos = [];
  const cliente = mqtt.connect(`mqtt://127.0.0.1:${brokerPorta}`, {
    clientId: `gateway-falso-${Math.random().toString(16).slice(2, 8)}`,
    reconnectPeriod: 0,
    will: {
      topic: T.status,
      payload: JSON.stringify({ type: 'gateway', status: 'offline' }),
      qos: 1,
      retain: true,
    },
  });
  await new Promise((resolve, reject) => {
    cliente.once('connect', resolve);
    cliente.once('error', reject);
  });
  await cliente.subscribeAsync(T.cmdSub, { qos: 1 });

  cliente.on('message', (topico, payload) => {
    if (topico !== T.cmdSub) return;
    const comando = JSON.parse(payload.toString());
    recebidos.push(comando);
    if (modo === 'mudo') return;
    const resposta = modo === 'rejeitar'
      ? { type: 'comando', acao: comando.acao, status: 'rejeitado', motivo: 'peca_invalida' }
      : { type: 'comando', acao: comando.acao, status: 'encaminhado', ...(comando.peca ? { peca: comando.peca } : {}) };
    cliente.publish(T.cmdPub, JSON.stringify(resposta));
  });

  const api = {
    recebidos,
    publicar(topico, corpo, opcoes = {}) {
      const payload = typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
      return new Promise((resolve, reject) => {
        cliente.publish(topico, payload, { qos: 1, ...opcoes }, (err) => (err ? reject(err) : resolve()));
      });
    },
    online() {
      return api.publicar(T.status, { type: 'gateway', status: 'online' }, { retain: true });
    },
    cair() {
      cliente.stream.destroy(); // queda sem DISCONNECT → o broker publica o LWT
    },
    fechar() {
      cliente.end(true);
    },
  };
  if (anunciarOnline) await api.online();
  return api;
}
```

- [ ] **Step 8: Helper `dashboard.mjs`**

```js
import { io } from 'socket.io-client';

/** Cliente Socket.IO: faz o papel do dashboard web ligado ao servidor de teste. */
export async function conectarDashboard(url) {
  const socket = io(url, { transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  const erros = [];
  socket.on('comando_erro', (e) => erros.push(e));
  return { socket, erros, fechar: () => socket.close() };
}
```

- [ ] **Step 9: Teste de caracterização do harness**

`test/server_metrics/integracao/harness.test.mjs`:

```js
// Caracteriza o servidor ATUAL (sem métricas) para provar que o harness funciona.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';

let broker;
let servidor;
let gateway;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  gateway = await criarGateway(broker.porta);
});

after(async () => {
  gateway?.fechar();
  await servidor?.parar();
  await broker?.parar();
});

test('o servidor de teste conecta ao broker em processo (/api/status → 200, mqtt=true)', async () => {
  const r = await esperar(async () => {
    const s = await servidor.status();
    return s.corpo.mqtt ? s : null;
  }, { descricao: 'mqtt=true em /api/status' });
  assert.equal(r.status, 200);
});

test('o anúncio online (retido) do gateway falso chega ao servidor', async () => {
  await esperar(async () => (await servidor.status()).corpo.gateway === 'online', {
    descricao: 'gateway = online em /api/status',
  });
});

test('um comando do dashboard chega ao gateway falso e é confirmado', async () => {
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(() => gateway.recebidos.length === 1, { descricao: 'o gateway falso receber o comando' });
  assert.equal(gateway.recebidos[0].acao, 'solicitar_peca');
  assert.equal(gateway.recebidos[0].peca, 'A');
  dashboard.fechar();
});

test('a queda forçada do gateway falso dispara o LWT (gateway = offline)', async () => {
  gateway.cair();
  await esperar(async () => (await servidor.status()).corpo.gateway === 'offline', {
    descricao: 'gateway = offline em /api/status',
  });
});
```

- [ ] **Step 10: Rodar o harness**

Run: `cd test/server_metrics && node --test integracao/harness.test.mjs`
Expected: 4 testes passam, sem saída de erro. Se o servidor não subir, o erro traz o log do processo; corrija o helper (não o `server.js`).

- [ ] **Step 11: Commit**

```bash
git add test/server_metrics/package.json test/server_metrics/package-lock.json test/server_metrics/helpers test/server_metrics/integracao/harness.test.mjs
git commit -m "test(metricas): harness com broker MQTT em processo, servidor real e gateway falso" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Núcleo de `server/metrics.js` — conexão, gateway, eventos, estoque e esteiras (TDD)

Cria a fachada de métricas com o estado de conexão MQTT, uptime, reconexões, erros, mensagens por tópico, gateway (LWT), eventos, estoque e esteiras. As Tasks 3 e 4 estendem este arquivo em pontos de inserção **de uma linha só** (as linhas `// ---- ... ----`, `let gatewayAtual = null;` e `const publico = {`); **não renomeie nem remova essas linhas**.

**Files:**
- Modify: `server/package.json`, `server/package-lock.json` (dependência `prom-client`)
- Create: `server/metrics.js`
- Test: `test/server_metrics/unit/estado.test.mjs`

**Interfaces:**
- Consumes: `valor` de `test/server_metrics/helpers/prom.mjs` (Task 1).
- Produces: `module.exports = { criarMetricas }` (CommonJS) com
  `criarMetricas({ relogio?: () => number /* ms */, timeoutConfirmacaoMs?: number, clientesWs?: () => number, topicos?: Record<string,string> } = {})` → fachada com:
  `mensagemMqtt(topic)`, `mqttConectou()`, `mqttCaiu()`, `mqttErro(tipo)`, `gateway(status)`, `evento(nome)`, `estoque(msg)`, `esteiras(msg)`, `contentType: string`, `texto(): Promise<string>`.
  Nenhum método (exceto `texto`) jamais lança exceção.
  Métricas criadas: `dfi_mqtt_messages_total{topic}`, `dfi_mqtt_connected`, `dfi_mqtt_uptime_seconds`, `dfi_mqtt_reconnects_total`, `dfi_mqtt_errors_total{tipo}`, `dfi_gateway_online`, `dfi_gateway_offline_total`, `dfi_events_total{evento}`, `dfi_stock_pieces{peca}`, `dfi_conveyor_on{esteira}`, `dfi_websocket_clients`, mais as métricas padrão (`process_*`, `nodejs_*`).

- [ ] **Step 1: Instalar o `prom-client`**

```bash
cd server && npm install prom-client@^15.1.3
```
Expected: `server/package.json` ganha `"prom-client": "^15.1.3"` em `dependencies`; o lock é atualizado.

- [ ] **Step 2: Escrever os testes (falhando)**

`test/server_metrics/unit/estado.test.mjs`:

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { criarMetricas } from '../../../server/metrics.js';
import { valor } from '../helpers/prom.mjs';

const TOPICOS = {
  status: 'dataflow/status',
  estoque: 'dataflow/estoque',
  eventos: 'dataflow/eventos',
  sensores: 'dataflow/sensores',
  esteiras: 'dataflow/esteiras',
  cmdSub: 'dataflow/comandos/sub',
  cmdPub: 'dataflow/comandos/pub',
  statusServer: 'dataflow/status/server',
};

function novo(extra = {}) {
  const relogio = { t: 1000 };
  const m = criarMetricas({ relogio: () => relogio.t, topicos: TOPICOS, ...extra });
  return { m, relogio, ler: async (nome, rotulos) => valor(await m.texto(), nome, rotulos) };
}

test('expõe o formato Prometheus e as métricas padrão do processo', async () => {
  const { m } = novo();
  assert.match(m.contentType, /^text\/plain/);
  const texto = await m.texto();
  assert.match(texto, /# TYPE dfi_mqtt_connected gauge/);
  assert.match(texto, /process_cpu_user_seconds_total/);
});

test('MQTT: conexão, uptime calculado no scrape e reconexões (só após a primeira conexão)', async () => {
  const { m, relogio, ler } = novo();
  assert.equal(await ler('dfi_mqtt_connected'), 0);
  assert.equal(await ler('dfi_mqtt_uptime_seconds'), 0);

  m.mqttConectou();
  assert.equal(await ler('dfi_mqtt_connected'), 1);
  assert.equal(await ler('dfi_mqtt_reconnects_total'), 0, 'a primeira conexão não é reconexão');
  relogio.t += 5000;
  assert.equal(await ler('dfi_mqtt_uptime_seconds'), 5);

  m.mqttCaiu();
  assert.equal(await ler('dfi_mqtt_connected'), 0);
  assert.equal(await ler('dfi_mqtt_uptime_seconds'), 0);

  m.mqttConectou();
  assert.equal(await ler('dfi_mqtt_reconnects_total'), 1);
  assert.equal(await ler('dfi_mqtt_connected'), 1);
});

test('erros MQTT usam lista permitida (valor desconhecido vira "outro")', async () => {
  const { m, ler } = novo();
  m.mqttErro('conexao');
  m.mqttErro('conexao');
  m.mqttErro('json_invalido');
  m.mqttErro('xpto');
  assert.equal(await ler('dfi_mqtt_errors_total', { tipo: 'conexao' }), 2);
  assert.equal(await ler('dfi_mqtt_errors_total', { tipo: 'json_invalido' }), 1);
  assert.equal(await ler('dfi_mqtt_errors_total', { tipo: 'outro' }), 1);
});

test('mensagens MQTT contam por tópico conhecido; tópico desconhecido vira "outro"', async () => {
  const { m, ler } = novo();
  m.mensagemMqtt('dataflow/estoque');
  m.mensagemMqtt('dataflow/estoque');
  m.mensagemMqtt('dataflow/comandos/pub');
  m.mensagemMqtt('qualquer/coisa');
  assert.equal(await ler('dfi_mqtt_messages_total', { topic: 'dataflow/estoque' }), 2);
  assert.equal(await ler('dfi_mqtt_messages_total', { topic: 'dataflow/comandos/pub' }), 1);
  assert.equal(await ler('dfi_mqtt_messages_total', { topic: 'outro' }), 1);
});

test('gateway: a queda só conta na transição online → offline', async () => {
  const { m, ler } = novo();
  m.gateway('offline'); // LWT retido recebido ao (re)conectar: NÃO é uma queda
  assert.equal(await ler('dfi_gateway_offline_total'), 0);
  assert.equal(await ler('dfi_gateway_online'), 0);

  m.gateway('online');
  assert.equal(await ler('dfi_gateway_online'), 1);

  m.gateway('offline');
  m.gateway('offline'); // repetido: não conta de novo
  assert.equal(await ler('dfi_gateway_offline_total'), 1);
  assert.equal(await ler('dfi_gateway_online'), 0);

  m.gateway('online');
  m.gateway('offline');
  assert.equal(await ler('dfi_gateway_offline_total'), 2);

  m.gateway('desconhecido'); // status inválido é ignorado
  assert.equal(await ler('dfi_gateway_offline_total'), 2);
  assert.equal(await ler('dfi_gateway_online'), 0);
});

test('eventos contam por tipo permitido; nome desconhecido vira "outro"', async () => {
  const { m, ler } = novo();
  for (const nome of ['pedido', 'entrega', 'entrega', 'erro', 'inicio', 'inventado', undefined]) m.evento(nome);
  assert.equal(await ler('dfi_events_total', { evento: 'pedido' }), 1);
  assert.equal(await ler('dfi_events_total', { evento: 'entrega' }), 2);
  assert.equal(await ler('dfi_events_total', { evento: 'erro' }), 1);
  assert.equal(await ler('dfi_events_total', { evento: 'inicio' }), 1);
  assert.equal(await ler('dfi_events_total', { evento: 'outro' }), 2);
});

test('estoque: só números finitos viram gauge; o resto é ignorado', async () => {
  const { m, ler } = novo();
  m.estoque({ type: 'estoque', pecaA: 4, pecaB: 'x', pecaC: NaN });
  assert.equal(await ler('dfi_stock_pieces', { peca: 'A' }), 4);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'B' }), null);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'C' }), null);
  m.estoque({ pecaA: 3, pecaB: 5, pecaC: 0 });
  assert.equal(await ler('dfi_stock_pieces', { peca: 'A' }), 3);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'B' }), 5);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'C' }), 0);
});

test('esteiras: aceita booleano ou 0/1 e ignora chaves ausentes ou inválidas', async () => {
  const { m, ler } = novo();
  m.esteiras({ principal: true, secA: false, secB: 1, secC: 'ligada' });
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'principal' }), 1);
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'secA' }), 0);
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'secB' }), 1);
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'secC' }), null);
});

test('clientes WebSocket: lidos do callback no scrape; falha do callback vira 0', async () => {
  const aviso = mock.method(console, 'warn', () => {});
  const { m: bom } = novo({ clientesWs: () => 3 });
  assert.equal(valor(await bom.texto(), 'dfi_websocket_clients'), 3);
  assert.equal(aviso.mock.callCount(), 0);
  const { m: ruim } = novo({ clientesWs: () => { throw new Error('io indisponível'); } });
  assert.equal(valor(await ruim.texto(), 'dfi_websocket_clients'), 0);
  assert.equal(aviso.mock.callCount(), 1, 'a falha do callback é registrada uma vez no log');
  aviso.mock.restore();
});

test('a fachada nunca lança: argumentos absurdos e relógio quebrado são engolidos', () => {
  const aviso = mock.method(console, 'warn', () => {});
  const { m } = novo();
  const metodos = Object.entries(m).filter(([nome, fn]) => typeof fn === 'function' && nome !== 'texto');
  assert.ok(metodos.length >= 8, 'a fachada expõe os métodos esperados');
  for (const [nome, fn] of metodos) {
    for (const arg of [undefined, null, 42, 'x', {}, [], { pecaA: 'x' }]) {
      assert.doesNotThrow(() => fn(arg), `${nome}(${JSON.stringify(arg)})`);
    }
  }
  const quebrado = criarMetricas({ relogio: () => { throw new Error('relógio quebrado'); }, topicos: TOPICOS });
  assert.doesNotThrow(() => quebrado.mqttConectou());
  assert.ok(aviso.mock.callCount() >= 1, 'a falha é registrada no log');
  aviso.mock.restore();
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test unit/estado.test.mjs`
Expected: FALHA com `Cannot find module '.../server/metrics.js'`.

- [ ] **Step 4: Implementar `server/metrics.js`**

```js
'use strict';
// ============================================================
// DATA FLOW INVENTORY — Métricas de performance (Prometheus)
// ------------------------------------------------------------
// Módulo isolado: não importa mqtt, express nem socket.io. O
// server.js só chama os métodos da fachada devolvida por
// criarMetricas() e expõe o texto em GET /metrics.
//
// REGRAS
//  1. Cada chamada cria um Registry PRÓPRIO (sem registro global).
//  2. Rótulos só recebem valores de listas permitidas; qualquer
//     outro valor vira "outro" — payloads do broker nunca criam
//     séries novas sem limite. Nenhum rótulo carrega brokerUrl,
//     usuário ou senha.
//  3. Todo método da fachada é embrulhado em try/catch: o server.js
//     encerra o processo em qualquer uncaughtException, então um bug
//     de métrica NUNCA pode chegar ao chamador.
// ============================================================
const client = require('prom-client');

const EVENTOS = ['pedido', 'entrega', 'erro', 'inicio'];
const ERROS_MQTT = ['conexao', 'json_invalido', 'publicacao', 'inscricao'];
const PECAS = ['A', 'B', 'C'];
const ESTEIRAS = ['principal', 'secA', 'secB', 'secC'];

const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');

/**
 * @param {object}   [opcoes]
 * @param {function} [opcoes.relogio]              ms monotônicos (injetável nos testes)
 * @param {number}   [opcoes.timeoutConfirmacaoMs] tempo máximo p/ o gateway confirmar um comando
 * @param {function} [opcoes.clientesWs]           quantos dashboards estão conectados agora
 * @param {object}   [opcoes.topicos]              objeto TOPICS do server.js (nome → tópico)
 */
function criarMetricas({
  relogio = () => performance.now(),
  timeoutConfirmacaoMs = 10000,
  clientesWs = () => 0,
  topicos = {},
} = {}) {
  // ---- Registro e métricas padrão ----
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });
  const topicosPermitidos = Object.values(topicos);

  // ---- Estado interno ----
  // Início (ms, no relógio injetado) da conexão atual com o broker; null se offline.
  let conectadoDesde = null;
  // Já houve alguma conexão? A primeira não conta como reconexão.
  let jaConectou = false;
  // Último status do gateway ('online' | 'offline'); null enquanto desconhecido.
  let gatewayAtual = null;
  const avisados = new Set();
  function avisar(nome, err) {
    if (avisados.has(nome)) return; // um aviso por método, para não inundar o log
    avisados.add(nome);
    console.warn(`[METRICS] ${nome} falhou (ignorado): ${err.message}`);
  }

  // ---- Definições ----
  const mensagens = new client.Counter({
    name: 'dfi_mqtt_messages_total',
    help: 'Mensagens MQTT recebidas, por tópico',
    labelNames: ['topic'],
    registers: [registry],
  });
  const conectado = new client.Gauge({
    name: 'dfi_mqtt_connected',
    help: '1 se o servidor está conectado ao broker MQTT, 0 se não',
    registers: [registry],
  });
  new client.Gauge({
    name: 'dfi_mqtt_uptime_seconds',
    help: 'Tempo (s) conectado ao broker sem cair; 0 se offline',
    registers: [registry],
    collect() {
      let segundos = 0;
      try {
        if (conectadoDesde !== null) segundos = Math.max(0, (relogio() - conectadoDesde) / 1000);
      } catch (err) {
        avisar('mqtt_uptime', err);
      }
      this.set(segundos);
    },
  });
  const reconexoes = new client.Counter({
    name: 'dfi_mqtt_reconnects_total',
    help: 'Conexões com o broker restabelecidas após uma queda',
    registers: [registry],
  });
  const errosMqtt = new client.Counter({
    name: 'dfi_mqtt_errors_total',
    help: 'Erros MQTT, por tipo',
    labelNames: ['tipo'],
    registers: [registry],
  });
  const gatewayOnline = new client.Gauge({
    name: 'dfi_gateway_online',
    help: '1 se o gateway ESP32 está online (LWT), 0 se não',
    registers: [registry],
  });
  const gatewayQuedas = new client.Counter({
    name: 'dfi_gateway_offline_total',
    help: 'Vezes em que o LWT do gateway ESP32 foi disparado (online → offline)',
    registers: [registry],
  });
  const eventos = new client.Counter({
    name: 'dfi_events_total',
    help: 'Eventos do Arduino recebidos, por tipo',
    labelNames: ['evento'],
    registers: [registry],
  });
  const estoqueGauge = new client.Gauge({
    name: 'dfi_stock_pieces',
    help: 'Peças em estoque, por tipo',
    labelNames: ['peca'],
    registers: [registry],
  });
  const esteiraGauge = new client.Gauge({
    name: 'dfi_conveyor_on',
    help: '1 se a esteira está ligada, 0 se parada',
    labelNames: ['esteira'],
    registers: [registry],
  });
  new client.Gauge({
    name: 'dfi_websocket_clients',
    help: 'Dashboards conectados por WebSocket',
    registers: [registry],
    collect() {
      let n = 0;
      try {
        n = Number(clientesWs()) || 0;
      } catch (err) {
        avisar('websocket_clients', err);
      }
      this.set(n);
    },
  });

  // ---- Operações ----
  function mensagemMqtt(topic) {
    mensagens.inc({ topic: permitido(topic, topicosPermitidos) });
  }

  function mqttConectou() {
    if (jaConectou) reconexoes.inc();
    jaConectou = true;
    conectadoDesde = relogio();
    conectado.set(1);
  }

  function mqttCaiu() {
    conectadoDesde = null;
    conectado.set(0);
  }

  function mqttErro(tipo) {
    errosMqtt.inc({ tipo: permitido(tipo, ERROS_MQTT) });
  }

  function gateway(status) {
    if (status === 'online') {
      gatewayOnline.set(1);
      gatewayAtual = 'online';
    } else if (status === 'offline') {
      gatewayOnline.set(0);
      // O LWT retido chega de novo a cada reconexão do servidor: só a transição conta.
      if (gatewayAtual === 'online') gatewayQuedas.inc();
      gatewayAtual = 'offline';
    }
  }

  function evento(nome) {
    eventos.inc({ evento: permitido(nome, EVENTOS) });
  }

  function estoque(msg) {
    for (const p of PECAS) {
      const v = msg && msg[`peca${p}`];
      if (typeof v === 'number' && Number.isFinite(v)) estoqueGauge.set({ peca: p }, v);
    }
  }

  function esteiras(msg) {
    for (const e of ESTEIRAS) {
      const v = msg && msg[e];
      if (v === true || v === 1) esteiraGauge.set({ esteira: e }, 1);
      else if (v === false || v === 0) esteiraGauge.set({ esteira: e }, 0);
    }
  }

  // ---- API pública ----
  const publico = {
    mensagemMqtt,
    mqttConectou,
    mqttCaiu,
    mqttErro,
    gateway,
    evento,
    estoque,
    esteiras,
  };

  // ---- Fachada à prova de falha ----
  const fachada = {};
  for (const [nome, fn] of Object.entries(publico)) {
    fachada[nome] = (...args) => {
      try {
        return fn(...args);
      } catch (err) {
        avisar(nome, err);
        return undefined;
      }
    };
  }
  fachada.contentType = registry.contentType;
  fachada.texto = () => registry.metrics();
  return fachada;
}

module.exports = { criarMetricas };
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd test/server_metrics && node --test unit/estado.test.mjs`
Expected: todos os 10 testes passam, sem `[METRICS]` no log (o teste da fachada silencia o `console.warn` com `mock`).

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/metrics.js test/server_metrics/unit/estado.test.mjs
git commit -m "feat(metricas): núcleo de métricas Prometheus (conexão, gateway, eventos, estoque, esteiras)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Casamento comando → confirmação e métricas de comando (TDD)

Cria o módulo **puro** `server/metrics-correlacao.js` (fila FIFO) e liga as métricas de comando em `server/metrics.js`: ack do publish, tempo de confirmação do gateway, resultado dos comandos, comandos sem resposta e confirmações órfãs.

**Files:**
- Create: `server/metrics-correlacao.js`
- Modify: `server/metrics.js` (6 edições em pontos de inserção de uma linha, listadas no Step 6)
- Test: `test/server_metrics/unit/correlacao.test.mjs`, `test/server_metrics/unit/comandos.test.mjs`

**Interfaces:**
- Consumes: `criarMetricas` e os pontos de inserção da Task 2; `valor` de `helpers/prom.mjs`.
- Produces:
  - `server/metrics-correlacao.js` exporta `{ CorrelacaoComandos, LIMITE_FILA }` (`LIMITE_FILA = 100`). `new CorrelacaoComandos({ limite? })` com:
    `registrar(acao, peca, t0) → { token: {chave, id}, descartados: number }`;
    `cancelar(token) → boolean`;
    `confirmar(acao, peca) → { t0 } | null` (com `peca`: fila exata `acao|peca`; sem `peca`: o mais antigo entre todas as filas da ação);
    `expirar(agora, timeoutMs) → number`;
    getter `pendentes → number`.
  - Novos métodos da fachada:
    `comandoAceito(acao, peca) → token`;
    `comandoFalhou(token)`;
    `publishAck(topic, segundos, ehComando = false)`;
    `comandoRecusado(motivo)`;
    `confirmacaoGateway({ acao, peca, status })`;
    `varrerPendentes()`.
  - Novas métricas: `dfi_mqtt_publish_ack_seconds{topic}` e `dfi_command_confirmation_seconds{acao,status}` (histogramas com buckets `0.005 … 10`), `dfi_commands_total{resultado}`, `dfi_command_unconfirmed_total`, `dfi_command_confirmation_orphan_total`.

- [ ] **Step 1: Testes do módulo de correlação (falhando)**

`test/server_metrics/unit/correlacao.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CorrelacaoComandos, LIMITE_FILA } from '../../../server/metrics-correlacao.js';

test('FIFO por chave: a confirmação casa com o comando pendente mais antigo', () => {
  const c = new CorrelacaoComandos();
  c.registrar('solicitar_peca', 'A', 1000);
  c.registrar('solicitar_peca', 'A', 1100);
  assert.deepEqual(c.confirmar('solicitar_peca', 'A'), { t0: 1000 });
  assert.deepEqual(c.confirmar('solicitar_peca', 'A'), { t0: 1100 });
  assert.equal(c.confirmar('solicitar_peca', 'A'), null);
  assert.equal(c.pendentes, 0);
});

test('com peça, só casa com a fila exata acao|peca', () => {
  const c = new CorrelacaoComandos();
  c.registrar('solicitar_peca', 'B', 1000);
  assert.equal(c.confirmar('solicitar_peca', 'A'), null);
  assert.deepEqual(c.confirmar('solicitar_peca', 'B'), { t0: 1000 });
});

test('sem peça (rejeição do gateway não ecoa a peça): casa com o mais antigo da mesma ação', () => {
  const c = new CorrelacaoComandos();
  c.registrar('solicitar_peca', 'C', 1050);
  c.registrar('solicitar_peca', 'A', 1000);
  c.registrar('reset', '', 900);
  assert.deepEqual(c.confirmar('solicitar_peca', ''), { t0: 1000 });
  assert.deepEqual(c.confirmar('solicitar_peca', undefined), { t0: 1050 });
  assert.equal(c.confirmar('solicitar_peca', ''), null);
  assert.deepEqual(c.confirmar('reset', ''), { t0: 900 });
});

test('cancelar remove só o comando indicado', () => {
  const c = new CorrelacaoComandos();
  const { token: a } = c.registrar('solicitar_peca', 'A', 1000);
  c.registrar('solicitar_peca', 'A', 1100);
  assert.equal(c.cancelar(a), true);
  assert.equal(c.cancelar(a), false, 'cancelar de novo não faz nada');
  assert.equal(c.cancelar(null), false);
  assert.deepEqual(c.confirmar('solicitar_peca', 'A'), { t0: 1100 });
});

test('expirar remove os pendentes com idade >= timeout e devolve quantos', () => {
  const c = new CorrelacaoComandos();
  c.registrar('solicitar_peca', 'A', 1000);
  c.registrar('reset', '', 5000);
  assert.equal(c.expirar(10999, 10000), 0, 'ainda não completou 10 s');
  assert.equal(c.expirar(11000, 10000), 1);
  assert.equal(c.pendentes, 1);
  assert.equal(c.expirar(15000, 10000), 1);
  assert.equal(c.pendentes, 0);
});

test('o limite por fila descarta os mais antigos e informa quantos', () => {
  assert.equal(LIMITE_FILA, 100);
  const c = new CorrelacaoComandos();
  let descartadosTotal = 0;
  for (let i = 0; i < 101; i++) descartadosTotal += c.registrar('solicitar_peca', 'A', i).descartados;
  assert.equal(descartadosTotal, 1);
  assert.equal(c.pendentes, 100);
  assert.deepEqual(c.confirmar('solicitar_peca', 'A'), { t0: 1 }, 'o t0=0 foi descartado');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test unit/correlacao.test.mjs`
Expected: FALHA com `Cannot find module '.../server/metrics-correlacao.js'`.

- [ ] **Step 3: Implementar `server/metrics-correlacao.js`**

```js
'use strict';
// ============================================================
// DATA FLOW INVENTORY — Correlação comando → confirmação
// ------------------------------------------------------------
// Fila FIFO de comandos que aguardam a confirmação do gateway
// ESP32 em dataflow/comandos/pub. O firmware NÃO devolve um id de
// correlação: a confirmação traz só acao (+ peca quando encaminha;
// a REJEIÇÃO não traz peca). O casamento é feito por ordem de chegada.
//
// Módulo PURO: sem prom-client, sem timers, sem I/O — o tempo entra
// como argumento, então é testável sem relógio real.
// ============================================================
const LIMITE_FILA = 100;

class CorrelacaoComandos {
  constructor({ limite = LIMITE_FILA } = {}) {
    this.limite = limite;
    this.filas = new Map(); // chave "acao|peca" → [{ id, t0 }]
    this.proximoId = 1;
  }

  static chave(acao, peca) {
    return `${acao}|${peca || ''}`;
  }

  /**
   * Registra um comando aguardando confirmação.
   * @returns {{ token: {chave: string, id: number}, descartados: number }}
   *   descartados = entradas mais antigas removidas por estourar o limite da fila.
   */
  registrar(acao, peca, t0) {
    const chave = CorrelacaoComandos.chave(acao, peca);
    let fila = this.filas.get(chave);
    if (!fila) {
      fila = [];
      this.filas.set(chave, fila);
    }
    const token = { chave, id: this.proximoId++ };
    fila.push({ id: token.id, t0 });
    let descartados = 0;
    while (fila.length > this.limite) {
      fila.shift();
      descartados++;
    }
    return { token, descartados };
  }

  /** Remove um comando pendente (ex.: o publish falhou). true se ele existia. */
  cancelar(token) {
    if (!token) return false;
    const fila = this.filas.get(token.chave);
    if (!fila) return false;
    const i = fila.findIndex((e) => e.id === token.id);
    if (i === -1) return false;
    fila.splice(i, 1);
    return true;
  }

  /**
   * Casa uma confirmação com o comando pendente mais antigo.
   * Com `peca`: fila exata acao|peca. Sem `peca` (a rejeição do gateway não ecoa a peça):
   * o mais antigo entre TODAS as filas da ação.
   * @returns {{ t0: number } | null} null se não havia pendente (confirmação órfã)
   */
  confirmar(acao, peca) {
    let alvo = null; // { fila, entrada }
    if (peca) {
      const fila = this.filas.get(CorrelacaoComandos.chave(acao, peca));
      if (fila && fila.length) alvo = { fila, entrada: fila[0] };
    } else {
      for (const [chave, fila] of this.filas) {
        if (!chave.startsWith(`${acao}|`) || !fila.length) continue;
        if (!alvo || fila[0].t0 < alvo.entrada.t0) alvo = { fila, entrada: fila[0] };
      }
    }
    if (!alvo) return null;
    alvo.fila.shift();
    return { t0: alvo.entrada.t0 };
  }

  /** Remove os pendentes com idade >= timeoutMs; devolve quantos expiraram. */
  expirar(agora, timeoutMs) {
    let expirados = 0;
    for (const fila of this.filas.values()) {
      while (fila.length && agora - fila[0].t0 >= timeoutMs) {
        fila.shift();
        expirados++;
      }
    }
    return expirados;
  }

  /** Quantos comandos aguardam confirmação. */
  get pendentes() {
    let n = 0;
    for (const fila of this.filas.values()) n += fila.length;
    return n;
  }
}

module.exports = { CorrelacaoComandos, LIMITE_FILA };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd test/server_metrics && node --test unit/correlacao.test.mjs`
Expected: 6 testes passam.

- [ ] **Step 5: Testes das métricas de comando (falhando)**

`test/server_metrics/unit/comandos.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMetricas } from '../../../server/metrics.js';
import { valor } from '../helpers/prom.mjs';

const TOPICOS = {
  status: 'dataflow/status',
  estoque: 'dataflow/estoque',
  eventos: 'dataflow/eventos',
  sensores: 'dataflow/sensores',
  esteiras: 'dataflow/esteiras',
  cmdSub: 'dataflow/comandos/sub',
  cmdPub: 'dataflow/comandos/pub',
  statusServer: 'dataflow/status/server',
};

function novo(extra = {}) {
  const relogio = { t: 1000 };
  const m = criarMetricas({ relogio: () => relogio.t, topicos: TOPICOS, ...extra });
  return { m, relogio, ler: async (nome, rotulos) => valor(await m.texto(), nome, rotulos) };
}

const ROT_ENC = { acao: 'solicitar_peca', status: 'encaminhado' };

test('comando aceito e confirmado: mede o tempo até a confirmação do gateway', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('solicitar_peca', 'A');
  relogio.t += 250;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  assert.equal(await ler('dfi_command_confirmation_seconds_count', ROT_ENC), 1);
  assert.equal(await ler('dfi_command_confirmation_seconds_sum', ROT_ENC), 0.25);
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 0);
});

test('dois comandos iguais pendentes são confirmados em ordem (FIFO)', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('solicitar_peca', 'A'); // t = 1000
  relogio.t = 1100;
  m.comandoAceito('solicitar_peca', 'A'); // t = 1100
  relogio.t = 1300;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' }); // 0,3 s
  relogio.t = 1400;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' }); // 0,3 s
  assert.equal(await ler('dfi_command_confirmation_seconds_count', ROT_ENC), 2);
  const soma = await ler('dfi_command_confirmation_seconds_sum', ROT_ENC);
  assert.ok(Math.abs(soma - 0.6) < 1e-9, `soma = ${soma}`);
});

test('confirmação sem comando pendente é contada como órfã e não vira latência', async () => {
  const { m, ler } = novo();
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 1);
  assert.equal(await ler('dfi_command_confirmation_seconds_count', ROT_ENC), null);
});

test('rejeição do gateway (sem peça) casa com o comando mais antigo da mesma ação', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('solicitar_peca', 'A'); // t = 1000
  relogio.t = 1050;
  m.comandoAceito('solicitar_peca', 'B'); // t = 1050
  relogio.t = 1200;
  m.confirmacaoGateway({ acao: 'solicitar_peca', status: 'rejeitado' }); // casa com A: 0,2 s
  const rot = { acao: 'solicitar_peca', status: 'rejeitado' };
  assert.equal(await ler('dfi_command_confirmation_seconds_count', rot), 1);
  assert.equal(await ler('dfi_command_confirmation_seconds_sum', rot), 0.2);
  relogio.t = 1300;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'B', status: 'encaminhado' }); // B continua pendente
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 0);
});

test('comando sem confirmação expira no timeout e passa a contar como "sem resposta"', async () => {
  const { m, relogio, ler } = novo({ timeoutConfirmacaoMs: 10000 });
  m.comandoAceito('solicitar_peca', 'A'); // t = 1000
  relogio.t = 10999;
  m.varrerPendentes();
  assert.equal(await ler('dfi_command_unconfirmed_total'), 0, 'ainda dentro do prazo');
  relogio.t = 11000;
  m.varrerPendentes();
  assert.equal(await ler('dfi_command_unconfirmed_total'), 1);
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 1, 'confirmação tardia é órfã');
});

test('publish que falhou cancela o pendente e conta falha_publicacao', async () => {
  const { m, relogio, ler } = novo();
  const token = m.comandoAceito('solicitar_peca', 'B');
  m.comandoFalhou(token);
  assert.equal(await ler('dfi_commands_total', { resultado: 'falha_publicacao' }), 1);
  relogio.t = 50000;
  m.varrerPendentes();
  assert.equal(await ler('dfi_command_unconfirmed_total'), 0, 'o comando cancelado não expira');
  m.comandoFalhou(undefined); // token ausente não quebra nem deixa de contar a falha
  assert.equal(await ler('dfi_commands_total', { resultado: 'falha_publicacao' }), 2);
});

test('mais de 100 pendentes na mesma fila: o mais antigo é descartado e contado como sem resposta', async () => {
  const { m, ler } = novo();
  for (let i = 0; i < 101; i++) m.comandoAceito('solicitar_peca', 'A');
  assert.equal(await ler('dfi_command_unconfirmed_total'), 1);
});

test('ação e status desconhecidos viram "outro"', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('inventada', 'A');
  relogio.t += 100;
  m.confirmacaoGateway({ acao: 'inventada', status: 'estranho' });
  assert.equal(await ler('dfi_command_confirmation_seconds_count', { acao: 'outro', status: 'outro' }), 1);
});

test('publishAck mede o PUBACK por tópico e só conta "publicado" quando é comando', async () => {
  const { m, ler } = novo();
  m.publishAck(TOPICOS.cmdSub, 0.004, true);
  m.publishAck(TOPICOS.statusServer, 0.01);
  m.publishAck(TOPICOS.cmdSub, Number.NaN, true); // duração inválida não entra no histograma
  const cmd = { topic: 'dataflow/comandos/sub' };
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_count', cmd), 1);
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_sum', cmd), 0.004);
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_bucket', { ...cmd, le: '0.005' }), 1);
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_count', { topic: 'dataflow/status/server' }), 1);
  assert.equal(await ler('dfi_commands_total', { resultado: 'publicado' }), 2);
});

test('comandoRecusado usa a lista permitida de motivos', async () => {
  const { m, ler } = novo();
  m.comandoRecusado('peca_invalida');
  m.comandoRecusado('rate_limit');
  m.comandoRecusado('rate_limit');
  m.comandoRecusado('broker_offline');
  m.comandoRecusado('qualquer');
  assert.equal(await ler('dfi_commands_total', { resultado: 'peca_invalida' }), 1);
  assert.equal(await ler('dfi_commands_total', { resultado: 'rate_limit' }), 2);
  assert.equal(await ler('dfi_commands_total', { resultado: 'broker_offline' }), 1);
  assert.equal(await ler('dfi_commands_total', { resultado: 'outro' }), 1);
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test unit/comandos.test.mjs`
Expected: os testes FALHAM com `m.comandoAceito is not a function` (a fachada da Task 2 não tem esses métodos).

- [ ] **Step 7: Estender `server/metrics.js` (6 edições, cada uma com `old_string` de UMA linha)**

**Edição A** — `old_string`: `const client = require('prom-client');`
`new_string`:
```js
const client = require('prom-client');
const { CorrelacaoComandos } = require('./metrics-correlacao');
```

**Edição B** — `old_string`: `const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');`
`new_string`:
```js
const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');

const ACOES = ['solicitar_peca', 'reset'];
const STATUS_CONFIRMACAO = ['encaminhado', 'rejeitado'];
const RESULTADOS_RECUSA = ['peca_invalida', 'rate_limit', 'broker_offline'];
const BUCKETS_MQTT = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
```

**Edição C** — `old_string`: `  let gatewayAtual = null;`
`new_string`:
```js
  let gatewayAtual = null;
  // Comandos aguardando a confirmação do gateway (fila FIFO por ação|peça).
  const correlacao = new CorrelacaoComandos();
```

**Edição D** — `old_string`: `  // ---- Operações ----`
`new_string`:
```js
  const publishAckHist = new client.Histogram({
    name: 'dfi_mqtt_publish_ack_seconds',
    help: 'Tempo entre o publish e o PUBACK do broker (QoS 1)',
    labelNames: ['topic'],
    buckets: BUCKETS_MQTT,
    registers: [registry],
  });
  const confirmacaoHist = new client.Histogram({
    name: 'dfi_command_confirmation_seconds',
    help: 'Tempo entre o comando ser aceito e a confirmação do gateway ESP32',
    labelNames: ['acao', 'status'],
    buckets: BUCKETS_MQTT,
    registers: [registry],
  });
  const comandos = new client.Counter({
    name: 'dfi_commands_total',
    help: 'Comandos do dashboard, por resultado',
    labelNames: ['resultado'],
    registers: [registry],
  });
  const semResposta = new client.Counter({
    name: 'dfi_command_unconfirmed_total',
    help: 'Comandos sem confirmação do gateway dentro do timeout',
    registers: [registry],
  });
  const orfas = new client.Counter({
    name: 'dfi_command_confirmation_orphan_total',
    help: 'Confirmações do gateway sem comando pendente',
    registers: [registry],
  });

  // ---- Operações ----
```

**Edição E** — `old_string`: `  // ---- API pública ----`
`new_string`:
```js
  const normalizarPeca = (peca) => (PECAS.includes(peca) ? peca : '');

  // O t0 é registrado ANTES do publish: a confirmação do gateway poderia, em tese, chegar antes do PUBACK.
  function comandoAceito(acao, peca) {
    const { token, descartados } = correlacao.registrar(permitido(acao, ACOES), normalizarPeca(peca), relogio());
    if (descartados) semResposta.inc(descartados);
    return token;
  }

  function comandoFalhou(token) {
    correlacao.cancelar(token);
    comandos.inc({ resultado: 'falha_publicacao' });
  }

  function publishAck(topic, segundos, ehComando = false) {
    if (Number.isFinite(segundos)) {
      publishAckHist.observe({ topic: permitido(topic, topicosPermitidos) }, segundos);
    }
    if (ehComando) comandos.inc({ resultado: 'publicado' });
  }

  function comandoRecusado(motivo) {
    comandos.inc({ resultado: permitido(motivo, RESULTADOS_RECUSA) });
  }

  function confirmacaoGateway({ acao, peca, status } = {}) {
    const acaoOk = permitido(acao, ACOES);
    const casado = correlacao.confirmar(acaoOk, normalizarPeca(peca));
    if (!casado) {
      orfas.inc();
      return;
    }
    const segundos = (relogio() - casado.t0) / 1000;
    confirmacaoHist.observe({ acao: acaoOk, status: permitido(status, STATUS_CONFIRMACAO) }, segundos);
  }

  function varrerPendentes() {
    const expirados = correlacao.expirar(relogio(), timeoutConfirmacaoMs);
    if (expirados) semResposta.inc(expirados);
  }

  // ---- API pública ----
```

**Edição F** — `old_string`: `  const publico = {`
`new_string`:
```js
  const publico = {
    comandoAceito,
    comandoFalhou,
    publishAck,
    comandoRecusado,
    confirmacaoGateway,
    varrerPendentes,
```

- [ ] **Step 8: Rodar tudo da unidade**

Run: `cd test/server_metrics && node --test "unit/*.test.mjs"`
Expected: `estado` (10), `correlacao` (6) e `comandos` (10) passam — 26 testes, 0 falhas.

- [ ] **Step 9: Commit**

```bash
git add server/metrics.js server/metrics-correlacao.js test/server_metrics/unit/correlacao.test.mjs test/server_metrics/unit/comandos.test.mjs
git commit -m "feat(metricas): casamento comando → confirmação do gateway e métricas de comando" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Middleware HTTP — tempo de resposta da API por rota (TDD)

**Files:**
- Modify: `server/metrics.js` (4 edições em pontos de inserção de uma linha)
- Test: `test/server_metrics/unit/http.test.mjs`

**Interfaces:**
- Consumes: `criarMetricas` (Tasks 2–3).
- Produces: método `middlewareHttp() → (req, res, next) => void` (Express) e a métrica `dfi_http_request_duration_seconds{rota,metodo,codigo}` (histograma, buckets `0.001 … 2.5`). `rota` = `req.route.path`; `nao_encontrada` para 404 sem rota; `estatico` para o resto. Requisições a `/metrics` não são medidas.

- [ ] **Step 1: Testes (falhando)**

`test/server_metrics/unit/http.test.mjs`:

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { criarMetricas } from '../../../server/metrics.js';
import { valor } from '../helpers/prom.mjs';

function novo() {
  const relogio = { t: 1000 };
  const m = criarMetricas({ relogio: () => relogio.t });
  return { m, relogio, ler: async (nome, rotulos) => valor(await m.texto(), nome, rotulos) };
}

/** Simula uma requisição atravessando o middleware; `duracaoMs` passa no relógio falso. */
function requisicao(m, relogio, { path, method = 'GET', rota, status = 200, duracaoMs = 20 }) {
  const req = { path, method, route: rota ? { path: rota } : undefined };
  const res = new EventEmitter();
  res.statusCode = status;
  let chamadas = 0;
  m.middlewareHttp()(req, res, () => { chamadas++; });
  relogio.t += duracaoMs;
  res.emit('finish');
  return chamadas;
}

test('mede a duração por rota, método e código, e chama next() uma vez', async () => {
  const { m, relogio, ler } = novo();
  const chamadas = requisicao(m, relogio, { path: '/api/status', rota: '/api/status', status: 200, duracaoMs: 20 });
  assert.equal(chamadas, 1);
  const rot = { rota: '/api/status', metodo: 'GET', codigo: '200' };
  assert.equal(await ler('dfi_http_request_duration_seconds_count', rot), 1);
  assert.equal(await ler('dfi_http_request_duration_seconds_sum', rot), 0.02);
  assert.equal(await ler('dfi_http_request_duration_seconds_bucket', { ...rot, le: '0.025' }), 1);
});

test('sem rota: 404 vira "nao_encontrada" e o resto vira "estatico" (a URL nunca vira rótulo)', async () => {
  const { m, relogio, ler } = novo();
  requisicao(m, relogio, { path: '/qualquer/coisa/123', status: 404 });
  requisicao(m, relogio, { path: '/css/style.css', status: 200 });
  requisicao(m, relogio, { path: '/js/app.js', status: 304 });
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: 'nao_encontrada', codigo: '404' }), 1);
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: 'estatico' }), 2);
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: '/qualquer/coisa/123' }), null);
});

test('o próprio /metrics não entra na medição', async () => {
  const { m, relogio, ler } = novo();
  requisicao(m, relogio, { path: '/metrics', rota: '/metrics' });
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: '/metrics' }), null);
});

test('método HTTP fora da lista vira "outro"', async () => {
  const { m, relogio, ler } = novo();
  requisicao(m, relogio, { path: '/api/status', rota: '/api/status', method: 'BREW' });
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { metodo: 'outro' }), 1);
});

test('res sem .on() não quebra: o aviso vai ao log e next() ainda é chamado', () => {
  const aviso = mock.method(console, 'warn', () => {});
  const { m } = novo();
  let chamadas = 0;
  assert.doesNotThrow(() => m.middlewareHttp()({ path: '/', method: 'GET' }, {}, () => { chamadas++; }));
  assert.equal(chamadas, 1);
  assert.ok(aviso.mock.callCount() >= 1);
  aviso.mock.restore();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test unit/http.test.mjs`
Expected: FALHA com `m.middlewareHttp is not a function`.

- [ ] **Step 3: Estender `server/metrics.js` (4 edições)**

**Edição A** — `old_string`: `const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');`
`new_string`:
```js
const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');

const METODOS_HTTP = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BUCKETS_HTTP = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];
```

**Edição B** — `old_string`: `  // ---- Operações ----`
`new_string`:
```js
  const httpHist = new client.Histogram({
    name: 'dfi_http_request_duration_seconds',
    help: 'Tempo de resposta da API HTTP, por rota',
    labelNames: ['rota', 'metodo', 'codigo'],
    buckets: BUCKETS_HTTP,
    registers: [registry],
  });

  // ---- Operações ----
```

**Edição C** — `old_string`: `  // ---- API pública ----`
`new_string`:
```js
  // Middleware do Express: mede no evento "finish" da resposta. O rótulo "rota" vem da rota
  // registrada (nunca da URL), então requisições arbitrárias não criam séries novas.
  function middlewareHttp() {
    return (req, res, next) => {
      try {
        const t0 = relogio();
        res.on('finish', () => {
          try {
            if (req.path === '/metrics') return; // o scrape não entra nos percentis da API
            const rota = req.route && typeof req.route.path === 'string'
              ? req.route.path
              : (res.statusCode === 404 ? 'nao_encontrada' : 'estatico');
            httpHist.observe(
              { rota, metodo: permitido(req.method, METODOS_HTTP), codigo: String(res.statusCode) },
              (relogio() - t0) / 1000,
            );
          } catch (err) {
            avisar('middlewareHttp', err);
          }
        });
      } catch (err) {
        avisar('middlewareHttp', err);
      }
      next();
    };
  }

  // ---- API pública ----
```

**Edição D** — `old_string`: `  const publico = {`
`new_string`:
```js
  const publico = {
    middlewareHttp,
```

- [ ] **Step 4: Rodar tudo da unidade**

Run: `cd test/server_metrics && node --test "unit/*.test.mjs"`
Expected: 31 testes passam (`estado` 10 + `correlacao` 6 + `comandos` 10 + `http` 5), 0 falhas, sem `[METRICS]` no log.

- [ ] **Step 5: Commit**

```bash
git add server/metrics.js test/server_metrics/unit/http.test.mjs
git commit -m "feat(metricas): middleware HTTP com tempo de resposta da API por rota" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ligar as métricas ao `server.js` — `GET /metrics`, conexão, mensagens e API (TDD de integração)

Escreve primeiro os testes de integração (com broker `aedes` em processo e o `server.js` real) e depois pendura os ganchos de conexão, mensagens e HTTP, mais a rota `GET /metrics`. Os ganchos de **comandos** ficam para a Task 6.

**Files:**
- Modify: `server/server.js` (edições S1–S15), `server/.env.example`
- Test: `test/server_metrics/integracao/endpoint.test.mjs`, `broker-fora.test.mjs`, `mensagens.test.mjs`, `conexao.test.mjs`

**Interfaces:**
- Consumes: `criarMetricas` e sua fachada (Tasks 2–4); helpers da Task 1.
- Produces: `const prom = criarMetricas({...})` em `server.js`; `GET /metrics` (Content-Type `text/plain; version=0.0.4`); variável de ambiente `METRICS_CONFIRMACAO_TIMEOUT_MS` (padrão 10000).

- [ ] **Step 1: Testes de integração (falhando)**

`test/server_metrics/integracao/endpoint.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor, familias } from '../helpers/prom.mjs';

let broker;
let servidor;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
});

after(async () => {
  await servidor?.parar();
  await broker?.parar();
});

test('GET /metrics responde no formato Prometheus, com as métricas dfi_ e as padrão do processo', async () => {
  const { status, tipo, texto } = await servidor.metricas();
  assert.equal(status, 200);
  assert.match(tipo, /^text\/plain/);
  assert.ok(familias(texto).has('dfi_mqtt_connected'));
  assert.ok(texto.includes('process_cpu_user_seconds_total'));
});

test('ao conectar no broker: mqtt_connected = 1, uptime > 0 e nenhuma reconexão', async () => {
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_connected') === 1, {
    descricao: 'dfi_mqtt_connected = 1',
  });
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_uptime_seconds') > 0, {
    descricao: 'dfi_mqtt_uptime_seconds > 0',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_mqtt_reconnects_total'), 0);
});

test('a API é medida por rota e o próprio /metrics não entra na medição', async () => {
  await fetch(`${servidor.url}/api/status`);
  await fetch(`${servidor.url}/nao-existe-mesmo`);
  await fetch(`${servidor.url}/css/style.css`);
  await servidor.texto(); // um scrape antes da leitura, para provar que ele não é medido
  const texto = await servidor.texto();
  const HIST = 'dfi_http_request_duration_seconds_count';
  assert.ok(valor(texto, HIST, { rota: '/api/status', metodo: 'GET', codigo: '200' }) >= 1);
  assert.equal(valor(texto, HIST, { rota: 'nao_encontrada', codigo: '404' }), 1);
  assert.ok(valor(texto, HIST, { rota: 'estatico' }) >= 1);
  assert.equal(valor(texto, HIST, { rota: '/metrics' }), null);
});
```

`test/server_metrics/integracao/broker-fora.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let servidor;

before(async () => {
  // Porta 1: nada escuta lá → ECONNREFUSED (o mesmo truque do teste de CSP do frontend).
  servidor = await iniciarServidor({ brokerPorta: 1 });
});

after(async () => {
  await servidor?.parar();
});

test('sem broker: /metrics responde 200, mqtt_connected = 0, uptime = 0 e o erro de conexão é contado', async () => {
  const { status, texto } = await servidor.metricas();
  assert.equal(status, 200);
  assert.equal(valor(texto, 'dfi_mqtt_connected'), 0);
  assert.equal(valor(texto, 'dfi_mqtt_uptime_seconds'), 0);
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_errors_total', { tipo: 'conexao' }) >= 1, {
    descricao: 'um erro de conexão contado',
  });
});

test('sem broker: /api/status continua respondendo 503 e a API mede o código 503', async () => {
  const { status } = await servidor.status();
  assert.equal(status, 503);
  const texto = await servidor.texto();
  assert.ok(valor(texto, 'dfi_http_request_duration_seconds_count', { rota: '/api/status', codigo: '503' }) >= 1);
});
```

`test/server_metrics/integracao/mensagens.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;
let gateway;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
  gateway = await criarGateway(broker.porta, { modo: 'mudo' });
});

after(async () => {
  gateway?.fechar();
  await servidor?.parar();
  await broker?.parar();
});

test('estoque, esteiras, eventos e mensagens por tópico chegam nas métricas', async () => {
  await gateway.publicar('dataflow/estoque', { type: 'estoque', pecaA: 4, pecaB: 5, pecaC: 2 }, { retain: true });
  await gateway.publicar('dataflow/esteiras', { principal: true, secA: false, secB: false, secC: true });
  await gateway.publicar('dataflow/eventos', { type: 'evento', evento: 'entrega', peca: 'A' });
  await gateway.publicar('dataflow/eventos', { type: 'evento', evento: 'inventado', peca: 'A' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_events_total', { evento: 'outro' }) === 1, {
    descricao: 'os eventos serem contados',
  });
  const texto = await servidor.texto();
  assert.equal(valor(texto, 'dfi_stock_pieces', { peca: 'A' }), 4);
  assert.equal(valor(texto, 'dfi_stock_pieces', { peca: 'B' }), 5);
  assert.equal(valor(texto, 'dfi_stock_pieces', { peca: 'C' }), 2);
  assert.equal(valor(texto, 'dfi_conveyor_on', { esteira: 'principal' }), 1);
  assert.equal(valor(texto, 'dfi_conveyor_on', { esteira: 'secA' }), 0);
  assert.equal(valor(texto, 'dfi_conveyor_on', { esteira: 'secC' }), 1);
  assert.equal(valor(texto, 'dfi_events_total', { evento: 'entrega' }), 1);
  assert.ok(valor(texto, 'dfi_mqtt_messages_total', { topic: 'dataflow/estoque' }) >= 1);
  assert.ok(valor(texto, 'dfi_mqtt_messages_total', { topic: 'dataflow/eventos' }) >= 2);
});

test('payload que não é JSON é contado como erro e não derruba o servidor', async () => {
  await gateway.publicar('dataflow/eventos', 'isto-nao-e-json');
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_errors_total', { tipo: 'json_invalido' }) === 1, {
    descricao: 'o erro json_invalido ser contado',
  });
  const { status } = await servidor.status();
  assert.equal(status, 200);
});
```

`test/server_metrics/integracao/conexao.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
});

after(async () => {
  await servidor?.parar();
  await broker?.parar();
});

test('LWT: a queda forçada do gateway conta exatamente uma queda (online → offline)', async () => {
  const gateway = await criarGateway(broker.porta); // anuncia online (retido) e registra o LWT
  await esperar(async () => valor(await servidor.texto(), 'dfi_gateway_online') === 1, {
    descricao: 'gateway_online = 1',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_gateway_offline_total'), 0);
  gateway.cair();
  await esperar(async () => valor(await servidor.texto(), 'dfi_gateway_offline_total') === 1, {
    descricao: 'gateway_offline_total = 1',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_gateway_online'), 0);
});

test('reconexão: o broker cai e volta → mqtt_connected 0 → 1 e reconnects_total = 1', async () => {
  await broker.parar();
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_connected') === 0, {
    timeoutMs: 15000,
    descricao: 'mqtt_connected = 0 depois da queda do broker',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_mqtt_uptime_seconds'), 0);

  await broker.reiniciar(); // o servidor tenta reconectar a cada 5 s
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_connected') === 1, {
    timeoutMs: 30000,
    descricao: 'mqtt_connected = 1 depois do broker voltar',
  });
  const texto = await servidor.texto();
  assert.equal(valor(texto, 'dfi_mqtt_reconnects_total'), 1);
  assert.ok(valor(texto, 'dfi_mqtt_uptime_seconds') < 30, 'o uptime recomeça a contar do zero');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test integracao/endpoint.test.mjs`
Expected: o 1º teste FALHA (`/metrics` responde 404 em vez de 200) e os demais falham por tempo esgotado (~10 s cada). Isso é o RED esperado.

- [ ] **Step 3: Editar `server/server.js` (edições S1–S15, nesta ordem)**

Cada `old_string` deve aparecer **exatamente uma vez** no arquivo; se não aparecer, pare e reporte (não improvise âncora).

**Edição S1** — importar o módulo
`old_string`:
```js
const path = require('path');
```
`new_string`:
```js
const path = require('path');
const { criarMetricas } = require('./metrics');
```

**Edição S2** — timeout configurável da confirmação
`old_string`:
```js
const COMANDO_INTERVALO_MS = parseInt(process.env.COMANDO_INTERVALO_MS, 10) || 500;
```
`new_string`:
```js
const COMANDO_INTERVALO_MS = parseInt(process.env.COMANDO_INTERVALO_MS, 10) || 500;

// Tempo máximo (ms) para o gateway confirmar um comando; passado disso o comando
// conta em dfi_command_unconfirmed_total (métricas Prometheus).
const METRICS_CONFIRMACAO_TIMEOUT_MS = parseInt(process.env.METRICS_CONFIRMACAO_TIMEOUT_MS, 10) || 10000;
```

**Edição S3** — criar a instância de métricas (depois de `TOPICS` e `io`, antes do helmet)
`old_string`:
```js
// Headers de segurança (CSP liberada para o CDN do Socket.IO e Google Fonts,
```
`new_string`:
```js
// Métricas de performance para o Prometheus (GET /metrics). Módulo isolado: todo método
// é à prova de falha, então um bug de métrica nunca derruba o servidor.
// (O objeto "metricas" acima é o contador simples do /api/status e continua como está.)
const prom = criarMetricas({
  timeoutConfirmacaoMs: METRICS_CONFIRMACAO_TIMEOUT_MS,
  clientesWs: () => io.engine.clientsCount,
  topicos: TOPICS,
});

// Headers de segurança (CSP liberada para o CDN do Socket.IO e Google Fonts,
```

**Edição S4** — middleware de tempo de resposta (antes de qualquer rota)
`old_string`:
```js
// Serve arquivos estáticos do frontend
```
`new_string`:
```js
// Tempo de resposta da API por rota (registrado antes das rotas para medir todas)
app.use(prom.middlewareHttp());

// Serve arquivos estáticos do frontend
```

**Edição S5** — rota `GET /metrics` (logo depois de `/api/status`)
`old_string`:
```js
    timestamp: new Date().toISOString()
  });
});
```
`new_string`:
```js
    timestamp: new Date().toISOString()
  });
});

// Métricas Prometheus (mesmo padrão aberto do /api/status; sem brokerUrl/usuário/senha nos
// rótulos). Nunca lança: em caso de erro responde 500 e o servidor segue de pé.
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prom.contentType);
    res.end(await prom.texto());
  } catch (err) {
    console.error('[METRICS] Falha ao gerar as métricas:', err.message);
    res.status(500).end('erro ao gerar as métricas');
  }
});
```

**Edição S6** — conexão estabelecida
`old_string`:
```js
mqttClient.on('connect', () => {
```
`new_string`:
```js
mqttClient.on('connect', () => {
  prom.mqttConectou();
```

**Edição S7** — erro ao assinar um tópico
`old_string`:
```js
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
```
`new_string`:
```js
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) prom.mqttErro('inscricao');
```

**Edição S8** — erro de conexão
`old_string`:
```js
mqttClient.on('error', (err) => {
```
`new_string`:
```js
mqttClient.on('error', (err) => {
  prom.mqttErro('conexao');
```

**Edição S9** — broker offline
`old_string`:
```js
mqttClient.on('offline', () => {
```
`new_string`:
```js
mqttClient.on('offline', () => {
  prom.mqttCaiu();
```

**Edição S10** — toda mensagem recebida
`old_string`:
```js
mqttClient.on('message', (topic, message) => {
```
`new_string`:
```js
mqttClient.on('message', (topic, message) => {
  prom.mensagemMqtt(topic);
```

**Edição S11** — payload que não é JSON
`old_string`:
```js
  } catch (e) {
```
`new_string`:
```js
  } catch (e) {
    prom.mqttErro('json_invalido');
```

**Edição S12** — status do gateway (LWT)
`old_string`:
```js
        estadoAtual.gateway = msgJson;
```
`new_string`:
```js
        estadoAtual.gateway = msgJson;
        prom.gateway(msgJson.status);
```

**Edição S13** — estoque
`old_string`:
```js
      estadoAtual.estoque = msgJson;
```
`new_string`:
```js
      estadoAtual.estoque = msgJson;
      prom.estoque(msgJson);
```

**Edição S14** — eventos por tipo
`old_string`:
```js
      io.emit('evento', msgJson);
```
`new_string`:
```js
      prom.evento(msgJson.evento);
      io.emit('evento', msgJson);
```

**Edição S15** — esteiras
`old_string`:
```js
      estadoAtual.esteiras = msgJson;
```
`new_string`:
```js
      estadoAtual.esteiras = msgJson;
      prom.esteiras(msgJson);
```

- [ ] **Step 4: Documentar a variável nova em `server/.env.example`**

`old_string`:
```
MQTT_TOPIC_STATUS_SERVER=dataflow/status/server
```
`new_string`:
```
MQTT_TOPIC_STATUS_SERVER=dataflow/status/server

# ============================================================
# MÉTRICAS DE PERFORMANCE (Prometheus) — GET /metrics
# ============================================================
# Tempo máximo (ms) para o gateway ESP32 confirmar um comando antes de ele
# contar como "sem resposta" (dfi_command_unconfirmed_total). Padrão: 10000.
METRICS_CONFIRMACAO_TIMEOUT_MS=10000
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd test/server_metrics && node --test integracao/endpoint.test.mjs integracao/broker-fora.test.mjs integracao/mensagens.test.mjs integracao/conexao.test.mjs`
Expected: todos passam (a reconexão leva ~5–10 s por causa do `reconnectPeriod` de 5 s do servidor).
Depois: `npm test` (tudo: unitários + integração) sem falhas. Rode também `cd ../.. && node -e "require('./server/metrics')"` sem erro.

- [ ] **Step 6: Commit**

```bash
git add server/server.js server/.env.example test/server_metrics/integracao/endpoint.test.mjs test/server_metrics/integracao/broker-fora.test.mjs test/server_metrics/integracao/mensagens.test.mjs test/server_metrics/integracao/conexao.test.mjs
git commit -m "feat(metricas): GET /metrics e ganchos de conexão, mensagens e API no server.js" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ganchos do fluxo de comandos no `server.js` (TDD de integração)

**Files:**
- Modify: `server/server.js` (edições S16–S21)
- Test: `test/server_metrics/integracao/comandos.test.mjs`, `comandos-sem-resposta.test.mjs`, `comandos-recusados.test.mjs`

**Interfaces:**
- Consumes: `prom.comandoAceito/comandoFalhou/publishAck/comandoRecusado/confirmacaoGateway/varrerPendentes` (Task 3); `criarGateway` (modos `confirmar`/`rejeitar`/`mudo`) e `conectarDashboard` (Task 1).
- Produces: o fluxo completo de comandos medido pelo servidor real.

- [ ] **Step 1: Testes (falhando)**

`test/server_metrics/integracao/comandos.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
});

after(async () => {
  await servidor?.parar();
  await broker?.parar();
});

const CONF = { acao: 'solicitar_peca', status: 'encaminhado' };

test('comando aceito: PUBACK medido, resultado "publicado" e tempo até a confirmação do gateway', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'confirmar' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', CONF) === 1, {
    descricao: 'a confirmação do gateway ser medida',
  });
  const texto = await servidor.texto();
  assert.equal(valor(texto, 'dfi_commands_total', { resultado: 'publicado' }), 1);
  assert.equal(valor(texto, 'dfi_mqtt_publish_ack_seconds_count', { topic: 'dataflow/comandos/sub' }), 1);
  const soma = valor(texto, 'dfi_command_confirmation_seconds_sum', CONF);
  assert.ok(soma > 0 && soma < 5, `tempo de confirmação plausível (${soma} s)`);
  assert.equal(valor(texto, 'dfi_command_confirmation_orphan_total'), 0);
  assert.equal(valor(texto, 'dfi_command_unconfirmed_total'), 0);
  dashboard.fechar();
  gateway.fechar();
});

test('reset também é medido, com a ação "reset"', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'confirmar' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('reset_sistema');
  await esperar(
    async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', { acao: 'reset', status: 'encaminhado' }) === 1,
    { descricao: 'a confirmação do reset ser medida' },
  );
  dashboard.fechar();
  gateway.fechar();
});

test('rejeição do gateway (sem peça no payload) casa com o comando pendente', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'rejeitar' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'B' });
  await esperar(
    async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', { acao: 'solicitar_peca', status: 'rejeitado' }) === 1,
    { descricao: 'a rejeição do gateway ser medida' },
  );
  dashboard.fechar();
  gateway.fechar();
});

test('confirmação sem comando pendente é contada como órfã', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'mudo' });
  await gateway.publicar('dataflow/comandos/pub', { type: 'comando', acao: 'reset', status: 'encaminhado' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_confirmation_orphan_total') === 1, {
    descricao: 'a confirmação órfã ser contada',
  });
  gateway.fechar();
});

test('peça inválida é recusada pelo servidor e nada vai ao broker', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'mudo' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'Z' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'peca_invalida' }) === 1, {
    descricao: 'a recusa peca_invalida ser contada',
  });
  assert.equal(gateway.recebidos.length, 0);
  dashboard.fechar();
  gateway.fechar();
});
```

`test/server_metrics/integracao/comandos-sem-resposta.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;
let gateway;

before(async () => {
  broker = await iniciarBroker();
  // Timeout curto (300 ms) só nesta suíte; o varredor do servidor roda a cada 1 s.
  servidor = await iniciarServidor({ brokerPorta: broker.porta, env: { METRICS_CONFIRMACAO_TIMEOUT_MS: '300' } });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
  gateway = await criarGateway(broker.porta, { modo: 'mudo' });
});

after(async () => {
  gateway?.fechar();
  await servidor?.parar();
  await broker?.parar();
});

test('gateway mudo: o comando expira como "sem resposta" e a confirmação tardia vira órfã', async () => {
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_unconfirmed_total') === 1, {
    timeoutMs: 8000,
    descricao: 'o comando sem resposta ser contado',
  });
  await gateway.publicar('dataflow/comandos/pub', { type: 'comando', acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_confirmation_orphan_total') === 1, {
    descricao: 'a confirmação tardia ser contada como órfã',
  });
  dashboard.fechar();
});
```

`test/server_metrics/integracao/comandos-recusados.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

test('rate limit: o 2º comando do mesmo cliente dentro do intervalo é recusado', async () => {
  const broker = await iniciarBroker();
  const servidor = await iniciarServidor({ brokerPorta: broker.porta, env: { COMANDO_INTERVALO_MS: '5000' } });
  try {
    await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
    const gateway = await criarGateway(broker.porta, { modo: 'confirmar' });
    const dashboard = await conectarDashboard(servidor.url);
    dashboard.socket.emit('solicitar_peca', { peca: 'A' });
    dashboard.socket.emit('solicitar_peca', { peca: 'B' });
    await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'rate_limit' }) === 1, {
      descricao: 'a recusa rate_limit ser contada',
    });
    await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'publicado' }) === 1, {
      descricao: 'o 1º comando ser publicado',
    });
    dashboard.fechar();
    gateway.fechar();
  } finally {
    await servidor.parar();
    await broker.parar();
  }
});

test('broker offline: o comando é recusado com "broker_offline" e o dashboard recebe o erro', async () => {
  const servidor = await iniciarServidor({ brokerPorta: 1 }); // nada escuta na porta 1
  try {
    const dashboard = await conectarDashboard(servidor.url);
    dashboard.socket.emit('solicitar_peca', { peca: 'A' });
    await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'broker_offline' }) === 1, {
      descricao: 'a recusa broker_offline ser contada',
    });
    assert.equal(dashboard.erros.length, 1);
    assert.equal(dashboard.erros[0].erro, 'Broker MQTT offline');
    dashboard.fechar();
  } finally {
    await servidor.parar();
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test integracao/comandos.test.mjs`
Expected: FALHA — os contadores de comando ficam ausentes (`null`), então os `esperar` estouram o tempo.

- [ ] **Step 3: Editar `server/server.js` (edições S16–S21)**

**Edição S16** — confirmação do gateway
`old_string`:
```js
    case TOPICS.cmdPub:
```
`new_string`:
```js
    case TOPICS.cmdPub:
      // Tempo entre o comando aceito e esta confirmação do gateway (dfi_command_confirmation_seconds)
      prom.confirmacaoGateway({ acao: msgJson.acao, peca: msgJson.peca, status: msgJson.status });
```

**Edição S17** — comando recusado por broker offline
`old_string`:
```js
    metricas.comandosRejeitados++;
    socket.emit('comando_erro', { erro: 'Broker MQTT offline', acao: comando.acao });
```
`new_string`:
```js
    metricas.comandosRejeitados++;
    prom.comandoRecusado('broker_offline');
    socket.emit('comando_erro', { erro: 'Broker MQTT offline', acao: comando.acao });
```

**Edição S18** — publish com ack medido
`old_string`:
```js
  mqttClient.publish(TOPICS.cmdSub, JSON.stringify(comando), { qos: 1 }, (err) => {
    if (err) {
      metricas.comandosRejeitados++;
      console.error('[MQTT] Erro ao publicar comando:', err.message);
      socket.emit('comando_erro', { erro: 'Falha ao enviar comando', acao: comando.acao });
    } else {
      metricas.comandosPublicados++;
      console.log(`[MQTT] Comando publicado: ${descricao}`);
    }
  });
```
`new_string`:
```js
  // O t0 do comando é registrado ANTES do publish (a confirmação do gateway poderia chegar antes
  // do PUBACK); o ack do publish é medido à parte, em dfi_mqtt_publish_ack_seconds.
  const tokenMetricas = prom.comandoAceito(comando.acao, comando.peca);
  const inicioPublish = performance.now();
  mqttClient.publish(TOPICS.cmdSub, JSON.stringify(comando), { qos: 1 }, (err) => {
    if (err) {
      metricas.comandosRejeitados++;
      prom.comandoFalhou(tokenMetricas);
      prom.mqttErro('publicacao');
      console.error('[MQTT] Erro ao publicar comando:', err.message);
      socket.emit('comando_erro', { erro: 'Falha ao enviar comando', acao: comando.acao });
    } else {
      metricas.comandosPublicados++;
      prom.publishAck(TOPICS.cmdSub, (performance.now() - inicioPublish) / 1000, true);
      console.log(`[MQTT] Comando publicado: ${descricao}`);
    }
  });
```

**Edição S19** — recusa por rate limit
`old_string`:
```js
      metricas.comandosRejeitados++;
      socket.emit('comando_erro', {
        erro: `Muitos comandos — aguarde ${COMANDO_INTERVALO_MS}ms entre envios`,
```
`new_string`:
```js
      metricas.comandosRejeitados++;
      prom.comandoRecusado('rate_limit');
      socket.emit('comando_erro', {
        erro: `Muitos comandos — aguarde ${COMANDO_INTERVALO_MS}ms entre envios`,
```

**Edição S20** — recusa por peça inválida
`old_string`:
```js
      metricas.comandosRejeitados++;
      socket.emit('comando_erro', { erro: `Peça inválida: ${data?.peca}`, acao: 'solicitar_peca' });
```
`new_string`:
```js
      metricas.comandosRejeitados++;
      prom.comandoRecusado('peca_invalida');
      socket.emit('comando_erro', { erro: `Peça inválida: ${data?.peca}`, acao: 'solicitar_peca' });
```

**Edição S21** — varredor de comandos sem resposta
`old_string`:
```js
server.listen(PORT, () => {
```
`new_string`:
```js
// Expira os comandos que o gateway não confirmou a tempo (dfi_command_unconfirmed_total).
// unref(): o timer não impede o processo de encerrar.
setInterval(() => prom.varrerPendentes(), 1000).unref();

server.listen(PORT, () => {
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd test/server_metrics && npm test`
Expected: unitários e integração passam por completo, sem `[METRICS]` nem erros no log. Rode uma segunda vez para conferir estabilidade.

- [ ] **Step 5: Commit**

```bash
git add server/server.js test/server_metrics/integracao/comandos.test.mjs test/server_metrics/integracao/comandos-sem-resposta.test.mjs test/server_metrics/integracao/comandos-recusados.test.mjs
git commit -m "feat(metricas): ganchos do fluxo de comandos (ack, confirmação, recusas e sem resposta)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Stack Docker — `docker-compose.yml`, Prometheus e Grafana provisionados (TDD estático)

Como não há Docker nesta máquina, esta tarefa é guiada por **testes estáticos** que leem os arquivos de configuração e travam as decisões de segurança e coerência do spec (§7). Nada aqui pode ser executado com `docker`.

**Files:**
- Create: `docker-compose.yml`
- Create: `observability/.env.example`, `observability/prometheus/prometheus.yml`
- Create: `observability/grafana/provisioning/datasources/prometheus.yml`, `observability/grafana/provisioning/dashboards/dfi.yml`
- Test: `test/server_metrics/infra/stack.test.mjs`

**Interfaces:**
- Consumes: `yaml` (devDependency do pacote de testes, Task 1).
- Produces (contratos que as Tasks 8–9 usam):
  - datasource Grafana com `uid: dfi-prometheus`, alcançando `http://prometheus:9090`;
  - provider de dashboards lendo `/var/lib/grafana/dashboards` (montado de `./docs/grafana`, somente leitura);
  - job Prometheus `dfi-server` em `host.docker.internal:3000`, caminho `/metrics`;
  - variáveis `GRAFANA_ADMIN_PASSWORD` (obrigatória), `GRAFANA_PORT` (padrão 3030), `PROMETHEUS_PORT` (padrão 9090);
  - comando de uso: `docker compose --env-file observability/.env up -d`.

- [ ] **Step 1: Escrever os testes (falhando)**

`test/server_metrics/infra/stack.test.mjs`:

```js
// Verificações ESTÁTICAS do stack de observabilidade (não executam Docker).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const ler = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');
const yaml = (rel) => parse(ler(rel));

const compose = yaml('docker-compose.yml');
const prometheus = compose.services.prometheus;
const grafana = compose.services.grafana;

function ignoradoPeloGit(caminho) {
  try {
    execFileSync('git', ['check-ignore', '-q', caminho], { cwd: RAIZ, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test('o compose tem exatamente os dois serviços de observabilidade (sem Mosquitto)', () => {
  assert.deepEqual(Object.keys(compose.services).sort(), ['grafana', 'prometheus']);
});

test('as imagens têm versão fixada, nunca "latest"', () => {
  assert.equal(prometheus.image, 'prom/prometheus:v3.15.0');
  assert.equal(grafana.image, 'grafana/grafana-oss:12.4.3');
  for (const s of [prometheus, grafana]) {
    assert.doesNotMatch(s.image, /latest/);
    assert.match(s.image, /:v?\d+\.\d+\.\d+$/);
  }
});

test('toda porta publicada fica presa ao localhost', () => {
  for (const s of [prometheus, grafana]) {
    assert.ok(s.ports.length >= 1);
    for (const p of s.ports) assert.ok(String(p).startsWith('127.0.0.1:'), `porta exposta fora do localhost: ${p}`);
  }
  assert.match(grafana.ports[0], /:3000$/, 'o Grafana escuta na 3000 dentro do container');
  assert.match(grafana.ports[0], /\$\{GRAFANA_PORT:-3030\}/, 'porta padrão 3030 (3000 é do servidor Node)');
});

test('o Grafana exige a senha de admin e não aceita acesso anônimo nem cadastro', () => {
  const env = grafana.environment;
  assert.match(env.GF_SECURITY_ADMIN_PASSWORD, /^\$\{GRAFANA_ADMIN_PASSWORD:\?.+\}$/, 'senha obrigatória (:?), sem valor padrão');
  assert.equal(String(env.GF_AUTH_ANONYMOUS_ENABLED), 'false');
  assert.equal(String(env.GF_USERS_ALLOW_SIGN_UP), 'false');
});

test('o Prometheus alcança o servidor do host, retém 30 dias e monta a configuração somente leitura', () => {
  assert.ok(prometheus.extra_hosts.includes('host.docker.internal:host-gateway'));
  assert.ok(prometheus.command.includes('--storage.tsdb.retention.time=30d'));
  assert.ok(prometheus.volumes.includes('./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro'));
});

test('o Grafana monta provisionamento e dashboards somente leitura, e espera o Prometheus ficar saudável', () => {
  assert.ok(grafana.volumes.includes('./observability/grafana/provisioning:/etc/grafana/provisioning:ro'));
  assert.ok(grafana.volumes.includes('./docs/grafana:/var/lib/grafana/dashboards:ro'));
  assert.equal(grafana.depends_on.prometheus.condition, 'service_healthy');
  assert.ok(prometheus.healthcheck && grafana.healthcheck, 'os dois serviços têm healthcheck');
});

test('os dados persistem em volumes nomeados', () => {
  assert.ok(Object.keys(compose.volumes).length === 2);
  assert.ok(prometheus.volumes.some((v) => v.startsWith('prometheus-data:')));
  assert.ok(grafana.volumes.some((v) => v.startsWith('grafana-data:')));
});

test('prometheus.yml: scrape do servidor a cada 5 s em host.docker.internal:3000/metrics', () => {
  const cfg = yaml('observability/prometheus/prometheus.yml');
  assert.equal(cfg.global.scrape_interval, '5s');
  assert.equal(cfg.global.scrape_timeout, '3s');
  const job = cfg.scrape_configs.find((j) => j.job_name === 'dfi-server');
  assert.ok(job, 'job dfi-server existe');
  assert.equal(job.metrics_path, '/metrics');
  assert.deepEqual(job.static_configs[0].targets, ['host.docker.internal:3000']);
});

test('datasource do Grafana: uid fixo e URL pelo nome do serviço do compose', () => {
  const ds = yaml('observability/grafana/provisioning/datasources/prometheus.yml').datasources[0];
  assert.equal(ds.uid, 'dfi-prometheus');
  assert.equal(ds.type, 'prometheus');
  assert.equal(ds.url, 'http://prometheus:9090');
  assert.ok(compose.services.prometheus, 'o nome "prometheus" da URL é um serviço do compose');
});

test('provider de dashboards lê o diretório montado e não permite edição pela interface', () => {
  const provider = yaml('observability/grafana/provisioning/dashboards/dfi.yml').providers[0];
  assert.equal(provider.type, 'file');
  assert.equal(provider.options.path, '/var/lib/grafana/dashboards');
  assert.equal(provider.allowUiUpdates, false);
});

test('.env.example traz a senha VAZIA (o usuário escolhe) e as portas padrão', () => {
  const exemplo = ler('observability/.env.example');
  assert.match(exemplo, /^GRAFANA_ADMIN_PASSWORD=$/m);
  assert.match(exemplo, /^GRAFANA_PORT=3030$/m);
  assert.match(exemplo, /^PROMETHEUS_PORT=9090$/m);
});

test('o .env real é ignorado pelo git e o .env.example continua versionado', () => {
  assert.equal(ignoradoPeloGit('observability/.env'), true);
  assert.equal(ignoradoPeloGit('observability/.env.example'), false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test infra/stack.test.mjs`
Expected: FALHA com `ENOENT` ao ler `docker-compose.yml`.

- [ ] **Step 3: Criar `docker-compose.yml`**

```yaml
# ============================================================
# DATA FLOW INVENTORY — Stack de observabilidade (DESENVOLVIMENTO)
# ------------------------------------------------------------
# Prometheus (coleta) + Grafana (dashboards). O servidor Node NÃO
# roda aqui: continua no host (npm start, porta 3000) e o Prometheus
# o consulta em host.docker.internal:3000/metrics.
#
# Uso (a senha vem de observability/.env — copie o .env.example):
#   docker compose --env-file observability/.env up -d
#   docker compose --env-file observability/.env down        # mantém os dados
#   docker compose --env-file observability/.env down -v     # APAGA os dados
# Guia completo: observability/README.md
# ============================================================
name: dataflow-observability

services:
  prometheus:
    image: prom/prometheus:v3.15.0
    container_name: dfi-prometheus
    restart: unless-stopped
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=30d
    volumes:
      - ./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "127.0.0.1:${PROMETHEUS_PORT:-9090}:9090"
    extra_hosts:
      # No Docker Desktop (Windows/Mac) o nome já existe; no Linux precisa deste mapeamento.
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:9090/-/ready || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 5

  grafana:
    image: grafana/grafana-oss:12.4.3
    container_name: dfi-grafana
    restart: unless-stopped
    depends_on:
      prometheus:
        condition: service_healthy
    environment:
      GF_SECURITY_ADMIN_USER: admin
      # Obrigatória: sem ela o "docker compose up" recusa iniciar (não existe senha padrão).
      GF_SECURITY_ADMIN_PASSWORD: "${GRAFANA_ADMIN_PASSWORD:?Defina GRAFANA_ADMIN_PASSWORD em observability/.env (copie o observability/.env.example)}"
      GF_AUTH_ANONYMOUS_ENABLED: "false"
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_ANALYTICS_REPORTING_ENABLED: "false"
      GF_ANALYTICS_CHECK_FOR_UPDATES: "false"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./observability/grafana/provisioning:/etc/grafana/provisioning:ro
      # Dashboards versionados no repositório (fonte da verdade); somente leitura.
      - ./docs/grafana:/var/lib/grafana/dashboards:ro
    ports:
      # 3030 no host porque a 3000 é do servidor Node.
      - "127.0.0.1:${GRAFANA_PORT:-3030}:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 10

volumes:
  prometheus-data:
    name: dfi-prometheus-data
  grafana-data:
    name: dfi-grafana-data
```

- [ ] **Step 4: Criar `observability/.env.example`**

```
# ============================================================
# DATA FLOW INVENTORY — Stack de observabilidade (EXEMPLO)
# ============================================================
# Copie este arquivo para observability/.env e preencha:
#   copy observability\.env.example observability\.env     (Windows)
#   cp observability/.env.example observability/.env       (Linux/Mac)
#
# O .env NÃO é versionado (o .gitignore ignora *.env).
# Uso:  docker compose --env-file observability/.env up -d
# ============================================================

# OBRIGATÓRIA. Senha do usuário "admin" do Grafana; o compose recusa iniciar sem ela.
# ATENÇÃO: só vale na PRIMEIRA criação do volume grafana-data (ver observability/README.md).
GRAFANA_ADMIN_PASSWORD=

# Portas publicadas em 127.0.0.1 (o servidor Node usa a 3000).
GRAFANA_PORT=3030
PROMETHEUS_PORT=9090
```

- [ ] **Step 5: Criar `observability/prometheus/prometheus.yml`**

```yaml
# ============================================================
# DATA FLOW INVENTORY — Prometheus (desenvolvimento)
# ------------------------------------------------------------
# O servidor Node roda no HOST (npm start, porta 3000); o container o
# alcança por host.docker.internal (ver extra_hosts no docker-compose.yml).
# Se o servidor estiver fora do ar, o alvo aparece como "down" — o
# servidor nunca depende do Prometheus (a coleta é por consulta).
# ============================================================
global:
  scrape_interval: 5s
  scrape_timeout: 3s
  evaluation_interval: 15s

scrape_configs:
  - job_name: dfi-server
    metrics_path: /metrics
    static_configs:
      - targets: ["host.docker.internal:3000"]
        labels:
          app: data-flow-inventory
```

- [ ] **Step 6: Criar o provisionamento do Grafana**

`observability/grafana/provisioning/datasources/prometheus.yml`:

```yaml
# uid FIXO: os dashboards em docs/grafana/*.json referenciam "dfi-prometheus".
apiVersion: 1
datasources:
  - name: Prometheus
    uid: dfi-prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: 5s
      httpMethod: POST
```

`observability/grafana/provisioning/dashboards/dfi.yml`:

```yaml
# Dashboards como código: os JSON vivem em docs/grafana/ (montado em /var/lib/grafana/dashboards).
# Para alterar um painel: edite na interface, use "Export → JSON" e sobrescreva o arquivo do repositório.
apiVersion: 1
providers:
  - name: dataflow-inventory
    orgId: 1
    folder: Data Flow Inventory
    type: file
    disableDeletion: true
    allowUiUpdates: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd test/server_metrics && node --test infra/stack.test.mjs`
Expected: os 12 testes passam. (O teste do `.env` usa `git check-ignore`; o worktree é um repositório git, então funciona.)

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml observability test/server_metrics/infra/stack.test.mjs
git commit -m "feat(observabilidade): stack Docker com Prometheus e Grafana provisionados como código" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Dashboards do Grafana (Visão Geral, Performance, Confiabilidade) com teste de coerência

Gera os três JSON em `docs/grafana/` e trava, por teste estático, que **toda métrica citada nas consultas existe no servidor** e que **toda métrica `dfi_*` do servidor aparece em algum dashboard** (o desvio silencioso — renomear uma métrica e deixar o painel vazio — passa a quebrar o CI). Os painéis são escritos por um gerador **descartável, fora do repositório**; só o JSON é versionado e passa a ser a fonte da verdade (edição posterior: pela interface do Grafana + "Export → JSON").

**Files:**
- Create: `docs/grafana/visao-geral.json`, `docs/grafana/performance.json`, `docs/grafana/confiabilidade.json`
- Test: `test/server_metrics/infra/dashboards.test.mjs`
- (Fora do repositório, NÃO commitar) `gerar-dashboards.mjs` no diretório temporário da sessão.

**Interfaces:**
- Consumes: datasource `dfi-prometheus` (Task 7); catálogo de métricas do servidor (Tasks 2–4).
- Produces: dashboards com `uid` `dfi-visao-geral`, `dfi-performance`, `dfi-confiabilidade`; títulos `Data Flow Inventory — Visão Geral`, `— Performance`, `— Confiabilidade`; `refresh: "5s"`; janela `now-15m`.

- [ ] **Step 1: Escrever o teste (falhando)**

`test/server_metrics/infra/dashboards.test.mjs`:

```js
// Verificações ESTÁTICAS dos dashboards do Grafana (não renderizam nada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarMetricas } from '../../../server/metrics.js';
import { familias } from '../helpers/prom.mjs';

const DASHBOARDS = {
  'visao-geral.json': { uid: 'dfi-visao-geral', titulo: 'Data Flow Inventory — Visão Geral' },
  'performance.json': { uid: 'dfi-performance', titulo: 'Data Flow Inventory — Performance' },
  'confiabilidade.json': { uid: 'dfi-confiabilidade', titulo: 'Data Flow Inventory — Confiabilidade' },
};

const carregar = (arquivo) => JSON.parse(readFileSync(new URL(`../../../docs/grafana/${arquivo}`, import.meta.url), 'utf8'));
const todos = Object.fromEntries(Object.keys(DASHBOARDS).map((a) => [a, carregar(a)]));

// Métricas que o servidor REALMENTE expõe (as linhas "# TYPE" listam até as que ainda não têm amostra).
const expostas = familias(await criarMetricas({ topicos: {} }).texto());
const nomesValidos = new Set();
for (const [nome, tipo] of expostas) {
  nomesValidos.add(nome);
  if (tipo === 'histogram') ['_bucket', '_sum', '_count'].forEach((s) => nomesValidos.add(nome + s));
}

const alvosDe = (dash) => dash.panels.flatMap((p) => p.targets ?? []);
const metricasCitadas = (dash) => {
  const nomes = new Set();
  for (const alvo of alvosDe(dash)) {
    for (const m of alvo.expr.matchAll(/\b((?:dfi|process|nodejs)_[a-z0-9_]+)/g)) nomes.add(m[1]);
  }
  return nomes;
};

test('cada dashboard tem uid, título, atualização de 5 s e janela de 15 min', () => {
  for (const [arquivo, esperado] of Object.entries(DASHBOARDS)) {
    const d = todos[arquivo];
    assert.equal(d.uid, esperado.uid, arquivo);
    assert.equal(d.title, esperado.titulo, arquivo);
    assert.equal(d.refresh, '5s', arquivo);
    assert.equal(d.time.from, 'now-15m', arquivo);
    assert.ok(d.tags.includes('dataflow-inventory'), arquivo);
    assert.ok(d.panels.length >= 5, `${arquivo} tem painéis`);
  }
});

test('painéis: ids únicos, dentro da grade de 24 colunas e todos usando o datasource dfi-prometheus', () => {
  for (const [arquivo, d] of Object.entries(todos)) {
    const ids = d.panels.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${arquivo}: ids repetidos`);
    for (const p of d.panels) {
      const { x, w, h } = p.gridPos;
      assert.ok(x >= 0 && w >= 1 && h >= 1 && x + w <= 24, `${arquivo} / ${p.title}: fora da grade`);
      assert.equal(p.datasource.uid, 'dfi-prometheus', `${arquivo} / ${p.title}`);
      assert.ok(p.targets.length >= 1, `${arquivo} / ${p.title}: sem consulta`);
      for (const t of p.targets) {
        assert.equal(t.datasource.uid, 'dfi-prometheus', `${arquivo} / ${p.title}`);
        assert.equal(typeof t.expr, 'string');
        assert.ok(t.expr.length > 0, `${arquivo} / ${p.title}: consulta vazia`);
      }
    }
  }
});

test('toda métrica citada nas consultas existe no servidor (ou é o "up" do Prometheus)', () => {
  for (const [arquivo, d] of Object.entries(todos)) {
    const citadas = metricasCitadas(d);
    assert.ok(citadas.size > 0, `${arquivo} cita métricas`);
    for (const nome of citadas) assert.ok(nomesValidos.has(nome), `${arquivo} cita "${nome}", que o servidor não expõe`);
  }
});

test('toda métrica dfi_* do servidor aparece em pelo menos um dashboard', () => {
  const usadas = new Set();
  for (const d of Object.values(todos)) for (const nome of metricasCitadas(d)) usadas.add(nome);
  const naoUsadas = [...expostas.keys()].filter((nome) => nome.startsWith('dfi_'))
    .filter((nome) => ![nome, `${nome}_bucket`, `${nome}_sum`, `${nome}_count`].some((v) => usadas.has(v)));
  assert.deepEqual(naoUsadas, [], `métricas sem painel: ${naoUsadas.join(', ')}`);
});

test('Performance mostra p50, p95 e p99 das três latências (confirmação, PUBACK e API)', () => {
  const exprs = alvosDe(todos['performance.json']).map((t) => t.expr);
  for (const base of ['dfi_command_confirmation_seconds', 'dfi_mqtt_publish_ack_seconds', 'dfi_http_request_duration_seconds']) {
    for (const q of ['0.5', '0.95', '0.99']) {
      assert.ok(
        exprs.some((e) => e.includes(`histogram_quantile(${q}`) && e.includes(`${base}_bucket`)),
        `falta o p${Number(q) * 100} de ${base}`,
      );
    }
  }
});

test('Visão Geral: o estoque usa os limiares do frontend (crítico ≤1, alerta 2, aviso 3, normal ≥4)', () => {
  const painel = todos['visao-geral.json'].panels.find((p) => p.title === 'Estoque atual');
  assert.ok(painel, 'painel "Estoque atual" existe');
  const passos = painel.fieldConfig.defaults.thresholds.steps;
  assert.deepEqual(passos.map((s) => s.value), [null, 2, 3, 4]);
  assert.deepEqual(passos.map((s) => s.color), ['red', 'orange', 'yellow', 'green']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test infra/dashboards.test.mjs`
Expected: FALHA com `ENOENT ... docs/grafana/visao-geral.json`.

- [ ] **Step 3: Criar o gerador (FORA do repositório) e gerar os JSON**

Grave o arquivo abaixo como `gerar-dashboards.mjs` no diretório temporário da sua sessão (não no repositório) e rode `node gerar-dashboards.mjs <caminho-absoluto-de-docs/grafana>`:

```js
// gerar-dashboards.mjs — ferramenta DESCARTÁVEL (não versionar). Uso: node gerar-dashboards.mjs <pasta-de-saida>
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error('Informe a pasta de saída (docs/grafana).');

const DS = { type: 'prometheus', uid: 'dfi-prometheus' };
let proximoId = 0;

const alvo = (expr, legenda = '', refId = 'A') => ({ refId, expr, legendFormat: legenda, datasource: DS });

const mapaOnOff = (textoOn, textoOff, corOff = 'red') => [{
  type: 'value',
  options: {
    0: { text: textoOff, color: corOff, index: 0 },
    1: { text: textoOn, color: 'green', index: 1 },
  },
}];
const PASSOS_ON_OFF = [{ color: 'red', value: null }, { color: 'green', value: 1 }];
const PASSOS_CONTAGEM = [{ color: 'green', value: null }, { color: 'yellow', value: 1 }, { color: 'red', value: 3 }];

function stat({ titulo, x, y, w = 4, h = 4, expr, unit = 'none', mappings = [], steps, decimals, descricao }) {
  return {
    id: ++proximoId, type: 'stat', title: titulo, description: descricao, datasource: DS,
    gridPos: { x, y, w, h },
    targets: [alvo(expr)],
    fieldConfig: { defaults: { unit, decimals, mappings, thresholds: { mode: 'absolute', steps } }, overrides: [] },
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      colorMode: 'background', graphMode: 'none', textMode: 'auto', justifyMode: 'center', orientation: 'auto',
    },
  };
}

function serie({ titulo, x, y, w = 12, h = 8, alvos, unit = 'none', degrau = false, min, descricao, overrides = [] }) {
  return {
    id: ++proximoId, type: 'timeseries', title: titulo, description: descricao, datasource: DS,
    gridPos: { x, y, w, h },
    targets: alvos,
    fieldConfig: {
      defaults: {
        unit, min,
        custom: {
          drawStyle: 'line', lineInterpolation: degrau ? 'stepAfter' : 'linear',
          lineWidth: 1, fillOpacity: 10, showPoints: 'never', spanNulls: false,
        },
      },
      overrides,
    },
    options: {
      legend: { showLegend: true, displayMode: 'list', placement: 'bottom', calcs: [] },
      tooltip: { mode: 'multi', sort: 'desc' },
    },
  };
}

function linhaDoTempo({ titulo, x, y, w = 24, h = 6, alvos, textoOn, textoOff, corOff = 'blue', descricao }) {
  return {
    id: ++proximoId, type: 'state-timeline', title: titulo, description: descricao, datasource: DS,
    gridPos: { x, y, w, h },
    targets: alvos,
    fieldConfig: {
      defaults: {
        mappings: mapaOnOff(textoOn, textoOff, corOff),
        color: { mode: 'thresholds' },
        thresholds: { mode: 'absolute', steps: PASSOS_ON_OFF },
        custom: { fillOpacity: 70, lineWidth: 0 },
      },
      overrides: [],
    },
    options: {
      mergeValues: true, showValue: 'never', rowHeight: 0.9, alignValue: 'left',
      legend: { showLegend: true, displayMode: 'list', placement: 'bottom' },
      tooltip: { mode: 'single', sort: 'none' },
    },
  };
}

// Percentis a partir do histograma; $__rate_interval segue o intervalo de coleta do datasource.
const quantil = (p, base, agrupar = '') =>
  `histogram_quantile(${p}, sum by (le${agrupar}) (rate(${base}_bucket[$__rate_interval])))`;
const percentis = (base) => [
  alvo(quantil(0.5, base), 'p50', 'A'),
  alvo(quantil(0.95, base), 'p95', 'B'),
  alvo(quantil(0.99, base), 'p99', 'C'),
];

function dashboard({ uid, titulo, descricao, paineis }) {
  return {
    uid, title: titulo, description: descricao,
    tags: ['dataflow-inventory', 'observabilidade'],
    timezone: 'browser', schemaVersion: 39, version: 1, editable: true, graphTooltip: 1,
    refresh: '5s', time: { from: 'now-15m', to: 'now' }, timepicker: {},
    templating: { list: [] }, annotations: { list: [] }, links: [], liveNow: false,
    panels: paineis,
  };
}

function gravar(nomeArquivo, dash) {
  mkdirSync(SAIDA, { recursive: true });
  writeFileSync(path.join(SAIDA, nomeArquivo), `${JSON.stringify(dash, null, 2)}\n`, 'utf8');
}

// Cores das peças = as do frontend (--peca-a/b/c).
const corDaPeca = (peca, cor) => ({
  matcher: { id: 'byName', options: `Peça ${peca}` },
  properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: cor } }],
});

// ---------------- Visão Geral ----------------
proximoId = 0;
gravar('visao-geral.json', dashboard({
  uid: 'dfi-visao-geral',
  titulo: 'Data Flow Inventory — Visão Geral',
  descricao: 'Estado atual do sistema: servidor, MQTT, gateway, estoque e esteiras.',
  paineis: [
    stat({ titulo: 'Servidor Node.js', x: 0, y: 0, expr: 'up{job="dfi-server"}', mappings: mapaOnOff('ONLINE', 'OFFLINE'), steps: PASSOS_ON_OFF }),
    stat({ titulo: 'Broker MQTT', x: 4, y: 0, expr: 'dfi_mqtt_connected', mappings: mapaOnOff('CONECTADO', 'DESCONECTADO'), steps: PASSOS_ON_OFF }),
    stat({ titulo: 'Gateway ESP32', x: 8, y: 0, expr: 'dfi_gateway_online', mappings: mapaOnOff('ONLINE', 'OFFLINE'), steps: PASSOS_ON_OFF }),
    stat({ titulo: 'Uptime da conexão MQTT', x: 12, y: 0, w: 6, expr: 'dfi_mqtt_uptime_seconds', unit: 's', steps: [{ color: 'blue', value: null }] }),
    stat({ titulo: 'Dashboards conectados', x: 18, y: 0, w: 6, expr: 'dfi_websocket_clients', decimals: 0, steps: [{ color: 'blue', value: null }] }),
    {
      id: ++proximoId, type: 'bargauge', title: 'Estoque atual', datasource: DS,
      description: 'Limiares iguais aos do frontend: crítico ≤1, alerta 2, aviso 3, normal ≥4.',
      gridPos: { x: 0, y: 4, w: 8, h: 8 },
      targets: [alvo('dfi_stock_pieces', 'Peça {{peca}}')],
      fieldConfig: {
        defaults: {
          unit: 'none', min: 0, max: 5, decimals: 0,
          thresholds: {
            mode: 'absolute',
            steps: [{ color: 'red', value: null }, { color: 'orange', value: 2 }, { color: 'yellow', value: 3 }, { color: 'green', value: 4 }],
          },
        },
        overrides: [],
      },
      options: {
        reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        orientation: 'horizontal', displayMode: 'basic', showUnfilled: true, valueMode: 'color',
      },
    },
    serie({
      titulo: 'Estoque ao longo do tempo', x: 8, y: 4, w: 16, h: 8, degrau: true, min: 0,
      descricao: 'Amostrado a cada 5 s. A precisão por evento fica no historiador SQLite do CX9240.',
      alvos: [alvo('dfi_stock_pieces', 'Peça {{peca}}')],
      overrides: [corDaPeca('A', '#e74c3c'), corDaPeca('B', '#2ecc71'), corDaPeca('C', '#3498db')],
    }),
    linhaDoTempo({
      titulo: 'Esteiras', x: 0, y: 12, textoOn: 'LIGADA', textoOff: 'PARADA',
      alvos: [alvo('dfi_conveyor_on', '{{esteira}}')],
    }),
  ],
}));

// ---------------- Performance ----------------
proximoId = 0;
gravar('performance.json', dashboard({
  uid: 'dfi-performance',
  titulo: 'Data Flow Inventory — Performance',
  descricao: 'Latências (p50/p95/p99), throughput e consumo do servidor.',
  paineis: [
    serie({ titulo: 'Confirmação do gateway — comando → confirmação', x: 0, y: 0, unit: 's', min: 0, alvos: percentis('dfi_command_confirmation_seconds'),
      descricao: 'Sem pontos quando nenhum comando é enviado na janela.' }),
    serie({ titulo: 'Publish → ack do broker (QoS 1)', x: 12, y: 0, unit: 's', min: 0, alvos: percentis('dfi_mqtt_publish_ack_seconds') }),
    serie({ titulo: 'API — tempo de resposta', x: 0, y: 8, unit: 's', min: 0, alvos: percentis('dfi_http_request_duration_seconds') }),
    serie({ titulo: 'API — p95 por rota', x: 12, y: 8, unit: 's', min: 0,
      alvos: [alvo(quantil(0.95, 'dfi_http_request_duration_seconds', ', rota'), '{{rota}}')] }),
    serie({ titulo: 'Mensagens MQTT por tópico (msg/s)', x: 0, y: 16, unit: 'ops', min: 0,
      alvos: [alvo('sum by (topic) (rate(dfi_mqtt_messages_total[$__rate_interval]))', '{{topic}}')] }),
    serie({ titulo: 'Eventos por tipo (eventos/min)', x: 12, y: 16, min: 0,
      alvos: [alvo('sum by (evento) (rate(dfi_events_total[$__rate_interval])) * 60', '{{evento}}')] }),
    serie({ titulo: 'CPU do servidor', x: 0, y: 24, w: 8, unit: 'percentunit', min: 0,
      alvos: [alvo('rate(process_cpu_seconds_total[$__rate_interval])', 'CPU')] }),
    serie({ titulo: 'Memória (RSS)', x: 8, y: 24, w: 8, unit: 'bytes', min: 0,
      alvos: [alvo('process_resident_memory_bytes', 'RSS')] }),
    serie({ titulo: 'Atraso do event loop (p99)', x: 16, y: 24, w: 8, unit: 's', min: 0,
      alvos: [alvo('nodejs_eventloop_lag_p99_seconds', 'p99')] }),
  ],
}));

// ---------------- Confiabilidade ----------------
proximoId = 0;
gravar('confiabilidade.json', dashboard({
  uid: 'dfi-confiabilidade',
  titulo: 'Data Flow Inventory — Confiabilidade',
  descricao: 'Uptime, reconexões, erros, quedas do gateway e comandos sem resposta.',
  paineis: [
    stat({ titulo: 'Uptime da conexão MQTT', x: 0, y: 0, expr: 'dfi_mqtt_uptime_seconds', unit: 's', steps: [{ color: 'blue', value: null }] }),
    stat({ titulo: 'Reconexões MQTT (1 h)', x: 4, y: 0, expr: 'increase(dfi_mqtt_reconnects_total[1h])', decimals: 0, steps: PASSOS_CONTAGEM }),
    stat({ titulo: 'Quedas do gateway (1 h)', x: 8, y: 0, expr: 'increase(dfi_gateway_offline_total[1h])', decimals: 0, steps: PASSOS_CONTAGEM,
      descricao: 'Quantas vezes o LWT do ESP32 foi disparado (online → offline).' }),
    stat({ titulo: 'Erros MQTT (1 h)', x: 12, y: 0, expr: 'sum(increase(dfi_mqtt_errors_total[1h]))', decimals: 0, steps: PASSOS_CONTAGEM }),
    stat({ titulo: 'Comandos sem resposta (1 h)', x: 16, y: 0, expr: 'increase(dfi_command_unconfirmed_total[1h])', decimals: 0, steps: PASSOS_CONTAGEM }),
    stat({ titulo: 'Confirmações órfãs (1 h)', x: 20, y: 0, expr: 'increase(dfi_command_confirmation_orphan_total[1h])', decimals: 0, steps: PASSOS_CONTAGEM }),
    linhaDoTempo({
      titulo: 'Disponibilidade', x: 0, y: 4, h: 6, textoOn: 'ONLINE', textoOff: 'OFFLINE', corOff: 'red',
      alvos: [
        alvo('up{job="dfi-server"}', 'Servidor Node.js', 'A'),
        alvo('dfi_mqtt_connected', 'Broker MQTT', 'B'),
        alvo('dfi_gateway_online', 'Gateway ESP32', 'C'),
      ],
    }),
    serie({ titulo: 'Comandos por resultado (janela de 5 min)', x: 0, y: 10, degrau: true, min: 0,
      alvos: [alvo('sum by (resultado) (increase(dfi_commands_total[5m]))', '{{resultado}}')] }),
    serie({ titulo: 'Erros MQTT por tipo (janela de 5 min)', x: 12, y: 10, degrau: true, min: 0,
      alvos: [alvo('sum by (tipo) (increase(dfi_mqtt_errors_total[5m]))', '{{tipo}}')] }),
  ],
}));

console.log(`Dashboards gravados em ${SAIDA}`);
```

```bash
node <caminho-do-gerador>/gerar-dashboards.mjs "$(pwd)/docs/grafana"
```
Expected: `Dashboards gravados em .../docs/grafana`; os três arquivos criados.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd test/server_metrics && node --test infra/dashboards.test.mjs`
Expected: os 6 testes passam. Se "toda métrica dfi_* aparece em algum dashboard" falhar listando uma métrica, o gerador esqueceu um painel: corrija o gerador, regenere e rode de novo (o teste é a fonte da verdade).

- [ ] **Step 5: Rodar tudo e conferir que o gerador não entrou no repositório**

Run: `cd test/server_metrics && npm test && cd ../.. && git status --short`
Expected: testes verdes; `git status` mostra só `docs/grafana/*.json` e o teste novo (nenhum `gerar-dashboards.mjs`).

- [ ] **Step 6: Commit**

```bash
git add docs/grafana test/server_metrics/infra/dashboards.test.mjs
git commit -m "feat(observabilidade): dashboards Grafana (Visão Geral, Performance, Confiabilidade)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Smoke scripts (com Docker) e `observability/README.md`

Entrega o que o agente **não consegue executar**: um roteiro automatizado (bash e PowerShell) para o usuário validar o stack com Docker, e o passo a passo em `observability/README.md`. Os testes estáticos garantem que os scripts cobrem cada etapa exigida pelo spec (§7) e que o README documenta as armadilhas conhecidas. Esta tarefa **não executa** os scripts (sem Docker); só checa a sintaxe.

**Files:**
- Create: `scripts/observability-smoke.sh`, `scripts/observability-smoke.ps1`
- Create: `observability/README.md`
- Test: `test/server_metrics/infra/scripts-e-docs.test.mjs`

**Interfaces:**
- Consumes: `docker-compose.yml`, `observability/.env` (Task 7), uids `dfi-visao-geral`/`dfi-performance`/`dfi-confiabilidade` (Task 8), `GET /metrics` (Task 5).
- Produces: `bash scripts/observability-smoke.sh` e `.\scripts\observability-smoke.ps1` (saem com código 0 se tudo passa, 1 se algo falha).
- Convenção do projeto: os `.ps1` existentes são **ASCII puro, sem BOM e sem acentos**; o novo segue a mesma regra.

- [ ] **Step 1: Testes (falhando)**

`test/server_metrics/infra/scripts-e-docs.test.mjs`:

```js
// Verificações ESTÁTICAS dos scripts de smoke e do README de observabilidade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

const sh = ler('scripts/observability-smoke.sh');
const ps1 = ler('scripts/observability-smoke.ps1');
const readme = ler('observability/README.md');

// Cada etapa que o spec (§7) exige do smoke, em texto que aparece nos DOIS scripts.
const ETAPAS = [
  ['/metrics', 'o servidor expõe /metrics'],
  ['config', 'docker compose config'],
  ['promtool', 'promtool check config'],
  ['up -d', 'docker compose up -d'],
  ['api/v1/query', 'consulta à API do Prometheus'],
  ['dfi-server', 'alvo dfi-server em "up"'],
  ['api/health', 'saúde do Grafana'],
  ['datasources/uid/dfi-prometheus/health', 'saúde do datasource'],
  ['api/dashboards/uid', 'consulta de dashboard por uid'],
  ['dfi-visao-geral', 'dashboard Visão Geral'],
  ['dfi-performance', 'dashboard Performance'],
  ['dfi-confiabilidade', 'dashboard Confiabilidade'],
  ['--env-file', 'o compose usa observability/.env'],
];

test('os dois scripts cobrem todas as etapas do smoke', () => {
  for (const [trecho, descricao] of ETAPAS) {
    assert.ok(sh.includes(trecho), `smoke.sh não cobre: ${descricao}`);
    assert.ok(ps1.includes(trecho), `smoke.ps1 não cobre: ${descricao}`);
  }
});

test('a imagem do promtool vem do docker-compose.yml (não fica fixada duas vezes)', () => {
  assert.doesNotMatch(sh, /prom\/prometheus:v\d/);
  assert.doesNotMatch(ps1, /prom\/prometheus:v\d/);
  assert.ok(sh.includes('docker-compose.yml') && ps1.includes('docker-compose.yml'));
});

test('o script PowerShell segue a convenção do projeto: ASCII puro, sem BOM', () => {
  assert.ok([...ps1].every((c) => c.charCodeAt(0) < 128), 'há caractere fora do ASCII (acento, travessão, BOM)');
});

test('os scripts saem com código de erro quando alguma etapa falha', () => {
  assert.match(sh, /exit 1/);
  assert.match(ps1, /exit 1/);
});

test('o README documenta o passo a passo e as armadilhas conhecidas', () => {
  for (const trecho of [
    'docker compose --env-file observability/.env up -d',
    'GRAFANA_ADMIN_PASSWORD',
    'host.docker.internal',
    'observability-smoke',
    'down -v',
    'grafana-data',
    'docs/grafana',
    'docs/ARCHITECTURE.md',
    'DEPLOYMENT.md',
  ]) {
    assert.ok(readme.includes(trecho), `README não menciona: ${trecho}`);
  }
  assert.match(readme, /PRIMEIRA/, 'documenta que a senha só vale na primeira criação do volume');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test infra/scripts-e-docs.test.mjs`
Expected: FALHA com `ENOENT ... scripts/observability-smoke.sh`.

- [ ] **Step 3: Criar `scripts/observability-smoke.sh`**

```bash
#!/usr/bin/env bash
# ============================================================
# DATA FLOW INVENTORY — Smoke test do stack de observabilidade
# ============================================================
# Descrição:
# Valida, COM Docker, o que os testes automáticos não conseguem:
# que o compose sobe, que o Prometheus enxerga o servidor Node e
# que o Grafana carrega o datasource e os 3 dashboards.
#
# PRÉ-REQUISITOS
#   1. Docker instalado e em execução.
#   2. observability/.env criado a partir do .env.example (com a senha).
#   3. Servidor Node rodando (cd server && npm start), padrão http://localhost:3000.
#
# Uso:
#   bash scripts/observability-smoke.sh
#   SERVIDOR_URL=http://localhost:3000 bash scripts/observability-smoke.sh
#
# Sai com código 0 se tudo passar e 1 se alguma etapa falhar.
# No Windows sem Git Bash, use scripts/observability-smoke.ps1.
# ============================================================
set -u

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ARQ_ENV="$RAIZ/observability/.env"
ARQ_COMPOSE="$RAIZ/docker-compose.yml"
SERVIDOR="${SERVIDOR_URL:-http://localhost:3000}"
COMPOSE=(docker compose --env-file "$ARQ_ENV" -f "$ARQ_COMPOSE")
falhas=0

etapa()   { printf '%-66s' "$1"; }
passou()  { echo "PASS"; }
falhou()  { echo "FAIL"; [ -n "${1:-}" ] && echo "     -> $1"; falhas=$((falhas + 1)); }
ler_env() { grep -E "^$1=" "$ARQ_ENV" 2>/dev/null | head -n1 | cut -d= -f2-; }

# esperar <segundos> <comando...>: repete o comando até passar ou estourar o tempo
esperar() {
  local limite=$1; shift
  local fim=$((SECONDS + limite))
  while [ "$SECONDS" -lt "$fim" ]; do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

# ---- 1. Servidor Node -----------------------------------------------------
etapa "Servidor Node expõe /metrics ($SERVIDOR)"
if curl -fsS --max-time 5 "$SERVIDOR/metrics" 2>/dev/null | grep -q '^dfi_mqtt_connected'; then
  passou
else
  falhou "Suba o servidor: cd server && npm start (o Prometheus precisa dele para o alvo ficar 'up')"
fi

# ---- 2. Pré-requisitos (fatais) ---------------------------------------------
etapa "Docker está em execução"
if docker info >/dev/null 2>&1; then passou; else falhou "Inicie o Docker Desktop / serviço docker"; exit 1; fi

etapa "observability/.env existe e tem GRAFANA_ADMIN_PASSWORD"
SENHA="$(ler_env GRAFANA_ADMIN_PASSWORD)"
if [ -n "$SENHA" ]; then passou; else falhou "Copie observability/.env.example para observability/.env e defina a senha"; exit 1; fi
PORTA_PROM="$(ler_env PROMETHEUS_PORT)"; PORTA_PROM="${PORTA_PROM:-9090}"
PORTA_GRAF="$(ler_env GRAFANA_PORT)";    PORTA_GRAF="${PORTA_GRAF:-3030}"

# ---- 3. Configuração --------------------------------------------------------
etapa "docker compose config (YAML e variáveis válidos)"
if "${COMPOSE[@]}" config -q >/dev/null 2>&1; then passou; else falhou "Rode: ${COMPOSE[*]} config"; fi

etapa "promtool check config (prometheus.yml)"
IMAGEM_PROM="$(grep -E '^[[:space:]]+image:[[:space:]]+prom/prometheus:' "$ARQ_COMPOSE" | awk '{print $2}' | head -n1)"
if MSYS_NO_PATHCONV=1 docker run --rm --entrypoint promtool \
     -v "$RAIZ/observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
     "$IMAGEM_PROM" check config /etc/prometheus/prometheus.yml >/dev/null 2>&1; then
  passou
else
  falhou "Rode o promtool manualmente para ver o erro (imagem: $IMAGEM_PROM)"
fi

# ---- 4. Subir o stack -------------------------------------------------------
etapa "docker compose up -d"
if "${COMPOSE[@]}" up -d >/dev/null 2>&1; then passou; else falhou "Rode: ${COMPOSE[*]} up -d (e leia a saída)"; exit 1; fi

# ---- 5. Prometheus enxerga o servidor --------------------------------------
alvo_up() {
  curl -fsS --max-time 5 --get --data-urlencode 'query=up{job="dfi-server"}' \
    "http://127.0.0.1:${PORTA_PROM}/api/v1/query" | grep -Eq '"value":\[[0-9.]+,"1"\]'
}
etapa "Prometheus: alvo dfi-server em 'up' (até 60 s)"
if esperar 60 alvo_up; then
  passou
else
  falhou "Alvo fora do ar: servidor parado? Firewall do Windows bloqueando a 3000? Veja http://127.0.0.1:${PORTA_PROM}/targets"
fi

# ---- 6. Grafana --------------------------------------------------------------
grafana_saudavel() { curl -fsS --max-time 5 "http://127.0.0.1:${PORTA_GRAF}/api/health" | grep -Eq '"database": *"ok"'; }
etapa "Grafana: /api/health (até 90 s)"
if esperar 90 grafana_saudavel; then passou; else falhou "Veja: docker logs dfi-grafana"; fi

datasource_ok() {
  curl -fsS --max-time 10 -u "admin:${SENHA}" \
    "http://127.0.0.1:${PORTA_GRAF}/api/datasources/uid/dfi-prometheus/health" | grep -Eq '"status": *"OK"'
}
etapa "Grafana: datasource dfi-prometheus saudável"
if esperar 30 datasource_ok; then
  passou
else
  falhou "Senha diferente da usada na 1a criacao do volume? Veja observability/README.md (Problemas comuns)"
fi

for uid in dfi-visao-geral dfi-performance dfi-confiabilidade; do
  etapa "Grafana: dashboard $uid carregado (api/dashboards/uid/$uid)"
  if curl -fsS --max-time 10 -u "admin:${SENHA}" "http://127.0.0.1:${PORTA_GRAF}/api/dashboards/uid/${uid}" >/dev/null 2>&1; then
    passou
  else
    falhou "Dashboard ausente: confira docs/grafana/ e os logs do Grafana"
  fi
done

# ---- Resultado --------------------------------------------------------------
echo
if [ "$falhas" -eq 0 ]; then
  echo "TUDO OK. Grafana: http://127.0.0.1:${PORTA_GRAF}  (usuario: admin)"
  exit 0
fi
echo "$falhas etapa(s) falharam."
exit 1
```

- [ ] **Step 4: Criar `scripts/observability-smoke.ps1`** (ASCII puro, sem acentos, sem BOM)

```powershell
# ============================================================
# DATA FLOW INVENTORY - Smoke test do stack de observabilidade
# PowerShell version for Windows
# ============================================================
# Valida, COM Docker, o que os testes automaticos nao conseguem:
# que o compose sobe, que o Prometheus enxerga o servidor Node e
# que o Grafana carrega o datasource e os 3 dashboards.
#
# PRE-REQUISITOS
#   1. Docker Desktop em execucao.
#   2. observability\.env criado a partir do .env.example (com a senha).
#   3. Servidor Node rodando (cd server; npm start), padrao http://localhost:3000.
#
# Uso:
#   .\scripts\observability-smoke.ps1
#   .\scripts\observability-smoke.ps1 -ServidorUrl http://localhost:3000
#
# Sai com codigo 0 se tudo passar e 1 se alguma etapa falhar.
# ============================================================
param([string]$ServidorUrl = 'http://localhost:3000')

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$arqEnv = Join-Path $raiz 'observability\.env'
$arqCompose = Join-Path $raiz 'docker-compose.yml'
$falhas = 0

function Etapa([string]$titulo, [scriptblock]$bloco, [string]$dica = '') {
    Write-Host $titulo.PadRight(66) -NoNewline
    $ok = $false
    try { $ok = [bool](& $bloco) } catch { $ok = $false }
    if ($ok) {
        Write-Host 'PASS' -ForegroundColor Green
    } else {
        Write-Host 'FAIL' -ForegroundColor Red
        if ($dica) { Write-Host "     -> $dica" }
        $script:falhas++
    }
    return $ok
}

function LerEnv([string]$chave) {
    if (-not (Test-Path $arqEnv)) { return '' }
    $linha = Get-Content $arqEnv | Where-Object { $_ -match "^$chave=" } | Select-Object -First 1
    if ($linha) { return $linha.Substring($chave.Length + 1).Trim() }
    return ''
}

function Esperar([scriptblock]$condicao, [int]$segundos) {
    $fim = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $fim) {
        try { if (& $condicao) { return $true } } catch { }
        Start-Sleep -Seconds 2
    }
    return $false
}

# ---- 1. Servidor Node -------------------------------------------------------
[void](Etapa "Servidor Node expoe /metrics ($ServidorUrl)" {
    (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "$ServidorUrl/metrics").Content -match 'dfi_mqtt_connected'
} "Suba o servidor: cd server; npm start (o Prometheus precisa dele para o alvo ficar 'up')")

# ---- 2. Pre-requisitos (fatais) ---------------------------------------------
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker esta em execucao'.PadRight(66) -NoNewline
    Write-Host 'FAIL' -ForegroundColor Red
    Write-Host '     -> Inicie o Docker Desktop'
    exit 1
}
Write-Host 'Docker esta em execucao'.PadRight(66) -NoNewline
Write-Host 'PASS' -ForegroundColor Green

$senha = LerEnv 'GRAFANA_ADMIN_PASSWORD'
if (-not $senha) {
    Write-Host 'observability\.env existe e tem GRAFANA_ADMIN_PASSWORD'.PadRight(66) -NoNewline
    Write-Host 'FAIL' -ForegroundColor Red
    Write-Host '     -> Copie observability\.env.example para observability\.env e defina a senha'
    exit 1
}
Write-Host 'observability\.env existe e tem GRAFANA_ADMIN_PASSWORD'.PadRight(66) -NoNewline
Write-Host 'PASS' -ForegroundColor Green

$portaProm = LerEnv 'PROMETHEUS_PORT'; if (-not $portaProm) { $portaProm = '9090' }
$portaGraf = LerEnv 'GRAFANA_PORT';    if (-not $portaGraf) { $portaGraf = '3030' }

# ---- 3. Configuracao --------------------------------------------------------
[void](Etapa 'docker compose config (YAML e variaveis validos)' {
    docker compose --env-file $arqEnv -f $arqCompose config -q *> $null
    $LASTEXITCODE -eq 0
} "Rode: docker compose --env-file observability\.env config")

$imagemProm = (Select-String -Path $arqCompose -Pattern '^\s+image:\s+(prom/prometheus:\S+)' | Select-Object -First 1).Matches[0].Groups[1].Value
[void](Etapa 'promtool check config (prometheus.yml)' {
    $cfg = Join-Path $raiz 'observability\prometheus\prometheus.yml'
    docker run --rm --entrypoint promtool -v "${cfg}:/etc/prometheus/prometheus.yml:ro" $imagemProm check config /etc/prometheus/prometheus.yml *> $null
    $LASTEXITCODE -eq 0
} "Rode o promtool manualmente para ver o erro (imagem: $imagemProm)")

# ---- 4. Subir o stack -------------------------------------------------------
$subiu = Etapa 'docker compose up -d' {
    docker compose --env-file $arqEnv -f $arqCompose up -d *> $null
    $LASTEXITCODE -eq 0
} "Rode: docker compose --env-file observability\.env up -d (e leia a saida)"
if (-not $subiu) { exit 1 }

# ---- 5. Prometheus enxerga o servidor ---------------------------------------
[void](Etapa "Prometheus: alvo dfi-server em 'up' (ate 60 s)" {
    Esperar {
        $q = [uri]::EscapeDataString('up{job="dfi-server"}')
        $r = Invoke-RestMethod -TimeoutSec 5 "http://127.0.0.1:$portaProm/api/v1/query?query=$q"
        $r.data.result.Count -gt 0 -and $r.data.result[0].value[1] -eq '1'
    } 60
} "Alvo fora do ar: servidor parado? Firewall do Windows bloqueando a 3000? Veja http://127.0.0.1:$portaProm/targets")

# ---- 6. Grafana -------------------------------------------------------------
$cred = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin:$senha"))
$auth = @{ Authorization = "Basic $cred" }

[void](Etapa 'Grafana: /api/health (ate 90 s)' {
    Esperar { (Invoke-RestMethod -TimeoutSec 5 "http://127.0.0.1:$portaGraf/api/health").database -eq 'ok' } 90
} 'Veja: docker logs dfi-grafana')

[void](Etapa 'Grafana: datasource dfi-prometheus saudavel' {
    Esperar {
        (Invoke-RestMethod -TimeoutSec 10 -Headers $auth "http://127.0.0.1:$portaGraf/api/datasources/uid/dfi-prometheus/health").status -eq 'OK'
    } 30
} 'Senha diferente da usada na 1a criacao do volume? Veja observability\README.md (Problemas comuns)')

foreach ($uid in @('dfi-visao-geral', 'dfi-performance', 'dfi-confiabilidade')) {
    [void](Etapa "Grafana: dashboard $uid carregado (api/dashboards/uid/$uid)" {
        [bool](Invoke-RestMethod -TimeoutSec 10 -Headers $auth "http://127.0.0.1:$portaGraf/api/dashboards/uid/$uid").dashboard
    } 'Dashboard ausente: confira docs\grafana\ e os logs do Grafana')
}

# ---- Resultado --------------------------------------------------------------
Write-Host ''
if ($falhas -eq 0) {
    Write-Host "TUDO OK. Grafana: http://127.0.0.1:$portaGraf  (usuario: admin)" -ForegroundColor Green
    exit 0
}
Write-Host "$falhas etapa(s) falharam." -ForegroundColor Red
exit 1
```

- [ ] **Step 5: Criar `observability/README.md`**

````markdown
# Observabilidade — Prometheus + Grafana

Métricas de **performance e infraestrutura** do servidor Node (latência MQTT, tempo de resposta da API, throughput de eventos, reconexões, quedas do gateway) com dashboards Grafana. Elas **complementam** o historiador SQLite do Beckhoff CX9240, que guarda os dados de **negócio** (estoque e eventos com precisão por evento) e não muda.

```
server.js (métricas em memória) ◄── consulta a cada 5 s ── Prometheus (Docker) ──► Grafana (Docker)
        GET /metrics                                                                   docs/grafana/*.json
```

O servidor **nunca empurra dados**: se este stack estiver desligado, nada muda no `server.js`. O stack é **opcional** e voltado a desenvolvimento; não é necessário para a bancada básica.

> **Status de validação:** as métricas, o endpoint `/metrics`, a coerência dos dashboards com as métricas e a configuração são cobertos por testes automatizados que **não usam Docker** (`cd test/server_metrics && npm test`). A execução real do stack (`docker compose up`, consultas PromQL e renderização dos painéis) só é validada por você, com o `scripts/observability-smoke.*` e conferindo os painéis no navegador.

## Pré-requisitos

- Docker Desktop (Windows/Mac) ou Docker Engine + plugin Compose v2 (Linux).
- O servidor Node rodando no host: `cd server && npm start` (porta 3000). O Prometheus o consulta em `host.docker.internal:3000`.
- Portas livres no host: `9090` (Prometheus) e `3030` (Grafana). O servidor usa a 3000.

## Passo a passo

1. **Crie o `.env` do stack** e escolha a senha do Grafana:
   ```bash
   cp observability/.env.example observability/.env        # Linux/Mac/Git Bash
   copy observability\.env.example observability\.env      # Windows (cmd)
   ```
   Edite `observability/.env` e preencha `GRAFANA_ADMIN_PASSWORD`. O arquivo **não é versionado** (`*.env` está no `.gitignore`).
2. **Suba o servidor Node** (`cd server && npm start`) e confira `http://localhost:3000/metrics`.
3. **Suba o stack** (da raiz do repositório):
   ```bash
   docker compose --env-file observability/.env up -d
   ```
4. **Abra o Grafana** em <http://127.0.0.1:3030> (usuário `admin`, senha do passo 1). Os três dashboards aparecem na pasta *Data Flow Inventory*.
5. **Valide** com o smoke script (veja abaixo).

## Verificação (smoke)

```bash
bash scripts/observability-smoke.sh              # Linux/Mac/Git Bash
.\scripts\observability-smoke.ps1                # Windows (PowerShell)
```

Ele confere, nesta ordem: `/metrics` do servidor; `docker compose config`; `promtool check config`; `docker compose up -d`; o alvo `dfi-server` em `up` no Prometheus; a saúde do Grafana e do datasource `dfi-prometheus`; e os três dashboards carregados. Sai com código 1 se algo falhar.

Verificação manual: <http://127.0.0.1:9090/targets> deve mostrar `dfi-server` como **UP**.

## Dashboards

| Dashboard | O que mostra |
|---|---|
| **Visão Geral** | servidor, MQTT e gateway; estoque A/B/C (atual e ao longo do tempo); linha do tempo das 4 esteiras; dashboards conectados |
| **Performance** | p50/p95/p99 da confirmação de comando, do PUBACK do broker e da API (por rota); mensagens por tópico e eventos por tipo; CPU, memória e atraso do event loop |
| **Confiabilidade** | uptime MQTT; reconexões, erros e quedas do gateway na última hora; comandos por resultado; comandos sem resposta e confirmações órfãs |

Os painéis de latência ficam **sem pontos** enquanto ninguém envia comandos: percentis só existem quando há amostras na janela. Envie um pedido pelo dashboard web para vê-los.

O catálogo completo de métricas está em `docs/ARCHITECTURE.md` (seção *Observabilidade*).

### Alterar um dashboard

Os JSON em `docs/grafana/` são a **fonte da verdade** (o Grafana os carrega em modo somente leitura). Para mudar um painel: edite-o na interface, use *Export → Export as JSON* e sobrescreva o arquivo correspondente em `docs/grafana/`. Depois rode `cd test/server_metrics && npm test`: o teste garante que toda consulta cita apenas métricas que o servidor realmente expõe.

## Operação

```bash
docker compose --env-file observability/.env ps          # estado
docker compose --env-file observability/.env logs -f     # logs
docker compose --env-file observability/.env down        # para e MANTÉM os dados
docker compose --env-file observability/.env down -v     # para e APAGA os dados (Prometheus e Grafana)
```

- **Retenção:** 30 dias no Prometheus (volume `dfi-prometheus-data`).
- **Acesso pela rede da bancada:** as portas ficam presas ao `127.0.0.1` de propósito. Para abrir o Grafana a outras máquinas, troque o mapeamento de portas em `docker-compose.yml` e defina uma senha forte.
- **Versões fixadas:** `prom/prometheus:v3.15.0` e `grafana/grafana-oss:12.4.3`.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Alvo `dfi-server` aparece **DOWN** em `/targets` | servidor Node parado, ou o Firewall do Windows bloqueia a entrada na porta 3000 vinda do Docker | suba o servidor; libere a porta 3000 de entrada (mesma ideia do broker: veja `docs/broker_local_mosquitto.md`, seção do firewall) |
| `host.docker.internal` não resolve (Linux) | o nome só existe por padrão no Docker Desktop | o `docker-compose.yml` já mapeia `host.docker.internal:host-gateway`; use Docker 20.10+ |
| `docker compose up` reclama de `GRAFANA_ADMIN_PASSWORD` | faltou o `--env-file` ou a senha está vazia | use `--env-file observability/.env` e preencha a senha |
| Mudei a senha no `.env` e o Grafana continua com a antiga | `GRAFANA_ADMIN_PASSWORD` só vale na **PRIMEIRA** criação do volume `grafana-data` | apague o volume (`down -v`, perde os dados do Grafana) ou troque a senha na interface / com `grafana cli admin reset-admin-password` |
| Painéis de latência vazios | ninguém enviou comandos na janela | envie um pedido pelo dashboard web |
| Painel vazio depois de renomear uma métrica | a consulta ainda cita o nome antigo | rode `npm test` em `test/server_metrics`: o teste aponta a métrica inexistente |
| Porta 9090 ou 3030 ocupada | outro programa usa a porta | defina `PROMETHEUS_PORT` / `GRAFANA_PORT` em `observability/.env` |

## Relação com o Deployment Guide

O `docs/DEPLOYMENT.md` ainda não existe (é um card à parte). Quando for escrito, ele deve **referenciar este README** (ou absorver estes passos) na etapa de observabilidade.
````

- [ ] **Step 6: Rodar os testes estáticos e checar a sintaxe dos scripts**

Run: `cd test/server_metrics && node --test infra/scripts-e-docs.test.mjs`
Expected: os 5 testes passam.

Sintaxe do bash (não executa nada): `bash -n scripts/observability-smoke.sh` → sem saída.
Sintaxe do PowerShell (não executa nada), no PowerShell:
```powershell
$erros = $null; $tokens = $null
[void][System.Management.Automation.Language.Parser]::ParseFile("$PWD\scripts\observability-smoke.ps1", [ref]$tokens, [ref]$erros)
if ($erros.Count) { $erros | ForEach-Object { $_.Message }; exit 1 } else { 'sintaxe ok' }
```
Expected: `sintaxe ok`. **Não execute os scripts** (não há Docker; eles falhariam na etapa 2).

- [ ] **Step 7: Commit**

```bash
git add scripts/observability-smoke.sh scripts/observability-smoke.ps1 observability/README.md test/server_metrics/infra/scripts-e-docs.test.mjs
git commit -m "feat(observabilidade): smoke scripts do stack e README com passo a passo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Job de CI e documentação (`ARCHITECTURE.md`, `CHANGELOG.md`)

**Files:**
- Modify: `.github/workflows/lint-and-security.yaml` (edição C1)
- Modify: `docs/ARCHITECTURE.md` (edições D1–D2), `docs/CHANGELOG.md` (edição D3)
- Test: `test/server_metrics/infra/ci-e-docs.test.mjs`

**Interfaces:**
- Consumes: catálogo de métricas (Tasks 2–4), `observability/README.md` (Task 9), estrutura atual do workflow (job `frontend-tests` já existente, herdado da branch principal).
- Produces: job `server-metrics-tests`; seção `## 7. Observabilidade` em `docs/ARCHITECTURE.md` (a antiga `## 7. Documentação Correlata` vira `## 8.`); entrada no `CHANGELOG.md`.

- [ ] **Step 1: Testes (falhando)**

`test/server_metrics/infra/ci-e-docs.test.mjs`:

```js
// Verificações ESTÁTICAS do job de CI e da documentação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { criarMetricas } from '../../../server/metrics.js';
import { familias } from '../helpers/prom.mjs';

const ler = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

test('CI: o job server-metrics-tests roda os testes de métricas no Node 22, sem Docker', () => {
  const wf = parse(ler('.github/workflows/lint-and-security.yaml'));
  const job = wf.jobs['server-metrics-tests'];
  assert.ok(job, 'o job existe');
  assert.equal(job['runs-on'], 'ubuntu-latest');
  const setup = job.steps.find((p) => p.uses?.startsWith('actions/setup-node'));
  assert.equal(String(setup.with['node-version']), '22');
  assert.match(setup.with['cache-dependency-path'], /server\/package-lock\.json/);
  assert.match(setup.with['cache-dependency-path'], /test\/server_metrics\/package-lock\.json/);
  const comandos = job.steps.map((p) => p.run ?? '').join('\n');
  assert.match(comandos, /cd server && npm ci/);
  assert.match(comandos, /test\/server_metrics && npm ci/);
  assert.match(comandos, /cd test\/server_metrics && npm test/);
  assert.doesNotMatch(comandos, /docker/i, 'o CI não depende de Docker');
  assert.ok(wf.jobs['frontend-tests'], 'o job frontend-tests já existente foi preservado');
});

test('ARCHITECTURE.md: a seção Observabilidade lista TODAS as métricas dfi_* do servidor', async () => {
  const arq = ler('docs/ARCHITECTURE.md');
  assert.match(arq, /^## 7\. Observabilidade\s*$/m);
  assert.match(arq, /^## 8\. Documentação Correlata\s*$/m);
  const secao = arq.split(/^## 7\. Observabilidade\s*$/m)[1].split(/^## 8\. /m)[0];
  const nomes = [...familias(await criarMetricas({ topicos: {} }).texto()).keys()].filter((n) => n.startsWith('dfi_'));
  assert.ok(nomes.length >= 17, 'o servidor expõe as 17 métricas do catálogo');
  const faltando = nomes.filter((n) => !secao.includes(n));
  assert.deepEqual(faltando, [], `métricas sem documentação: ${faltando.join(', ')}`);
  for (const trecho of ['observability/README.md', 'docs/grafana', 'METRICS_CONFIRMACAO_TIMEOUT_MS', 'CX9240']) {
    assert.ok(secao.includes(trecho), `a seção Observabilidade não menciona ${trecho}`);
  }
  assert.ok(arq.includes('observability/README.md'), 'a lista de documentação correlata aponta para o README do stack');
});

test('CHANGELOG registra a telemetria histórica em "Não publicado"', () => {
  const log = ler('docs/CHANGELOG.md');
  const naoPublicado = log.split(/^## \[Não publicado\]\s*$/m)[1].split(/^## \[/m)[0];
  assert.match(naoPublicado, /Telemetria Histórica de Performance/);
  assert.match(naoPublicado, /GET \/metrics/);
  assert.match(naoPublicado, /observability\/README\.md/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd test/server_metrics && node --test infra/ci-e-docs.test.mjs`
Expected: os 3 testes FALHAM (job inexistente; seção `## 7. Observabilidade` ausente; entrada do CHANGELOG ausente).

- [ ] **Step 3: Editar o workflow de CI**

**Edição C1** — arquivo `.github/workflows/lint-and-security.yaml` (o `old_string` deve aparecer exatamente uma vez; é a última linha do arquivo)
`old_string`:
```yaml
          retention-days: 7
```
`new_string`:
```yaml
          retention-days: 7

  server-metrics-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: |
            server/package-lock.json
            test/server_metrics/package-lock.json

      - name: Instalar dependências (server e testes de métricas)
        run: |
          cd server && npm ci
          cd ../test/server_metrics && npm ci

      - name: Testes das métricas e da infraestrutura de observabilidade (sem Docker)
        run: cd test/server_metrics && npm test
```

- [ ] **Step 4: Editar `docs/ARCHITECTURE.md`**

**Edição D1** — arquivo `docs/ARCHITECTURE.md`: nova seção 7 e renumeração da antiga
`old_string`:
```markdown
## 7. Documentação Correlata
```
`new_string`:
```markdown
## 7. Observabilidade

> **Escopo:** métricas de **performance e infraestrutura** do servidor Node.js. Elas **complementam** (não substituem) o historiador SQLite do Beckhoff CX9240 (§6.1), que guarda os dados de **negócio** — estoque e eventos com precisão por evento.

### 7.1 Arquitetura

`server.js` (métricas em memória) ← `GET /metrics`, consulta a cada 5 s ← **Prometheus** (Docker) → **Grafana** (Docker, dashboards em `docs/grafana/`).

- O servidor **nunca empurra dados**: se o stack estiver desligado, nada muda no `server.js`. O stack é opcional e voltado a desenvolvimento.
- `GET /metrics` fica na mesma porta do servidor (3000) e segue o padrão aberto do `/api/status`. Nenhum rótulo carrega `brokerUrl`, usuário ou senha.
- A lógica é isolada em `server/metrics.js` (fachada sobre `prom-client`, com registro próprio); o `server.js` só chama ganchos. **Todo método da fachada é à prova de falha** (`try/catch` interno), porque o servidor encerra o processo em qualquer `uncaughtException`.

### 7.2 Catálogo de métricas (prefixo `dfi_`)

Os rótulos só recebem valores de listas permitidas; qualquer outro valor vira `outro`.

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
- **Estoque:** gauge amostrado a cada scrape (5 s). A variação exata por evento fica no SQLite do CX9240.

### 7.4 Stack e dashboards

- `docker-compose.yml` (raiz): Prometheus `v3.15.0` e Grafana OSS `12.4.3`, portas presas ao `127.0.0.1` (9090 e 3030), senha do Grafana obrigatória (`GRAFANA_ADMIN_PASSWORD` em `observability/.env`).
- Dashboards versionados em `docs/grafana/`: **Visão Geral**, **Performance** (p50/p95/p99) e **Confiabilidade**.
- Passo a passo, smoke test e problemas comuns: `observability/README.md`.

### 7.5 Limitações conhecidas

- O casamento comando → confirmação é aproximado enquanto o firmware não devolver um id de correlação.
- Percentis só existem quando há amostras na janela (sem comandos, os painéis de latência ficam vazios).
- A execução real do stack e a renderização dos painéis são validadas com `scripts/observability-smoke.*`; os testes automatizados (`test/server_metrics`) não usam Docker.

## 8. Documentação Correlata
```

**Edição D2** — arquivo `docs/ARCHITECTURE.md`: apontar a documentação nova na lista de correlatos
`old_string`:
```markdown
- `docs/CHANGELOG.md` — Histórico de mudanças
```
`new_string`:
```markdown
- `docs/CHANGELOG.md` — Histórico de mudanças
- `observability/README.md` — **[NOVO]** Stack de observabilidade (Prometheus + Grafana): passo a passo, smoke test e problemas comuns
- `docs/grafana/` — **[NOVO]** Dashboards do Grafana versionados (Visão Geral, Performance, Confiabilidade)
```

- [ ] **Step 5: Editar `docs/CHANGELOG.md`**

**Edição D3** — arquivo `docs/CHANGELOG.md`: nova entrada no topo de "Adicionado" (o `old_string` é a primeira entrada atual)
`old_string`:
```markdown
- **Roteiro de Testes — Semana 7 (28/09–02/10/2026)**
```
`new_string`:
```markdown
- **Telemetria Histórica de Performance — Prometheus + Grafana (30/09/2026)**
  - `GET /metrics` no `server/server.js` (mesma porta 3000 e mesmo padrão aberto do `/api/status`) com 17 métricas `dfi_*` mais as métricas padrão do processo: publish → ack do broker, tempo de confirmação do gateway por comando, tempo de resposta da API por rota, throughput de mensagens e eventos, reconexões MQTT, erros, quedas do gateway (LWT), comandos por resultado, sem resposta e órfãos, estoque e esteiras
  - Lógica isolada em `server/metrics.js` (+ `server/metrics-correlacao.js`, fila FIFO comando → confirmação); todo método é à prova de falha para nunca derrubar o servidor; rótulos só aceitam valores de listas permitidas
  - Variável nova `METRICS_CONFIRMACAO_TIMEOUT_MS` (padrão 10000) em `server/.env.example`; dependência nova `prom-client`
  - Stack Docker de desenvolvimento em `docker-compose.yml` (Prometheus `v3.15.0` + Grafana `12.4.3`, portas presas ao localhost, senha obrigatória) com provisionamento em `observability/`
  - Três dashboards versionados em `docs/grafana/`: Visão Geral, Performance (p50/p95/p99) e Confiabilidade
  - Passo a passo, smoke test e problemas comuns em `observability/README.md`; nova seção "Observabilidade" em `docs/ARCHITECTURE.md`
  - Testes sem Docker em `test/server_metrics/` (unitários, integração com broker MQTT em processo e verificações estáticas do stack) e job `server-metrics-tests` no CI
  - **Não validado ainda:** execução real do stack (`docker compose up`), consultas PromQL e renderização dos painéis — dependem de Docker e são cobertos por `scripts/observability-smoke.sh` / `.ps1`. Burn-in com os dashboards e screenshots para o card continuam pendentes
  - Complementa (não substitui) o historiador SQLite do CX9240, que guarda os dados de negócio

- **Roteiro de Testes — Semana 7 (28/09–02/10/2026)**
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd test/server_metrics && node --test infra/ci-e-docs.test.mjs && npm test`
Expected: os 3 testes novos passam e a suíte inteira continua verde. Confira também que o YAML do workflow continua válido: o próprio teste faz o `parse`.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/lint-and-security.yaml docs/ARCHITECTURE.md docs/CHANGELOG.md test/server_metrics/infra/ci-e-docs.test.mjs
git commit -m "docs(observabilidade): ARCHITECTURE, CHANGELOG e job de CI para as métricas" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificação final, regressão e evidência real

Nenhum arquivo versionado novo (só correções, se algo falhar). Serve para provar o estado final do branch com comandos reais e colher a evidência que a nota do Vault vai citar.

**Files:**
- Nenhum novo. Um gerador de evidência **descartável** fica fora do repositório (diretório temporário da sessão).

**Interfaces:**
- Consumes: tudo das Tasks 1–10.
- Produces: um arquivo de texto **fora do repositório** com as linhas `dfi_*` de um `/metrics` real (usado na Task 12) e o resultado das verificações abaixo, colados no relatório da tarefa.

- [ ] **Step 1: Suíte completa, duas vezes (estabilidade)**

Run (duas vezes seguidas): `cd test/server_metrics && npm test`
Expected: 0 falhas nas duas execuções e nenhuma linha `[METRICS]` nem erro no log. Se algum teste de tempo falhar só sob carga, rode o arquivo isolado e relate as duas execuções honestamente.

- [ ] **Step 2: Regressão do servidor sob a CSP real (helmet)**

O `frontend_smoke` sobe o `server/server.js` já instrumentado (projeto `servidor-sem-broker`, porta 3101). O frontend e o simulador **não** foram tocados, então basta esse projeto:
```bash
cd test/frontend_smoke && npm ci && npx playwright test --project=servidor-sem-broker
```
Expected: passa. (O Chromium já está no cache do Playwright deste usuário; se pedir download, use `npx playwright install chromium`, download autorizado.)

- [ ] **Step 3: Auditoria de dependências (mesma régua do CI)**

```bash
cd server && npm audit --audit-level=critical
cd ../test/server_metrics && npm audit --audit-level=critical
```
Expected: sem vulnerabilidades críticas. Relate o resumo (mesmo que haja moderadas/altas, sem corrigir nada fora do escopo).

- [ ] **Step 4: Fronteiras do escopo e higiene**

```bash
git diff --name-only origin/main | grep -E '^(arduino|esp32|simulator|frontend|test/frontend_smoke|test/mqtt_probe)/' || echo "nenhum arquivo proibido alterado"
grep -rn --exclude-dir=node_modules '```' server/metrics.js server/metrics-correlacao.js server/server.js test/server_metrics scripts docker-compose.yml observability/prometheus observability/grafana observability/.env.example || echo "nenhuma cerca de markdown em arquivo-fonte"
git status --short
```
Expected: "nenhum arquivo proibido alterado", "nenhuma cerca de markdown em arquivo-fonte" e `git status` limpo. Confirme também que `server/.env` não foi criado nem versionado.

- [ ] **Step 5: Sintaxe dos smoke scripts (sem executá-los)**

```bash
bash -n scripts/observability-smoke.sh && echo "sh ok"
```
E no PowerShell (mesmo comando do Step 6 da Task 9): esperado `sintaxe ok`.

- [ ] **Step 6: Colher a evidência real do `/metrics`**

Grave `coletar-exemplo.mjs` **fora do repositório** e rode `node coletar-exemplo.mjs "<caminho-absoluto-do-worktree>" > metrics-exemplo.txt` (também fora do repositório):

```js
// coletar-exemplo.mjs — ferramenta DESCARTÁVEL (não versionar).
// Sobe broker em processo + servidor real + gateway falso, gera tráfego e imprime as linhas dfi_* do /metrics.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = process.argv[2];
if (!RAIZ) throw new Error('Informe o caminho do worktree.');
const auxiliar = (nome) => import(pathToFileURL(path.join(RAIZ, 'test/server_metrics/helpers', nome)).href);

const { iniciarBroker } = await auxiliar('broker.mjs');
const { iniciarServidor } = await auxiliar('servidor.mjs');
const { criarGateway } = await auxiliar('gateway.mjs');
const { conectarDashboard } = await auxiliar('dashboard.mjs');
const { esperar } = await auxiliar('esperar.mjs');
const { valor } = await auxiliar('prom.mjs');

const broker = await iniciarBroker();
const servidor = await iniciarServidor({ brokerPorta: broker.porta });
try {
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
  const gateway = await criarGateway(broker.porta);
  await gateway.publicar('dataflow/estoque', { type: 'estoque', pecaA: 4, pecaB: 5, pecaC: 3 }, { retain: true });
  await gateway.publicar('dataflow/esteiras', { principal: true, secA: true, secB: false, secC: false });
  await gateway.publicar('dataflow/eventos', { type: 'evento', evento: 'pedido', peca: 'A' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(
    async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', { acao: 'solicitar_peca', status: 'encaminhado' }) === 1,
    { descricao: 'a confirmação do gateway' },
  );
  await fetch(`${servidor.url}/api/status`);
  const texto = await servidor.texto();
  console.log(texto.split('\n').filter((l) => l.startsWith('dfi_') && !l.includes('_bucket')).join('\n'));
  dashboard.fechar();
  gateway.fechar();
} finally {
  await servidor.parar();
  await broker.parar();
}
```
Expected: o arquivo lista linhas como `dfi_mqtt_connected 1`, `dfi_stock_pieces{peca="A"} 4`, `dfi_command_confirmation_seconds_count{acao="solicitar_peca",status="encaminhado"} 1`, `dfi_commands_total{resultado="publicado"} 1`. Guarde o **caminho** desse arquivo no relatório: a Task 12 usa um trecho dele.

- [ ] **Step 7: Relatório da tarefa (sem commit)**

Registre no relatório: saída das duas execuções da suíte, do `frontend_smoke`, das auditorias, das checagens de fronteira e o caminho do `metrics-exemplo.txt`. Se algum passo exigir correção de código, corrija com um commit próprio (`fix(observabilidade): ...`) e repita a verificação.

---

### Task 12: Nota do Vault e links inversos (Obsidian)

Escreve `Backend/Telemetria Histórica - Prometheus e Grafana.md` no Vault (`C:\Users\matheusn\Documents\GitHub\ObsidianVault`) e acrescenta as linhas inversas nas notas existentes, no padrão de `Convenção de links.md`. **Somente esta tarefa mexe fora do worktree; o Vault não recebe commit** (o plugin de backup já cuida disso).

**Files (todos no Vault):**
- Create: `Backend/Telemetria Histórica - Prometheus e Grafana.md`
- Modify: `Automation/Data Flow Inventory.md` (2 linhas acrescentadas)
- Modify: `Backend/Docker Compose - Stacks de dados.md` (1 linha acrescentada)
- Modify: `Jornada/Jornada de Aprendizagem.md` (item 10.6 + 1 linha em "Notas futuras planejadas")

**Interfaces:**
- Consumes: fatos reais das Tasks 1–11 e o `metrics-exemplo.txt` da Task 11 (para o trecho de exemplo).
- Convenção (`Convenção de links.md`): relações no vocabulário fechado (`Pressupõe`, `Aprofunda`, `Relaciona-se com`, `Base para`…), cada linha entre `~~ ~~`, aplicada só às notas novas e às linhas adicionadas. Notas do Vault usam finais de linha **LF** (confirmado); tags na 1ª linha (`#backend #docker` já existem).

- [ ] **Step 1: Reler o padrão antes de escrever**

Leia `Convenção de links.md`, o topo e as seções de `Backend/Docker Compose - Stacks de dados.md` (estilo: `> [!info] Objetivo da nota`, `## Sumário` com `[[#Seção]]`, `### Vault` / `### Externas` nas referências) e a seção "Próximos Passos" de `Automation/Data Flow Inventory.md`.

- [ ] **Step 2: Criar a nota**

Crie `Backend/Telemetria Histórica - Prometheus e Grafana.md` com o conteúdo abaixo (**as métricas e comandos já foram verificados**; só o bloco marcado com `[!warning]` depende do estado de validação — ver Step 3):

````markdown
#backend #docker
~~Pressupõe: [[Docker]], [[Docker Compose - Stacks de dados]]~~
~~Aprofunda: [[Data Flow Inventory]]~~
~~Relaciona-se com: [[TF6420 - Database Server]], [[Funcionalidades de Conectividade - TF6100 vs TF6250 vs TF6420]], [[Publisher-Subscriber (Beckhoff RT Linux - CX8290)]], [[Docker CI-CD com GitHub Actions]]~~
# Telemetria Histórica - Prometheus e Grafana
> [!info] Objetivo da nota
> Explicar a camada de **observabilidade de performance** do [[Data Flow Inventory]]: métricas Prometheus no servidor Node.js e dashboards Grafana que respondem "o sistema está saudável e rápido?" — uma pergunta diferente da que o historiador de dados de negócio responde.

> [!warning] O que foi e o que não foi validado
> Os testes automatizados (unitários, integração com um broker MQTT em processo e verificações estáticas dos arquivos do stack) foram executados por quem implementou. **A execução real do stack Docker (`docker compose up`), as consultas PromQL e a renderização dos painéis não foram executadas**: a máquina de desenvolvimento não tinha Docker. Valide no seu ambiente com o smoke script (ver [[#Verificação]]).

## Sumário
- [[#Objetivo]]
- [[#Por que isso importa no projeto]]
- [[#Como foi integrada]]
- [[#Métricas expostas]]
- [[#Como rodar]]
- [[#Verificação]]
- [[#Problemas comuns]]
- [[#Decisões de projeto]]
- [[#Limitações]]
- [[#Referências]]

## Objetivo
O [[Data Flow Inventory]] já tinha um historiador: o Beckhoff CX9240 grava estoque e eventos em SQLite, via [[TF6420 - Database Server]]. Aquilo é **dado de negócio** — "quantas peças de cada tipo existiam às 14h?". Esta nota trata do outro lado: **dado de performance e infraestrutura** — "quanto tempo o ESP32 levou para confirmar o comando?", "quantas vezes o gateway caiu hoje?", "o servidor está lento?". Para isso o servidor Node.js passou a expor métricas em `GET /metrics`, um **Prometheus** as coleta e um **Grafana** as desenha em três dashboards.

## Por que isso importa no projeto
- **Duas perguntas, duas ferramentas.** Negócio pede precisão por evento e SQL (o que o CX9240 faz); performance pede séries de tempo agregadas, contadores e **percentis** (p50/p95/p99), que é o que o Prometheus faz bem. Misturar as duas no mesmo banco polui os dois.
- **Falhas silenciosas ficam visíveis.** A cadeia é longa (Arduino → ESP32 → broker → servidor → dashboard); uma queda do gateway, uma reconexão ao broker ou um comando que o ESP32 nunca confirmou passavam despercebidos. Agora cada um vira uma métrica com histórico.
- **Serve de instrumento para o burn-in.** Durante os testes de bancada dá para observar latência e reconexões em paralelo, em vez de depender só do que aparece no log.
- **É o mesmo raciocínio da "melhoria contínua" de [[Docker#Melhoria contínua]]**: medir antes de mexer. E reaproveita o padrão de stack descrito em [[Docker Compose - Stacks de dados]] (Compose + Grafana provisionado), trocando o Postgres por um banco de séries de tempo.
- O modelo publicador/assinante do MQTT é o mesmo de [[Publisher-Subscriber (Beckhoff RT Linux - CX8290)]]; aqui ele ganha um observador externo, sem mudar quem publica.

## Como foi integrada
```
server.js (métricas em memória) ◄── GET /metrics, consulta a cada 5 s ── Prometheus (Docker) ──► Grafana (Docker)
```
1. **Módulo isolado `server/metrics.js`** (biblioteca `prom-client`). O `server.js` só chama ganchos finos: conexão MQTT, mensagem recebida, comando publicado, confirmação do gateway, resposta HTTP.
2. **O servidor nunca empurra dados** (modelo *pull*): se o stack estiver desligado, nada muda no servidor — sem fila, sem retry, sem impacto.
3. **Fachada à prova de falha.** O servidor encerra o processo em qualquer exceção não capturada; por isso todo método de métrica tem `try/catch` interno. Um bug de métrica não pode derrubar a bancada.
4. **Rótulos com lista permitida.** Qualquer valor desconhecido vira `outro`; um payload estranho vindo do broker nunca cria séries novas sem limite. Nenhum rótulo carrega endereço do broker, usuário ou senha.
5. **Comando → confirmação.** O firmware do ESP32 confirma o comando sem devolver um id de correlação (e a rejeição nem repete a peça). O servidor casa comando e confirmação **por ordem de chegada**, com uma fila FIFO por `acao|peca` — a mesma estrutura vista em [[Estruturas de dados]]. Sem resposta em 10 s vira "comando sem resposta"; confirmação sem comando vira "órfã".
6. **Gateway offline = transição.** O LWT retido chega de novo a cada reconexão do servidor; só a passagem *online → offline* conta como queda.
7. **Stack como código.** `docker-compose.yml` sobe Prometheus e Grafana com versões fixadas; o datasource e os dashboards são provisionados a partir de arquivos (`observability/` e `docs/grafana/`). As portas ficam presas ao `127.0.0.1` e a senha do Grafana é obrigatória.
8. **Testes sem Docker.** Um broker MQTT em processo (`aedes`) e o servidor real permitem testar publish, reconexão, LWT e o fluxo de comandos de verdade; testes estáticos garantem que todo painel só cita métricas que o servidor expõe.

## Métricas expostas
Prefixo `dfi_`. Além destas, o `prom-client` expõe `process_*` e `nodejs_*` (CPU, memória, atraso do event loop).

| Grupo | Métricas |
|---|---|
| Latência (histogramas) | `dfi_mqtt_publish_ack_seconds`, `dfi_command_confirmation_seconds`, `dfi_http_request_duration_seconds` |
| Throughput | `dfi_mqtt_messages_total`, `dfi_events_total` |
| Conexão | `dfi_mqtt_connected`, `dfi_mqtt_uptime_seconds`, `dfi_mqtt_reconnects_total`, `dfi_mqtt_errors_total` |
| Gateway | `dfi_gateway_online`, `dfi_gateway_offline_total` |
| Comandos | `dfi_commands_total`, `dfi_command_unconfirmed_total`, `dfi_command_confirmation_orphan_total` |
| Estado | `dfi_stock_pieces`, `dfi_conveyor_on`, `dfi_websocket_clients` |

Trecho real de `/metrics` (colhido com o servidor de verdade, um broker MQTT em processo e um gateway falso; depois de um pedido de peça A):
```
dfi_mqtt_connected 1
dfi_mqtt_reconnects_total 0
dfi_gateway_online 1
dfi_stock_pieces{peca="A"} 4
dfi_stock_pieces{peca="B"} 5
dfi_stock_pieces{peca="C"} 3
dfi_conveyor_on{esteira="principal"} 1
dfi_conveyor_on{esteira="secA"} 1
dfi_events_total{evento="pedido"} 1
dfi_commands_total{resultado="publicado"} 1
dfi_mqtt_publish_ack_seconds_count{topic="dataflow/comandos/sub"} 1
dfi_command_confirmation_seconds_count{acao="solicitar_peca",status="encaminhado"} 1
```

## Como rodar
```bash
cp observability/.env.example observability/.env      # preencha GRAFANA_ADMIN_PASSWORD
cd server && npm start                                # servidor na porta 3000
cd .. && docker compose --env-file observability/.env up -d
```
Grafana em `http://127.0.0.1:3030` (usuário `admin`); Prometheus em `http://127.0.0.1:9090`. Os dashboards **Visão Geral**, **Performance** e **Confiabilidade** aparecem na pasta *Data Flow Inventory*. Detalhes em `observability/README.md` do repositório.

## Verificação
- `bash scripts/observability-smoke.sh` (ou `.\scripts\observability-smoke.ps1` no Windows) confere: `/metrics`, `docker compose config`, `promtool check config`, o alvo `dfi-server` em `up`, a saúde do Grafana e do datasource, e os três dashboards.
- Manual: `http://127.0.0.1:9090/targets` deve mostrar `dfi-server` como **UP**.
- Sem Docker: `cd test/server_metrics && npm test` roda todos os testes automatizados.

## Problemas comuns
| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Alvo `dfi-server` **DOWN** | servidor parado, ou o Firewall do Windows bloqueia a porta 3000 vinda do Docker | subir o servidor; liberar a 3000 (mesma ideia do broker) |
| Trocou a senha no `.env` e o Grafana ignora | a senha só vale na **primeira** criação do volume | apagar o volume (`down -v`) ou redefinir pela interface |
| Painéis de latência vazios | ninguém enviou comandos na janela | enviar um pedido pelo dashboard web |

## Decisões de projeto
- **Prometheus, não InfluxDB.** O modelo *pull* mantém o servidor independente do stack e os histogramas dão p50/p95/p99 direto. O InfluxDB (*push*) guardaria o instante exato de cada evento, mas exigiria lote/retry no servidor e um token para proteger. A precisão por evento já existe no historiador do CX9240.
- **`/metrics` na mesma porta**, no padrão aberto do `/api/status` (que já expõe o endereço do broker), em vez de uma porta separada.
- **Estoque como gauge amostrado** a cada 5 s: suficiente para a tendência; o exato fica no SQLite.
- **Sem mudar o firmware.** Um id de correlação no ESP32 tornaria o casamento exato, mas exigiria regravar o gateway na bancada — ficou como melhoria futura.

## Limitações
- O casamento comando → confirmação é aproximado enquanto o firmware não devolver um id.
- Percentis só existem quando há amostras na janela.
- O stack é de **desenvolvimento**: portas locais, sem TLS, sem alertas.

## Referências
### Vault
- [[Data Flow Inventory]] — o projeto que ganhou a telemetria
- [[Docker Compose - Stacks de dados]] — o padrão de stack com Grafana provisionado
- [[Docker]] — conceitos de containers e [[Docker#Melhoria contínua]]
- [[TF6420 - Database Server]] — o lado "dado de negócio" (historiador)
- [[Publisher-Subscriber (Beckhoff RT Linux - CX8290)]] e [[Funcionalidades de Conectividade - TF6100 vs TF6250 vs TF6420]] — protocolos e modelo pub/sub
- [[Docker CI-CD com GitHub Actions]] — o job de CI que roda os testes
- [[Estruturas de dados]] — a fila FIFO
### Externas
- [Visão geral do Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Histogramas e sumários — boas práticas](https://prometheus.io/docs/practices/histograms/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Provisionamento do Grafana](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [Grafana em Docker](https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/)
````

- [ ] **Step 3: Ajustar o que só o estado real define**

1. **Confira o trecho de exemplo:** as 12 linhas do bloco "Trecho real de `/metrics`" da nota vieram de uma execução real do coletor da Task 11. Compare-as com o seu `metrics-exemplo.txt`; se alguma linha divergir (valor ou nome), **use a sua saída real** no lugar, sem inventar linhas.
2. **Aviso de validação:** se o usuário informou, no despacho desta tarefa, que **já executou o smoke com sucesso** no PC dele, substitua o bloco `> [!warning] O que foi e o que não foi validado` por um `> [!success]` que diga exatamente o que ele validou (e só isso). Caso contrário, mantenha o aviso como está.
3. Não escreva contagens de testes nem datas de execução que você não tenha verificado.

- [ ] **Step 4: Linhas inversas nas notas existentes (somente acrescentar)**

Use edições de linha única; nenhuma linha existente é alterada.

**Edição V1** — `Automation/Data Flow Inventory.md`, relação inversa (logo após a linha `Aplica na prática`)
`old_string`:
```markdown
~~Aplica na prática: [[PLC OOP Basics]], [[Motores elétricos e Controle de Velocidade]], [[Estruturas de dados]]~~
```
`new_string`:
```markdown
~~Aplica na prática: [[PLC OOP Basics]], [[Motores elétricos e Controle de Velocidade]], [[Estruturas de dados]]~~
~~Base para: [[Telemetria Histórica - Prometheus e Grafana]]~~
```

**Edição V2** — `Automation/Data Flow Inventory.md`, item em "Próximos Passos" (logo após o item "Análise do histórico")
`old_string`:
```markdown
- 📊 **Análise do histórico:** os dados coletados podem alimentar os fluxos de [[Pandas para Ciência de Dados]] e [[Pré-processamento de Dados]].
```
`new_string`:
```markdown
- 📊 **Análise do histórico:** os dados coletados podem alimentar os fluxos de [[Pandas para Ciência de Dados]] e [[Pré-processamento de Dados]].
- 📈 **Telemetria de performance:** o servidor Node.js expõe métricas Prometheus (`/metrics`) e dashboards Grafana mostram latência MQTT, tempo de resposta da API, reconexões e quedas do gateway, complementando o historiador de negócio do CX9240 — veja [[Telemetria Histórica - Prometheus e Grafana]] (métricas e testes prontos; a execução do stack Docker ainda deve ser validada em bancada).
```

**Edição V3** — `Backend/Docker Compose - Stacks de dados.md`, relação inversa
`old_string`:
```markdown
~~Relaciona-se com: [[TF6420 - Database Server]], [[Docker - Gateway de dados (pyads, OPC UA, MQTT)]]~~
```
`new_string`:
```markdown
~~Relaciona-se com: [[TF6420 - Database Server]], [[Docker - Gateway de dados (pyads, OPC UA, MQTT)]]~~
~~Base para: [[Telemetria Histórica - Prometheus e Grafana]]~~
```

**Edição V4** — `Jornada/Jornada de Aprendizagem.md`, item 10.6 na Trilha 10 (logo após o 10.5)
`old_string`:
```markdown
	- 🎯 Pratique: publique a tag `v1.0.0` e veja o deploy acontecer sozinho na VM que simula o IPC
```
`new_string`:
```markdown
	- 🎯 Pratique: publique a tag `v1.0.0` e veja o deploy acontecer sozinho na VM que simula o IPC
- [ ] **10.6 [[Telemetria Histórica - Prometheus e Grafana]]** 🟡📘 — métricas de performance do Data Flow Inventory com Prometheus e Grafana
	- 🔑 Termos: `Prometheus`, `scrape`, `histograma`, `percentil (p95)`, `rótulo`, `LWT`, `provisioning`
	- 🎯 Pratique: suba o stack, envie pedidos pelo dashboard web e localize no painel *Performance* o p95 do tempo de confirmação do gateway
```

**Edição V5** — `Jornada/Jornada de Aprendizagem.md`, registro em "Notas futuras planejadas"
`old_string`:
```markdown
- [x] Trilha **Containers e DevOps (Docker)**: [[Docker]] + 4 notas satélites — criada (Trilha 10)
```
`new_string`:
```markdown
- [x] Trilha **Containers e DevOps (Docker)**: [[Docker]] + 4 notas satélites — criada (Trilha 10)
- [x] Nota **[[Telemetria Histórica - Prometheus e Grafana]]** — criada (Trilha 10.6)
```

Cada `old_string` deve aparecer **exatamente uma vez** no arquivo; se não aparecer, pare e reporte (não improvise).

- [ ] **Step 5: Verificar links e âncoras da nota**

Grave o verificador abaixo como `verificar-links.mjs` **fora do Vault e fora do repositório** (diretório temporário da sessão):

```js
// verificar-links.mjs — ferramenta DESCARTÁVEL (não colocar no Vault).
// Uso: node verificar-links.mjs <pasta-do-vault> "<caminho-relativo-da-nota>"
import fs from 'node:fs';
import path from 'node:path';

const [raiz, notaRel] = process.argv.slice(2);
if (!raiz || !notaRel) throw new Error('Uso: node verificar-links.mjs <vault> "<nota.md>"');

const notas = new Map(); // nome da nota (sem .md) → caminho
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p);
    else if (e.name.endsWith('.md')) notas.set(e.name.slice(0, -3), p);
  }
})(raiz);

const arquivo = path.join(raiz, notaRel);
const texto = fs.readFileSync(arquivo, 'utf8');
const semBlocos = texto.replace(/^(`{3,})[\s\S]*?^\1\s*$/gm, ''); // ignora blocos de código

// Título de seção: linha que começa com 1 a 6 "#" seguidos de espaço, sem regex dinâmica.
const temTitulo = (conteudo, titulo) => conteudo.split('\n').some(
  (linha) => /^#{1,6}\s/.test(linha) && linha.replace(/^#{1,6}\s+/, '').trim() === titulo,
);

let problemas = 0;
for (const m of semBlocos.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
  const [alvo, ancora] = m[1].split('#');
  const caminhoAlvo = alvo ? notas.get(alvo) : arquivo;
  if (alvo && !caminhoAlvo) { console.log(`NOTA INEXISTENTE: [[${m[1]}]]`); problemas++; continue; }
  if (ancora && !temTitulo(fs.readFileSync(caminhoAlvo, 'utf8'), ancora)) {
    console.log(`ÂNCORA INEXISTENTE: [[${m[1]}]]`); problemas++;
  }
}
console.log(problemas ? `${problemas} problema(s)` : 'todos os links e âncoras existem');
process.exit(problemas ? 1 : 0);
```

e rode:

```bash
node verificar-links.mjs "C:/Users/matheusn/Documents/GitHub/ObsidianVault" "Backend/Telemetria Histórica - Prometheus e Grafana.md"
```
Expected: `todos os links e âncoras existem`. Corrija a nota (nunca crie notas-alvo novas) se algo falhar. Confira ainda que `git -C <Vault> status --short` mostra só as 4 notas esperadas (a nova e as 3 alteradas) além de `.obsidian/workspace.json`, que não é seu, e **não dê commit**.

- [ ] **Step 6: Relatório da tarefa**

Liste no relatório: a nota criada, as 5 edições aplicadas (V1–V5, com a linha resultante de cada), a saída do verificador de links e o que foi mantido no aviso de validação. **Não escreva no relatório nem na nota nada que não tenha sido executado.**

---

## Auto-revisão do plano (feita ao escrever)

- **Cobertura do spec:** §1 escopo → Tasks 2–10; §2 decisões D1–D6 → Tasks 2–8; §3–4 arquitetura e catálogo → Tasks 2–4 e teste de coerência da Task 8/10; §5 módulo → Tasks 2–4; §6 ganchos → Tasks 5–6; §7 stack e smoke → Tasks 7 e 9; §8 dashboards → Task 8; §9 testes → Tasks 1–10 (CI na Task 10); §10 documentação e Vault → Tasks 9, 10 e 12; §11 riscos (Docker não validado) → Tasks 9, 10, 12 e relatório final; §12 entregáveis → Task 11 e relatório.
- **Desvios do spec (todos listados no topo):** `topicos` em `criarMetricas`; módulo `metrics-correlacao.js`; terceiro argumento de `publishAck`; `.gitignore` sem alteração; `--env-file`; gerador descartável; Vault depois da verificação.
- **Consistência de nomes:** a fachada expõe `mensagemMqtt`, `mqttConectou`, `mqttCaiu`, `mqttErro`, `gateway`, `evento`, `estoque`, `esteiras` (Task 2), `comandoAceito`, `comandoFalhou`, `publishAck`, `comandoRecusado`, `confirmacaoGateway`, `varrerPendentes` (Task 3) e `middlewareHttp` (Task 4); o `server.js` usa exatamente esses nomes (Tasks 5–6).
- **Verificado antes de entregar o plano:** o código das Tasks 1–10 foi extraído do próprio plano, aplicado sobre o `server.js` real e executado (78 testes, 0 falhas), incluindo as 21 edições do `server.js`, os 3 dashboards gerados, os arquivos do stack e as edições de CI/documentação. A sintaxe dos smoke scripts foi checada com `bash -n` e com o parser do PowerShell.
- **Não verificável nesta máquina (sem Docker):** `docker compose up`, `promtool`, consultas PromQL e renderização dos painéis — cobertos por `scripts/observability-smoke.*` para o usuário.
