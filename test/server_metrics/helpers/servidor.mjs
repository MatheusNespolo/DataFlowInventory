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
  let ultimoErro;
  // Corrida de porta livre: se o filho encerrar antes de responder (ex.: EADDRINUSE), tenta outra porta.
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
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
        const r = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(3000) });
        return r.status > 0;
      }, { timeoutMs: 30000, descricao: 'o servidor responder em /api/status' });
    } catch (err) {
      filho.kill();
      ultimoErro = new Error(`${err.message}
--- log do servidor ---
${log}`);
      if (encerrou && tentativa < 3) continue;
      throw ultimoErro;
    }

    return montar({ filho, url, porta, getLog: () => log, encerrou: () => encerrou });
  }
  throw ultimoErro;
}

function montar({ filho, url, porta, getLog, encerrou }) {
  return {
    url,
    porta,
    get log() { return getLog(); },
    async metricas() {
      const r = await fetch(`${url}/metrics`, { signal: AbortSignal.timeout(3000) });
      return { status: r.status, tipo: r.headers.get('content-type'), texto: await r.text() };
    },
    async texto() {
      return (await this.metricas()).texto;
    },
    async status() {
      const r = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(3000) });
      return { status: r.status, corpo: await r.json() };
    },
    async parar() {
      if (encerrou()) return;
      filho.kill();
      await new Promise((resolve) => {
        filho.once('exit', resolve);
        setTimeout(resolve, 3000).unref();
      });
    },
  };
}
