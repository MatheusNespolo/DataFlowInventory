# Roteiro de Testes — Semana 12 (03–06/11/2026)

> **Estado da bancada (03/11/2026):** as esteiras **A e B estão montadas na base** e aprovadas (A: 10 entregas em 28/10, 4650–5000 ms; em 29–30/10, 10 entregas de cada esteira, A e B, entre 5000 e 6000 ms). O **display OLED chegou** em 03/11 e as **peças impressas em 3D** serão usadas pela primeira vez nesta semana. Esta semana recebe tudo o que não foi executado na [Semana 11](semana_11_26-30_outubro.md): esteira C na base, integração total, peças 3D, separador automático no hardware e o reteste do display. Segunda-feira (02/11) foi feriado (Finados). Estado completo e histórico em [`resultados.md`](../resultados.md).

| Item | Status (03/11/2026) | Origem |
|---|---|---|
| Esteira A na base | ✅ Aprovado | Semana 11, 28/10 |
| Esteira B na base | ✅ Aprovado | Semana 11, 29–30/10 |
| Esteira C na base | ✅ Integrada (03/11) | número de entregas e tempos a registrar |
| Integração A+B+C na base | ⬜ Pendente | transferido da Semana 11 |
| Integração com as peças impressas em 3D (roda separadora e peça) | ⬜ Pendente | transferido da Semana 11; ainda não usadas |
| Separador em modo automático no hardware | ⚠️ Em diagnóstico (03/11) | a roda se move, mas aparenta girar menos que o esperado; ver Bloco 4 |
| Display OLED (reteste B3) | ⬜ Pendente | display recebido em 03/11; firmware pronto (PRs #68 e #70) |

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
| **03/11 (ter.)** | Montagem da esteira C na base e teste individual. | C com ≥ 5 entregas sem falha e tempos registrados. | ✅ C integrada com sucesso; entregas e tempos a registrar. Separador: gira menos que o esperado (em diagnóstico) |
| **04/11 (qua.)** | Tempos por esteira e integração A+B+C na base. | Tabela de tempos por esteira; sequência alternada estável. | ⬜ |
| **05/11 (qui.)** | Peças 3D e separador em modo automático. | Roda encaixada e alinhada; peça passando pelos sensores; roda no compartimento certo. | ⬜ |
| **06/11 (sex.)** | Display OLED (B3), integração total final e fechamento. | Evidência final registrada em `resultados.md`. | ⬜ |

> ⚠️ A ordem pode mudar conforme a disponibilidade da bancada e das peças. O que não for executado fica como **pendente**, sem presumir aprovação.

---

## Bloco 1 — esteira C na base

Mesmo procedimento usado para A e B na Semana 11 (Bloco 2 do [roteiro anterior](semana_11_26-30_outubro.md)): montar, conferir alinhamento, sensores e fiação, e repetir pelo menos 5 entregas sem falha, sem mudar firmware nem parâmetros.

| Esteira | Resultado | Tempo de entrega | Ciclos | Falhas | Observações |
|---|---|---:|---:|---|---|
| C | ✅ Integrada (03/11) | a registrar | a registrar |  | Montada na base e integrada com sucesso; número de entregas e tempos serão informados pela equipe |

**Critério de saída:** [ ] C fixada na base sem tensão mecânica · [ ] ≥ 5 entregas sem falha · [ ] tempo registrado e comparado com a calibração de 21/10 (C: ~4530 ms).

---

## Bloco 2 — tempos por esteira na base

Na Semana 11, as entregas de A e B em 29–30/10 ficaram entre 5000 e 6000 ms (intervalo registrado em conjunto), acima dos 4650–5000 ms da A em 28/10. Medir cada esteira **separada**, na base, com a mesma peça:

| Esteira | Calibração (21/10) | Na base (Semana 11) | Na base (Semana 12) | Ciclos | Observações |
|---|---:|---:|---:|---:|---|
| A | ~4950 ms | 4650–5000 ms (28/10); 5000–6000 ms (29–30/10, com B) |  |  |  |
| B | — | 5000–6000 ms (com A, em conjunto) |  |  |  |
| C | ~4530 ms | — |  |  |  |

**Critério de saída:** [ ] tempo de cada esteira registrado · [ ] diferença em relação à calibração explicada (atrito da montagem, peça, alimentação) ou aceita como nova referência.

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
- [ ] Modo automático: em pedidos reais, a roda chega ao compartimento antes da peça.
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

Registrar: ângulo medido em cada situação, se a marca se desloca, e a fonte de 5 V usada.

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
