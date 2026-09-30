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
