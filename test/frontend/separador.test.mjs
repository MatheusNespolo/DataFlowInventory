// Testes da roda do separador no diagrama (js/separador.js). Socket, relógio e
// agendador de quadros são falsos: nada depende de navegador nem de three.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAUS, GRAUS_POR_SEGUNDO, avancar, criarSeparador, destinoPorStatus, menorCaminho, normalizar,
} from '../../frontend/js/separador.js';

function socketFalso() {
  const handlers = {};
  return {
    on(evt, fn) { (handlers[evt] ||= []).push(fn); },
    emitir(evt, dado) { (handlers[evt] || []).forEach((fn) => fn(dado)); },
  };
}

// Relógio + fila de quadros controlados pelo teste (um "requestAnimationFrame" falso).
function quadrosFalsos() {
  let t = 0;
  let proximoId = 0;
  const fila = [];
  return {
    agora: () => t,
    agendar: (fn) => { fila.push([++proximoId, fn]); return proximoId; },
    cancelar: (id) => { const i = fila.findIndex(([x]) => x === id); if (i >= 0) fila.splice(i, 1); },
    pendentes: () => fila.length,
    // Roda quadros de `passoMs` até a fila esvaziar (ou o limite); devolve o tempo gasto.
    ate(passoMs = 16, limiteMs = 20000) {
      const inicio = t;
      while (fila.length && t - inicio < limiteMs) {
        t += passoMs;
        const [, fn] = fila.shift();
        fn();
      }
      return t - inicio;
    },
    um(passoMs = 16) { t += passoMs; const [, fn] = fila.shift(); fn(); },
  };
}

function montar(extra = {}) {
  const socket = socketFalso();
  const q = quadrosFalsos();
  const sep = criarSeparador({ socket, agendar: q.agendar, cancelar: q.cancelar, agora: q.agora, ...extra });
  return { socket, q, sep };
}

// ---- Regra de destino (espelha separadorAutoDestino do firmware) ----------------

test('destino: só um pedido aprovado (ACIONANDO ou ENTREGANDO) move a roda', () => {
  assert.equal(destinoPorStatus('AGUARDANDO_PEDIDO', 0), null);
  assert.equal(destinoPorStatus('VERIFICANDO_ESTOQUE', 2), null); // ainda checando
  assert.equal(destinoPorStatus('ERRO', 2), null);                // pedido recusado
  assert.equal(destinoPorStatus('ACIONANDO_ESTEIRA', 1), 'A');
  assert.equal(destinoPorStatus('ENTREGANDO_PECA', 2), 'B');
  assert.equal(destinoPorStatus('ENTREGANDO_PECA', 3), 'C');
  assert.equal(destinoPorStatus('ENTREGANDO_PECA', 0), null);     // sem peça
  assert.equal(destinoPorStatus('ENTREGANDO_PECA', 4), null);     // peça inválida
  assert.equal(destinoPorStatus('ENTREGANDO_PECA', undefined), null);
  assert.equal(destinoPorStatus(undefined, 2), null);
});

test('ângulos dos compartimentos: iguais aos do firmware (A 120°, B 240°, C e neutro 0°)', () => {
  assert.deepEqual({ ...GRAUS }, { A: 120, B: 240, C: 0, neutro: 0 });
  assert.equal(GRAUS_POR_SEGUNDO, 60); // 10 RPM
});

// ---- Caminho mais curto (igual ao separadorDelta do firmware) -------------------

test('menorCaminho: sentido e empate como no firmware', () => {
  assert.equal(menorCaminho(0, 120), 120);
  assert.equal(menorCaminho(0, 240), -120);   // B pelo outro lado
  assert.equal(menorCaminho(240, 120), -120);
  assert.equal(menorCaminho(120, 240), 120);
  assert.equal(menorCaminho(350, 10), 20);    // passa pelo zero
  assert.equal(menorCaminho(10, 350), -20);
  assert.equal(menorCaminho(0, 180), 180);    // empate: sentido positivo
  assert.equal(menorCaminho(90, 90), 0);
  assert.equal(normalizar(-120), 240);
  assert.equal(normalizar(480), 120);
});

test('avancar: anda pelo caminho mais curto e não passa do alvo', () => {
  assert.equal(avancar(0, 120, 0.5), 30);
  assert.equal(avancar(0, 240, 0.5), 330);          // indo para trás
  assert.equal(avancar(100, 120, 1), 120);          // chega e para
  assert.equal(avancar(5, 0, 1), 0);                // não ultrapassa o neutro
  assert.equal(avancar(0, 120, 0), 0);              // dt = 0: parado
});

// ---- Controlador -------------------------------------------------------------------

test('um pedido de B gira a roda 120° para trás, a 60°/s, e ela fica em 240°', () => {
  const { socket, q, sep } = montar();
  assert.deepEqual({ ...sep.estado }, { destino: null, alvo: 0, graus: 0, movendo: false });

  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 2 });
  assert.equal(sep.estado.destino, 'B');
  assert.equal(sep.estado.alvo, 240);
  assert.equal(sep.estado.movendo, true);

  q.um(); // primeiro quadro: sem tempo decorrido, ainda parado
  q.um(500);
  assert.ok(sep.estado.graus < 360 && sep.estado.graus > 240, 'vai pelo caminho mais curto (para trás)');

  const gasto = q.ate();
  assert.equal(sep.estado.graus, 240);
  assert.equal(sep.estado.movendo, false);
  assert.ok(gasto >= 1400 && gasto <= 1700, `levou ${gasto} ms para o resto de 120° a 60°/s`);
  assert.equal(q.pendentes(), 0);

  // A entrega termina e o firmware volta a aguardar: a roda FICA em B.
  socket.emitir('status', { estado: 'ENTREGANDO_PECA', pecaSolicitada: 2 });
  socket.emitir('status', { estado: 'AGUARDANDO_PEDIDO', pecaSolicitada: 0 });
  assert.equal(sep.estado.graus, 240);
  assert.equal(sep.estado.destino, 'B');
  assert.equal(q.pendentes(), 0);
});

test('o status se repete a cada segundo: a mesma peça não reinicia nem trava a roda', () => {
  const { socket, q, sep } = montar();
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 1 });
  q.ate(16, 600);
  const meio = sep.estado.graus;
  socket.emitir('status', { estado: 'ENTREGANDO_PECA', pecaSolicitada: 1 }); // mesma peça
  assert.equal(sep.estado.graus, meio);
  assert.equal(sep.estado.movendo, true);
  q.ate();
  assert.equal(sep.estado.graus, 120);
});

test('sequência B → A → C: cada pedido leva a roda ao caminho mais curto', () => {
  const { socket, q, sep } = montar();
  const pedir = (peca) => {
    socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: peca });
    q.ate();
    socket.emitir('status', { estado: 'AGUARDANDO_PEDIDO', pecaSolicitada: 0 });
  };
  pedir(2); assert.equal(sep.estado.graus, 240);
  pedir(1); assert.equal(sep.estado.graus, 120);
  pedir(3); assert.equal(sep.estado.graus, 0);
  pedir(1); assert.equal(sep.estado.graus, 120);
  pedir(2); assert.equal(sep.estado.graus, 240);
});

test('pedido recusado ou ainda em checagem não move a roda', () => {
  const { socket, q, sep } = montar();
  socket.emitir('status', { estado: 'VERIFICANDO_ESTOQUE', pecaSolicitada: 3 });
  socket.emitir('status', { estado: 'ERRO', pecaSolicitada: 3 });
  assert.equal(sep.estado.destino, null);
  assert.equal(sep.estado.movendo, false);
  assert.equal(q.pendentes(), 0);
});

test('novo pedido no meio do giro muda o alvo a partir de onde a roda está', () => {
  const { socket, q, sep } = montar();
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 1 }); // A: 120°
  q.um();
  q.um(1000);                                                                   // ~60°
  const meio = sep.estado.graus;
  assert.ok(meio > 50 && meio < 70);
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 3 }); // C: volta a 0°
  q.ate();
  assert.equal(sep.estado.graus, 0);
  assert.equal(sep.estado.destino, 'C');
});

test('o Uno reiniciou (evento inicio): a roda volta a ser SUPOSTA no neutro, sem animação', () => {
  const { socket, q, sep } = montar();
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 2 });
  q.um(); q.um(400);
  socket.emitir('evento', { evento: 'inicio', versao: '3.0' });
  assert.deepEqual({ ...sep.estado }, { destino: null, alvo: 0, graus: 0, movendo: false });
  assert.equal(q.pendentes(), 0, 'o quadro agendado foi cancelado');
  // Outro evento qualquer não mexe na roda.
  socket.emitir('evento', { evento: 'entrega', peca: 'B' });
  assert.equal(sep.estado.graus, 0);
  // E o próximo pedido de B volta a girar (destino foi esquecido).
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 2 });
  assert.equal(sep.estado.movendo, true);
});

test('página aberta no meio de um pedido (estado_inicial): a roda já busca o compartimento', () => {
  const { socket, q, sep } = montar();
  socket.emitir('estado_inicial', { status: { estado: 'ENTREGANDO_PECA', pecaSolicitada: 1 }, eventos: [] });
  assert.equal(sep.estado.destino, 'A');
  q.ate();
  assert.equal(sep.estado.graus, 120);
  // Reconexão com o sistema parado: não mexe.
  socket.emitir('estado_inicial', { status: { estado: 'AGUARDANDO_PEDIDO', pecaSolicitada: 0 } });
  assert.equal(sep.estado.graus, 120);
  // Mensagens malformadas são ignoradas.
  socket.emitir('estado_inicial', {});
  socket.emitir('status', null);
  socket.emitir('evento', undefined);
  assert.equal(sep.estado.graus, 120);
});

test('prefers-reduced-motion: a roda vai direto ao destino, sem quadros', () => {
  const { socket, q, sep } = montar({ semMovimento: true });
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 2 });
  assert.equal(sep.estado.graus, 240);
  assert.equal(sep.estado.movendo, false);
  assert.equal(q.pendentes(), 0);
});

test('ouvintes são avisados a cada mudança e podem sair', () => {
  const { socket, q, sep } = montar();
  const vistos = [];
  const sair = sep.aoMudar((e) => vistos.push([e.graus, e.movendo]));
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 1 });
  q.ate();
  assert.ok(vistos.length >= 3);
  assert.deepEqual(vistos.at(-1), [120, false]);
  sair();
  const n = vistos.length;
  socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 3 });
  q.ate();
  assert.equal(vistos.length, n);
  // Um ouvinte que lança não derruba os outros nem a roda.
  sep.aoMudar(() => { throw new Error('falha de proposito'); });
  const outro = [];
  sep.aoMudar((e) => outro.push(e.graus));
  const log = console.error; console.error = () => {};
  try { socket.emitir('status', { estado: 'ACIONANDO_ESTEIRA', pecaSolicitada: 2 }); q.ate(); } finally { console.error = log; }
  assert.equal(outro.at(-1), 240);
});
