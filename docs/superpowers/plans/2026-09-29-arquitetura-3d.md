# Arquitetura 3D navegável + polimento do painel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a vista `#/arquitetura` (diagrama 3D navegável com status ao vivo das conexões), um seletor de vistas em destaque e o polimento do painel principal, sem quebrar nenhum botão.

**Architecture:** SPA estática em `frontend/` com roteamento por hash. A vista nova é composta por ES modules independentes de `app.js`: modelo estático (`arquitetura-dados.js`), lógica pura de status (`arquitetura-status.js`), coletor de sinais (`arquitetura-sinais.js`), cena three.js (`arquitetura3d.js`) e fallback SVG (`arquitetura-fallback.js`). `app.js` recebe só mudanças cirúrgicas (socket exposto, roteador de 3 rotas, ligação de botões protegida, seletor de vistas).

**Tech Stack:** HTML/CSS/JS vanilla, three.js r169 vendorizado (+ OrbitControls e CSS2DRenderer 0.169.0), Socket.IO client, `node --test` (Node 22), Playwright (`@playwright/test`, Chromium), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-29-arquitetura-3d-design.md` — ler antes de cada tarefa; as seções citadas (§) referem-se a ele.

## Global Constraints

- Trabalhar **somente** no worktree `C:\Users\matheusn\Documents\GitHub\DataFlowInventory-arq3d`, branch `feat/arquitetura-3d`.
- **Proibido alterar:** `docs/*.md` (exceto este plano), `README.md`, `docs/CHANGELOG.md`, `frontend/README.md`, `server/**`, `simulator/**`, `arduino/**`, `esp32/**`.
- **Contrato congelado (§3.3):** todo `id` usado em `els` de `frontend/js/app.js` e em `diagrama3d.js` (`mimic-3d`, `.mimic`) continua existindo; `#btn-solicitar-a/b/c` e `#btn-reset` continuam `<button>`; células da faixa mantêm `.annun-v`, `.annun-led`, `data-state`.
- CSP do servidor: `scriptSrc 'self' https://cdn.socket.io` → **nenhum script inline** (nem `importmap`, nem `onclick`). Addons importam `'/vendor/three.module.min.js'`.
- three.js vendorizado é **r169**; addons **exatamente** de `three@0.169.0/examples/jsm/`.
- Idioma de UI, comentários e mensagens de commit: **português (pt-BR)**, seguindo o estilo dos arquivos existentes (cabeçalhos `// ====`).
- Tokens de cor: usar as variáveis de `:root` em `style.css`; nenhuma cor crua nova fora de `:root` (exceto materiais three.js, que espelham os tokens em hex com comentário).
- Alvos de toque ≥ 44 px de altura; 8 px entre alvos adjacentes; `:focus-visible` nunca removido.
- `prefers-reduced-motion: reduce` desliga partículas, voos de câmera (corte seco) e animações novas.
- Toda tarefa termina com `npm test` em `test/frontend_smoke` **passando** (inclui o cenário dos botões) antes do commit.
- Node **≥ 22.7** (os módulos de `frontend/js/` são ESM sem `package.json`; os testes unitários dependem da detecção automática de módulo). Verificar com `node -v` antes da Task 2.
- Testes unitários sempre com o glob entre aspas: `node --test "test/frontend/*.test.mjs"`.
- O Playwright usa as portas 3000 (simulador) e 3001 (servidor): nada mais pode estar escutando nelas durante os testes.
- Commits terminam com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `test/frontend_smoke/package.json`, `package-lock.json` | Criar | Pacote Playwright |
| `test/frontend_smoke/playwright.config.mjs` | Criar | 2 projetos: `simulador` (porta 3000) e `servidor-sem-broker` (porta 3001) |
| `test/frontend_smoke/helpers.mjs` | Criar | Coleta de erros de console, roteiro dos botões |
| `test/frontend_smoke/botoes.spec.mjs` | Criar | Cenários 1 e 2 |
| `test/frontend_smoke/navegacao.spec.mjs` | Criar | Cenário 3 |
| `test/frontend_smoke/arquitetura.spec.mjs` | Criar | Cenário 5 |
| `test/frontend_smoke/resiliencia.spec.mjs` | Criar | Cenário 4 |
| `test/frontend_smoke/mobile.spec.mjs` | Criar | Cenário 6 |
| `test/frontend_smoke/csp.spec.mjs` | Criar | Cenário 7 |
| `test/frontend/arquitetura-status.test.mjs` | Criar | Unitários de `derivarStatus` |
| `test/frontend/arquitetura-dados.test.mjs` | Criar | Integridade do modelo |
| `test/frontend/arquitetura-sinais.test.mjs` | Criar | Unitários do coletor |
| `frontend/js/arquitetura-status.js` | Criar | Função pura de status (§4.3–4.5) |
| `frontend/js/arquitetura-dados.js` | Criar | Modelo estático (§4.1–4.2) |
| `frontend/js/arquitetura-sinais.js` | Criar | Coletor de sinais (§4.6) |
| `frontend/js/arquitetura3d.js` | Criar | Cena, navegação, detalhes, ciclo de vida (§5) |
| `frontend/js/arquitetura-fallback.js` | Criar | SVG 2D sem WebGL (§5.5) |
| `frontend/js/seletor.js` | Criar | LED da tecla ARC (usa sinais + status) |
| `frontend/vendor/OrbitControls.js`, `frontend/vendor/CSS2DRenderer.js` | Criar | Addons r169 com import reescrito |
| `frontend/js/app.js` | Modificar | `dfiSocket`, `ligar()`, roteador 3 rotas, `aria-current`, contador LOG |
| `frontend/js/diagrama3d.js` | Modificar | Pausa só fora da rota principal |
| `frontend/index.html` | Modificar | `.topo`, seletor, vista arquitetura, ícones, ajuda, atalhos |
| `frontend/css/style.css` | Modificar | Seletor, vista arquitetura, polimento |
| `.github/workflows/lint-and-security.yaml` | Modificar | Job `frontend-tests` |

---

### Task 1: Rede de proteção E2E + linha de base dos botões

Cria o pacote Playwright e os cenários 1 e 2 (§7.2), e roda **contra o código atual**, sem nenhuma mudança no frontend. Precisa passar agora; é a linha de base que protege todas as tarefas seguintes.

**Files:**
- Create: `test/frontend_smoke/package.json`, `test/frontend_smoke/package-lock.json` (gerado)
- Create: `test/frontend_smoke/playwright.config.mjs`
- Create: `test/frontend_smoke/helpers.mjs`
- Create: `test/frontend_smoke/botoes.spec.mjs`
- Modify: `.gitignore` (raiz) — acrescentar saídas do Playwright

**Interfaces:**
- Produces (em `helpers.mjs`): `coletarErros(page) → string[]` (array vivo), `esperarSemErros(erros)`, `roteiroBotoes(page)` (clica A, B, C e Reiniciar e verifica o efeito de cada um), `IDS_CONTRATO: string[]`. Projetos Playwright `simulador` (baseURL `http://localhost:3000`) e `servidor-sem-broker` (baseURL `http://localhost:3001`).

- [ ] **Step 1: Instalar dependências dos servidores (usadas pelo `webServer`)**

```bash
cd simulator && npm ci && cd ../server && npm ci && cd ..
```

- [ ] **Step 2: Criar o pacote de testes**

`test/frontend_smoke/package.json`:

```json
{
  "name": "dataflow-frontend-smoke",
  "version": "1.0.0",
  "private": true,
  "description": "Testes E2E de fumaça do dashboard (Playwright) — protegem os botões de controle e a navegação",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:simulador": "playwright test --project=simulador"
  }
}
```

```bash
cd test/frontend_smoke && npm install -D @playwright/test && npx playwright install chromium
```

Expected: `package-lock.json` criado; Chromium baixado (~150 MB, download autorizado pelo usuário).

- [ ] **Step 3: Configuração**

`test/frontend_smoke/playwright.config.mjs`:

```js
// ============================================================
// DATA FLOW INVENTORY — Configuração dos testes E2E (Playwright)
// ------------------------------------------------------------
// Projeto "simulador": sobe ../../simulator na porta 3000 (sem helmet).
// Projeto "servidor-sem-broker": sobe ../../server na porta 3001 com um
// broker inalcançável, para exercitar a CSP real do helmet e o 503 de
// /api/status. O dotenv não sobrescreve variáveis já definidas aqui.
// ============================================================
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs/,
  // O simulador é um processo único com estado (estoque = 5 por peça):
  // testes em série e sem retentativas, para não esgotar o estoque.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'simulador', testIgnore: /csp\.spec\.mjs/, use: { baseURL: 'http://localhost:3000' } },
    { name: 'servidor-sem-broker', testMatch: /csp\.spec\.mjs/, use: { baseURL: 'http://localhost:3001' } },
  ],
  webServer: [
    {
      command: 'node ../../simulator/server.js',
      url: 'http://localhost:3000',
      env: { PORT: '3000' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node ../../server/server.js',
      url: 'http://localhost:3001',
      env: {
        PORT: '3001',
        ALLOWED_ORIGIN: 'http://localhost:3001',
        MQTT_BROKER_URL: 'mqtt://127.0.0.1',
        MQTT_PORT: '1',          // porta fechada → broker sempre inalcançável
        MQTT_USERNAME: '',
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
```

- [ ] **Step 4: Helpers**

`test/frontend_smoke/helpers.mjs`:

```js
// ============================================================
// Utilitários compartilhados dos testes E2E
// ============================================================
import { expect } from '@playwright/test';

// Recursos externos cuja falha de rede não indica defeito do dashboard.
const IGNORAR = /fonts\.(googleapis|gstatic)\.com|favicon\.ico/;

/** Registra erros de página/console. Retorna um array preenchido ao longo do teste. */
export function coletarErros(page) {
  const erros = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (IGNORAR.test(m.text()) || IGNORAR.test(url)) return;
    erros.push(`console: ${m.text()}`);
  });
  return erros;
}

export function esperarSemErros(erros) {
  expect(erros, erros.join('\n')).toEqual([]);
}

/** Linhas do histórico com exatamente este texto. */
function linhas(page, texto) {
  return page.locator('#historico-lista .historico-msg', { hasText: new RegExp(`^${texto}$`) });
}

/**
 * Roteiro dos botões de controle (cenário 1, spec §7.2).
 * Conta as linhas antes de clicar, porque o simulador reenvia os últimos
 * eventos em "estado_inicial" (execuções anteriores já entregaram peças).
 */
export async function roteiroBotoes(page) {
  const estado = page.locator('#estado-atual');
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');

  for (const peca of ['A', 'B', 'C']) {
    const botao = page.locator(`#btn-solicitar-${peca.toLowerCase()}`);
    await expect(botao).toBeEnabled();
    const antes = await linhas(page, `Peça ${peca} entregue`).count();
    await botao.click();
    await expect(linhas(page, `Peça ${peca} entregue`)).toHaveCount(antes + 1);
    await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
    await expect(botao).toBeEnabled();
  }

  const antesReset = await linhas(page, 'Comando enviado: reset').count();
  await page.locator('#btn-reset').click();
  await expect(linhas(page, 'Comando enviado: reset')).toHaveCount(antesReset + 1);
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
}

/** IDs usados por frontend/js/app.js (objeto els) e diagrama3d.js — contrato congelado (§3.3). */
export const IDS_CONTRATO = [
  'mqtt-status', 'gateway-status', 'server-time', 'annun-estado', 'annun-estado-v',
  'annun-estoque', 'annun-estoque-v', 'estado-atual', 'peca-solicitada', 'uptime',
  'estoque-a', 'estoque-b', 'estoque-c', 'estoque-badge-a', 'estoque-badge-b', 'estoque-badge-c',
  'esteira-principal', 'esteira-a', 'esteira-b', 'esteira-c',
  'sensor-topo-a', 'sensor-topo-b', 'sensor-topo-c', 'sensor-j1', 'sensor-j2', 'sensor-j3',
  'svg-esteira-principal', 'svg-esteira-a', 'svg-esteira-b', 'svg-esteira-c',
  'svg-sensor-topo-a', 'svg-sensor-topo-b', 'svg-sensor-topo-c',
  'svg-sensor-j1', 'svg-sensor-j2', 'svg-sensor-j3',
  'driver-info', 'btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset',
  'historico-lista', 'view-principal', 'view-status', 'mimic-3d',
];
```

- [ ] **Step 5: Cenários 1 e 2**

`test/frontend_smoke/botoes.spec.mjs`:

```js
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, roteiroBotoes, IDS_CONTRATO } from './helpers.mjs';

test('cenário 1 — botões Solicitar A/B/C e Reiniciar funcionam', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  await roteiroBotoes(page);
  esperarSemErros(erros);
});

test('cenário 2 — contrato de IDs preservado', async ({ page }) => {
  await page.goto('/');
  for (const id of IDS_CONTRATO) {
    await expect(page.locator(`#${id}`), `#${id} ausente`).toHaveCount(1);
  }
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset']) {
    expect(await page.locator(`#${id}`).evaluate((el) => el.tagName)).toBe('BUTTON');
  }
});
```

- [ ] **Step 6: Ignorar saídas do Playwright** — acrescentar ao final do `.gitignore` da raiz:

```
# Playwright (test/frontend_smoke)
test/frontend_smoke/test-results/
test/frontend_smoke/playwright-report/
test/frontend_smoke/capturas/
```

- [ ] **Step 7: Rodar a linha de base**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: `2 passed`. Se o cenário 1 falhar contra o código atual, **pare e reporte**: o teste precisa enxergar o comportamento de hoje antes de proteger qualquer mudança.

- [ ] **Step 7b: Capturas "antes" (linha de base visual)** — com o simulador rodando em outro terminal (`cd simulator && npm start`):

```bash
cd test/frontend_smoke
for tam in 1920,1080 1366,768 375,812; do
  for rota in "" "#/status"; do
    nome=$(echo "${rota:-principal}" | tr -d '#/')
    npx playwright screenshot --wait-for-timeout=2500 --viewport-size=$tam "http://localhost:3000/$rota" "capturas/antes/${nome:-principal}-${tam/,/x}.png"
  done
done
```

Expected: 6 PNGs em `test/frontend_smoke/capturas/antes/` (ignorados pelo git; usados na Task 12). Encerrar o simulador em seguida (o Playwright sobe o próprio).

- [ ] **Step 8: Commit**

```bash
git add test/frontend_smoke/package.json test/frontend_smoke/package-lock.json test/frontend_smoke/playwright.config.mjs test/frontend_smoke/helpers.mjs test/frontend_smoke/botoes.spec.mjs .gitignore
git commit -m "test: E2E de fumaça dos botões (linha de base, Playwright)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Lógica pura de status (`arquitetura-status.js`) — TDD

Implementa §4.3–4.5 como função pura, sem DOM e sem three.js, importável no Node.

**Files:**
- Create: `test/frontend/arquitetura-status.test.mjs`
- Create: `frontend/js/arquitetura-status.js`

**Interfaces:**
- Produces (exports de `frontend/js/arquitetura-status.js`):
  - `NOS: string[]` = `['arduino','esp32','broker','servidor','simulador','dashboard','beckhoff']`
  - `TOPOLOGIA: Record<string, [string, string]>` (id do enlace → [de, para])
  - `ORDEM_GRAVIDADE: string[]` = `['falha','atencao','desconhecido','sem-dados','ok']`
  - `LIMITE_CAMPO_MS = 60000`
  - `detectarModo(api) → 'local'|'nuvem'|'simulador'|'desconhecido'`
  - `derivarStatus(sinais, agora) → { modo, enlaces: Record<id, {estado, inferido, fonte}>, nos: Record<id, estado>, resumo: {pior, monitorados, ok} }`
  - `sinais` tem o formato de §4.3: `{ socketConectado, api, gateway, ultimoDadoCampoEm, apiEm }`

- [ ] **Step 1: Escrever os testes (falhando)**

`test/frontend/arquitetura-status.test.mjs`:

```js
// Testes unitários de derivarStatus (spec §4.5). Rodar: node --test "test/frontend/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  derivarStatus, detectarModo, NOS, TOPOLOGIA, LIMITE_CAMPO_MS,
} from '../../frontend/js/arquitetura-status.js';

const AGORA = 1_000_000;
const API_LOCAL = { tipo: 'ok', mqtt: true, brokerUrl: 'mqtt://127.0.0.1' };

function sinais(extra = {}) {
  return {
    socketConectado: true,
    api: API_LOCAL,
    gateway: 'online',
    ultimoDadoCampoEm: AGORA - 1000,
    apiEm: AGORA - 500,
    ...extra,
  };
}
const est = (r, id) => r.enlaces[id].estado;

test('detectarModo: local, nuvem, simulador, desconhecido', () => {
  assert.equal(detectarModo(API_LOCAL), 'local');
  assert.equal(detectarModo({ tipo: 'ok', mqtt: true, brokerUrl: 'mqtts://abc.s1.eu.hivemq.cloud' }), 'nuvem');
  assert.equal(detectarModo({ tipo: 'ok', mqtt: true, brokerUrl: 'mqtts://broker.exemplo' }), 'nuvem');
  assert.equal(detectarModo({ tipo: 'ok', mqtt: true, brokerUrl: 'mqtt://10.0.0.5:8883' }), 'nuvem');
  assert.equal(detectarModo({ tipo: 'ausente' }), 'simulador');
  assert.equal(detectarModo({ tipo: 'erro' }), 'desconhecido');
  assert.equal(detectarModo({ tipo: 'pendente' }), 'desconhecido');
});

test('modo local saudável: tudo ok, Beckhoff sem telemetria, ramo do simulador fora do modo', () => {
  const r = derivarStatus(sinais(), AGORA);
  assert.equal(r.modo, 'local');
  for (const id of ['uart', 'mqtt-esp32', 'mqtt-servidor', 'socket-servidor']) assert.equal(est(r, id), 'ok', id);
  assert.equal(est(r, 'mqtt-beckhoff'), 'sem-telemetria');
  assert.equal(est(r, 'socket-simulador'), 'fora-do-modo');
  assert.equal(est(r, 'mqtt-simulador'), 'fora-do-modo');
  assert.equal(r.nos.simulador, 'fora-do-modo');
  assert.equal(r.nos.beckhoff, 'sem-telemetria');
  assert.equal(r.nos.dashboard, 'ok');
  assert.deepEqual(r.resumo, { pior: 'ok', monitorados: 4, ok: 4 });
});

test('servidor responde 503 (mqtt=false) → mqtt-servidor em falha e nós vizinhos em falha', () => {
  const r = derivarStatus(sinais({ api: { tipo: 'ok', mqtt: false, brokerUrl: 'mqtt://127.0.0.1' } }), AGORA);
  assert.equal(est(r, 'mqtt-servidor'), 'falha');
  assert.equal(r.nos.servidor, 'falha');
  assert.equal(r.nos.broker, 'falha');
  assert.equal(r.resumo.pior, 'falha');
});

test('api com erro/pendente → mqtt-servidor desconhecido', () => {
  assert.equal(est(derivarStatus(sinais({ api: { tipo: 'erro' } }), AGORA), 'mqtt-servidor'), 'desconhecido');
  assert.equal(est(derivarStatus(sinais({ api: { tipo: 'pendente' } }), AGORA), 'mqtt-servidor'), 'desconhecido');
});

test('gateway offline → mqtt-esp32 falha e UART desconhecido (nunca falha)', () => {
  const r = derivarStatus(sinais({ gateway: 'offline' }), AGORA);
  assert.equal(est(r, 'mqtt-esp32'), 'falha');
  assert.equal(est(r, 'uart'), 'desconhecido');
  assert.equal(r.nos.esp32, 'falha');
});

test('gateway sem informação → mqtt-esp32 desconhecido', () => {
  assert.equal(est(derivarStatus(sinais({ gateway: null }), AGORA), 'mqtt-esp32'), 'desconhecido');
});

test('UART inferido: < 60 s ok, ≥ 60 s atenção, sem dado nenhum atenção — nunca falha', () => {
  const recente = derivarStatus(sinais({ ultimoDadoCampoEm: AGORA - (LIMITE_CAMPO_MS - 1) }), AGORA);
  assert.equal(est(recente, 'uart'), 'ok');
  assert.equal(recente.enlaces.uart.inferido, true);
  assert.equal(est(derivarStatus(sinais({ ultimoDadoCampoEm: AGORA - LIMITE_CAMPO_MS }), AGORA), 'uart'), 'atencao');
  assert.equal(est(derivarStatus(sinais({ ultimoDadoCampoEm: null }), AGORA), 'uart'), 'atencao');
});

test('modo simulador: ramo real fora do modo, simulador ok, publicação MQTT sem telemetria', () => {
  const r = derivarStatus(sinais({ api: { tipo: 'ausente' } }), AGORA);
  assert.equal(r.modo, 'simulador');
  for (const id of ['uart', 'mqtt-esp32', 'mqtt-servidor', 'socket-servidor']) assert.equal(est(r, id), 'fora-do-modo', id);
  assert.equal(est(r, 'socket-simulador'), 'ok');
  assert.equal(est(r, 'mqtt-simulador'), 'sem-telemetria');
  assert.equal(r.nos.arduino, 'fora-do-modo');
  assert.equal(r.nos.servidor, 'fora-do-modo');
  assert.equal(r.nos.simulador, 'ok');
  assert.equal(r.nos.dashboard, 'ok');
  assert.deepEqual(r.resumo, { pior: 'ok', monitorados: 1, ok: 1 });
});

test('modo desconhecido: nenhum ramo esmaecido', () => {
  const r = derivarStatus(sinais({ api: { tipo: 'pendente' } }), AGORA);
  assert.equal(r.modo, 'desconhecido');
  assert.equal(est(r, 'socket-servidor'), 'ok');
  assert.equal(est(r, 'socket-simulador'), 'desconhecido');
  assert.equal(est(r, 'mqtt-simulador'), 'sem-telemetria');
});

test('socket caído (modo local): dashboard em falha, demais sem dados, Beckhoff sem telemetria', () => {
  const r = derivarStatus(sinais({ socketConectado: false }), AGORA);
  assert.equal(est(r, 'socket-servidor'), 'falha');
  for (const id of ['uart', 'mqtt-esp32', 'mqtt-servidor']) assert.equal(est(r, id), 'sem-dados', id);
  assert.equal(est(r, 'mqtt-beckhoff'), 'sem-telemetria');
  assert.equal(est(r, 'socket-simulador'), 'fora-do-modo');
  assert.equal(r.nos.dashboard, 'falha');
  assert.equal(r.resumo.pior, 'falha');
});

test('socket caído em modo desconhecido: os dois enlaces do dashboard em falha', () => {
  const r = derivarStatus(sinais({ socketConectado: false, api: { tipo: 'erro' } }), AGORA);
  assert.equal(est(r, 'socket-servidor'), 'falha');
  assert.equal(est(r, 'socket-simulador'), 'falha');
});

test('todo enlace tem fonte textual e todo nó tem estado', () => {
  const r = derivarStatus(sinais(), AGORA);
  for (const id of Object.keys(TOPOLOGIA)) {
    assert.ok(r.enlaces[id], id);
    assert.equal(typeof r.enlaces[id].fonte, 'string');
    assert.ok(r.enlaces[id].fonte.length > 10, id);
  }
  for (const no of NOS) assert.equal(typeof r.nos[no], 'string', no);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test "test/frontend/*.test.mjs"`
Expected: FAIL — `Cannot find module '.../frontend/js/arquitetura-status.js'`.

- [ ] **Step 3: Implementação**

`frontend/js/arquitetura-status.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — Status das conexões (lógica pura)
// ------------------------------------------------------------
// Converte os sinais disponíveis no navegador (socket, /api/status,
// LWT do gateway, idade do último dado de campo) em estados por
// enlace e por nó. Sem DOM e sem three.js: testado em Node
// (test/frontend/arquitetura-status.test.mjs). Regras: spec §4.5.
// ============================================================

export const NOS = ['arduino', 'esp32', 'broker', 'servidor', 'simulador', 'dashboard', 'beckhoff'];

export const TOPOLOGIA = {
  'uart':             ['arduino', 'esp32'],
  'mqtt-esp32':       ['esp32', 'broker'],
  'mqtt-servidor':    ['broker', 'servidor'],
  'socket-servidor':  ['servidor', 'dashboard'],
  'mqtt-beckhoff':    ['broker', 'beckhoff'],
  'socket-simulador': ['simulador', 'dashboard'],
  'mqtt-simulador':   ['simulador', 'broker'],
};

// Do mais grave para o menos grave (só estados que contam como monitorados).
export const ORDEM_GRAVIDADE = ['falha', 'atencao', 'desconhecido', 'sem-dados', 'ok'];

// Silêncio do Arduino por mais que isso vira "sem dados recentes".
export const LIMITE_CAMPO_MS = 60000;

const FONTES = {
  'uart':             'Inferido pela chegada de dados do Arduino (status, sensores, esteiras)',
  'mqtt-esp32':       'LWT do gateway em dataflow/status (evento "gateway")',
  'mqtt-servidor':    'GET /api/status (campo mqtt), consultado a cada 5 s',
  'socket-servidor':  'Conexão Socket.IO deste navegador',
  'socket-simulador': 'Conexão Socket.IO deste navegador',
  'mqtt-beckhoff':    'Não monitorado — telemetria oficial planejada como melhoria',
  'mqtt-simulador':   'Não monitorado — publicação opcional (MQTT_PUBLISH=true)',
};

const NAO_MONITORADOS = new Set(['sem-telemetria', 'fora-do-modo']);

export function detectarModo(api) {
  if (!api) return 'desconhecido';
  if (api.tipo === 'ausente') return 'simulador';
  if (api.tipo !== 'ok') return 'desconhecido';
  const url = String(api.brokerUrl || '').toLowerCase();
  if (url.includes('hivemq') || url.startsWith('mqtts://') || url.includes(':8883')) return 'nuvem';
  return 'local';
}

function pior(estados) {
  let melhorIdx = ORDEM_GRAVIDADE.length - 1;
  for (const e of estados) {
    const i = ORDEM_GRAVIDADE.indexOf(e);
    if (i !== -1 && i < melhorIdx) melhorIdx = i;
  }
  return ORDEM_GRAVIDADE[melhorIdx];
}

function estadoComSocket(id, s, modo, agora) {
  const sim = modo === 'simulador';
  switch (id) {
    case 'socket-servidor':
      return sim ? 'fora-do-modo' : 'ok';
    case 'socket-simulador':
      if (sim) return 'ok';
      return modo === 'desconhecido' ? 'desconhecido' : 'fora-do-modo';
    case 'mqtt-servidor':
      if (sim) return 'fora-do-modo';
      if (s.api && s.api.tipo === 'ok') return s.api.mqtt ? 'ok' : 'falha';
      return 'desconhecido';
    case 'mqtt-esp32':
      if (sim) return 'fora-do-modo';
      if (s.gateway === 'online') return 'ok';
      if (s.gateway === 'offline') return 'falha';
      return 'desconhecido';
    case 'uart':
      if (sim) return 'fora-do-modo';
      if (s.gateway !== 'online') return 'desconhecido';
      if (s.ultimoDadoCampoEm != null && agora - s.ultimoDadoCampoEm < LIMITE_CAMPO_MS) return 'ok';
      return 'atencao'; // silêncio não prova falha: nunca 'falha'
    case 'mqtt-beckhoff':
      return 'sem-telemetria';
    case 'mqtt-simulador':
      return modo === 'local' || modo === 'nuvem' ? 'fora-do-modo' : 'sem-telemetria';
    default:
      return 'desconhecido';
  }
}

function estadoSemSocket(id, modo) {
  const sim = modo === 'simulador';
  const desc = modo === 'desconhecido';
  switch (id) {
    case 'socket-servidor':
      return sim ? 'fora-do-modo' : 'falha';
    case 'socket-simulador':
      return sim || desc ? 'falha' : 'fora-do-modo';
    case 'mqtt-beckhoff':
      return 'sem-telemetria';
    case 'mqtt-simulador':
      return modo === 'local' || modo === 'nuvem' ? 'fora-do-modo' : 'sem-telemetria';
    default: // uart, mqtt-esp32, mqtt-servidor
      return sim ? 'fora-do-modo' : 'sem-dados';
  }
}

export function derivarStatus(sinais, agora) {
  const s = sinais || {};
  const modo = detectarModo(s.api);

  const enlaces = {};
  for (const id of Object.keys(TOPOLOGIA)) {
    enlaces[id] = {
      estado: s.socketConectado ? estadoComSocket(id, s, modo, agora) : estadoSemSocket(id, modo),
      inferido: id === 'uart',
      fonte: FONTES[id],
    };
  }

  const nos = {};
  for (const no of NOS) {
    const proprios = Object.keys(TOPOLOGIA)
      .filter((id) => TOPOLOGIA[id].includes(no))
      .map((id) => enlaces[id].estado);
    const monitorados = proprios.filter((e) => !NAO_MONITORADOS.has(e));
    if (monitorados.length) nos[no] = pior(monitorados);
    else if (proprios.every((e) => e === 'fora-do-modo')) nos[no] = 'fora-do-modo';
    else nos[no] = 'sem-telemetria';
  }

  const monitorados = Object.values(enlaces).map((e) => e.estado).filter((e) => !NAO_MONITORADOS.has(e));
  const resumo = {
    pior: monitorados.length ? pior(monitorados) : 'desconhecido',
    monitorados: monitorados.length,
    ok: monitorados.filter((e) => e === 'ok').length,
  };

  return { modo, enlaces, nos, resumo };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test "test/frontend/*.test.mjs"`
Expected: todos os testes passam (12 testes, 0 falhas).

- [ ] **Step 5: Commit**

```bash
git add frontend/js/arquitetura-status.js test/frontend/arquitetura-status.test.mjs
git commit -m "feat(arquitetura): lógica pura de status das conexões" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Roteador de 3 rotas, socket compartilhado e ligação protegida dos botões

**Files:**
- Modify: `frontend/js/app.js` (linhas ~14, 79-83, 642-647, 712-751)
- Modify: `frontend/js/diagrama3d.js` (bloco final `hashchange`, linhas ~266-271)
- Modify: `frontend/index.html` (nova `<main id="view-arquitetura">` antes do `<footer>`)
- Modify: `frontend/css/style.css` (layout base da vista)
- Create: `test/frontend_smoke/navegacao.spec.mjs`

**Interfaces:**
- Consumes: helpers da Task 1.
- Produces: `window.dfiSocket` (instância Socket.IO); `els.viewArquitetura`; constante `ROTAS` e função `rotaAtual()` em `app.js`; `roteador()` marca `aria-current="page"` em qualquer `a.seletor-tecla` cujo `href` seja a rota ativa (usado na Task 4); `<main id="view-arquitetura" class="painel-arquitetura view">` com `<div id="arq-palco" class="arq-palco">` dentro (Task 8 monta a cena ali). Convenção para módulos: a rota de arquitetura está ativa quando `location.hash === '#/arquitetura'`.

- [ ] **Step 1: Teste de navegação (falhando)**

`test/frontend_smoke/navegacao.spec.mjs`:

```js
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

const VISTAS = ['#view-principal', '#view-status', '#view-arquitetura'];

async function soVisivel(page, alvo) {
  for (const v of VISTAS) {
    if (v === alvo) await expect(page.locator(v)).toBeVisible();
    else await expect(page.locator(v)).toBeHidden();
  }
}

test('cenário 3a — deep link, rota desconhecida e botão Voltar', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/#/arquitetura');
  await soVisivel(page, '#view-arquitetura');
  await expect(page).toHaveTitle(/Arquitetura/);

  await page.goto('/#/qualquer-coisa');
  await soVisivel(page, '#view-principal');

  await page.goto('/#/status');
  await soVisivel(page, '#view-status');
  await page.evaluate(() => { location.hash = '#/arquitetura'; });
  await soVisivel(page, '#view-arquitetura');
  await page.goBack();
  await soVisivel(page, '#view-status');
  esperarSemErros(erros);
});

test('socket exposto para os módulos', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => !!(window.dfiSocket && window.dfiSocket.connected))).toBe(true);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador navegacao`
Expected: FAIL (`#view-arquitetura` não existe).

- [ ] **Step 2: Expor o socket** — em `app.js`, logo após `const socket = io();`:

```js
// Compartilhado com os módulos da vista de arquitetura (js/arquitetura-sinais.js),
// que registram os próprios listeners sem tocar nos handlers abaixo.
window.dfiSocket = socket;
```

- [ ] **Step 3: Referência da vista nova** — no objeto `els`, dentro do bloco `// Vistas (roteamento por hash)`:

```js
  viewPrincipal: document.getElementById('view-principal'),
  viewStatus: document.getElementById('view-status'),
  viewArquitetura: document.getElementById('view-arquitetura'),
```

- [ ] **Step 4: Ligação protegida dos botões** — substituir as 4 linhas `els.btn...addEventListener(...)` (bloco "Ligação dos botões via JS") por:

```js
// Ligação dos botões via JS (sem onclick inline — a CSP do helmet bloqueia
// handlers inline: script-src-attr 'none'). O script roda após o DOM.
// ligar() nunca lança: um id ausente registra erro no console em vez de
// derrubar o restante do script (roteador, relógio, histórico).
function ligar(el, nome, fn) {
  if (!el) {
    console.error(`[UI] Elemento ausente: ${nome} — ação indisponível`);
    return;
  }
  el.addEventListener('click', fn);
}

ligar(els.btnSolicitarA, '#btn-solicitar-a', () => solicitarPeca('A'));
ligar(els.btnSolicitarB, '#btn-solicitar-b', () => solicitarPeca('B'));
ligar(els.btnSolicitarC, '#btn-solicitar-c', () => solicitarPeca('C'));
ligar(els.btnReset, '#btn-reset', () => resetSistema());
```

- [ ] **Step 5: Roteador de 3 rotas** — substituir o bloco inteiro de `// ROTEAMENTO POR HASH` até `roteador(false);` por:

```js
// ============================================================
// ROTEAMENTO POR HASH — painel (#/), equipamentos+histórico (#/status)
// e arquitetura (#/arquitetura)
// ============================================================
// Uma única conexão Socket.IO alimenta as três vistas; alternar é só
// mostrar/ocultar. A faixa anunciadora fica fora delas (sempre visível).
// Hash vazio ou desconhecido cai no painel principal.
const ROTAS = {
  '#/':            { vista: () => els.viewPrincipal,   titulo: 'Data Flow Inventory — Painel' },
  '#/status':      { vista: () => els.viewStatus,      titulo: 'Equipamentos & histórico — Data Flow Inventory' },
  '#/arquitetura': { vista: () => els.viewArquitetura, titulo: 'Arquitetura do sistema — Data Flow Inventory' },
};

function rotaAtual() {
  return Object.prototype.hasOwnProperty.call(ROTAS, location.hash) ? location.hash : '#/';
}

function definirLive(container, valor) {
  if (!container) return;
  container.querySelectorAll('[aria-live]').forEach((el) => el.setAttribute('aria-live', valor));
}

function roteador(mudarFoco) {
  const rota = rotaAtual();
  const ativa = ROTAS[rota].vista();
  if (!ativa) return;

  Object.values(ROTAS).forEach(({ vista }) => {
    const v = vista();
    if (!v || v === ativa) return;
    v.hidden = true;
    // A vista oculta não deve anunciar atualizações para leitores de tela.
    definirLive(v, 'off');
  });
  ativa.hidden = false;
  definirLive(ativa, 'polite');
  document.title = ROTAS[rota].titulo;

  // Seletor de vistas: marca a tecla da rota ativa.
  document.querySelectorAll('a.seletor-tecla').forEach((a) => {
    if (a.getAttribute('href') === rota) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // O atalho no rodapé só faz sentido na página inicial.
  const footerNav = document.getElementById('footer-nav');
  if (footerNav) footerNav.hidden = rota !== '#/';

  // Só move o foco quando o usuário navega (não no carregamento inicial).
  if (mudarFoco) {
    ativa.focus({ preventScroll: false });
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => roteador(true));
roteador(false);
```

- [ ] **Step 6: Pausa correta do mímico** — em `diagrama3d.js`, substituir o bloco final:

```js
  // Pausa a cena ao ir para #/status; retoma ao voltar
  window.addEventListener('hashchange', () => {
    const ativo = location.hash !== '#/status';
    mount.style.display = ativo ? '' : 'none';
    if (ativo) marcarSujo();
  });
```

por:

```js
  // A cena só roda na rota principal; pausa em #/status e #/arquitetura
  // (e em qualquer outra vista futura), retomando ao voltar.
  const VISTAS_SECUNDARIAS = ['#/status', '#/arquitetura'];
  function aplicarRota() {
    const ativo = !VISTAS_SECUNDARIAS.includes(location.hash);
    mount.style.display = ativo ? '' : 'none';
    if (ativo) marcarSujo();
  }
  window.addEventListener('hashchange', aplicarRota);
  aplicarRota();
```

- [ ] **Step 7: Vista no HTML** — em `index.html`, logo antes do comentário `<!-- RODAPÉ -->`:

```html
  <!-- ============================================================ -->
  <!-- ARQUITETURA DO SISTEMA (#/arquitetura) — js/arquitetura3d.js  -->
  <!-- ============================================================ -->
  <main class="painel-arquitetura view" id="view-arquitetura" aria-label="Arquitetura do sistema" tabindex="-1" hidden>
    <div class="arq-barra">
      <h2 class="bay-title arq-titulo"><span class="bay-title-k">ARC</span> Arquitetura do sistema</h2>
    </div>
    <div id="arq-palco" class="arq-palco"></div>
  </main>
```

- [ ] **Step 8: CSS base da vista** — em `style.css`, após o bloco `.bay-historico { grid-area: historico; }`:

```css
/* Arquitetura do sistema (#/arquitetura): barra + palco da cena 3D */
.painel-arquitetura {
  flex: 1;
  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
  padding: clamp(0.75rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.6rem, 1.4vw, 1rem);
}

.arq-barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.arq-titulo {
  margin-bottom: 0;
}

.arq-palco {
  position: relative;
  flex: 1;
  min-height: 420px;
  border: 1px solid var(--etch);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: var(--shadow-sm), var(--bevel);
  overflow: hidden;
}
```

- [ ] **Step 9: Rodar tudo**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam (cenários 1, 2, 3a e socket).

- [ ] **Step 10: Commit**

```bash
git add frontend/js/app.js frontend/js/diagrama3d.js frontend/index.html frontend/css/style.css test/frontend_smoke/navegacao.spec.mjs
git commit -m "feat(frontend): rota #/arquitetura, socket compartilhado e ligação protegida dos botões" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Seletor de vistas em destaque + atalhos contextuais

Implementa §6.1: substitui o link discreto do rodapé por um seletor fixo abaixo da faixa (barra inferior no celular), com contador de eventos na tecla LOG e LED (ainda estático) na tecla ARC.

**Files:**
- Modify: `frontend/index.html` (envolver `header.annun` em `div.topo`, adicionar `nav.seletor`, atalhos, remover `.voltar` e `#footer-nav`)
- Modify: `frontend/css/style.css`
- Modify: `frontend/js/app.js` (contador LOG; remover as linhas do `footerNav` no roteador)
- Modify: `test/frontend_smoke/navegacao.spec.mjs`

**Interfaces:**
- Consumes: `roteador()`/`rotaAtual()` da Task 3 (já marca `aria-current` em `a.seletor-tecla`).
- Produces: elementos `#arc-led` (`data-estado` ∈ estados de §4.4, padrão `desconhecido`) e `#arc-led-texto` (texto acessível) — preenchidos pela Task 7; `#log-contador` com `.seletor-contador-n`; classe utilitária `.sr-only`; ícones SVG inline no padrão `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` (traço via CSS).

- [ ] **Step 1: Testes do seletor (falhando)** — acrescentar a `navegacao.spec.mjs`:

```js
test('cenário 3b — seletor de vistas: teclas, aria-current e contador LOG', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  const teclas = page.locator('nav.seletor a.seletor-tecla');
  await expect(teclas).toHaveCount(3);
  await expect(page.locator('a.seletor-tecla[href="#/"]')).toHaveAttribute('aria-current', 'page');

  // Um comando gera evento no histórico enquanto a vista LOG está fechada.
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  await page.locator('#btn-reset').click();
  await expect(page.locator('#log-contador')).toBeVisible();

  await page.locator('a.seletor-tecla[href="#/status"]').click();
  await soVisivel(page, '#view-status');
  await expect(page.locator('a.seletor-tecla[href="#/status"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#log-contador')).toBeHidden();

  await page.locator('a.seletor-tecla[href="#/arquitetura"]').click();
  await soVisivel(page, '#view-arquitetura');
  await expect(page.locator('a.seletor-tecla[href="#/arquitetura"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('a.seletor-tecla[aria-current]')).toHaveCount(1);

  // Atalhos contextuais levam à arquitetura.
  await page.locator('a.seletor-tecla[href="#/"]').click();
  await page.locator('.bay-mimic a.bay-atalho').click();
  await soVisivel(page, '#view-arquitetura');
  await page.goBack();
  await page.locator('#gateway-status a.annun-atalho').click();
  await soVisivel(page, '#view-arquitetura');

  // Links antigos saíram.
  await expect(page.locator('#footer-nav')).toHaveCount(0);
  await expect(page.locator('a.voltar')).toHaveCount(0);
  esperarSemErros(erros);
});

test('teclas do seletor têm ≥ 44 px de altura', async ({ page }) => {
  await page.goto('/');
  for (const t of await page.locator('a.seletor-tecla').all()) {
    expect((await t.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador navegacao`
Expected: FAIL (`nav.seletor` não existe).

- [ ] **Step 2: HTML — topo + seletor.** Em `index.html`, envolver o `<header class="annun" ...>…</header>` existente (sem alterar nada dentro dele, exceto o Step 4) em `<div class="topo">` e acrescentar a `nav` logo após o `</header>`, ainda dentro de `.topo`:

```html
  <div class="topo">
    <!-- header.annun existente, inalterado -->

    <!-- ============================================================ -->
    <!-- SELETOR DE VISTAS — teclas de painel (barra inferior no celular) -->
    <!-- ============================================================ -->
    <nav class="seletor" aria-label="Vistas do painel">
      <a class="seletor-tecla" href="#/">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        <span class="seletor-k" aria-hidden="true">PNL</span>
        <span class="seletor-rotulo">Painel</span>
      </a>
      <a class="seletor-tecla" href="#/status">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>
        <span class="seletor-k" aria-hidden="true">LOG</span>
        <span class="seletor-rotulo"><span class="rotulo-longo">Equipamentos &amp; histórico</span><span class="rotulo-curto">Eventos</span></span>
        <span id="log-contador" class="seletor-contador" hidden><span class="seletor-contador-n">0</span><span class="sr-only"> eventos novos</span></span>
      </a>
      <a class="seletor-tecla" href="#/arquitetura">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>
        <span class="seletor-k" aria-hidden="true">ARC</span>
        <span class="seletor-rotulo">Arquitetura</span>
        <span id="arc-led" class="seletor-led" data-estado="desconhecido" aria-hidden="true"></span>
        <span id="arc-led-texto" class="sr-only">, conexões: status desconhecido</span>
      </a>
    </nav>
  </div>
```

- [ ] **Step 3: Atalho no card do mímico** — no `<h2 class="bay-title" id="t-mimic">`, após o texto "Diagrama do sistema":

```html
<a class="bay-atalho" href="#/arquitetura">Ver arquitetura<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
```

- [ ] **Step 4: Atalhos nas células Enlace e Gateway** — como **último filho** de `#mqtt-status` e de `#gateway-status` (sem mexer em `.annun-led`, `.annun-k`, `.annun-v`):

```html
        <a class="annun-atalho" href="#/arquitetura" aria-label="Ver esta conexão na arquitetura"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
```

- [ ] **Step 5: Remover links antigos** — apagar `<a class="voltar" href="#/">…</a>` da `#view-status` e `<a id="footer-nav" …>…</a>` do rodapé. Em `app.js` (`roteador`), apagar as 3 linhas do comentário "O atalho no rodapé…" + `footerNav`.

- [ ] **Step 6: Contador LOG em `app.js`**

Após `const MAX_HISTORICO = 30;`:

```js
// Eventos chegados com a vista #/status fechada (contador da tecla LOG).
let eventosNaoVistos = 0;

function atualizarContadorLog() {
  const el = document.getElementById('log-contador');
  if (!el) return;
  el.hidden = eventosNaoVistos === 0;
  const n = el.querySelector('.seletor-contador-n');
  if (n) n.textContent = eventosNaoVistos > 99 ? '99+' : String(eventosNaoVistos);
}
```

No fim de `adicionarHistorico` (após o bloco "Limita o histórico"). O replay de `estado_inicial` passa `scroll = false` e não conta:

```js
  if (scroll && rotaAtual() !== '#/status') {
    eventosNaoVistos++;
    atualizarContadorLog();
  }
```

Em `roteador`, logo após `document.title = ...`:

```js
  if (rota === '#/status') {
    eventosNaoVistos = 0;
    atualizarContadorLog();
  }
```

- [ ] **Step 7: CSS** — em `style.css`:

(a) Em `.annun`, **remover** `position: sticky; top: 0; z-index: 100;` (passa para `.topo`). Em `.annun-cell`, trocar `grid-template-columns: auto 1fr;` por `grid-template-columns: auto 1fr auto;`.

(b) Em `.painel-status`, remover a linha `"voltar    voltar"` de `grid-template-areas` e a regra `.painel-status .voltar { grid-area: voltar; }`; remover as regras `.voltar`, `.voltar:hover`, `.footer-link`, `.footer-link:hover`; no `@media (max-width: 900px)`, remover `"voltar"` de `grid-template-areas`.

(c) Acrescentar após o bloco da faixa anunciadora (antes de `/* PAINEL — grade de instrumentos */`):

```css
/* ============================================================
   TOPO FIXO + SELETOR DE VISTAS (teclas de painel)
   ============================================================ */
.topo {
  position: sticky;
  top: 0;
  z-index: 100;
}

html {
  /* O foco nunca fica escondido sob o topo fixo (WCAG 2.4.11). */
  scroll-padding-top: 8.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.ico {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.seletor {
  display: flex;
  gap: 0.5rem;
  padding: 0.45rem clamp(0.75rem, 2vw, 1.5rem);
  background: var(--bay);
  border-bottom: 1px solid var(--etch-strong);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.seletor-tecla {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.45rem 0.95rem;
  color: var(--readout-dim);
  text-decoration: none;
  font-weight: 600;
  font-size: var(--step-0);
  background: linear-gradient(180deg, var(--bay-raised), #191c24);
  border: 1px solid var(--etch);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm), var(--bevel);
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.seletor-tecla:hover {
  color: var(--readout);
  border-color: var(--etch-strong);
  background: linear-gradient(180deg, var(--bg-card-hover), var(--bay-raised));
}

.seletor-tecla:active {
  transform: translateY(1px);
}

/* Tecla ativa: "afundada" no painel, com borda de sinalização azul */
.seletor-tecla[aria-current="page"] {
  color: var(--readout);
  background: var(--bay-inset);
  border-color: var(--led-idle);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(74, 163, 255, 0.18);
}

.seletor-k {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--legend);
  border: 1px solid var(--etch);
  border-radius: 4px;
  padding: 0.08rem 0.34rem;
}

.seletor-tecla[aria-current="page"] .seletor-k {
  color: var(--led-idle);
  border-color: color-mix(in srgb, var(--led-idle) 45%, var(--etch));
}

.rotulo-curto { display: none; }

.seletor-contador {
  min-width: 1.35rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--led-idle);
  color: var(--bay-inset);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
}

.seletor-led {
  --led: var(--muted);
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 50%;
  background: var(--led);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35), 0 0 10px 0 var(--led);
}
.seletor-led[data-estado="ok"]      { --led: var(--led-run); }
.seletor-led[data-estado="atencao"] { --led: var(--led-warn); }
.seletor-led[data-estado="falha"]   { --led: var(--led-fault); animation: breathe 1.5s ease-in-out infinite; }

/* Atalho no título de um bay (ex.: "Ver arquitetura") */
.bay-atalho {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 32px;
  padding: 0.2rem 0.6rem;
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--led-idle);
  text-decoration: none;
  border: 1px solid color-mix(in srgb, var(--led-idle) 35%, var(--etch));
  border-radius: var(--radius-sm);
  transition: background 160ms ease, border-color 160ms ease;
}
.bay-atalho:hover {
  background: color-mix(in srgb, var(--led-idle) 10%, transparent);
  border-color: var(--led-idle);
}
.bay-atalho .ico { width: 0.9rem; height: 0.9rem; }

/* Atalho discreto dentro de uma célula da faixa */
.annun-atalho {
  grid-column: 3;
  grid-row: 1 / 3;
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: 0.25rem;
  color: var(--legend);
  border-radius: 4px;
  transition: color 160ms ease, background 160ms ease;
}
.annun-atalho:hover {
  color: var(--readout);
  background: rgba(255, 255, 255, 0.06);
}
.annun-atalho .ico { width: 0.9rem; height: 0.9rem; }
```

(d) Dentro do `@media (max-width: 720px)` existente, acrescentar:

```css
  /* Seletor vira barra inferior fixa (3 itens, ícone + rótulo curto) */
  .seletor {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    justify-content: space-around;
    padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom));
    border-top: 1px solid var(--etch-strong);
    border-bottom: 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
  }
  .seletor-tecla {
    flex: 1;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.3rem 0.25rem;
    font-size: 0.7rem;
  }
  .seletor-k,
  .rotulo-longo { display: none; }
  .rotulo-curto { display: inline; }
  .seletor-contador,
  .seletor-led {
    position: absolute;
    top: 0.3rem;
    right: calc(50% - 1.4rem);
  }
  body {
    padding-bottom: calc(4.2rem + env(safe-area-inset-bottom));
  }
  html {
    scroll-padding-top: 7rem;
    scroll-padding-bottom: 5rem;
  }
```

- [ ] **Step 8: Rodar tudo**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam (inclusive cenário 1 dos botões).

- [ ] **Step 9: Commit**

```bash
git add frontend/index.html frontend/css/style.css frontend/js/app.js test/frontend_smoke/navegacao.spec.mjs
git commit -m "feat(frontend): seletor de vistas em destaque e atalhos para a arquitetura" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Polimento do painel — botões com ícones SVG, ajuda de desabilitado, contraste

Implementa §6.2 e §6.3. **Nenhum `id` muda**; os botões continuam `<button>` com o mesmo texto visível.

**Files:**
- Modify: `frontend/index.html` (conteúdo interno dos 4 botões, parágrafo de ajuda)
- Modify: `frontend/css/style.css` (`--muted`, `.btn`, `.ajuda-controle`)
- Modify: `test/frontend_smoke/helpers.mjs` (`roteiroBotoes` verifica a ajuda)
- Modify: `test/frontend_smoke/botoes.spec.mjs`

**Interfaces:**
- Consumes: `.ico` e `.sr-only` da Task 4.
- Produces: `#ajuda-controle` (visível só com algum botão desabilitado).

- [ ] **Step 1: Testes (falhando)**

Em `helpers.mjs`, dentro de `roteiroBotoes`, logo após `await botao.click();`, acrescentar (só na primeira peça, para não alongar o roteiro):

```js
    if (peca === 'A') {
      // Enquanto o pedido é processado, os botões ficam desabilitados e a ajuda explica o motivo.
      await expect(page.locator('#ajuda-controle')).toBeVisible();
    }
```

E, após o laço (antes do bloco do reset), acrescentar:

```js
  await expect(page.locator('#ajuda-controle')).toBeHidden();
```

Em `botoes.spec.mjs`, acrescentar:

```js
test('botões de controle: ícones SVG (sem emoji), ≥ 44 px, ajuda ligada por aria-describedby', async ({ page }) => {
  await page.goto('/');
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset']) {
    const b = page.locator(`#${id}`);
    await expect(b.locator('svg.ico')).toHaveCount(1);
    expect(await b.innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-describedby', 'ajuda-controle');
  }
});

test('--muted atinge contraste 4,5:1 sobre --bay-raised', async ({ page }) => {
  await page.goto('/');
  const razao = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const hex = (v) => css.getPropertyValue(v).trim();
    const lum = (h) => {
      const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const a = lum(hex('--muted'));
    const b = lum(hex('--bay-raised'));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(razao).toBeGreaterThanOrEqual(4.5);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador botoes`
Expected: FAIL (sem `#ajuda-controle`, emojis presentes, contraste ~3,4).

- [ ] **Step 2: HTML dos botões** — substituir o **conteúdo** de `.botoes-controle` (mantendo `id`, classes e ordem) e acrescentar a ajuda logo após o `</div>` de `.botoes-controle`:

```html
      <div class="botoes-controle">
        <button id="btn-solicitar-a" class="btn btn-peca btn-a" aria-describedby="ajuda-controle">
          <svg class="ico btn-chip" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
          Solicitar A
        </button>
        <button id="btn-solicitar-b" class="btn btn-peca btn-b" aria-describedby="ajuda-controle">
          <svg class="ico btn-chip" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
          Solicitar B
        </button>
        <button id="btn-solicitar-c" class="btn btn-peca btn-c" aria-describedby="ajuda-controle">
          <svg class="ico btn-chip" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
          Solicitar C
        </button>
        <button id="btn-reset" class="btn btn-reset">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Reiniciar
        </button>
      </div>
      <p id="ajuda-controle" class="ajuda-controle">Comandos liberados quando o sistema voltar a <span class="mono">AGUARDANDO_PEDIDO</span>.</p>
```

- [ ] **Step 3: CSS**

(a) Em `:root`, trocar a linha de `--muted`:

```css
  --muted:        #858ca3;   /* ~5,0:1 sobre --bay-raised; ~4,6:1 sobre --bg-card-hover (era #6b7189, ~3,4:1) */
```

(b) Em `.btn`, acrescentar `min-height: 44px;` e trocar a `transition` por
`transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, opacity 160ms ease;`.

(c) Em `.btn:disabled`, trocar `opacity: 0.42;` por `opacity: 0.45;`.

(d) Substituir a regra `.btn-icon { … }` por:

```css
/* Chip da peça: quadrado preenchido com a cor da peça (substitui o emoji) */
.btn-chip {
  fill: var(--btn);
  stroke: none;
}

/* Explica por que os comandos estão desabilitados (só aparece nesse caso) */
.ajuda-controle {
  display: none;
  margin-top: 0.7rem;
  font-size: var(--step--1);
  color: var(--legend);
}
.bay-controle:has(.btn:disabled) .ajuda-controle {
  display: block;
}
```

(e) Garantir o espaçamento mínimo entre botões: em `.botoes-controle`, trocar `gap: 0.55rem;` por `gap: 0.6rem;` (≥ 8 px com a escala de fonte mínima de 13 px).

- [ ] **Step 4: Revisão de movimento reduzido** — confirmar (sem mudança de código esperada) que: `app.js` → `parallaxDiagrama` retorna com `semMovimento`; `diagrama3d.js` desliga o parallax com `semMovimento`; a regra global `@media (prefers-reduced-motion: reduce)` já zera as animações CSS novas (`breathe` do `.seletor-led`, transições do seletor). Se algo não estiver coberto, corrigir na mesma regra global.

- [ ] **Step 5: Rodar tudo**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html frontend/css/style.css test/frontend_smoke/helpers.mjs test/frontend_smoke/botoes.spec.mjs
git commit -m "feat(frontend): ícones SVG nos botões, ajuda de desabilitado e contraste de --muted" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Addons three.js vendorizados + modelo estático da arquitetura

**Files:**
- Create: `frontend/vendor/OrbitControls.js`, `frontend/vendor/CSS2DRenderer.js`
- Create: `frontend/js/arquitetura-dados.js`
- Create: `test/frontend/arquitetura-dados.test.mjs`

**Interfaces:**
- Consumes: `NOS`, `TOPOLOGIA` de `arquitetura-status.js` (Task 2) — o teste garante que o modelo bate com a topologia.
- Produces (exports de `arquitetura-dados.js`):
  - `NOS_ARQ: Record<idNo, { codigo, nome, camada, posicao: [x,y,z], forma: 'placa'|'torre'|'monitor'|'rack', funcao: string, secoes: Secao[] }>`
  - `Secao = { titulo, fonte, itens?: string[], colunas?: string[], linhas?: string[][] }` (lista **ou** tabela)
  - `ENLACES_ARQ: Record<idEnlace, { de, para, protocolo, rotulo, topicos: string[] }>`
  - `HARDWARE: { id, nome, detalhe, posicao: [x,y,z] }[]` (cluster ao redor do Arduino, sem status)
  - `CAMERAS: Record<'geral'|'campo'|'nuvem'|'aplicacao', { rotulo, posicao: [x,y,z], alvo: [x,y,z] }>`
  - `ROTULO_MODO: Record<'local'|'nuvem'|'simulador'|'desconhecido', string>`
  - `ROTULO_ESTADO: Record<estado, string>` (texto pt-BR de cada estado de §4.4)
  - Addons: `import { OrbitControls } from '/vendor/OrbitControls.js'` e `import { CSS2DRenderer, CSS2DObject } from '/vendor/CSS2DRenderer.js'`.

- [ ] **Step 1: Teste de integridade (falhando)**

`test/frontend/arquitetura-dados.test.mjs`:

```js
// Integridade do modelo estático da arquitetura e dos addons vendorizados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOS, TOPOLOGIA } from '../../frontend/js/arquitetura-status.js';
import {
  NOS_ARQ, ENLACES_ARQ, HARDWARE, CAMERAS, ROTULO_MODO, ROTULO_ESTADO,
} from '../../frontend/js/arquitetura-dados.js';

test('todo nó da topologia tem modelo completo', () => {
  assert.deepEqual(Object.keys(NOS_ARQ).sort(), [...NOS].sort());
  for (const [id, n] of Object.entries(NOS_ARQ)) {
    assert.match(n.codigo, /^[A-Z]{3}$/, id);
    assert.ok(n.nome && n.camada && n.funcao, id);
    assert.equal(n.posicao.length, 3, id);
    assert.ok(['placa', 'torre', 'monitor', 'rack'].includes(n.forma), id);
    assert.ok(n.secoes.length >= 1, id);
    for (const s of n.secoes) {
      assert.ok(s.titulo && s.fonte, `${id}/${s.titulo}`);
      assert.ok(Array.isArray(s.itens) !== Array.isArray(s.linhas), `${id}/${s.titulo}: lista OU tabela`);
      if (s.linhas) for (const l of s.linhas) assert.equal(l.length, s.colunas.length, `${id}/${s.titulo}`);
    }
  }
});

test('enlaces batem com a topologia de status', () => {
  assert.deepEqual(Object.keys(ENLACES_ARQ).sort(), Object.keys(TOPOLOGIA).sort());
  for (const [id, e] of Object.entries(ENLACES_ARQ)) {
    assert.deepEqual([e.de, e.para], TOPOLOGIA[id], id);
    assert.ok(e.protocolo && e.rotulo, id);
    assert.ok(Array.isArray(e.topicos), id);
  }
});

test('hardware, câmeras e rótulos', () => {
  assert.equal(HARDWARE.length, 4);
  for (const h of HARDWARE) assert.equal(h.posicao.length, 3);
  assert.deepEqual(Object.keys(CAMERAS).sort(), ['aplicacao', 'campo', 'geral', 'nuvem']);
  assert.deepEqual(Object.keys(ROTULO_MODO).sort(), ['desconhecido', 'local', 'nuvem', 'simulador']);
  for (const e of ['ok', 'atencao', 'falha', 'desconhecido', 'sem-telemetria', 'sem-dados', 'fora-do-modo']) {
    assert.ok(ROTULO_ESTADO[e], e);
  }
});

test('addons vendorizados importam o three.js local (CSP sem importmap)', () => {
  for (const f of ['OrbitControls.js', 'CSS2DRenderer.js']) {
    const src = readFileSync(new URL(`../../frontend/vendor/${f}`, import.meta.url), 'utf8');
    assert.ok(!/from\s+['"]three['"]/.test(src), `${f} ainda importa 'three'`);
    assert.ok(src.includes("from '/vendor/three.module.min.js'"), f);
    assert.ok(src.includes('three@0.169.0'), `${f} sem cabeçalho de versão`);
  }
});
```

Run: `node --test "test/frontend/*.test.mjs"`
Expected: FAIL (`arquitetura-dados.js` inexistente).

- [ ] **Step 2: Vendorizar os addons (r169)**

```bash
curl -fsSL https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js -o frontend/vendor/OrbitControls.js
curl -fsSL https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/renderers/CSS2DRenderer.js -o frontend/vendor/CSS2DRenderer.js
sed -i "s#from 'three'#from '/vendor/three.module.min.js'#" frontend/vendor/OrbitControls.js frontend/vendor/CSS2DRenderer.js
grep -n "from '" frontend/vendor/OrbitControls.js frontend/vendor/CSS2DRenderer.js
```

Expected: cada arquivo mostra só `from '/vendor/three.module.min.js'`. Em seguida, inserir no topo de **cada** arquivo:

```js
// Vendorizado de three@0.169.0/examples/jsm (mesma revisão do three.module.min.js, r169).
// Import 'three' reescrito para '/vendor/three.module.min.js': a CSP do servidor
// (scriptSrc 'self') bloquearia um <script type="importmap"> inline.
```

- [ ] **Step 3: Modelo estático**

`frontend/js/arquitetura-dados.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — Modelo estático da arquitetura
// ------------------------------------------------------------
// Snapshot de docs/ARCHITECTURE.md e docs/arquitetura_mqtt.md em
// 29/09/2026 (+ server/server.js para a lista de tópicos).
// Se a documentação mudar, atualizar este arquivo.
// Posições em unidades de cena (x = fluxo esquerda→direita, z = profundidade).
// ============================================================

export const NOS_ARQ = {
  arduino: {
    codigo: 'FLD', nome: 'Arduino Uno — FSM', camada: 'Campo', forma: 'placa', posicao: [-8, 0, 0],
    funcao: 'Controla esteiras, sensores, LCD e separador; executa a máquina de estados e fala com o gateway pela serial.',
    secoes: [
      {
        titulo: 'Estados da FSM', fonte: 'ARCHITECTURE.md §3',
        itens: [
          'AGUARDANDO_PEDIDO — recebe comando',
          'VERIFICANDO_ESTOQUE — verifica se há peça',
          'ACIONANDO_ESTEIRA — liga motor, aguarda sensores',
          'ENTREGANDO_PECA — pausa, decrementa, publica',
          'ERRO — timeout ou rejeição (requer CMD:RESET)',
        ],
      },
      {
        titulo: 'Rejeições explícitas', fonte: 'ARCHITECTURE.md §3',
        itens: ['peca_indisponivel', 'ocupado', 'comando_desconhecido'],
      },
      {
        titulo: 'Hardware e pinagem', fonte: 'ARCHITECTURE.md §4',
        colunas: ['Componente', 'Qtd', 'Pinos', 'Alimentação'],
        linhas: [
          ['Motor DC (esteiras)', '3', 'PWM 9, 10, 11', '12V (via IRF520)'],
          ['Sensor IR TCRT5000', '6', 'A0, A1, A2, A3, 2, 4', '5V'],
          ['LCD 16x2 I2C', '1', 'SDA/SCL (A4/A5)', '5V'],
          ['Motor de passo 28BYJ-48', '1', '5, 6, 7, 8 (ULN2003)', '5V'],
        ],
      },
    ],
  },
  esp32: {
    codigo: 'EDG', nome: 'ESP32 — Gateway MQTT', camada: 'Borda', forma: 'placa', posicao: [-4, 0, 0],
    funcao: 'Ponte Serial ↔ MQTT: publica telemetria do Arduino e encaminha comandos do dashboard.',
    secoes: [
      {
        titulo: 'Presença', fonte: 'ARCHITECTURE.md §2.2',
        itens: ['LWT em dataflow/status (retained, QoS 1): o broker publica "offline" se o ESP32 cair'],
      },
    ],
  },
  broker: {
    codigo: 'MSG', nome: 'Broker MQTT', camada: 'Mensageria', forma: 'torre', posicao: [0, 0, 0],
    funcao: 'Barramento de mensagens entre campo, aplicação e historiador.',
    secoes: [
      {
        titulo: 'Tópicos principais', fonte: 'ARCHITECTURE.md §2.2',
        colunas: ['Tópico', 'Origem', 'Retained', 'QoS'],
        linhas: [
          ['dataflow/status', 'ESP32', 'sim', '1'],
          ['dataflow/status/server', 'Servidor', 'sim', '1'],
          ['dataflow/estoque', 'Arduino', 'sim', '1'],
          ['dataflow/eventos', 'Arduino', 'não', '1'],
          ['dataflow/comandos/sub', 'Servidor', 'não', '1'],
        ],
      },
      {
        titulo: 'Modos de operação', fonte: 'ARCHITECTURE.md §5',
        itens: [
          'Modo 1 — Hardware real + Mosquitto local',
          'Modo 2 — Hardware real + HiveMQ Cloud (TLS 8883)',
          'Modo 3 — Simulador offline (Node.js)',
        ],
      },
    ],
  },
  servidor: {
    codigo: 'APP', nome: 'Servidor Node.js', camada: 'Aplicação', forma: 'torre', posicao: [4, 0, -1.5],
    funcao: 'Assina os tópicos MQTT, repassa ao dashboard por Socket.IO e publica os comandos.',
    secoes: [
      {
        titulo: 'Tópicos assinados', fonte: 'server/server.js (TOPICS)',
        itens: ['dataflow/status', 'dataflow/estoque', 'dataflow/eventos', 'dataflow/sensores', 'dataflow/esteiras', 'dataflow/comandos/pub'],
      },
      {
        titulo: 'Observabilidade', fonte: 'server/server.js',
        itens: ['GET /api/status — 200 com broker conectado, 503 sem broker', 'LWT próprio em dataflow/status/server'],
      },
    ],
  },
  simulador: {
    codigo: 'SIM', nome: 'Simulador (Modo 3)', camada: 'Aplicação', forma: 'torre', posicao: [4, 0, 2.5],
    funcao: 'Simula a FSM do Arduino sem hardware nem broker, emitindo os mesmos eventos Socket.IO do servidor.',
    secoes: [
      {
        titulo: 'Integração opcional', fonte: 'ARCHITECTURE.md §5',
        itens: ['MQTT_PUBLISH=true publica dataflow/estoque (retained, QoS 1) para o Beckhoff'],
      },
    ],
  },
  dashboard: {
    codigo: 'HMI', nome: 'Dashboard web', camada: 'Apresentação', forma: 'monitor', posicao: [8, 0, 0.5],
    funcao: 'Painel de operação, equipamentos e histórico, e esta vista de arquitetura.',
    secoes: [
      {
        titulo: 'Vistas', fonte: 'frontend/index.html',
        itens: ['#/ — Painel', '#/status — Equipamentos & histórico', '#/arquitetura — Arquitetura do sistema'],
      },
    ],
  },
  beckhoff: {
    codigo: 'HST', nome: 'Beckhoff CX9240 — Historiador', camada: 'Historiador', forma: 'rack', posicao: [0, 0, -5],
    funcao: 'Grava estoque e eventos em SQLite local (TwinCAT 3, RT Linux ARM64).',
    secoes: [
      {
        titulo: 'Integração', fonte: 'ARCHITECTURE.md §6.1',
        itens: [
          'TF6701 IoT Communication assina dataflow/estoque e dataflow/eventos (QoS 1)',
          'TF6420 Database Server grava em /var/lib/dfi/historian.db (WAL)',
          'Tabelas estoque_hist e eventos_hist',
          'Validado de ponta a ponta em 15/09/2026',
        ],
      },
    ],
  },
};

export const ENLACES_ARQ = {
  'uart':             { de: 'arduino', para: 'esp32', protocolo: 'UART Serial', rotulo: 'Arduino ↔ ESP32', topicos: [] },
  'mqtt-esp32':       { de: 'esp32', para: 'broker', protocolo: 'MQTT (TLS no Modo 2)', rotulo: 'ESP32 ↔ Broker',
    topicos: ['dataflow/status', 'dataflow/estoque', 'dataflow/eventos', 'dataflow/sensores', 'dataflow/esteiras', 'dataflow/comandos/sub', 'dataflow/comandos/pub'] },
  'mqtt-servidor':    { de: 'broker', para: 'servidor', protocolo: 'MQTT', rotulo: 'Broker ↔ Servidor',
    topicos: ['dataflow/status', 'dataflow/estoque', 'dataflow/eventos', 'dataflow/sensores', 'dataflow/esteiras', 'dataflow/comandos/sub', 'dataflow/comandos/pub', 'dataflow/status/server'] },
  'socket-servidor':  { de: 'servidor', para: 'dashboard', protocolo: 'Socket.IO', rotulo: 'Servidor ↔ Dashboard', topicos: [] },
  'mqtt-beckhoff':    { de: 'broker', para: 'beckhoff', protocolo: 'MQTT (TF6701)', rotulo: 'Broker → Beckhoff',
    topicos: ['dataflow/estoque', 'dataflow/eventos'] },
  'socket-simulador': { de: 'simulador', para: 'dashboard', protocolo: 'Socket.IO', rotulo: 'Simulador ↔ Dashboard', topicos: [] },
  'mqtt-simulador':   { de: 'simulador', para: 'broker', protocolo: 'MQTT opcional (MQTT_PUBLISH=true)', rotulo: 'Simulador → Broker',
    topicos: ['dataflow/estoque'] },
};

// Cluster de hardware ao redor do Arduino (visual, sem status próprio).
export const HARDWARE = [
  { id: 'motores',  nome: 'Motores DC ×3', detalhe: 'PWM 9, 10, 11 · IRF520 · 12V', posicao: [-9.6, 0, 1.8] },
  { id: 'sensores', nome: 'Sensores IR ×6', detalhe: 'TCRT5000 · A0–A3, 2, 4', posicao: [-8, 0, 2.4] },
  { id: 'lcd',      nome: 'LCD 16x2 I2C', detalhe: 'SDA/SCL (A4/A5)', posicao: [-6.4, 0, 1.8] },
  { id: 'passo',    nome: 'Motor de passo', detalhe: '28BYJ-48 · ULN2003 · 5–8', posicao: [-9.6, 0, -1.6] },
];

export const CAMERAS = {
  geral:     { rotulo: 'Visão geral', posicao: [0, 11, 15], alvo: [0, 0, -0.5] },
  campo:     { rotulo: 'Campo',       posicao: [-6.5, 5, 7.5], alvo: [-6.5, 0, 0.5] },
  nuvem:     { rotulo: 'Nuvem',       posicao: [0, 6.5, 6.5],  alvo: [0, 0, -2] },
  aplicacao: { rotulo: 'Aplicação',   posicao: [6.5, 5, 8],    alvo: [6, 0, 0.5] },
};

export const ROTULO_MODO = {
  local:        'Modo 1 · Mosquitto local',
  nuvem:        'Modo 2 · HiveMQ Cloud',
  simulador:    'Modo 3 · Simulador',
  desconhecido: 'Modo desconhecido',
};

export const ROTULO_ESTADO = {
  'ok':             'OK',
  'atencao':        'Atenção',
  'falha':          'Falha',
  'desconhecido':   'Desconhecido',
  'sem-telemetria': 'Não monitorado',
  'sem-dados':      'Sem dados',
  'fora-do-modo':   'Fora deste modo',
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test "test/frontend/*.test.mjs"`
Expected: todos passam (status + dados).

- [ ] **Step 5: Commit**

```bash
git add frontend/vendor/OrbitControls.js frontend/vendor/CSS2DRenderer.js frontend/js/arquitetura-dados.js test/frontend/arquitetura-dados.test.mjs
git commit -m "feat(arquitetura): modelo estático e addons three.js r169 vendorizados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Coletor de sinais + LED da tecla ARC

Implementa §4.6. O coletor é único (singleton) e tem **um dono do ritmo de polling**: `seletor.js`, carregado em todas as vistas. `arquitetura3d.js` (Task 8) só assina as mudanças.

**Files:**
- Create: `test/frontend/arquitetura-sinais.test.mjs`
- Create: `frontend/js/arquitetura-sinais.js`
- Create: `frontend/js/seletor.js`
- Modify: `frontend/index.html` (script de módulo)
- Modify: `test/frontend_smoke/helpers.mjs` (ignorar o 404/503 esperado de `/api/status` no console)
- Modify: `test/frontend_smoke/navegacao.spec.mjs`

**Interfaces:**
- Consumes: `window.dfiSocket` (Task 3); `derivarStatus` (Task 2); `ROTULO_ESTADO` (Task 6); `#arc-led`, `#arc-led-texto` (Task 4).
- Produces (exports de `arquitetura-sinais.js`):
  - `criarColetor({ socket, fetchFn, relogio, agendar, cancelar, intervaloAtivoMs = 5000, intervaloFundoMs = 30000, timeoutMs = 3000 })` → `{ obter(): Sinais, aoMudar(cb): () => void, consultarApi(): Promise<void>, definirRitmo('ativo'|'fundo'|'parado'): void }`
  - `coletorCompartilhado()` → a instância única ligada a `window.dfiSocket` e `fetch`.
  - `Sinais` = formato de §4.3.

- [ ] **Step 1: Testes (falhando)**

`test/frontend/arquitetura-sinais.test.mjs`:

```js
// Testes do coletor de sinais (spec §4.6). Socket e fetch são falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarColetor } from '../../frontend/js/arquitetura-sinais.js';

function socketFalso(conectado = true) {
  const handlers = {};
  return {
    connected: conectado,
    on(evt, fn) { (handlers[evt] ||= []).push(fn); },
    emitir(evt, dado) { (handlers[evt] || []).forEach((fn) => fn(dado)); },
  };
}
const resposta = (status, corpo) => async () => ({ status, json: async () => corpo });

function montar(extra = {}) {
  const socket = extra.socket === undefined ? socketFalso() : extra.socket;
  let agora = 1000;
  const agendados = [];
  const cancelados = [];
  const coletor = criarColetor({
    socket,
    fetchFn: extra.fetchFn || resposta(200, { mqtt: true, brokerUrl: 'mqtt://127.0.0.1' }),
    relogio: () => agora,
    agendar: (fn, ms) => { agendados.push(ms); return agendados.length; },
    cancelar: (id) => cancelados.push(id),
  });
  return { socket, coletor, agendados, cancelados, avancar: (ms) => { agora += ms; } };
}

test('estado inicial reflete o socket e começa com api pendente', () => {
  const { coletor } = montar();
  const s = coletor.obter();
  assert.equal(s.socketConectado, true);
  assert.deepEqual(s.api, { tipo: 'pendente' });
  assert.equal(s.gateway, null);
  assert.equal(s.ultimoDadoCampoEm, null);
});

test('sem socket: desconectado e sem exceção', () => {
  const { coletor } = montar({ socket: null });
  assert.equal(coletor.obter().socketConectado, false);
});

test('connect/disconnect atualizam e notificam', () => {
  const { socket, coletor } = montar();
  let chamadas = 0;
  coletor.aoMudar(() => { chamadas++; });
  socket.emitir('disconnect');
  assert.equal(coletor.obter().socketConectado, false);
  socket.emitir('connect');
  assert.equal(coletor.obter().socketConectado, true);
  assert.equal(chamadas, 2);
});

test('aoMudar devolve função que cancela a assinatura', () => {
  const { socket, coletor } = montar();
  let chamadas = 0;
  const sair = coletor.aoMudar(() => { chamadas++; });
  sair();
  socket.emitir('disconnect');
  assert.equal(chamadas, 0);
});

test('gateway via evento e via estado_inicial', () => {
  const { socket, coletor } = montar();
  socket.emitir('estado_inicial', { gateway: { status: 'offline' } });
  assert.equal(coletor.obter().gateway, 'offline');
  socket.emitir('gateway', { status: 'online', type: 'gateway' });
  assert.equal(coletor.obter().gateway, 'online');
});

test('status/sensores/esteiras ao vivo marcam o último dado de campo; estado_inicial não', () => {
  const { socket, coletor, avancar } = montar();
  socket.emitir('estado_inicial', { status: { estado: 'AGUARDANDO_PEDIDO' } });
  assert.equal(coletor.obter().ultimoDadoCampoEm, null);
  for (const evt of ['status', 'sensores', 'esteiras']) {
    avancar(10);
    socket.emitir(evt, {});
    assert.equal(coletor.obter().ultimoDadoCampoEm, 1000 + (evt === 'status' ? 10 : evt === 'sensores' ? 20 : 30));
  }
});

test('consultarApi: 200, 503, 404, 500 e exceção', async () => {
  const casos = [
    [resposta(200, { mqtt: true, brokerUrl: 'mqtts://x.hivemq.cloud' }), { tipo: 'ok', mqtt: true, brokerUrl: 'mqtts://x.hivemq.cloud' }],
    [resposta(503, { mqtt: false, brokerUrl: 'mqtt://127.0.0.1' }), { tipo: 'ok', mqtt: false, brokerUrl: 'mqtt://127.0.0.1' }],
    [resposta(404, null), { tipo: 'ausente' }],
    [resposta(500, null), { tipo: 'erro' }],
    [async () => { throw new Error('rede'); }, { tipo: 'erro' }],
  ];
  for (const [fetchFn, esperado] of casos) {
    const { coletor } = montar({ fetchFn });
    await coletor.consultarApi();
    assert.deepEqual(coletor.obter().api, esperado);
    assert.equal(coletor.obter().apiEm, 1000);
  }
});

test('definirRitmo: ativo 5 s, fundo 30 s, parado cancela; repetir o mesmo ritmo não reagenda', () => {
  const { coletor, agendados, cancelados } = montar();
  coletor.definirRitmo('ativo');
  coletor.definirRitmo('ativo');
  assert.deepEqual(agendados, [5000]);
  coletor.definirRitmo('fundo');
  assert.deepEqual(agendados, [5000, 30000]);
  assert.deepEqual(cancelados, [1]);
  coletor.definirRitmo('parado');
  assert.deepEqual(cancelados, [1, 2]);
});
```

Run: `node --test "test/frontend/*.test.mjs"`
Expected: FAIL (módulo inexistente).

- [ ] **Step 2: Implementação do coletor**

`frontend/js/arquitetura-sinais.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — Coletor de sinais de conectividade
// ------------------------------------------------------------
// Junta os sinais já disponíveis no navegador (spec §4.3/§4.6):
// conexão Socket.IO, LWT do gateway, chegada de dados do Arduino
// e GET /api/status (404 no simulador). Registra os PRÓPRIOS
// listeners no socket compartilhado — não altera os handlers de
// app.js. Dependências injetáveis para teste em Node.
// ============================================================

export function criarColetor({
  socket,
  fetchFn,
  relogio = () => Date.now(),
  agendar = (fn, ms) => setInterval(fn, ms),
  cancelar = (id) => clearInterval(id),
  intervaloAtivoMs = 5000,
  intervaloFundoMs = 30000,
  timeoutMs = 3000,
}) {
  const sinais = {
    socketConectado: !!(socket && socket.connected),
    api: { tipo: 'pendente' },
    gateway: null,
    ultimoDadoCampoEm: null,
    apiEm: null,
  };
  const ouvintes = new Set();
  let ritmo = 'parado';
  let timer = null;

  function emitir() {
    const copia = obter();
    ouvintes.forEach((cb) => {
      try { cb(copia); } catch (e) { console.error('[ARQ] Falha em ouvinte de sinais:', e); }
    });
  }

  function obter() {
    return { ...sinais, api: { ...sinais.api } };
  }

  function aoMudar(cb) {
    ouvintes.add(cb);
    return () => ouvintes.delete(cb);
  }

  if (socket) {
    socket.on('connect', () => { sinais.socketConectado = true; emitir(); });
    socket.on('disconnect', () => { sinais.socketConectado = false; emitir(); });
    socket.on('gateway', (d) => { sinais.gateway = (d && d.status) || null; emitir(); });
    socket.on('estado_inicial', (d) => {
      // O estado inicial vem do cache do servidor: não prova que o Arduino
      // está falando agora, então só aproveita o gateway (retained).
      if (d && d.gateway && d.gateway.status) { sinais.gateway = d.gateway.status; emitir(); }
    });
    const dadoDeCampo = () => { sinais.ultimoDadoCampoEm = relogio(); emitir(); };
    socket.on('status', dadoDeCampo);
    socket.on('sensores', dadoDeCampo);
    socket.on('esteiras', dadoDeCampo);
  }

  async function consultarApi() {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const limite = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const r = await fetchFn('/api/status', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (r.status === 404) {
        sinais.api = { tipo: 'ausente' };
      } else if (r.status === 200 || r.status === 503) {
        const corpo = (await r.json()) || {};
        sinais.api = { tipo: 'ok', mqtt: !!corpo.mqtt, brokerUrl: String(corpo.brokerUrl || '') };
      } else {
        sinais.api = { tipo: 'erro' };
      }
    } catch (e) {
      sinais.api = { tipo: 'erro' };
    } finally {
      if (limite) clearTimeout(limite);
      sinais.apiEm = relogio();
      emitir();
    }
  }

  function definirRitmo(novo) {
    if (novo === ritmo) return;
    ritmo = novo;
    if (timer !== null) { cancelar(timer); timer = null; }
    if (novo === 'parado') return;
    consultarApi();
    timer = agendar(consultarApi, novo === 'ativo' ? intervaloAtivoMs : intervaloFundoMs);
  }

  return { obter, aoMudar, consultarApi, definirRitmo };
}

let unico = null;

/** Instância única ligada ao socket de app.js (window.dfiSocket). */
export function coletorCompartilhado() {
  if (!unico) {
    unico = criarColetor({
      socket: window.dfiSocket || null,
      fetchFn: (url, opts) => fetch(url, opts),
    });
  }
  return unico;
}
```

Run: `node --test "test/frontend/*.test.mjs"`
Expected: todos passam. (Nota: em `definirRitmo`, `consultarApi()` sem `await` é intencional; nos testes, o `fetch` falso resolve sem efeitos colaterais.)

- [ ] **Step 3: LED da tecla ARC**

`frontend/js/seletor.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — LED da tecla ARC (seletor de vistas)
// ------------------------------------------------------------
// Mostra, de qualquer vista, o pior estado entre os enlaces
// monitorados. É o dono do ritmo de consulta a /api/status:
// 5 s com #/arquitetura aberta, 30 s nas outras vistas,
// parado com a aba oculta.
// ============================================================
import { coletorCompartilhado } from './arquitetura-sinais.js';
import { derivarStatus } from './arquitetura-status.js';
import { ROTULO_ESTADO } from './arquitetura-dados.js';

const led = document.getElementById('arc-led');
const texto = document.getElementById('arc-led-texto');
const coletor = coletorCompartilhado();

function pintar() {
  if (!led) return;
  const { resumo } = derivarStatus(coletor.obter(), Date.now());
  led.dataset.estado = resumo.pior;
  if (texto) {
    texto.textContent = `, conexões: ${resumo.ok} de ${resumo.monitorados} OK, pior estado ${ROTULO_ESTADO[resumo.pior]}`;
  }
}

function ajustarRitmo() {
  if (document.hidden) coletor.definirRitmo('parado');
  else coletor.definirRitmo(location.hash === '#/arquitetura' ? 'ativo' : 'fundo');
}

coletor.aoMudar(pintar);
setInterval(pintar, 5000); // reavalia a idade do último dado de campo (regra de 60 s do UART)
window.addEventListener('hashchange', ajustarRitmo);
document.addEventListener('visibilitychange', ajustarRitmo);
ajustarRitmo();
pintar();
```

Em `index.html`, logo após `<script src="js/app.js"></script>`:

```html
  <!-- LED da tecla ARC + polling de /api/status (módulo independente de app.js) -->
  <script type="module" src="js/seletor.js"></script>
```

- [ ] **Step 4: E2E** — em `helpers.mjs`, trocar `IGNORAR` por:

```js
// Recursos externos cuja falha de rede não indica defeito do dashboard,
// e /api/status, cujo 404 (simulador) e 503 (broker fora) são respostas esperadas.
const IGNORAR = /fonts\.(googleapis|gstatic)\.com|favicon\.ico|\/api\/status/;
```

Em `navegacao.spec.mjs`, acrescentar:

```js
test('LED da tecla ARC reflete o simulador (1 de 1 enlace OK)', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  await expect(page.locator('#arc-led')).toHaveAttribute('data-estado', 'ok');
  await expect(page.locator('#arc-led-texto')).toContainText('1 de 1 OK');
  esperarSemErros(erros);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/arquitetura-sinais.js frontend/js/seletor.js frontend/index.html test/frontend/arquitetura-sinais.test.mjs test/frontend_smoke/helpers.mjs test/frontend_smoke/navegacao.spec.mjs
git commit -m "feat(arquitetura): coletor de sinais e LED de conexões na tecla ARC" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Cena 3D navegável (palco, nós, enlaces, rótulos, controles, ciclo de vida)

Implementa §5.1 (barra, controles, legenda), §5.2 (cena), a parte de navegação livre e presets de §5.3, e §5.5 (ciclo de vida). Seleção, painel de detalhes e teclado ficam na Task 9; o fallback SVG, na Task 10.

**Files:**
- Create: `frontend/js/ambiente3d.js` (ambiente IBL compartilhado, extraído de `diagrama3d.js`)
- Modify: `frontend/js/diagrama3d.js` (passa a importar `ambienteGradiente`)
- Create: `frontend/js/arquitetura3d.js` (só three.js; exporta `construir3d`)
- Create: `frontend/js/arquitetura-vista.js` (entrada da vista, sem three.js)
- Modify: `frontend/index.html` (conteúdo de `#view-arquitetura`, script de módulo)
- Modify: `frontend/css/style.css`
- Modify: `test/frontend_smoke/playwright.config.mjs` (WebGL por SwiftShader no headless)
- Create: `test/frontend_smoke/arquitetura.spec.mjs`

**Interfaces:**
- Consumes: `NOS_ARQ`, `ENLACES_ARQ`, `HARDWARE`, `CAMERAS`, `ROTULO_MODO`, `ROTULO_ESTADO` (Task 6); `derivarStatus` (Task 2); `coletorCompartilhado().obter()/aoMudar()` (Task 7). **Não** chama `definirRitmo` (o dono é `seletor.js`).
- Produces:
  - `ambiente3d.js`: `export function ambienteGradiente(renderer): THREE.Texture`.
  - `arquitetura3d.js` (importa three.js; carregado só por `import()` dinâmico) exporta `COR_ESTADO: Record<estado, number>` e `construir3d({ palco, criarRotulo, semMovimento }) → contexto | null`.
  - `arquitetura-vista.js` (entrada da vista; **nunca** importa three.js estaticamente) — dono do ciclo de vida da rota, do relógio de status de 1 s, da barra e dos anúncios.
  - DOM: `#arq-palco[data-pronto="3d"]` quando a cena está pronta (Task 10 usa `"fallback"`); um `button.arq-rotulo[data-no=<id>][data-estado=<estado>]` por nó (7); botões `[data-camera=geral|campo|nuvem|aplicacao]`; `#arq-enquadrar` (desabilitado até a Task 9); `#arq-modo`, `#arq-atualizado`, `#arq-aviso`, `#arq-anuncio`.
  - Evento `arq:selecionar` disparado no `#arq-palco` com `detail: { tipo: 'no', id }` ao clicar num rótulo (a Task 9 escuta).
  - **Contexto de representação** `c` (contrato comum à cena 3D e ao fallback SVG da Task 10): `c.nos[id].rotulo` e `c.aplicar(r)` obrigatórios; `c.definirAtiva(bool)` opcional (render loop); `c.ativa` é mantido pela vista. Na cena 3D, também `c.voarPara({ posicao, alvo }, instantaneo?)`, `c.marcarSujo()`, `c.atualizarParticulas()`, `c.cena`, `c.camera`, `c.renderer`, `c.nos[id] = { grupo, corpo, anel, rotulo, altura }`, `c.enlaces[id] = { tubo, curva, material, tracejado, particulas, estado }`.
  - Funções de `arquitetura-vista.js`: `criarRotulo(id)`, `aplicarComum(c, r)`, `anunciarMudancas(c, r)`, `atualizarBarra(s)`, `reavaliar(c)`, `obterContexto()`, `ativar(c, ativa)`, `aoMudarRota()`.

- [ ] **Step 1: WebGL no Chromium headless** — em `playwright.config.mjs`, dentro de `use`, acrescentar:

```js
    // Headless sem GPU: força o WebGL por software (SwiftShader) para a cena 3D.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
```

- [ ] **Step 2: Teste E2E da cena (falhando)**

`test/frontend_smoke/arquitetura.spec.mjs`:

```js
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test('cenário 5a — cena 3D pronta no modo simulador', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/#/arquitetura');
  const palco = page.locator('#arq-palco');
  await expect(palco).toHaveAttribute('data-pronto', '3d');
  await expect(palco.locator('canvas[role="img"]')).toHaveCount(1);
  await expect(page.locator('#arq-modo')).toHaveText('Modo 3 · Simulador');

  const rotulos = page.locator('button.arq-rotulo');
  await expect(rotulos).toHaveCount(7);
  await expect(page.locator('button.arq-rotulo[data-no="simulador"]')).toHaveAttribute('data-estado', 'ok');
  await expect(page.locator('button.arq-rotulo[data-no="arduino"]')).toHaveAttribute('data-estado', 'fora-do-modo');
  await expect(page.locator('button.arq-rotulo[data-no="beckhoff"]')).toHaveAttribute('data-estado', 'sem-telemetria');
  await expect(page.locator('#arq-atualizado')).toContainText('atualizado há');

  // Presets de câmera e alternadores não geram erro.
  for (const cam of ['campo', 'nuvem', 'aplicacao', 'geral']) {
    await page.locator(`[data-camera="${cam}"]`).click();
  }
  await page.locator('#arq-rotulos').uncheck();
  await expect(rotulos.first()).toBeHidden();
  await page.locator('#arq-rotulos').check();
  await expect(rotulos.first()).toBeVisible();
  await page.locator('#arq-particulas').uncheck();

  // Sair e voltar mantém a cena (construída uma única vez).
  await page.locator('a.seletor-tecla[href="#/"]').click();
  await page.locator('a.seletor-tecla[href="#/arquitetura"]').click();
  await expect(page.locator('#arq-palco canvas')).toHaveCount(1);
  esperarSemErros(erros);
});

test('a cena não é construída fora da rota', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#arq-palco canvas')).toHaveCount(0);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador arquitetura`
Expected: FAIL (`data-pronto` ausente).

- [ ] **Step 3: Extrair o ambiente IBL** — criar `frontend/js/ambiente3d.js` movendo **sem alteração** a função `ambienteGradiente(renderer)` do fim de `diagrama3d.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — Ambiente 3D compartilhado
// ------------------------------------------------------------
// Esfera com gradiente vertical, pré-filtrada como mapa de ambiente
// (IBL). Usada pelo mímico (diagrama3d.js) e pela arquitetura
// (arquitetura3d.js), para que as duas cenas tenham a mesma luz.
// ============================================================
import * as THREE from '/vendor/three.module.min.js';

export function ambienteGradiente(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(60, 40, 24);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
  const pos = geo.attributes.position;
  const cores = [];
  const topo = new THREE.Color(0x93bcff);
  const meio = new THREE.Color(0x2a2f3a);
  const chao = new THREE.Color(0x0b0a08);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 60; // -1..1
    if (y >= 0) c.copy(meio).lerp(topo, y);
    else c.copy(meio).lerp(chao, -y);
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  cena.add(new THREE.Mesh(geo, mat));
  const tex = pmrem.fromScene(cena, 0.04).texture;
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return tex;
}
```

Em `diagrama3d.js`: apagar a função `ambienteGradiente` e seu comentário do fim do arquivo e acrescentar, abaixo do `import * as THREE`:

```js
import { ambienteGradiente } from './ambiente3d.js';
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador botoes`
Expected: passa (o mímico continua funcionando; nenhum erro de console).

- [ ] **Step 4: Marcação da vista** — substituir todo o conteúdo interno de `<main id="view-arquitetura">` por:

```html
    <div class="arq-barra">
      <h2 class="bay-title arq-titulo"><span class="bay-title-k">ARC</span> Arquitetura do sistema</h2>
      <span id="arq-modo" class="arq-selo">Modo desconhecido</span>
      <span id="arq-atualizado" class="arq-atualizado mono">aguardando dados…</span>
    </div>

    <div id="arq-palco" class="arq-palco">
      <!-- Controles da cena (padrão do exemplo three.js misc_exporter_stl: painel no canto superior direito) -->
      <div class="arq-controles" id="arq-controles">
        <button type="button" class="arq-btn arq-controles-abrir" aria-expanded="false" aria-controls="arq-controles-corpo">Controles</button>
        <div id="arq-controles-corpo" class="arq-controles-corpo">
          <div class="arq-grupo" role="group" aria-label="Câmera">
            <button type="button" class="arq-btn" data-camera="geral">Visão geral</button>
            <button type="button" class="arq-btn" data-camera="campo">Campo</button>
            <button type="button" class="arq-btn" data-camera="nuvem">Nuvem</button>
            <button type="button" class="arq-btn" data-camera="aplicacao">Aplicação</button>
            <button type="button" class="arq-btn" id="arq-enquadrar" disabled>Enquadrar seleção</button>
          </div>
          <label class="arq-check"><input type="checkbox" id="arq-particulas" checked> Partículas</label>
          <label class="arq-check"><input type="checkbox" id="arq-rotulos" checked> Rótulos</label>
        </div>
      </div>

      <ul class="arq-legenda" aria-label="Legenda dos estados">
        <li><span class="arq-amostra" data-estado="ok"></span>OK</li>
        <li><span class="arq-amostra" data-estado="atencao"></span>Atenção</li>
        <li><span class="arq-amostra" data-estado="falha"></span>Falha</li>
        <li><span class="arq-amostra" data-estado="desconhecido"></span>Desconhecido</li>
        <li><span class="arq-amostra arq-amostra--tracejada" data-estado="ok"></span>Inferido</li>
        <li><span class="arq-amostra arq-amostra--tracejada" data-estado="sem-telemetria"></span>Não monitorado</li>
        <li><span class="arq-amostra" data-estado="fora-do-modo"></span>Fora deste modo</li>
      </ul>

      <p id="arq-aviso" class="arq-aviso" role="status" hidden></p>
      <div id="arq-anuncio" class="sr-only" aria-live="polite"></div>
    </div>
```

E, após o script `js/diagrama3d.js`:

```html
  <!-- Vista #/arquitetura: a cena só é construída na primeira visita à rota
       (arquitetura-vista.js carrega arquitetura3d.js sob demanda). -->
  <script type="module" src="js/arquitetura-vista.js"></script>
```

- [ ] **Step 5: CSS da vista** — acrescentar após o bloco `.arq-palco { … }` criado na Task 3:

```css
.arq-selo {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--led-idle);
  border: 1px solid color-mix(in srgb, var(--led-idle) 40%, var(--etch));
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
}

.arq-atualizado {
  font-size: var(--step--1);
  color: var(--legend);
}

.arq-palco > canvas,
.arq-camada-rotulos {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.arq-camada-rotulos {
  pointer-events: none;
}

/* Placa de identificação de cada nó (CSS2D) */
.arq-rotulo {
  --led: var(--muted);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 32px;
  padding: 0.3rem 0.6rem;
  font-family: var(--font-ui);
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--readout);
  background: color-mix(in srgb, var(--bay-raised) 88%, transparent);
  border: 1px solid var(--etch-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 160ms ease, opacity 160ms ease, background 160ms ease;
}
.arq-rotulo:hover { border-color: var(--led); }
.arq-rotulo[aria-pressed="true"] { border-color: var(--led-idle); background: var(--bay-inset); }
.arq-rotulo-k {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: var(--legend);
}
.arq-rotulo-led {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--led);
  box-shadow: 0 0 8px var(--led);
}
.arq-rotulo[data-estado="ok"]           { --led: var(--led-run); }
.arq-rotulo[data-estado="atencao"]      { --led: var(--led-warn); }
.arq-rotulo[data-estado="falha"]        { --led: var(--led-fault); }
.arq-rotulo[data-estado="desconhecido"] { --led: var(--led-idle); }
.arq-rotulo[data-estado="fora-do-modo"] { opacity: 0.45; }

/* Etiqueta do hardware de campo (informativa, sem interação) */
.arq-hw {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--legend);
  text-align: center;
  line-height: 1.3;
  white-space: nowrap;
}

.arq-controles {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  max-width: 15rem;
  padding: 0.6rem;
  background: color-mix(in srgb, var(--bay) 92%, transparent);
  border: 1px solid var(--etch);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm), var(--bevel);
}
.arq-controles-abrir { display: none; }
.arq-controles-corpo { display: grid; gap: 0.5rem; }
.arq-grupo { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.arq-grupo #arq-enquadrar { grid-column: 1 / -1; }

.arq-btn {
  min-height: 36px;
  padding: 0.35rem 0.6rem;
  font: 600 var(--step--1) var(--font-ui);
  color: var(--readout);
  background: var(--bay-inset);
  border: 1px solid var(--etch);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}
.arq-btn:hover:not(:disabled) { border-color: var(--led-idle); }
.arq-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.arq-check {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 32px;
  font-size: var(--step--1);
  color: var(--readout-dim);
  cursor: pointer;
}
.arq-check input { width: 1rem; height: 1rem; accent-color: var(--led-idle); }

.arq-legenda {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.8rem;
  max-width: min(34rem, calc(100% - 1.5rem));
  margin: 0;
  padding: 0.5rem 0.7rem;
  list-style: none;
  font-size: 0.7rem;
  color: var(--readout-dim);
  background: color-mix(in srgb, var(--bay) 92%, transparent);
  border: 1px solid var(--etch);
  border-radius: var(--radius-sm);
}
.arq-legenda li { display: inline-flex; align-items: center; gap: 0.35rem; }

.arq-amostra {
  --led: var(--muted);
  width: 1.3rem;
  height: 0.3rem;
  border-radius: 2px;
  background: var(--led);
}
.arq-amostra[data-estado="ok"]             { --led: var(--led-run); }
.arq-amostra[data-estado="atencao"]        { --led: var(--led-warn); }
.arq-amostra[data-estado="falha"]          { --led: var(--led-fault); }
.arq-amostra[data-estado="desconhecido"]   { --led: var(--led-idle); }
.arq-amostra[data-estado="sem-telemetria"] { --led: var(--muted); }
.arq-amostra[data-estado="fora-do-modo"]   { --led: var(--etch-strong); opacity: 0.6; }
.arq-amostra--tracejada {
  background: repeating-linear-gradient(90deg, var(--led) 0 4px, transparent 4px 7px);
}

.arq-aviso {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 2;
  max-width: 22rem;
  padding: 0.5rem 0.75rem;
  font-size: var(--step--1);
  color: var(--readout);
  background: color-mix(in srgb, var(--led-fault) 14%, var(--bay-inset));
  border: 1px solid color-mix(in srgb, var(--led-fault) 45%, var(--etch));
  border-radius: var(--radius-sm);
}
```

E dentro do `@media (max-width: 720px)`:

```css
  .arq-palco { min-height: 65vh; }
  .arq-controles { max-width: calc(100% - 1.5rem); }
  .arq-controles-abrir { display: block; width: 100%; }
  .arq-controles-corpo { display: none; margin-top: 0.5rem; }
  .arq-controles[data-aberto] .arq-controles-corpo { display: grid; }
  .arq-legenda { font-size: 0.64rem; }
```

- [ ] **Step 6: Módulo da cena (só three.js)** — `frontend/js/arquitetura3d.js`. É carregado por `import()` dinâmico a partir de `arquitetura-vista.js` (Step 7): se o three.js não carregar, só este módulo falha e a vista cai no fallback (Task 10).

```js
// ============================================================
// DATA FLOW INVENTORY — Cena 3D da arquitetura (three.js)
// ------------------------------------------------------------
// Padrão do exemplo three.js misc_exporter_stl (chão com grade
// sumindo na névoa, OrbitControls livre, painel de controles no
// canto) com a luz do mímico da tela principal. Carregado sob
// demanda por js/arquitetura-vista.js; não conhece o coletor de
// sinais nem o painel de detalhes — só desenha o que recebe em
// c.aplicar(r) e dispara "arq:selecionar" no palco.
// ============================================================
import * as THREE from '/vendor/three.module.min.js';
import { OrbitControls } from '/vendor/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '/vendor/CSS2DRenderer.js';
import { ambienteGradiente } from './ambiente3d.js';
import { NOS_ARQ, ENLACES_ARQ, HARDWARE, CAMERAS } from './arquitetura-dados.js';

const FUNDO = 0x14161c; // --panel

// Espelha os tokens IEC 60073 de style.css (:root).
export const COR_ESTADO = {
  'ok':             0x3ddc84, // --led-run
  'atencao':        0xffb020, // --led-warn
  'falha':          0xff4d4f, // --led-fault
  'desconhecido':   0x4aa3ff, // --led-idle
  'sem-dados':      0x858ca3, // --muted
  'sem-telemetria': 0x6b7189,
  'fora-do-modo':   0x3a3f4d, // --etch-strong
};

function suportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

// Textura de listras usada como alphaMap: tubo tracejado para enlaces
// inferidos ou não monitorados.
function texturaTracejada() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 2;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 32, 2);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 18, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function corpoPorForma(forma) {
  const grupo = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3f4d, roughness: 0.55, metalness: 0.45, transparent: true,
  });
  const add = (geo, y) => {
    const m = new THREE.Mesh(geo, material);
    m.position.y = y;
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
    return m;
  };
  let altura = 1;
  switch (forma) {
    case 'placa':
      add(new THREE.BoxGeometry(2.2, 0.22, 1.5), 0.2);
      add(new THREE.BoxGeometry(0.7, 0.14, 0.5), 0.38);
      altura = 0.45;
      break;
    case 'torre':
      add(new THREE.BoxGeometry(1.3, 2.2, 1.3), 1.1);
      altura = 2.2;
      break;
    case 'monitor':
      add(new THREE.BoxGeometry(1.0, 0.08, 0.6), 0.04);
      add(new THREE.BoxGeometry(0.18, 0.7, 0.18), 0.4);
      add(new THREE.BoxGeometry(2.4, 1.45, 0.14), 1.45);
      altura = 2.2;
      break;
    case 'rack':
      add(new THREE.BoxGeometry(1.8, 1.6, 1.2), 0.8);
      altura = 1.6;
      break;
  }
  return { grupo, material, altura };
}

/**
 * Constrói a cena dentro do palco.
 * @param {{ palco: HTMLElement, criarRotulo: (id: string) => HTMLButtonElement, semMovimento: boolean }} opcoes
 * @returns contexto de representação, ou null sem WebGL.
 */
export function construir3d({ palco, criarRotulo, semMovimento }) {
  if (!suportaWebGL()) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Diagrama 3D da arquitetura do Data Flow Inventory. Arraste para girar, use a roda para aproximar '
    + 'e o botão direito para deslocar. Use Tab para percorrer os componentes.');
  palco.prepend(canvas);

  const rotulos = new CSS2DRenderer();
  rotulos.domElement.className = 'arq-camada-rotulos';
  canvas.after(rotulos.domElement);

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(FUNDO);
  cena.fog = new THREE.Fog(FUNDO, 22, 48);
  cena.environment = ambienteGradiente(renderer);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.fromArray(CAMERAS.geral.posicao);

  // --- Luzes (mesmas do mímico) ---
  cena.add(new THREE.HemisphereLight(0x9ec3ff, 0x24201c, 0.6));
  const key = new THREE.DirectionalLight(0xffe9cf, 2.0);
  key.position.set(-8, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  key.shadow.bias = -0.0012;
  cena.add(key);
  const fill = new THREE.DirectionalLight(0x8ab0ff, 0.4);
  fill.position.set(10, 6, -8);
  cena.add(fill);

  // --- Chão + grade que some na névoa (padrão misc_exporter_stl) ---
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: FUNDO, roughness: 1, metalness: 0 })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);
  const grade = new THREE.GridHelper(90, 90, 0x3a3f4d, 0x2b2f3a);
  grade.position.y = 0.002;
  grade.material.transparent = true;
  grade.material.opacity = 0.7;
  cena.add(grade);

  // --- Navegação (OrbitControls, como no exemplo de referência) ---
  const controles = new OrbitControls(camera, canvas);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.maxPolarAngle = THREE.MathUtils.degToRad(85); // nunca abaixo do chão
  controles.minDistance = 5;
  controles.maxDistance = 38;
  controles.screenSpacePanning = true;
  controles.target.fromArray(CAMERAS.geral.alvo);
  controles.update();

  const c = {
    renderer, rotulos, cena, camera, controles,
    nos: {}, enlaces: {},
    sujo: true, voo: null, w: 0, h: 0,
    particulasLigadas: !semMovimento,
  };
  c.marcarSujo = () => { c.sujo = true; };
  controles.addEventListener('change', c.marcarSujo);
  controles.addEventListener('start', () => { c.voo = null; }); // o usuário assume a câmera

  // --- Nós ---
  for (const [id, n] of Object.entries(NOS_ARQ)) {
    const { grupo, material, altura } = corpoPorForma(n.forma);
    grupo.position.fromArray(n.posicao);
    grupo.traverse((o) => { o.userData.no = id; });

    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.05, 10, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1d24, emissive: COR_ESTADO.desconhecido, emissiveIntensity: 1.4 })
    );
    anel.rotation.x = Math.PI / 2;
    anel.position.y = 0.04;
    grupo.add(anel);

    const rotulo = criarRotulo(id);
    const obj = new CSS2DObject(rotulo);
    obj.position.set(0, altura + 0.55, 0);
    grupo.add(obj);

    cena.add(grupo);
    c.nos[id] = { grupo, corpo: material, anel, rotulo, altura };
  }

  // --- Cluster de hardware ao redor do Arduino (sem status) ---
  const matHw = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.6, metalness: 0.3 });
  const matFio = new THREE.LineBasicMaterial({ color: 0x3a3f4d });
  const origem = new THREE.Vector3().fromArray(NOS_ARQ.arduino.posicao).setY(0.2);
  for (const h of HARDWARE) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), matHw);
    m.position.set(h.posicao[0], 0.15, h.posicao[2]);
    m.castShadow = true;
    cena.add(m);
    cena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([origem, m.position.clone()]), matFio));
    const et = document.createElement('div');
    et.className = 'arq-hw';
    et.innerHTML = `${h.nome}<br>${h.detalhe}`;
    const obj = new CSS2DObject(et);
    obj.position.set(0, 0.5, 0);
    m.add(obj);
  }

  // --- Enlaces: tubo sobre curva + partículas no sentido do fluxo ---
  const baseTracejada = texturaTracejada();
  const geoParticula = new THREE.SphereGeometry(0.1, 12, 8);
  for (const [id, e] of Object.entries(ENLACES_ARQ)) {
    const a = new THREE.Vector3().fromArray(NOS_ARQ[e.de].posicao).setY(0.35);
    const b = new THREE.Vector3().fromArray(NOS_ARQ[e.para].posicao).setY(0.35);
    const meio = a.clone().lerp(b, 0.5);
    meio.y = 0.35 + Math.min(2.2, a.distanceTo(b) * 0.18);
    const curva = new THREE.QuadraticBezierCurve3(a, meio, b);

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1d24, emissive: COR_ESTADO.desconhecido, emissiveIntensity: 1.1,
      roughness: 0.4, metalness: 0.1, transparent: true,
    });
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.07, 8, false), material);
    tubo.userData.enlace = id;
    cena.add(tubo);

    const tracejado = baseTracejada.clone();
    tracejado.repeat.set(Math.max(4, Math.round(curva.getLength() * 3)), 1);
    tracejado.needsUpdate = true;

    const particulas = [0, 1 / 3, 2 / 3].map((t) => {
      const p = new THREE.Mesh(geoParticula, new THREE.MeshStandardMaterial({
        color: 0x1a1d24, emissive: COR_ESTADO.ok, emissiveIntensity: 2,
      }));
      p.userData.t = t;
      p.position.copy(curva.getPointAt(t));
      p.visible = false;
      cena.add(p);
      return p;
    });

    c.enlaces[id] = { tubo, curva, material, tracejado, particulas, estado: 'desconhecido' };
  }

  // --- Câmera: voo suave entre enquadramentos (corte seco com movimento reduzido) ---
  c.voarPara = (destino, instantaneo = semMovimento) => {
    const pos = new THREE.Vector3().fromArray(destino.posicao);
    const alvo = new THREE.Vector3().fromArray(destino.alvo);
    if (instantaneo) {
      camera.position.copy(pos);
      controles.target.copy(alvo);
      controles.update();
      c.voo = null;
    } else {
      c.voo = { t: 0, dePos: camera.position.clone(), deAlvo: controles.target.clone(), pos, alvo };
    }
    c.marcarSujo();
  };

  // --- Status → cena ---
  c.atualizarParticulas = () => {
    for (const e of Object.values(c.enlaces)) {
      const mostrar = e.estado === 'ok' && c.particulasLigadas && !semMovimento;
      e.particulas.forEach((p) => { p.visible = mostrar; });
    }
    c.marcarSujo();
  };

  c.aplicar = (r) => {
    for (const [id, info] of Object.entries(r.enlaces)) {
      const e = c.enlaces[id];
      e.estado = info.estado;
      e.material.emissive.setHex(COR_ESTADO[info.estado]);
      const alpha = info.inferido || info.estado === 'sem-telemetria' ? e.tracejado : null;
      if (e.material.alphaMap !== alpha) {
        e.material.alphaMap = alpha;
        e.material.alphaTest = alpha ? 0.5 : 0;
        e.material.needsUpdate = true;
      }
      e.material.opacity = info.estado === 'fora-do-modo' ? 0.15 : 1;
    }
    for (const [id, estado] of Object.entries(r.nos)) {
      const n = c.nos[id];
      n.anel.material.emissive.setHex(COR_ESTADO[estado]);
      n.corpo.opacity = estado === 'fora-do-modo' ? 0.3 : 1;
    }
    c.atualizarParticulas();
  };

  // --- Laço de renderização (por sujeira, como o mímico) ---
  const relogio = new THREE.Clock();
  const suave = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  function ajustarTamanho() {
    const w = Math.max(1, palco.clientWidth);
    const h = Math.max(1, palco.clientHeight);
    if (w === c.w && h === c.h) return;
    c.w = w;
    c.h = h;
    renderer.setSize(w, h, false);
    rotulos.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    c.sujo = true;
  }

  function passo() {
    const dt = Math.min(relogio.getDelta(), 0.05);
    ajustarTamanho();
    let animando = false;

    if (c.voo) {
      c.voo.t = Math.min(1, c.voo.t + dt / 0.6);
      const k = suave(c.voo.t);
      camera.position.lerpVectors(c.voo.dePos, c.voo.pos, k);
      controles.target.lerpVectors(c.voo.deAlvo, c.voo.alvo, k);
      if (c.voo.t >= 1) c.voo = null;
      animando = true;
    }
    if (controles.update()) animando = true; // amortecimento ainda em curso

    if (c.particulasLigadas && !semMovimento) {
      for (const e of Object.values(c.enlaces)) {
        if (e.estado !== 'ok') continue;
        for (const p of e.particulas) {
          p.userData.t = (p.userData.t + dt * 0.22) % 1;
          p.position.copy(e.curva.getPointAt(p.userData.t));
        }
        animando = true;
      }
    }

    if (c.sujo || animando) {
      renderer.render(cena, camera);
      rotulos.render(cena, camera);
      c.sujo = false;
    }
  }

  // Só o laço de renderização; o relógio de status é da vista (arquitetura-vista.js).
  c.definirAtiva = (ativa) => {
    if (ativa) {
      relogio.getDelta();
      c.sujo = true;
      renderer.setAnimationLoop(passo);
    } else {
      renderer.setAnimationLoop(null);
    }
  };

  ligarControles(c, palco, semMovimento);
  return c;
}

function ligarControles(c, palco, semMovimento) {
  palco.querySelectorAll('[data-camera]').forEach((b) => {
    b.addEventListener('click', () => c.voarPara(CAMERAS[b.dataset.camera]));
  });

  const particulas = document.getElementById('arq-particulas');
  if (particulas) {
    particulas.checked = !semMovimento;
    particulas.disabled = semMovimento;
    particulas.addEventListener('change', () => {
      c.particulasLigadas = particulas.checked;
      c.atualizarParticulas();
    });
  }

  const rotulos = document.getElementById('arq-rotulos');
  if (rotulos) {
    rotulos.addEventListener('change', () => {
      c.rotulos.domElement.hidden = !rotulos.checked;
      c.marcarSujo();
    });
  }

  const abrir = palco.querySelector('.arq-controles-abrir');
  const caixa = document.getElementById('arq-controles');
  if (abrir && caixa) {
    abrir.addEventListener('click', () => {
      const aberto = abrir.getAttribute('aria-expanded') !== 'true';
      abrir.setAttribute('aria-expanded', String(aberto));
      caixa.toggleAttribute('data-aberto', aberto);
    });
  }
}
```

- [ ] **Step 7: Módulo da vista (entrada, sem three.js)** — `frontend/js/arquitetura-vista.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — Vista #/arquitetura (entrada)
// ------------------------------------------------------------
// Ciclo de vida da rota, status (coletor → derivarStatus), barra,
// anúncios e rótulos. NÃO importa three.js: a cena 3D é carregada
// sob demanda com import(); se falhar, a vista segue em 2D
// (Task 10). Independente de app.js: se este módulo falhar, o
// painel e os botões seguem funcionando.
//
// Contexto de representação (c), comum à cena 3D e ao SVG:
//   c.nos[id].rotulo       botão .arq-rotulo do nó
//   c.aplicar(r)           pinta o status na representação
//   c.definirAtiva(bool)   (opcional) liga/desliga o render
//   c.destacar(sel), c.enquadrar(sel), c.visaoGeral()  (Task 9, opcionais)
// ============================================================
import { NOS_ARQ, ENLACES_ARQ, ROTULO_MODO, ROTULO_ESTADO } from './arquitetura-dados.js';
import { derivarStatus } from './arquitetura-status.js';
import { coletorCompartilhado } from './arquitetura-sinais.js';

const ROTA = '#/arquitetura';
const palco = document.getElementById('arq-palco');
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coletor = coletorCompartilhado();
let ctx = null;
let construindo = false;
let relogioStatus = null;

// Placa de identificação do nó: botão real (Tab/Enter), igual no 3D e no SVG.
function criarRotulo(id) {
  const n = NOS_ARQ[id];
  const rotulo = document.createElement('button');
  rotulo.type = 'button';
  rotulo.className = 'arq-rotulo';
  rotulo.dataset.no = id;
  rotulo.dataset.estado = 'desconhecido';
  rotulo.setAttribute('aria-pressed', 'false');
  rotulo.innerHTML = `<span class="arq-rotulo-led" aria-hidden="true"></span>`
    + `<span class="arq-rotulo-k" aria-hidden="true">${n.codigo}</span>`
    + `<span class="arq-rotulo-nome">${n.nome}</span>`;
  rotulo.addEventListener('click', () => {
    palco.dispatchEvent(new CustomEvent('arq:selecionar', { detail: { tipo: 'no', id } }));
  });
  return rotulo;
}

function aplicarComum(c, r) {
  for (const [id, estado] of Object.entries(r.nos)) {
    const rotulo = c.nos[id].rotulo;
    rotulo.dataset.estado = estado;
    rotulo.setAttribute('aria-label', `${NOS_ARQ[id].nome}: ${ROTULO_ESTADO[estado]}`);
  }
  const modo = document.getElementById('arq-modo');
  if (modo) modo.textContent = ROTULO_MODO[r.modo];
  anunciarMudancas(c, r);
}

// Anuncia (aria-live) só as mudanças de estado dos enlaces, nunca a primeira pintura.
function anunciarMudancas(c, r) {
  const atual = Object.fromEntries(Object.entries(r.enlaces).map(([id, e]) => [id, e.estado]));
  const antes = c.estadosAnteriores;
  c.estadosAnteriores = atual;
  const el = document.getElementById('arq-anuncio');
  if (!antes || !el) return;
  const msgs = Object.keys(atual)
    .filter((id) => antes[id] !== atual[id])
    .map((id) => `${ENLACES_ARQ[id].rotulo}: ${ROTULO_ESTADO[atual[id]]}`);
  if (msgs.length) el.textContent = msgs.join('. ');
}

function atualizarBarra(s) {
  const el = document.getElementById('arq-atualizado');
  if (el) {
    el.textContent = s.apiEm
      ? `atualizado há ${Math.max(0, Math.round((Date.now() - s.apiEm) / 1000))} s`
      : 'aguardando dados…';
  }
  const aviso = document.getElementById('arq-aviso');
  if (aviso) {
    aviso.hidden = s.socketConectado;
    if (!s.socketConectado) {
      aviso.textContent = 'Sem conexão com o servidor: estados marcados como "sem dados" até reconectar.';
    }
  }
}

function reavaliar(c) {
  const s = coletor.obter();
  const r = derivarStatus(s, Date.now());
  c.aplicar(r);
  aplicarComum(c, r);
  atualizarBarra(s);
}

async function obterContexto() {
  try {
    const m = await import('./arquitetura3d.js');
    const c = m.construir3d({ palco, criarRotulo, semMovimento });
    if (c) {
      palco.dataset.pronto = '3d';
      return c;
    }
  } catch (e) {
    console.warn('[ARQ] Cena 3D indisponível:', e && e.message);
  }
  // Sem WebGL/three.js: substituído pelo fallback SVG na Task 10.
  const aviso = document.getElementById('arq-aviso');
  if (aviso) {
    aviso.textContent = 'WebGL indisponível neste navegador.';
    aviso.hidden = false;
  }
  return null;
}

function ativar(c, ativa) {
  if (ativa === !!c.ativa) return;
  c.ativa = ativa;
  if (c.definirAtiva) c.definirAtiva(ativa);
  if (ativa) {
    relogioStatus = setInterval(() => reavaliar(c), 1000); // "atualizado há X s" + regra de 60 s do UART
    reavaliar(c);
  } else {
    clearInterval(relogioStatus);
    relogioStatus = null;
  }
}

async function aoMudarRota() {
  if (!palco) return;
  if (location.hash === ROTA && !ctx && !construindo) {
    construindo = true;
    ctx = await obterContexto();
    construindo = false;
    if (!ctx) return;
  }
  // Relê o hash: a rota pode ter mudado durante o import().
  if (ctx) ativar(ctx, location.hash === ROTA);
}

coletor.aoMudar(() => { if (ctx && ctx.ativa) reavaliar(ctx); });
window.addEventListener('hashchange', aoMudarRota);
aoMudarRota();
```

- [ ] **Step 8: Rodar tudo**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam (cenário 5a incluído; botões intactos).

- [ ] **Step 9: Verificação visual rápida** — com o simulador rodando (`cd simulator && npm start`), abrir `http://localhost:3000/#/arquitetura` no navegador embutido e conferir: grade sumindo na névoa, 7 placas, enlaces do ramo real esmaecidos, partículas no enlace Simulador ↔ Dashboard, órbita/zoom/pan funcionando.

- [ ] **Step 10: Commit**

```bash
git add frontend/js/ambiente3d.js frontend/js/diagrama3d.js frontend/js/arquitetura3d.js frontend/js/arquitetura-vista.js frontend/index.html frontend/css/style.css test/frontend_smoke/playwright.config.mjs test/frontend_smoke/arquitetura.spec.mjs
git commit -m "feat(arquitetura): cena 3D navegável com status ao vivo das conexões" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Seleção, painel de detalhes e teclado

Implementa o restante de §5.3 (clique/raycast, voo até o item, Enter/Esc) e §5.4 (painel de detalhes de nó e de enlace).

**Files:**
- Modify: `frontend/index.html` (`aside#arq-detalhes` dentro de `#arq-palco`)
- Modify: `frontend/css/style.css`
- Modify: `frontend/js/arquitetura3d.js` (ganchos `destacar`/`enquadrar`/`visaoGeral`, raycast)
- Modify: `frontend/js/arquitetura-vista.js` (seleção e painel)
- Modify: `test/frontend_smoke/arquitetura.spec.mjs`

**Interfaces:**
- Consumes: da Task 8 — contexto `c` (`c.nos`, `c.enlaces`, `c.voarPara`, `c.marcarSujo`, `c.cena`, `c.camera`, `c.renderer`), `construir3d`, `ligarControles`, e em `arquitetura-vista.js`: `reavaliar(c)`, `aoMudarRota()`, evento `arq:selecionar`; `NOS_ARQ`, `ENLACES_ARQ`, `CAMERAS`, `ROTULO_ESTADO`.
- Produces:
  - Ganchos opcionais do contexto (a cena 3D implementa os três; o fallback da Task 10 implementa só `destacar`): `c.destacar(sel)`, `c.enquadrar(sel)`, `c.visaoGeral()`.
  - Estado `c.selecao: { tipo: 'no'|'enlace', id } | null`, `c.detalhes`, `c.focoRetorno`.
  - Em `arquitetura-vista.js`: `selecionar(c, sel)`, `ligarPainel(c)` (evento, Fechar, Enquadrar, Esc — chamada uma vez em `aoMudarRota`), `atualizarDetalhes(c, r, s)`.
  - Em `arquitetura3d.js`: `enquadramento(c, sel)`, `ligarRaycast(c, palco)` (dispara `arq:selecionar`).
  - DOM `#arq-detalhes`, `#arq-detalhes-titulo`, `#arq-detalhes-corpo`, `#arq-fechar`, `button.arq-link-enlace[data-enlace]`, `.arq-estado[data-estado]`.

- [ ] **Step 1: Teste (falhando)** — acrescentar a `arquitetura.spec.mjs`:

```js
test('cenário 5b — teclado abre detalhes de nó e de enlace; Esc fecha e devolve o foco', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/#/arquitetura');
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', '3d');

  const broker = page.locator('button.arq-rotulo[data-no="broker"]');
  await broker.focus();
  await page.keyboard.press('Enter');
  const painel = page.locator('#arq-detalhes');
  await expect(painel).toBeVisible();
  await expect(page.locator('#arq-detalhes-titulo')).toHaveText('Broker MQTT');
  await expect(painel).toContainText('dataflow/status/server');
  await expect(painel).toContainText('ARCHITECTURE.md §2.2');
  await expect(broker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#arq-enquadrar')).toBeEnabled();

  await painel.locator('button.arq-link-enlace[data-enlace="mqtt-beckhoff"]').click();
  await expect(page.locator('#arq-detalhes-titulo')).toHaveText('Broker → Beckhoff');
  await expect(painel.locator('.arq-estado')).toHaveAttribute('data-estado', 'sem-telemetria');
  await expect(painel).toContainText('Não monitorado');

  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await expect(broker).toBeFocused();
  await expect(page.locator('#arq-enquadrar')).toBeDisabled();
  esperarSemErros(erros);
});

test('cenário 5c — detalhe do Arduino mostra FSM e pinagem', async ({ page }) => {
  await page.goto('/#/arquitetura');
  await page.locator('button.arq-rotulo[data-no="arduino"]').click();
  const painel = page.locator('#arq-detalhes');
  await expect(painel).toContainText('AGUARDANDO_PEDIDO');
  await expect(painel.locator('table')).toContainText('PWM 9, 10, 11');
  await page.locator('#arq-fechar').click();
  await expect(painel).toBeHidden();
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador arquitetura`
Expected: FAIL (`#arq-detalhes` inexistente).

- [ ] **Step 2: HTML** — dentro de `#arq-palco`, logo após `<div id="arq-anuncio" …></div>`:

```html
      <aside id="arq-detalhes" class="arq-detalhes" aria-labelledby="arq-detalhes-titulo" hidden>
        <div class="arq-detalhes-topo">
          <h3 id="arq-detalhes-titulo" class="arq-detalhes-titulo" tabindex="-1"></h3>
          <button type="button" class="arq-btn" id="arq-fechar">Fechar</button>
        </div>
        <div id="arq-detalhes-corpo" class="arq-detalhes-corpo"></div>
      </aside>
```

- [ ] **Step 3: CSS** — acrescentar após as regras `.arq-aviso`:

```css
/* Painel de detalhes: gaveta à direita (bottom sheet no celular) */
.arq-detalhes {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  background: var(--bay);
  border-left: 1px solid var(--etch-strong);
  box-shadow: var(--shadow);
  animation: gavetaEntra 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
@keyframes gavetaEntra {
  from { transform: translateX(24px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.arq-detalhes-topo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--etch);
}
.arq-detalhes-titulo {
  flex: 1;
  font-size: var(--step-1);
  font-weight: 600;
  color: var(--readout);
}
.arq-detalhes-corpo {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 1rem 1.25rem;
  display: grid;
  align-content: start;
  gap: 1rem;
  font-size: var(--step--1);
  color: var(--readout-dim);
}
.arq-detalhes-corpo h4 {
  margin-bottom: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--legend);
}
.arq-detalhes-corpo ul { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.25rem; }
.arq-detalhes-corpo table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
.arq-detalhes-corpo th,
.arq-detalhes-corpo td { padding: 0.3rem 0.4rem; border-bottom: 1px solid var(--etch); text-align: left; vertical-align: top; }
.arq-detalhes-corpo th { color: var(--legend); font-weight: 600; }
.arq-fonte { margin-top: 0.3rem; font-size: 0.66rem; color: var(--legend); }

.arq-estado {
  --led: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
  color: var(--readout);
}
.arq-estado::before {
  content: '';
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--led);
  box-shadow: 0 0 8px var(--led);
}
.arq-estado[data-estado="ok"]           { --led: var(--led-run); }
.arq-estado[data-estado="atencao"]      { --led: var(--led-warn); }
.arq-estado[data-estado="falha"]        { --led: var(--led-fault); }
.arq-estado[data-estado="desconhecido"] { --led: var(--led-idle); }

.arq-selo-inferido {
  margin-left: 0.4rem;
  padding: 0.05rem 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--led-warn);
  border: 1px dashed color-mix(in srgb, var(--led-warn) 55%, var(--etch));
  border-radius: 999px;
}

.arq-link-enlace {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  font: 500 var(--step--1) var(--font-ui);
  color: var(--readout);
  text-align: left;
  background: var(--bay-inset);
  border: 1px solid var(--etch);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.arq-link-enlace:hover { border-color: var(--led-idle); }
.arq-lista-enlaces { list-style: none; padding: 0 !important; }
```

E dentro do `@media (max-width: 720px)`:

```css
  .arq-detalhes {
    top: auto;
    left: 0;
    width: 100%;
    max-height: 62%;
    border-left: 0;
    border-top: 1px solid var(--etch-strong);
    border-radius: var(--radius) var(--radius) 0 0;
    animation-name: folhaSobe;
  }
  @keyframes folhaSobe {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: none; opacity: 1; }
  }
```

- [ ] **Step 4: Ganchos de seleção na cena 3D** — em `arquitetura3d.js`, dentro de `construir3d`, trocar a linha `ligarControles(c, palco, semMovimento);` por:

```js
  // --- Seleção: realce do enlace e enquadramento de câmera ---
  c.destacar = (sel) => {
    for (const [id, e] of Object.entries(c.enlaces)) {
      e.material.emissiveIntensity = sel && sel.tipo === 'enlace' && sel.id === id ? 2.4 : 1.1;
    }
    c.marcarSujo();
  };
  c.enquadrar = (sel) => c.voarPara(enquadramento(c, sel));
  c.visaoGeral = () => c.voarPara(CAMERAS.geral);

  ligarControles(c, palco, semMovimento);
  ligarRaycast(c, palco);
```

E acrescentar ao fim de `arquitetura3d.js`:

```js
function enquadramento(c, sel) {
  const p = sel.tipo === 'no'
    ? new THREE.Vector3().fromArray(NOS_ARQ[sel.id].posicao)
    : c.enlaces[sel.id].curva.getPointAt(0.5);
  return { alvo: [p.x, 0.5, p.z], posicao: [p.x + 2.5, 5.5, p.z + 7] };
}

// Clique curto (sem arrastar) no canvas: raycast em nós e enlaces.
// Não conhece o painel: só dispara "arq:selecionar" no palco.
function ligarRaycast(c, palco) {
  // Alvos de clique mais grossos (invisíveis) para os tubos finos.
  const alvos = [];
  for (const [id, e] of Object.entries(c.enlaces)) {
    const alvo = new THREE.Mesh(
      new THREE.TubeGeometry(e.curva, 32, 0.28, 6, false),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    alvo.userData.enlace = id;
    c.cena.add(alvo);
    alvos.push(alvo);
  }
  Object.values(c.nos).forEach((n) => n.grupo.traverse((o) => { if (o.isMesh) alvos.push(o); }));

  const canvas = c.renderer.domElement;
  const raio = new THREE.Raycaster();
  let inicio = null;
  canvas.addEventListener('pointerdown', (ev) => { inicio = { x: ev.clientX, y: ev.clientY }; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!inicio || Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > 5) return;
    const r = canvas.getBoundingClientRect();
    const ponto = new THREE.Vector2(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1
    );
    raio.setFromCamera(ponto, c.camera);
    const [acerto] = raio.intersectObjects(alvos, false);
    if (!acerto) return;
    const { enlace, no } = acerto.object.userData;
    const detail = enlace ? { tipo: 'enlace', id: enlace } : no ? { tipo: 'no', id: no } : null;
    if (detail) palco.dispatchEvent(new CustomEvent('arq:selecionar', { detail }));
  });
}
```

- [ ] **Step 5: Painel de detalhes na vista** — em `arquitetura-vista.js`:

(a) Em `reavaliar(c)`, acrescentar como última linha: `atualizarDetalhes(c, r, s);`

(b) Em `aoMudarRota`, logo após `if (!ctx) return;`, acrescentar: `ligarPainel(ctx);`

(c) Acrescentar antes de `async function obterContexto()`:

```js
// ============================================================
// SELEÇÃO + PAINEL DE DETALHES (comum ao 3D e ao SVG)
// ============================================================
const painel = document.getElementById('arq-detalhes');
const tituloPainel = document.getElementById('arq-detalhes-titulo');
const corpoPainel = document.getElementById('arq-detalhes-corpo');
const botaoEnquadrar = document.getElementById('arq-enquadrar');

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function secao(titulo) {
  const s = el('section');
  s.append(el('h4', null, titulo));
  return s;
}

function montarSecaoDoc(s) {
  const bloco = secao(s.titulo);
  if (s.itens) {
    const ul = el('ul');
    s.itens.forEach((t) => ul.append(el('li', null, t)));
    bloco.append(ul);
  } else {
    const tabela = el('table');
    const thead = el('thead');
    const cab = el('tr');
    s.colunas.forEach((t) => cab.append(el('th', null, t)));
    thead.append(cab);
    const tbody = el('tbody');
    s.linhas.forEach((linha) => {
      const tr = el('tr');
      linha.forEach((t) => tr.append(el('td', null, t)));
      tbody.append(tr);
    });
    tabela.append(thead, tbody);
    bloco.append(tabela);
  }
  bloco.append(el('p', 'arq-fonte', `Fonte: ${s.fonte}`));
  return bloco;
}

// Monta o DOM do painel uma vez por seleção; atualizarDetalhes só troca textos
// e data-estado (sem recriar nós, para não perder o foco do teclado).
function montarDetalhes(c, sel) {
  corpoPainel.replaceChildren();
  const refs = { estado: el('p', 'arq-estado'), conexoes: [], fonte: null, ultimo: null };
  corpoPainel.append(refs.estado);

  if (sel.tipo === 'no') {
    const n = NOS_ARQ[sel.id];
    tituloPainel.textContent = n.nome;
    const funcao = secao(`${n.codigo} · ${n.camada}`);
    funcao.append(el('p', null, n.funcao));
    corpoPainel.append(funcao);

    const conexoes = secao('Conexões');
    const ul = el('ul', 'arq-lista-enlaces');
    Object.entries(ENLACES_ARQ)
      .filter(([, e]) => e.de === sel.id || e.para === sel.id)
      .forEach(([id, e]) => {
        const li = el('li');
        const b = el('button', 'arq-link-enlace');
        b.type = 'button';
        b.dataset.enlace = id;
        const est = el('span', 'arq-estado');
        b.append(el('span', null, `${e.rotulo} · ${e.protocolo}`), est);
        b.addEventListener('click', () => selecionar(c, { tipo: 'enlace', id }));
        li.append(b);
        ul.append(li);
        refs.conexoes.push({ id, el: est });
      });
    conexoes.append(ul);
    corpoPainel.append(conexoes);
    n.secoes.forEach((s) => corpoPainel.append(montarSecaoDoc(s)));
  } else {
    const e = ENLACES_ARQ[sel.id];
    tituloPainel.textContent = e.rotulo;
    const info = secao('Enlace');
    const ul = el('ul');
    ul.append(
      el('li', null, `Protocolo: ${e.protocolo}`),
      el('li', null, `De ${NOS_ARQ[e.de].nome} para ${NOS_ARQ[e.para].nome}`),
    );
    info.append(ul);
    corpoPainel.append(info);

    const origem = secao('De onde vem o status');
    refs.fonte = el('p');
    refs.ultimo = el('p', 'arq-fonte');
    origem.append(refs.fonte, refs.ultimo);
    corpoPainel.append(origem);

    if (e.topicos.length) {
      const t = secao('Tópicos MQTT');
      const lista = el('ul');
      e.topicos.forEach((tp) => lista.append(el('li', 'mono', tp)));
      t.append(lista);
      corpoPainel.append(t);
    }
  }
  c.detalhes = refs;
}

function pintarEstado(alvo, estado) {
  alvo.dataset.estado = estado;
  alvo.textContent = ROTULO_ESTADO[estado];
}

function atualizarDetalhes(c, r, s) {
  if (!c.selecao || !c.detalhes) return;
  const d = c.detalhes;
  if (c.selecao.tipo === 'no') {
    pintarEstado(d.estado, r.nos[c.selecao.id]);
    d.conexoes.forEach(({ id, el: alvo }) => {
      pintarEstado(alvo, r.enlaces[id].estado);
      if (r.enlaces[id].inferido) alvo.textContent += ' (inferido)';
    });
    return;
  }
  const info = r.enlaces[c.selecao.id];
  pintarEstado(d.estado, info.estado);
  if (info.inferido) d.estado.append(el('span', 'arq-selo-inferido', 'inferido'));
  d.fonte.textContent = info.fonte;
  const quando = c.selecao.id === 'uart' ? s.ultimoDadoCampoEm
    : c.selecao.id === 'mqtt-servidor' ? s.apiEm : null;
  d.ultimo.textContent = quando
    ? `Último sinal há ${Math.max(0, Math.round((Date.now() - quando) / 1000))} s`
    : '';
}

function selecionar(c, sel) {
  if (sel && !c.selecao) c.focoRetorno = document.activeElement;
  c.selecao = sel;

  for (const [id, n] of Object.entries(c.nos)) {
    n.rotulo.setAttribute('aria-pressed', String(!!sel && sel.tipo === 'no' && sel.id === id));
  }
  if (c.destacar) c.destacar(sel);
  if (botaoEnquadrar) botaoEnquadrar.disabled = !sel || !c.enquadrar;

  if (!sel) {
    painel.hidden = true;
    c.detalhes = null;
    if (c.visaoGeral) c.visaoGeral();
    const volta = c.focoRetorno;
    c.focoRetorno = null;
    if (volta && document.contains(volta)) volta.focus();
    return;
  }

  montarDetalhes(c, sel);
  painel.hidden = false;
  reavaliar(c);
  if (c.enquadrar) c.enquadrar(sel);
  tituloPainel.focus();
}

// Evento de seleção, Fechar, Enquadrar e Esc — ligados uma única vez.
function ligarPainel(c) {
  palco.addEventListener('arq:selecionar', (ev) => selecionar(c, ev.detail));

  const fechar = document.getElementById('arq-fechar');
  if (fechar) fechar.addEventListener('click', () => selecionar(c, null));

  if (botaoEnquadrar) {
    botaoEnquadrar.addEventListener('click', () => {
      if (c.selecao && c.enquadrar) c.enquadrar(c.selecao);
    });
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || location.hash !== ROTA) return;
    if (c.selecao) selecionar(c, null);
    else if (c.visaoGeral) c.visaoGeral();
  });
}
```

- [ ] **Step 6: Rodar tudo**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam.

- [ ] **Step 7: Commit**

```bash
git add frontend/index.html frontend/css/style.css frontend/js/arquitetura3d.js frontend/js/arquitetura-vista.js test/frontend_smoke/arquitetura.spec.mjs
git commit -m "feat(arquitetura): seleção, painel de detalhes e navegação por teclado" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Fallback SVG 2D + testes de resiliência

Implementa o fallback de §5.5 e o cenário 4 de §7.2: sem WebGL ou sem three.js, a vista mostra um diagrama 2D com os mesmos rótulos, status e painel; e nenhuma falha dos módulos novos afeta os botões.

**Files:**
- Create: `frontend/js/arquitetura-fallback.js`
- Modify: `frontend/js/arquitetura-vista.js` (`obterContexto` usa o fallback)
- Modify: `frontend/css/style.css`
- Modify: `test/frontend_smoke/helpers.mjs` (`coletarErros` aceita padrão extra a ignorar)
- Create: `test/frontend_smoke/resiliencia.spec.mjs`

**Interfaces:**
- Consumes: `NOS_ARQ`, `ENLACES_ARQ` (Task 6); `criarRotulo` e o contrato de contexto (Task 8); ganchos `destacar` e `ligarPainel` (Task 9).
- Produces: `desenharFallback(palco, criarRotulo) → { nos: Record<id, { rotulo }>, enlaces: Record<id, SVGPathElement>, aplicar(r), destacar(sel) }`; `#arq-palco[data-pronto="fallback"]`; `path.arq-fb-enlace[data-enlace][data-estado]`; `coletarErros(page, ignorarExtra?: RegExp)`.

- [ ] **Step 1: Helper com padrão extra** — em `helpers.mjs`, trocar a assinatura e o teste de `coletarErros`:

```js
/**
 * Registra erros de página/console. Retorna um array preenchido ao longo do teste.
 * ignorarExtra: padrão adicional (ex.: um recurso bloqueado de propósito pelo teste).
 */
export function coletarErros(page, ignorarExtra = null) {
  const erros = [];
  const ignora = (s) => IGNORAR.test(s) || (ignorarExtra && ignorarExtra.test(s));
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (ignora(m.text()) || ignora(url)) return;
    erros.push(`console: ${m.text()}`);
  });
  return erros;
}
```

- [ ] **Step 2: Testes de resiliência (falhando)**

`test/frontend_smoke/resiliencia.spec.mjs`:

```js
// Cenário 4 (spec §7.2): falhas dos módulos novos nunca derrubam os botões.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, roteiroBotoes } from './helpers.mjs';

test('cenário 4a — arquitetura-vista.js bloqueado: botões funcionam', async ({ page }) => {
  await page.route('**/js/arquitetura-vista.js', (r) => r.abort());
  const erros = coletarErros(page, /arquitetura-vista\.js/);
  await page.goto('/');
  await roteiroBotoes(page);
  esperarSemErros(erros);
});

test('cenário 4b — arquitetura3d.js bloqueado: fallback 2D completo e botões funcionam', async ({ page }) => {
  await page.route('**/js/arquitetura3d.js', (r) => r.abort());
  const erros = coletarErros(page, /arquitetura3d\.js/);
  await page.goto('/#/arquitetura');
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', 'fallback');
  await expect(page.locator('button.arq-rotulo')).toHaveCount(7);
  await expect(page.locator('button.arq-rotulo[data-no="simulador"]')).toHaveAttribute('data-estado', 'ok');
  await expect(page.locator('path.arq-fb-enlace[data-enlace="socket-simulador"]')).toHaveAttribute('data-estado', 'ok');

  await page.locator('button.arq-rotulo[data-no="broker"]').click();
  await expect(page.locator('#arq-detalhes')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#arq-detalhes')).toBeHidden();

  await page.locator('a.seletor-tecla[href="#/"]').click();
  await roteiroBotoes(page);
  esperarSemErros(erros);
});

test('cenário 4c — three.module.min.js bloqueado: mímico SVG, arquitetura 2D e botões funcionam', async ({ page }) => {
  await page.route('**/vendor/three.module.min.js', (r) => r.abort());
  const erros = coletarErros(page, /three\.module\.min\.js|arquitetura3d\.js|diagrama3d\.js/);
  await page.goto('/');
  await roteiroBotoes(page);
  await page.locator('a.seletor-tecla[href="#/arquitetura"]').click();
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', 'fallback');
  esperarSemErros(erros);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador resiliencia`
Expected: 4a passa; 4b e 4c FALHAM (`data-pronto` não é `fallback`).

- [ ] **Step 3: Fallback** — `frontend/js/arquitetura-fallback.js`:

```js
// ============================================================
// DATA FLOW INVENTORY — Arquitetura em 2D (sem WebGL/three.js)
// ------------------------------------------------------------
// Planta baixa da mesma topologia (x e z de arquitetura-dados.js),
// com os mesmos rótulos, estados e painel de detalhes da cena 3D.
// Não importa three.js.
// ============================================================
import { NOS_ARQ, ENLACES_ARQ } from './arquitetura-dados.js';

const NS = 'http://www.w3.org/2000/svg';
// Janela da planta em unidades de cena → viewBox 1000 × 520.
const X0 = -11, X1 = 10, Z0 = -6.5, Z1 = 4.5, W = 1000, H = 520;
const px = (x) => ((x - X0) / (X1 - X0)) * W;
const pz = (z) => ((z - Z0) / (Z1 - Z0)) * H;

export function desenharFallback(palco, criarRotulo) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // "none": o SVG ocupa o palco inteiro e os rótulos (em %) ficam alinhados às pontas dos enlaces.
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'arq-fallback');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Diagrama 2D da arquitetura (WebGL indisponível). Use Tab para percorrer os componentes.');

  const enlaces = {};
  for (const [id, e] of Object.entries(ENLACES_ARQ)) {
    const ax = px(NOS_ARQ[e.de].posicao[0]);
    const az = pz(NOS_ARQ[e.de].posicao[2]);
    const bx = px(NOS_ARQ[e.para].posicao[0]);
    const bz = pz(NOS_ARQ[e.para].posicao[2]);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2 - Math.min(60, Math.hypot(bx - ax, bz - az) * 0.15);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M ${ax} ${az} Q ${mx} ${mz} ${bx} ${bz}`);
    path.setAttribute('class', 'arq-fb-enlace');
    path.dataset.enlace = id;
    path.dataset.estado = 'desconhecido';
    path.addEventListener('click', () => {
      palco.dispatchEvent(new CustomEvent('arq:selecionar', { detail: { tipo: 'enlace', id } }));
    });
    svg.append(path);
    enlaces[id] = path;
  }

  const camada = document.createElement('div');
  camada.className = 'arq-fb-rotulos';
  const nos = {};
  for (const id of Object.keys(NOS_ARQ)) {
    const [x, , z] = NOS_ARQ[id].posicao;
    const rotulo = criarRotulo(id);
    rotulo.style.left = `${(px(x) / W) * 100}%`;
    rotulo.style.top = `${(pz(z) / H) * 100}%`;
    camada.append(rotulo);
    nos[id] = { rotulo };
  }

  palco.prepend(camada);
  palco.prepend(svg);

  return {
    nos,
    enlaces,
    aplicar(r) {
      for (const [id, info] of Object.entries(r.enlaces)) {
        const p = enlaces[id];
        p.dataset.estado = info.estado;
        p.classList.toggle('arq-fb-tracejado', info.inferido || info.estado === 'sem-telemetria');
      }
    },
    destacar(sel) {
      for (const [id, p] of Object.entries(enlaces)) {
        p.classList.toggle('arq-fb-selecionado', !!sel && sel.tipo === 'enlace' && sel.id === id);
      }
    },
  };
}
```

- [ ] **Step 4: Usar o fallback na vista** — em `arquitetura-vista.js`, acrescentar aos imports:

```js
import { desenharFallback } from './arquitetura-fallback.js';
```

E substituir o bloco final de `obterContexto()` (do comentário `// Sem WebGL/three.js: substituído pelo fallback SVG na Task 10.` até o `return null;`) por:

```js
  // Sem WebGL/three.js: planta 2D com os mesmos rótulos, estados e painel.
  try {
    const c = desenharFallback(palco, criarRotulo);
    palco.dataset.pronto = 'fallback';
    return c;
  } catch (e) {
    console.warn('[ARQ] Diagrama 2D indisponível:', e && e.message);
    return null;
  }
```

- [ ] **Step 5: CSS do fallback** — acrescentar após as regras do painel de detalhes:

```css
/* Fallback 2D (sem WebGL): planta baixa com os mesmos estados */
.arq-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.arq-fb-enlace {
  --led: var(--muted);
  fill: none;
  stroke: var(--led);
  stroke-width: 4;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
}
.arq-fb-enlace[data-estado="ok"]           { --led: var(--led-run); }
.arq-fb-enlace[data-estado="atencao"]      { --led: var(--led-warn); }
.arq-fb-enlace[data-estado="falha"]        { --led: var(--led-fault); }
.arq-fb-enlace[data-estado="desconhecido"] { --led: var(--led-idle); }
.arq-fb-enlace[data-estado="fora-do-modo"] { --led: var(--etch-strong); opacity: 0.35; }
.arq-fb-tracejado    { stroke-dasharray: 8 6; }
.arq-fb-selecionado  { stroke-width: 7; }
.arq-fb-rotulos {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.arq-fb-rotulos .arq-rotulo {
  position: absolute;
  transform: translate(-50%, -50%);
}
/* Câmera e partículas não se aplicam à planta 2D */
.arq-palco[data-pronto="fallback"] .arq-controles { display: none; }
```

- [ ] **Step 6: Rodar tudo**

Run: `cd test/frontend_smoke && npx playwright test --project=simulador`
Expected: todos passam (4a, 4b, 4c incluídos).

- [ ] **Step 7: Commit**

```bash
git add frontend/js/arquitetura-fallback.js frontend/js/arquitetura-vista.js frontend/css/style.css test/frontend_smoke/helpers.mjs test/frontend_smoke/resiliencia.spec.mjs
git commit -m "feat(arquitetura): fallback 2D sem WebGL e testes de resiliência dos botões" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: CSP real, celular e job de CI

Cenários 6 e 7 de §7.2 e o job de §7.3.

**Files:**
- Create: `test/frontend_smoke/csp.spec.mjs`
- Create: `test/frontend_smoke/mobile.spec.mjs`
- Modify: `.github/workflows/lint-and-security.yaml` (novo job `frontend-tests`)

**Interfaces:**
- Consumes: projetos `simulador` e `servidor-sem-broker` (Task 1); todos os seletores DOM das Tasks 3–10.
- Produces: job de CI `frontend-tests`.

- [ ] **Step 1: Cenário 7 (servidor real sem broker)**

`test/frontend_smoke/csp.spec.mjs`:

```js
// Cenário 7 (spec §7.2): roda contra server/ (helmet + CSP real) com broker inalcançável.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test('cenário 7 — CSP do helmet não bloqueia nada e broker fora aparece como falha', async ({ page }) => {
  const violacoes = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(m.text())) violacoes.push(m.text());
  });
  const erros = coletarErros(page);

  await page.goto('/#/arquitetura');
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', '3d');
  await expect(page.locator('#arq-modo')).toHaveText('Modo 1 · Mosquitto local');
  await expect(page.locator('button.arq-rotulo[data-no="servidor"]')).toHaveAttribute('data-estado', 'falha');
  await expect(page.locator('#arc-led')).toHaveAttribute('data-estado', 'falha');

  await page.locator('button.arq-rotulo[data-no="servidor"]').click();
  await page.locator('button.arq-link-enlace[data-enlace="mqtt-servidor"]').click();
  await expect(page.locator('#arq-detalhes .arq-estado').first()).toHaveAttribute('data-estado', 'falha');
  await expect(page.locator('#arq-detalhes')).toContainText('GET /api/status');

  // O painel principal também carrega sem violações sob a CSP.
  await page.locator('a.seletor-tecla[href="#/"]').click();
  await expect(page.locator('#btn-solicitar-a')).toBeVisible();

  expect(violacoes, violacoes.join('\n')).toEqual([]);
  esperarSemErros(erros);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=servidor-sem-broker`
Expected: passa. Se houver violação de CSP, corrigir **o frontend** (nunca afrouxar a CSP em `server/`, que está fora do escopo).

- [ ] **Step 2: Cenário 6 (celular 375 × 812)**

`test/frontend_smoke/mobile.spec.mjs`:

```js
// Cenário 6 (spec §7.2): 375 px sem rolagem horizontal, barra inferior e alvos ≥ 44 px.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

const ROTAS = ['#/', '#/status', '#/arquitetura'];

test('cenário 6 — sem rolagem horizontal, seletor como barra inferior, alvos ≥ 44 px', async ({ page }) => {
  const erros = coletarErros(page);
  for (const rota of ROTAS) {
    await page.goto(`/${rota}`);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(0);

    const nav = await page.locator('nav.seletor').boundingBox();
    expect(nav.y + nav.height).toBeGreaterThan(812 - 2); // colada na base da tela
    for (const t of await page.locator('a.seletor-tecla').all()) {
      expect((await t.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  }

  await page.goto('/#/');
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset']) {
    const b = page.locator(`#${id}`);
    await b.scrollIntoViewIfNeeded();
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }

  // Controles da cena recolhidos atrás de um botão.
  await page.goto('/#/arquitetura');
  const abrir = page.locator('.arq-controles-abrir');
  await expect(abrir).toBeVisible();
  await expect(page.locator('#arq-controles-corpo')).toBeHidden();
  await abrir.click();
  await expect(page.locator('#arq-controles-corpo')).toBeVisible();
  await expect(abrir).toHaveAttribute('aria-expanded', 'true');
  esperarSemErros(erros);
});
```

Run: `cd test/frontend_smoke && npx playwright test --project=simulador mobile`
Expected: passa. Se houver rolagem horizontal, corrigir o CSS responsável (sem alterar `id`).

- [ ] **Step 3: Job de CI** — em `.github/workflows/lint-and-security.yaml`, acrescentar ao fim de `jobs:` (mesma indentação dos outros jobs):

```yaml
  frontend-tests:
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
            simulator/package-lock.json
            test/frontend_smoke/package-lock.json

      - name: Instalar dependências (server, simulator, testes E2E)
        run: |
          cd server && npm ci
          cd ../simulator && npm ci
          cd ../test/frontend_smoke && npm ci

      - name: Testes unitários do frontend (node --test)
        run: node --test "test/frontend/*.test.mjs"

      - name: Instalar Chromium (Playwright)
        run: cd test/frontend_smoke && npx playwright install --with-deps chromium

      - name: Testes E2E — botões, navegação, arquitetura, resiliência, celular e CSP
        run: cd test/frontend_smoke && npx playwright test

      - name: Publicar relatório do Playwright
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: test/frontend_smoke/playwright-report/
          retention-days: 7
```

- [ ] **Step 4: Validar o YAML e rodar a suíte completa localmente**

```bash
python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/lint-and-security.yaml', encoding='utf-8')); print('yaml ok')"
node --test "test/frontend/*.test.mjs"
cd test/frontend_smoke && npx playwright test
```

Expected: `yaml ok`; unitários passam; Playwright passa nos dois projetos.

- [ ] **Step 5: Commit**

```bash
git add test/frontend_smoke/csp.spec.mjs test/frontend_smoke/mobile.spec.mjs .github/workflows/lint-and-security.yaml
git commit -m "ci: testes do frontend (unitários + E2E Playwright) em todo push" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Cliente Socket.IO servido pelo próprio servidor (sem dependência de CDN)

> Adicionada após a aprovação do plano, a pedido do usuário. **Ordem de execução:** Tasks 1–11 → **Task 13** → Task 12 (a verificação final vem por último).

Hoje `index.html` carrega `https://cdn.socket.io/4.7.5/socket.io.min.js`. Se o CDN falhar (bancada sem internet, CDN fora), `io` fica indefinido, `app.js` lança na primeira linha e **todos os botões param**. O `socket.io` do servidor e do simulador já serve o cliente em `/socket.io/socket.io.js` (opção `serveClient`, ligada por padrão), na mesma origem. A CSP `scriptSrc 'self'` já cobre isso; `server/` não muda.

**Files:**
- Modify: `frontend/index.html` (tag do Socket.IO)
- Modify: `test/frontend_smoke/resiliencia.spec.mjs`

**Interfaces:**
- Consumes: `roteiroBotoes`, `coletarErros` (Tasks 1 e 10).
- Produces: nenhuma interface nova; `window.io` continua global (script clássico).

- [ ] **Step 1: Teste (falhando)** — acrescentar a `resiliencia.spec.mjs`:

```js
test('cenário 4d — CDN do Socket.IO inacessível: botões funcionam (cliente servido localmente)', async ({ page }) => {
  await page.route('https://cdn.socket.io/**', (r) => r.abort());
  const erros = coletarErros(page, /cdn\.socket\.io/);
  await page.goto('/');
  await expect(page.locator('script[src="/socket.io/socket.io.js"]')).toHaveCount(1);
  await roteiroBotoes(page);
  esperarSemErros(erros);
});
```

Estoque do simulador: este teste consome 1 peça de cada tipo, somando 5 de 5 (botões 1 + 4a/4b/4c 3 + 4d 1). Nenhum outro teste pode solicitar peças depois disso.

Run: `cd test/frontend_smoke && npx playwright test --project=simulador resiliencia`
Expected: 4d FALHA (`io is not defined` / script ausente).

- [ ] **Step 2: Trocar a tag** — em `index.html`, substituir:

```html
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
```

por:

```html
  <!-- Cliente Socket.IO servido pelo próprio servidor/simulador (mesma origem e
       mesma versão do servidor; funciona sem internet na bancada). -->
  <script src="/socket.io/socket.io.js"></script>
```

- [ ] **Step 3: Rodar tudo (os dois projetos)**

Run: `cd test/frontend_smoke && npx playwright test`
Expected: todos passam, inclusive o cenário 7 (CSP do helmet com o script em `'self'`).

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html test/frontend_smoke/resiliencia.spec.mjs
git commit -m "fix(frontend): cliente Socket.IO servido localmente (botões não dependem do CDN)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Verificação final, capturas e texto para a documentação

> Executar **por último**, depois da Task 13.

**Files:**
- Nenhum arquivo versionado novo (capturas ficam em `test/frontend_smoke/capturas/`, ignorado pelo git).

**Interfaces:**
- Consumes: tudo.
- Produces: capturas "depois"; texto de changelog/README para a descrição do PR.

- [ ] **Step 1: Suíte completa limpa**

```bash
node --test "test/frontend/*.test.mjs"
cd test/frontend_smoke && npx playwright test
```

Expected: 0 falhas. Colar a saída no relatório final.

- [ ] **Step 2: Capturas "depois"** — com o simulador rodando (`cd simulator && npm start`, porta 3000):

```bash
cd test/frontend_smoke
for tam in 1920,1080 1366,768 375,812; do
  for rota in "" "#/status" "#/arquitetura"; do
    nome=$(echo "${rota:-principal}" | tr -d '#/')
    npx playwright screenshot --wait-for-timeout=2500 --viewport-size=$tam "http://localhost:3000/$rota" "capturas/depois/${nome:-principal}-${tam/,/x}.png"
  done
done
```

Abrir lado a lado com `capturas/antes/` (Task 1, Step 7b) e conferir: tema preservado (cores, fontes, bays), seletor em destaque, botões com ícones SVG.

- [ ] **Step 3: Verificação manual no navegador embutido** — `http://localhost:3000/#/arquitetura`: órbita, zoom e pan; presets de câmera; clique num tubo abre o detalhe do enlace; Tab/Enter/Esc; alternar Partículas e Rótulos. Depois `http://localhost:3000/`: clicar A, B, C e Reiniciar e ver o histórico em `#/status`.

- [ ] **Step 4: Texto para a documentação (não editar `docs/`)** — preparar, para a descrição do PR, este bloco para o responsável pela documentação incorporar em `docs/CHANGELOG.md` e `frontend/README.md`:

```markdown
### Adicionado
- Vista `#/arquitetura`: diagrama 3D navegável (three.js r169 + OrbitControls) da arquitetura
  (Arduino → ESP32 → Broker → Servidor/Simulador → Dashboard, historiador Beckhoff), com status
  ao vivo de cada conexão a partir dos sinais já existentes (Socket.IO, LWT do gateway,
  GET /api/status). Enlaces sem telemetria aparecem como "inferido" ou "não monitorado".
  Fallback 2D automático sem WebGL.
- Seletor de vistas fixo (barra inferior no celular) com contador de eventos (LOG) e LED de
  conexões (ARC); atalhos para a arquitetura no mímico e nas células Enlace/Gateway.
- Testes: unitários (`node --test "test/frontend/*.test.mjs"`) e E2E Playwright
  (`test/frontend_smoke/`), incluindo a proteção dos botões Solicitar A/B/C e Reiniciar;
  job `frontend-tests` no CI.

### Alterado
- Botões de controle com ícones SVG (sem emoji) e aviso quando estão desabilitados.
- `--muted` com contraste 4,5:1; ligação dos botões protegida contra elementos ausentes.
- Cliente Socket.IO passa a vir do próprio servidor (`/socket.io/socket.io.js`) em vez do CDN:
  o dashboard e os botões funcionam sem internet na bancada.

### Removido
- Link de rodapé "Equipamentos & histórico" e botão "← Painel principal" (substituídos pelo seletor).
```

E, para `frontend/README.md`, a linha de rotas passa a ser: `#/` (painel), `#/status` (equipamentos e histórico) e `#/arquitetura` (arquitetura 3D); a estrutura ganha `js/arquitetura-*.js`, `js/seletor.js`, `js/ambiente3d.js`, `vendor/OrbitControls.js` e `vendor/CSS2DRenderer.js`.

- [ ] **Step 5: Encerrar o branch** — seguir `superpowers:finishing-a-development-branch` (PR para `main`; sem merge automático).
