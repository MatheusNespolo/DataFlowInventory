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
