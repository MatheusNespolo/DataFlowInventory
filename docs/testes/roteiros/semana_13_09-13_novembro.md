# Roteiro de Testes — Semana 13 (09–13/11/2026)

> **Estado da bancada (09/11/2026):** as esteiras **A, B e C estão montadas na base** e aprovadas, a integração das três esteiras foi feita sem perda de conexão nem reinício, o **display OLED** foi aprovado e a **roda separadora** está fixada no motor de passo, com giro e posições testados. Esta semana recebe o que não foi concluído na [Semana 12](semana_12_03-06_novembro.md) e vai **até a integração total do projeto**. Estado completo e histórico em [`resultados.md`](../resultados.md).

> **Atualização de estado (12/11/2026):** a **roda separadora foi montada na base**, junto do fim da esteira principal (fotos de 10/11 em [`img/prototipo/`](../../../img/prototipo/)). **Decisão da equipe:** os produtos transportados foram **comprados** prontos, no lugar dos feitos à mão. Falta testá-los em operação. A **integração total do projeto** está prevista para **13/11**. O trabalho foi apresentado no **CONIC** com sucesso.

| Item | Status (12/11/2026) | Origem |
|---|---|---|
| Roda separadora montada na base | ✅ Concluído | fotos de 10/11 |
| Produtos comprados percorrendo as esteiras e caindo na roda | ⬜ Pendente (13/11) | transferido da Semana 12; produtos comprados no lugar dos feitos à mão |
| Tempo do produto entre a junção e o fim da esteira principal | ⬜ Pendente | transferido da Semana 12 |
| Acabamento da elétrica | ⬜ Pendente | transferido da Semana 12 |
| Acabamento da base e dos cabos | ⬜ Pendente | transferido da Semana 12 |
| Reteste das esteiras depois do acabamento | ⬜ Pendente | novo |
| Integração total do projeto | ⬜ Prevista para 13/11 | transferido da Semana 12 |
| Registro fotográfico da montagem | ✅ Concluído | fotos do protótipo montado na base (10/11), em `img/prototipo/` |
| Apresentação no CONIC | ✅ Concluído | apresentação bem-sucedida; vídeo de teste de bancada na [release de mídia](https://github.com/MatheusNespolo/DataFlowInventory/releases/tag/midia-conic-2026) |

## Objetivos

1. Validar os produtos comprados em cada esteira, nos sensores e na roda separadora, enquanto a fiação ainda está acessível.
2. Concluir o acabamento da elétrica, da base e dos cabos, sem alterar o comportamento já aprovado.
3. Fazer a integração total do projeto: esteiras, separador com a roda fixada, produtos, display e dashboard operando juntos.
4. Registrar a evidência final e encerrar a bancada de testes.

## Cronograma

| Data | Atividade | Saída esperada | Status |
|---|---|---|---|
| **09/11 (seg.)** | Produtos em cada esteira e na roda. | Sensores acionados e produto no compartimento certo, em A, B e C. | ➡️ Roda montada na base; produtos comprados, teste em operação em 13/11 |
| **10/11 (ter.)** | Acabamento da elétrica. | Fiação organizada e conferida; alimentação e GND comum revisados. | ⬜ Não registrado |
| **11/11 (qua.)** | Acabamento da base e dos cabos; reteste das esteiras. | Acabamento concluído; tempos dentro das referências. | ⬜ Não registrado |
| **12/11 (qui.)** | Integração total do projeto. | Sequência completa estável, com ocupado, estoque e erro forçado verificados. | ➡️ Prevista para 13/11. Apresentação no CONIC |
| **13/11 (sex.)** | Fechamento, fotos e registro final. | Evidência final em `resultados.md`; pendências classificadas. | ⬜ |

> ⚠️ A ordem pode mudar conforme a disponibilidade da bancada, mas os produtos devem ser testados **antes** de fechar os cabos: ajustar a altura ou a posição de um sensor é mais fácil com tudo acessível. O que não for executado fica como **pendente**, sem presumir aprovação.

---

## Bloco 1 — produtos comprados

A peça impressa em 3D foi descartada, e os produtos feitos à mão foram substituídos por **produtos comprados** (decisão da equipe, 12/11). A roda separadora impressa continua e já está montada na base. Repetir em cada esteira, com pelo menos 5 entregas por tipo de produto:

- [ ] O produto percorre topo → junção → esteira principal sem enroscar.
- [ ] Os sensores de topo e de junção detectam o produto (pulso ≥ 20 ms na junção).
- [ ] O produto cai no compartimento certo da roda.
- [ ] Os três tipos de produto (A, B, C) são detectados pelos sensores, apesar de diferenças de tamanho ou de cor.

| Produto / esteira | Resultado | Tempo de entrega | Ciclos | Falhas | Observações |
|---|---|---:|---:|---|---|
| A |  |  |  |  |  |
| B |  |  |  |  |  |
| C |  |  |  |  |  |

**Tempo até a roda:** medir o tempo do produto entre a junção e o fim da esteira principal. Hoje `SEPARADOR_ESPERA_APOS_ENTREGA_MS` é 0: em pedidos seguidos, a roda pode sair do compartimento antes de o produto anterior chegar. Se isso acontecer, registrar o tempo medido para a calibração dessa constante.

| Medição | Tempo (ms) | Observações |
|---|---:|---|
| Junção → fim da esteira principal |  |  |

**Critério de saída:** [ ] os três produtos aprovados nas três etapas · [ ] ajustes de sensor registrados · [ ] tempo até a roda registrado.

---

## Bloco 2 — acabamento da elétrica

- [ ] Conexões conferidas e fiação organizada, sem contato com partes móveis.
- [ ] Motor de passo (versão de 12 V) em fonte de 12 V dedicada, com **GND comum** ao Uno.
- [ ] ULN2003 ligado em ordem direta: IN1→5, IN2→6, IN3→7, IN4→8.
- [ ] Cabos do I²C (display) e da serial afastados dos cabos dos motores.

**Critério de saída:** [ ] sistema energiza sem reinício (`inicio` só no boot) · [ ] `lcd_quedas` estável com os motores ligados.

---

## Bloco 3 — acabamento da base e dos cabos; reteste

- [ ] Acabamento da base concluído, sem interferir nas esteiras, nos sensores nem na roda.
- [ ] Cabos fixados, sem tensão e sem encostar nas partes móveis.

Depois do acabamento, repetir ao menos 5 entregas por esteira e comparar com as referências medidas na base:

| Esteira | Referência (04/11) | Depois do acabamento | Ciclos | Falhas | Observações |
|---|---:|---:|---:|---|---|
| A | 5513 ms |  |  |  |  |
| B | 4437 ms |  |  |  |  |
| C | 4086 ms |  |  |  |  |

**Critério de saída:** [ ] nenhuma esteira mudou de comportamento · [ ] a volta completa do separador (`CMD:SEP:A`, `CMD:SEP:B`, `CMD:SEP:0`) continua fechando na marca.

---

## Bloco 4 — integração total do projeto

Reúne o que ficou aberto no Bloco 3 da [Semana 12](semana_12_03-06_novembro.md) e os critérios do card [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66), com tudo montado e com os produtos comprados:

- [ ] Sequência de pedidos A/B/C pelo dashboard, com o separador em modo automático e o produto caindo no compartimento certo.
- [ ] Pedidos em sequência rápida: o segundo pedido é recusado como `ocupado` enquanto o primeiro não termina.
- [ ] Estoque igual no display e no dashboard depois do ciclo.
- [ ] Um erro forçado (retirar o produto antes da junção) gera `timeout`, e o reset recupera.
- [ ] Ciclo de resistência sem reinício do Uno (`inicio` só no boot), com o ESP32 conectado.
- [ ] Giro da roda no diagrama do dashboard acompanha a roda real.
- [ ] Display mostra as telas e a faixa de ícones acompanhando a FSM durante a operação.

**Critério de saída:** [ ] integração total concluída com logs e sequência de eventos registrados · [ ] sistema estável em operação em série · [ ] falhas classificadas como pendência ou ajuste de bancada.

---

## Fechamento e evidências

Registrar ao fim de cada dia, conforme o [mapa da documentação](../../README.md):

- resultados em [`resultados.md`](../resultados.md) (estado atual, registro e diário);
- uma entrada curta no [`CHANGELOG.md`](../../CHANGELOG.md), em `[Não publicado]`;
- fotos da montagem final (pendência do Bloco 1 da [Semana 11](semana_11_26-30_outubro.md)): as de 10/11 estão em [`img/prototipo/`](../../../img/prototipo/); acrescentar fotos depois do acabamento e da integração total;
- comentário nos cards [#1](https://github.com/MatheusNespolo/DataFlowInventory/issues/1) (montagem), [#65](https://github.com/MatheusNespolo/DataFlowInventory/issues/65) (roda separadora e produtos), [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66) (integração total) e [#9](https://github.com/MatheusNespolo/DataFlowInventory/issues/9) (testes do sistema).

Marcar cada item como **aprovado**, **falhou**, **bloqueado** ou **não executado**.
