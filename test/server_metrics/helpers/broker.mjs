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
