// ============================================================
// DATA FLOW INVENTORY — Configuração dos testes E2E (Playwright)
// ------------------------------------------------------------
// Projeto "simulador": sobe ../../simulator na porta 3100 (sem helmet).
// Projeto "servidor-sem-broker": sobe ../../server na porta 3101 com um
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
  // Carga da página (~9 s) + roteiro dos botões (~30 s) + navegação: margem para CI.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'simulador', testIgnore: /csp\.spec\.mjs/, use: { baseURL: 'http://localhost:3100' } },
    { name: 'servidor-sem-broker', testMatch: /csp\.spec\.mjs/, use: { baseURL: 'http://localhost:3101' } },
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
