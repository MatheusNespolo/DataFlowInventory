# Roteiro de Testes — Semana 12 (03–06/11/2026)

> **Estado da bancada (03/11/2026):** as esteiras **A e B estão montadas na base** e aprovadas (A: 10 entregas em 28/10, 4650–5000 ms; em 29–30/10, 10 entregas de cada esteira, A e B, entre 5000 e 6000 ms). O **display OLED chegou** em 03/11 e as **peças impressas em 3D** serão usadas pela primeira vez nesta semana. Esta semana recebe tudo o que não foi executado na [Semana 11](semana_11_26-30_outubro.md): esteira C na base, integração total, peças 3D, separador automático no hardware e o reteste do display. Segunda-feira (02/11) foi feriado (Finados). Estado completo e histórico em [`resultados.md`](../resultados.md).

> **Atualização de estado (05/11/2026):** com `SEPARADOR_PASSOS_POR_VOLTA` 4076 (`99786b7`), **a volta do separador fecha na marca** e a roda se prepara **a tempo de receber as peças**. Os tempos de cada esteira foram medidos em 04/11 (Bloco 2). Hoje: acabamento da elétrica e fixação da roda separadora no motor de passo. Para finalizar, falta o acabamento da base e dos cabos.

| Item | Status (05/11/2026) | Origem |
|---|---|---|
| Esteira A na base | ✅ Aprovado | Semana 11, 28/10 |
| Esteira B na base | ✅ Aprovado | Semana 11, 29–30/10 |
| Esteira C na base | ✅ Aprovado (03/11) | 10 entregas, 4103–5069 ms |
| Integração A+B+C na base | ⬜ Pendente | transferido da Semana 11 |
| Fixação da roda separadora no motor de passo | 🔄 Em andamento (05/11) | transferido da Semana 11 |
| Peça impressa em 3D percorrendo as esteiras | ⬜ Pendente | transferido da Semana 11 |
| Separador em modo automático no hardware | ✅ Aprovado (04/11) | giro corrigido com 4076 passos por volta (`99786b7`): a volta fecha e a roda chega a tempo; ver Bloco 4 |
| Tempos por esteira na base | ✅ Medido (04/11) | A 5513 ms, B 4437 ms, C 4086 ms; ver Bloco 2 |
| Acabamento da elétrica | 🔄 Em andamento (05/11) | — |
| Acabamento da base e dos cabos | ⬜ Pendente | etapa final |
| Display OLED (reteste B3) | ✅ Aprovado (03/11) | testado com sucesso na bancada |

## Objetivos

1. Montar a esteira C na base e aprová-la como A e B, sem mudar o comportamento calibrado.
2. Medir o tempo de entrega de cada esteira na base, separadamente, para comparar com a calibração de 21/10.
3. Fazer a integração total A+B+C na base, com pedidos alternados e em sequência, sem reinício do Uno.
4. Validar as peças impressas em 3D e o separador em modo automático no hardware.
5. Retestar o display com o OLED (item B3 do [plano de testes](../plano_de_testes.md)).

## Cronograma

| Data | Atividade | Saída esperada | Status |
|---|---|---|---|
| **02/11 (seg.)** | Feriado (Finados). | — | — |
| **03/11 (ter.)** | Montagem da esteira C na base e teste individual. | C com ≥ 5 entregas sem falha e tempos registrados. | ✅ C integrada: 10 entregas, 4103–5069 ms. Display OLED testado com sucesso. Separador: gira menos que o esperado (em diagnóstico) |
| **04/11 (qua.)** | Tempos por esteira e integração A+B+C na base. | Tabela de tempos por esteira; sequência alternada estável. | ✅ Tempos medidos (A 5513, B 4437, C 4086 ms); separador corrigido. Integração A+B+C: resultado a registrar |
| **05/11 (qui.)** | Peças 3D e separador em modo automático. | Roda encaixada e alinhada; peça passando pelos sensores; roda no compartimento certo. | 🔄 Acabamento da elétrica e fixação da roda no motor de passo |
| **06/11 (sex.)** | Display OLED (B3), integração total final e fechamento. | Evidência final registrada em `resultados.md`. | ⬜ |

> ⚠️ A ordem pode mudar conforme a disponibilidade da bancada e das peças. O que não for executado fica como **pendente**, sem presumir aprovação.

---

## Bloco 1 — esteira C na base

Mesmo procedimento usado para A e B na Semana 11 (Bloco 2 do [roteiro anterior](semana_11_26-30_outubro.md)): montar, conferir alinhamento, sensores e fiação, e repetir pelo menos 5 entregas sem falha, sem mudar firmware nem parâmetros.

| Esteira | Resultado | Tempo de entrega | Ciclos | Falhas | Observações |
|---|---|---:|---:|---|---|
| C | ✅ Aprovado (03/11) | 4103–5069 ms | 10 | nenhuma relatada | Montada na base e integrada com sucesso. Amostras: 4652, 4230, 4103, 4365 e 5069 ms; dentro da calibração de 21/10 (~4530 ms) |

**Critério de saída:** [ ] C fixada na base sem tensão mecânica · [ ] ≥ 5 entregas sem falha · [ ] tempo registrado e comparado com a calibração de 21/10 (C: ~4530 ms).

---

## Bloco 2 — tempos por esteira na base

Na Semana 11, as entregas de A e B em 29–30/10 ficaram entre 5000 e 6000 ms (intervalo registrado em conjunto), acima dos 4650–5000 ms da A em 28/10. Medir cada esteira **separada**, na base, com a mesma peça:

| Esteira | Calibração (21/10) | Na base (Semana 11) | Na base (Semana 12) | Ciclos | Observações |
|---|---:|---:|---:|---:|---|
| A | ~4950 ms | 4650–5000 ms (28/10); 5000–6000 ms (29–30/10, com B) | 5513 ms (04/11) | não informados | A mais lenta das três; cerca de 560 ms acima da calibração |
| B | — | 5000–6000 ms (com A, em conjunto) | 4437 ms (04/11) | não informados | Primeiro tempo da B isolada |
| C | ~4530 ms | — | 4103–5069 ms (03/11); 4086 ms (04/11) | 10 (03/11) | Dentro do esperado |

**Critério de saída:** [x] tempo de cada esteira registrado · [ ] diferença em relação à calibração explicada (atrito da montagem, peça, alimentação) ou aceita como nova referência.

---

## Bloco 3 — integração total A+B+C na base

- [ ] Sequência alternada A → B → C repetida, sem reinício inesperado do Uno (sem `inicio` no meio).
- [ ] Pedidos em sequência rápida: o segundo pedido é recusado como `ocupado` enquanto o primeiro não termina.
- [ ] Estoque correto no dashboard depois do ciclo.
- [ ] Um erro forçado (retirar a peça antes da junção) gera `timeout` e o reset recupera.

**Critério de saída:** [ ] integração total concluída com logs e sequência de eventos registrados · [ ] falhas classificadas como pendência ou ajuste de bancada.

---

## Bloco 4 — peças 3D e separador automático

Itens do Bloco 4 da Semana 11 e do card [#65](https://github.com/MatheusNespolo/DataFlowInventory/issues/65):

- [ ] Roda encaixada no eixo do 28BYJ-48, sem folga nem deslizamento.
- [ ] `CMD:SEP:A|B|C|0` leva cada compartimento à posição de recebimento.
- [x] Modo automático: em pedidos reais, a roda chega ao compartimento antes da peça (04/11).
- [ ] A peça impressa percorre topo → junção → esteira principal sem enroscar e aciona os sensores.
- [ ] Medir o tempo da peça entre a junção e o fim da esteira principal (define `SEPARADOR_ESPERA_APOS_ENTREGA_MS`).

> **Observação (03/11):** a roda se move, mas aparenta **girar menos que o esperado**. O firmware conta cada passo que emite (um `loop()` atrasado só deixa a roda mais lenta, sem reduzir o ângulo), então a causa está entre: (1) **passos perdidos** sob carga (roda impressa, atrito, velocidade de 10 RPM, alimentação de 5 V fraca ou compartilhada com os motores DC); (2) **passos por volta diferentes** dos 2038 configurados (outra redução do motor); (3) **expectativa ou geometria**: a roda sempre vai pelo caminho mais curto, no máximo 120° por pedido, e os compartimentos impressos podem não estar a 120°. Diagnóstico abaixo.

#### Diagnóstico do giro (fazer nesta ordem)

1. **Marca de referência:** faça um risco na roda e outro na base, com a roda no neutro; ligue o Uno com ela assim (não há sensor de referência).
2. **Sem a roda (só o eixo com uma fita):** `CMD:SEP:A` deve girar exatamente **1/3 de volta (120°)**; `CMD:SEP:0` volta à marca. Repita 5 vezes.
3. **Com a roda:** repita o passo 2.

| Situação | Causa provável | Ajuste |
|---|---|---|
| Sem a roda gira 120° e volta à marca; **com** a roda gira menos e a marca **se desloca** a cada ciclo | Passos perdidos sob carga | Baixar `SEPARADOR_RPM` (10 → 6); fonte de 5 V própria com ≥ 500 mA e GND comum; reduzir atrito/excentricidade da roda |
| Gira menos que 120° mesmo **sem** a roda, mas **sempre volta exatamente à marca** | Passos por volta errados (outra redução) | Corrigir `SEPARADOR_PASSOS_POR_VOLTA` na proporção: 2038 × 120 ÷ ângulo medido |
| Gira 120° e volta à marca, com e sem a roda | Firmware e motor corretos | Ajustar `SEPARADOR_GRAUS_A/B/C` à posição real dos compartimentos da roda impressa |

Registrar: ângulo medido em cada situação, se a marca se desloca, e a fonte usada.

> **Atualização (04/11):** o motor de passo tem **fonte de 12 V dedicada**. Com mudanças na elétrica e no firmware, inclusive `SEPARADOR_RPM` 10 → 5 (`c54776c`), a roda continua girando cerca de **metade** do esperado. Um fator fixo de 2 que não muda com a velocidade **não é perda de passos** (ela piora com a velocidade e não é constante): é uma relação fixa entre os passos e o ângulo da roda. O próximo teste separa onde ela está.

#### Teste do eixo × roda (decisivo para o fator 2)

1. Prenda uma fita em bandeira no **eixo do motor** e faça uma marca na **roda**; as duas alinhadas com uma marca na base, com a roda no neutro e o Uno ligado assim.
2. Pelo Serial Monitor: `CMD:SEP:A`, depois `CMD:SEP:B`, depois `CMD:SEP:0`. Cada um avança 120° no mesmo sentido: juntos, **uma volta completa**.
3. Observe a fita do **eixo** e a marca da **roda** separadamente.

| Eixo do motor | Roda | Causa | Ajuste |
|---|---|---|---|
| Dá **meia volta** | Acompanha o eixo | O motor precisa do **dobro de passos por volta** (4076 em vez de 2038): outra versão do 28BYJ-48 ou acionamento equivalente a meio passo | Em `config.h`: `SEPARADOR_PASSOS_POR_VOLTA` 4076 e `SEPARADOR_PASSOS_BIBLIOTECA` 4096 (os dois juntos; a biblioteca precisa ser ≥ e múltipla de 4) |
| Dá **uma volta completa** | Dá meia volta | Transmissão entre o eixo e a roda: engrenagens/polias 2:1 na peça impressa, ou o eixo **patinando** no furo da roda | Se houver redução, multiplicar `SEPARADOR_PASSOS_POR_VOLTA` pela relação; se patina, corrigir o encaixe (furo em D do eixo) |
| Treme, zumbe ou anda e volta | — | Sequência das fases fora de ordem (fiação IN1–IN4 ≠ pinos 5–8 em ordem direta) | Fiação direta IN1→5, IN2→6, IN3→7, IN4→8 (o firmware já troca a ordem internamente) |

> ✅ **Resolvido (04/11):** com `SEPARADOR_PASSOS_POR_VOLTA` 4076 e `SEPARADOR_PASSOS_BIBLIOTECA` 4096 (`99786b7`), a volta completa fecha na marca e a roda se prepara a tempo de receber as peças. O valor é o medido em bancada; a origem física do fator 2 (versão do motor ou transmissão) não foi identificada.

**Critério de saída:** [ ] peça e roda operam sem interferência · [ ] ajustes de impressão, tolerância ou ângulo registrados.

---

## Bloco 5 — display OLED (reteste B3)

Procedimento no item B3 do [plano de testes](../plano_de_testes.md): conferir a ordem dos pinos antes de ligar, `lcd_end` = 60 e `i2c_n` ≥ 1 no `status`, as telas e a faixa de ícones acompanhando a FSM.

---

## Fechamento e evidências

Registrar ao fim de cada dia, conforme o [mapa da documentação](../../README.md):

- resultados em [`resultados.md`](../resultados.md) (estado atual, registro e diário);
- uma entrada curta no [`CHANGELOG.md`](../../CHANGELOG.md), em `[Não publicado]`;
- comentário nos cards [#1](https://github.com/MatheusNespolo/DataFlowInventory/issues/1) (montagem), [#65](https://github.com/MatheusNespolo/DataFlowInventory/issues/65) (peças 3D) e [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66) (integração total).

Marcar cada item como **aprovado**, **falhou**, **bloqueado** ou **não executado**.
