# Roteiro de Testes — Semana 13 (09–13/11/2026)

> **Estado da bancada (09/11/2026):** as esteiras **A, B e C estão montadas na base** e aprovadas, a integração das três esteiras foi feita sem perda de conexão nem reinício, o **display OLED** foi aprovado e a **roda separadora** está fixada no motor de passo, com giro e posições testados. Esta semana recebe o que não foi concluído na [Semana 12](semana_12_03-06_novembro.md) e vai **até a integração total do projeto**. Estado completo e histórico em [`resultados.md`](../resultados.md).

> **Atualização de estado (12/11/2026):** a **roda separadora foi montada na base**, junto do fim da esteira principal (fotos de 10/11 em [`img/prototipo/`](../../../img/prototipo/)). **Decisão da equipe:** os produtos transportados foram **comprados** prontos, no lugar dos feitos à mão. Falta testá-los em operação. A **integração total do projeto** está prevista para **13/11**. O trabalho foi apresentado no **CONIC** com sucesso.

> **Atualização de estado (13/11/2026):** os produtos comprados foram testados em 12/11. Dois problemas: (1) os produtos **A e C nem sempre passam da esteira secundária para a principal**, o que pede ajuste mecânico; (2) a **roda separadora gira menos que deveria**, e o produto nem sempre cai no compartimento certo, o que pede ajuste fino das configurações com testes empíricos (Bloco 1b). Em 13/11: os dois ajustes e, depois, a integração total **já com o CX9240**.

| Item | Status (13/11/2026) | Origem |
|---|---|---|
| Roda separadora montada na base | ✅ Concluído | fotos de 10/11 |
| Produtos comprados percorrendo as esteiras e caindo na roda | ⚠️ Parcial (12/11) | A e C nem sempre passam para a esteira principal; nem sempre caem no compartimento certo |
| Ajuste mecânico da passagem de A e C para a esteira principal | ⬜ Pendente (13/11) | novo (12/11) |
| Ajuste fino do giro da roda separadora | ⬜ Pendente (13/11) | novo (12/11); ver Bloco 1b |
| Tempo do produto entre a junção e o fim da esteira principal | ⬜ Pendente | transferido da Semana 12 |
| Acabamento da elétrica | ⬜ Pendente | transferido da Semana 12 |
| Acabamento da base e dos cabos | ⬜ Pendente | transferido da Semana 12 |
| Reteste das esteiras depois do acabamento | ⬜ Pendente | novo |
| Integração total do projeto, com o CX9240 | ⬜ Prevista para 13/11, depois dos ajustes | transferido da Semana 12 |
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
| **12/11 (qui.)** | Integração total do projeto (na prática: teste dos produtos). | Sequência completa estável, com ocupado, estoque e erro forçado verificados. | ⚠️ Produtos testados: A e C nem sempre passam para a principal; roda gira menos e erra o compartimento. Integração total adiada para 13/11 |
| **13/11 (sex.)** | Ajuste mecânico de A e C, ajuste fino da roda e integração total com o CX9240. | Produtos passando e caindo no compartimento certo; evidência final em `resultados.md`. | ⬜ |

> ⚠️ A ordem pode mudar conforme a disponibilidade da bancada, mas os produtos devem ser testados **antes** de fechar os cabos: ajustar a altura ou a posição de um sensor é mais fácil com tudo acessível. O que não for executado fica como **pendente**, sem presumir aprovação.

---

## Bloco 1 — produtos comprados

A peça impressa em 3D foi descartada, e os produtos feitos à mão foram substituídos por **produtos comprados** (decisão da equipe, 12/11). A roda separadora impressa continua e já está montada na base. Repetir em cada esteira, com pelo menos 5 entregas por tipo de produto:

- [ ] ⚠️ O produto percorre topo → junção → esteira principal sem enroscar: **B sim; A e C nem sempre passam** da secundária para a principal (12/11) — ajuste mecânico.
- [x] Os sensores de topo e de junção detectam o produto (pulso ≥ 20 ms na junção).
- [ ] ⚠️ O produto cai no compartimento certo da roda: **nem sempre** (12/11) — a roda gira menos que deveria; ver Bloco 1b.
- [ ] Os três tipos de produto (A, B, C) são detectados pelos sensores, apesar de diferenças de tamanho ou de cor.

| Produto / esteira | Resultado | Tempo de entrega | Ciclos | Falhas | Observações |
|---|---|---:|---:|---|---|
| A | ⚠️ Intermitente (12/11) |  |  |  | Nem sempre passa da esteira secundária para a principal; ajuste mecânico |
| B | ✅ Passa (12/11) |  |  |  | Sem problema relatado na passagem para a principal |
| C | ⚠️ Intermitente (12/11) |  |  |  | Nem sempre passa da esteira secundária para a principal; ajuste mecânico |

> Ajuste mecânico de A e C: conferir a altura e o alinhamento do fim de cada secundária em relação à principal (degrau, folga ou rampa onde o produto prende), a tensão das lonas e se o produto comprado é largo ou alto demais para a passagem. Depois do ajuste, repetir ≥ 5 entregas de cada uma. Se a junção passar a confirmar a entrega mas o produto ainda ficar no caminho, o `M3` (3 s de saída) pode precisar de mais tempo; registrar antes de mudar parâmetros.

**Tempo até a roda:** medir o tempo do produto entre a junção e o fim da esteira principal. Hoje `SEPARADOR_ESPERA_APOS_ENTREGA_MS` é 0: em pedidos seguidos, a roda pode sair do compartimento antes de o produto anterior chegar. Se isso acontecer, registrar o tempo medido para a calibração dessa constante.

| Medição | Tempo (ms) | Observações |
|---|---:|---|
| Junção → fim da esteira principal |  |  |

**Critério de saída:** [ ] os três produtos aprovados nas três etapas · [ ] ajustes de sensor registrados · [ ] tempo até a roda registrado.

---

## Bloco 1b — ajuste fino do giro da roda separadora (13/11)

**Sintoma (12/11):** com a roda montada na base, ela gira menos que deveria, e a esteira principal nem sempre entrega o produto no compartimento certo. Em 04/11, com 4076 passos por volta, a volta completa fechava na marca; o que muda agora é a roda montada e em operação. Os testes abaixo separam as causas possíveis, cada uma com o seu ajuste em `config.h`.

**Antes de começar:** o Uno só **supõe** que a roda está no neutro ao ligar (não há sensor de referência). Ligue sempre com a roda no neutro, e repita esse alinhamento depois de qualquer reinício do Uno.

1. **Marcas:** uma na roda, no compartimento do neutro (C), e outra na base, no ponto onde o produto cai da esteira principal.
2. **Volta completa sem pedidos**, pelo Serial Monitor: `CMD:SEP:A` → `CMD:SEP:B` → `CMD:SEP:0`. Repita **5 vezes** sem desligar e anote onde a marca para a cada volta.
3. **Compartimentos:** pare em `CMD:SEP:A` e em `CMD:SEP:B` e veja se o compartimento fica **centrado** sob o ponto de queda.
4. **Pedidos em sequência:** dois pedidos seguidos, e observe se a roda sai do lugar antes de o produto anterior cair.

| Observação | Causa provável | Ajuste em `config.h` |
|---|---|---|
| A marca **vai ficando para trás** a cada volta (o erro cresce) | Passos perdidos: a roda montada tem mais atrito ou peso | `SEPARADOR_RPM` 10 → 8 (ou 6); conferir atrito da roda com a abertura da base |
| A marca para **sempre no mesmo ponto**, antes da posição, em todas as voltas | Passos por volta ainda curtos | `SEPARADOR_PASSOS_POR_VOLTA` = 4076 × 360 ÷ ângulo medido numa volta (ex.: volta de 340° → 4316); manter `SEPARADOR_PASSOS_BIBLIOTECA` ≥ esse valor e múltiplo de 4 |
| A volta fecha, mas um compartimento fica **deslocado** do ponto de queda | Compartimentos da roda impressa fora de 120° ou ponto de queda fora do neutro | Ajustar `SEPARADOR_GRAUS_A`, `SEPARADOR_GRAUS_B` e `SEPARADOR_GRAUS_C` (e `NEUTRO`) aos ângulos reais, em passos de 2–5° |
| Parado, tudo certo; o erro só aparece em **pedidos seguidos** | A roda sai antes de o produto anterior cair (`SEPARADOR_ESPERA_APOS_ENTREGA_MS` é 0) | Medir o tempo junção → queda e usar um valor um pouco maior nessa constante |
| A roda gira para o **lado errado** (A e B trocados) | Sentido invertido | `SEPARADOR_INVERTER_SENTIDO` 1 |

| Teste | Resultado | Ajuste aplicado | Commit |
|---|---|---|---|
| Volta completa × 5 (onde a marca para) |  |  |  |
| Compartimento A centrado |  |  |  |
| Compartimento B centrado |  |  |  |
| Compartimento C / neutro centrado |  |  |  |
| Pedidos seguidos |  |  |  |

Mude **uma constante por vez**, compile e repita os testes; registre o valor final e o commit.

**Critério de saída:** [ ] a volta completa fecha na marca 5 vezes seguidas · [ ] cada compartimento centrado sob o ponto de queda · [ ] produto no compartimento certo em pedidos seguidos.

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

Prevista para 13/11, depois dos ajustes dos Blocos 1 e 1b, **já com o Beckhoff CX9240** registrando os eventos. Reúne o que ficou aberto no Bloco 3 da [Semana 12](semana_12_03-06_novembro.md) e os critérios do card [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66), com tudo montado e com os produtos comprados:

- [ ] Sequência de pedidos A/B/C pelo dashboard, com o separador em modo automático e o produto caindo no compartimento certo.
- [ ] Pedidos em sequência rápida: o segundo pedido é recusado como `ocupado` enquanto o primeiro não termina.
- [ ] Estoque igual no display e no dashboard depois do ciclo.
- [ ] Um erro forçado (retirar o produto antes da junção) gera `timeout`, e o reset recupera.
- [ ] Ciclo de resistência sem reinício do Uno (`inicio` só no boot), com o ESP32 conectado.
- [ ] Giro da roda no diagrama do dashboard acompanha a roda real.
- [ ] Display mostra as telas e a faixa de ícones acompanhando a FSM durante a operação.
- [ ] CX9240 recebe e grava os eventos e o estoque (historiador SQLite), conferido depois do ciclo.
- [ ] Falta de energia dos periféricos: com a fonte desligada, ERRO `sem_energia` e alerta no dashboard (item B4 do [plano de testes](../plano_de_testes.md); card [#80](https://github.com/MatheusNespolo/DataFlowInventory/issues/80), melhoria contínua), inclusive durante uma entrega, sem débito.

**Critério de saída:** [ ] integração total concluída com logs e sequência de eventos registrados · [ ] sistema estável em operação em série · [ ] falhas classificadas como pendência ou ajuste de bancada.

---

## Fechamento e evidências

Registrar ao fim de cada dia, conforme o [mapa da documentação](../../README.md):

- resultados em [`resultados.md`](../resultados.md) (estado atual, registro e diário);
- uma entrada curta no [`CHANGELOG.md`](../../CHANGELOG.md), em `[Não publicado]`;
- fotos da montagem final (pendência do Bloco 1 da [Semana 11](semana_11_26-30_outubro.md)): as de 10/11 estão em [`img/prototipo/`](../../../img/prototipo/); acrescentar fotos depois do acabamento e da integração total;
- comentário nos cards [#1](https://github.com/MatheusNespolo/DataFlowInventory/issues/1) (montagem), [#65](https://github.com/MatheusNespolo/DataFlowInventory/issues/65) (roda separadora e produtos), [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66) (integração total) e [#9](https://github.com/MatheusNespolo/DataFlowInventory/issues/9) (testes do sistema).

Marcar cada item como **aprovado**, **falhou**, **bloqueado** ou **não executado**.
