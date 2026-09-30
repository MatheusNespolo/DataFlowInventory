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
