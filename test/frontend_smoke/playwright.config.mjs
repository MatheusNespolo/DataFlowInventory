// ============================================================
// DATA FLOW INVENTORY — Configuração dos testes E2E (Playwright)
// ------------------------------------------------------------
// Projeto "simulador": sobe ../../simulator na porta 3100 (sem helmet).
// Projeto "servidor-sem-broker": sobe ../../server na porta 3101 com broker
// inalcançável; projetos api-status separam os contratos 404 (simulador) e
// 503 (servidor) sem reaproveitar o mesmo arquivo contra a URL errada.
// Projeto "simulador-sem-estoque": outro simulador (porta 3102) com
// ESTOQUE_INICIAL=1, só para o cenário sem_estoque.
// ============================================================
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs/,
  // O simulador é stateful (estoque inicial = 15 por peça); manter testes em série.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  maxFailures: 3,
  // Carga da página (~9 s) + roteiros com entrega simulada: margem para CI sem globalTimeout.
  timeout: 90_000,
  // Máquina de bancada/CI sob carga: asserções com folga.
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
    // Headless sem GPU: força o WebGL por software (SwiftShader) para a cena 3D.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'simulador', testIgnore: /(csp|sem-estoque|api-status)\.spec\.mjs/, use: { baseURL: 'http://localhost:3100' } },
    { name: 'servidor-sem-broker', testMatch: /csp\.spec\.mjs/, use: { baseURL: 'http://localhost:3101' } },
    { name: 'api-status-simulador', testMatch: /api-status\.spec\.mjs/, grep: /simulador não expõe/, use: { baseURL: 'http://localhost:3100' } },
    { name: 'api-status-servidor', testMatch: /api-status\.spec\.mjs/, grepInvert: /simulador não expõe/, use: { baseURL: 'http://localhost:3101' } },
    // Simulador dedicado com 1 peça por tipo: o caso sem_estoque não gasta o estoque do principal.
    { name: 'simulador-sem-estoque', testMatch: /sem-estoque\.spec\.mjs/, use: { baseURL: 'http://localhost:3102' } },
  ],
  webServer: [
    {
      command: 'node ../../simulator/server.js',
      url: 'http://localhost:3100',
      env: { PORT: '3100' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node ../../simulator/server.js',
      url: 'http://localhost:3102',
      env: { PORT: '3102', ESTOQUE_INICIAL: '1' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node ../../server/server.js',
      url: 'http://localhost:3101',
      env: {
        PORT: '3101',
        ALLOWED_ORIGIN: 'http://localhost:3101',
        MQTT_BROKER_URL: 'mqtt://127.0.0.1',
        MQTT_PORT: '1',          // porta fechada → broker sempre inalcançável
        MQTT_USERNAME: '',
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
