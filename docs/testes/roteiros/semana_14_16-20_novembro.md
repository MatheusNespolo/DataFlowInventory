# Roteiro de Testes — Semana 14 (16–20/11/2026)

> **Estado da bancada (17/11/2026):** as esteiras A, B e C e a roda separadora estão montadas na base. Em 16/11 a equipe **testou na bancada a detecção da falta de energia dos periféricos** (card [#80](https://github.com/MatheusNespolo/DataFlowInventory/issues/80)) e começou a **calibrar o giro da roda separadora**: com **7 RPM**, na primeira volta todos os produtos caem no compartimento certo, mas a marca da roda vai se afastando da marca da base a cada volta; com **6 RPM**, a roda fica muito fora das posições. Em 17/11: acabamentos e fechamento da calibração. Esta semana recebe o que ficou aberto na [Semana 13](semana_13_09-13_novembro.md). Estado completo e histórico em [`resultados.md`](../resultados.md).

| Item | Status (17/11/2026) | Origem |
|---|---|---|
| Detecção da falta de energia dos periféricos (B4) | ✅ Testada (16/11) | card #80; quedas durante uma entrega sem registro separado |
| Calibração do giro da roda separadora | ⚠️ Em andamento (16–17/11) | Bloco 1b da Semana 13; ver Bloco 1 abaixo |
| Ajuste mecânico da passagem de A e C para a esteira principal | ⬜ Sem registro | transferido da Semana 13 |
| Tempo do produto entre a junção e o fim da esteira principal | ⬜ Pendente | transferido da Semana 13 |
| Acabamento da elétrica, da base e dos cabos | ⬜ Previsto para 17/11 | transferido da Semana 13 |
| Reteste das esteiras depois do acabamento | ⬜ Pendente | transferido da Semana 13 |
| Integração total do projeto, com o CX9240 | ⬜ Pendente | transferido da Semana 13 (card [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66)) |

## Objetivos

1. Fechar a calibração da roda separadora: a marca volta ao lugar em voltas seguidas e o produto cai no compartimento certo em pedidos seguidos.
2. Concluir o acabamento da elétrica, da base e dos cabos, sem alterar o comportamento já aprovado.
3. Fazer a integração total do projeto, com o CX9240, e registrar a evidência final.

## Cronograma

| Data | Atividade | Saída esperada | Status |
|---|---|---|---|
| **16/11 (seg.)** | Teste da falta de energia (B4); calibração da roda com 7 e 6 RPM. | Detecção conferida na bancada; RPM escolhido. | ✅ B4 testado · ⚠️ 7 RPM acerta a 1ª volta, mas a marca se afasta nas seguintes; 6 RPM fica muito fora |
| **17/11 (ter.)** | Acabamentos e fechamento da calibração. | Acabamento concluído; volta fechando na marca 5 vezes seguidas. | ⬜ |
| **18–20/11** | Ajuste de A e C, reteste das esteiras e integração total com o CX9240. | Evidência final em `resultados.md`. | ⬜ |

> ⚠️ A ordem pode mudar conforme a disponibilidade da bancada. O que não for executado fica como **pendente**, sem presumir aprovação.

---

## Bloco 1 — fechamento da calibração da roda separadora

**Configuração em teste** (`config.h`, commit `2a1f775`, 17/11): `SEPARADOR_PASSOS_POR_VOLTA` **4096** (antes 4076) e `SEPARADOR_RPM` **7** (antes 10). `SEPARADOR_PASSOS_BIBLIOTECA` continua 4096.

**Observado em 16/11:**

| RPM | Resultado |
|---:|---|
| 7 | Na primeira volta, todos os produtos caem nos compartimentos certos; nas voltas seguintes, a marca da roda vai se afastando da marca da base |
| 6 | A roda fica muito fora das posições |

**Leitura:** um erro que **cresce a cada volta, sempre no mesmo sentido**, é a assinatura de um **número de passos por volta errado**: ele soma o mesmo desvio em toda volta. A perda de passos costuma ser irregular e depende da carga. Em 04/11, a volta medida fechou com **4076** passos; com **4096** sobram 20 passos por volta (cerca de 1,8°), e o próprio comentário do `config.h` avisa que esse arredondamento desalinha os compartimentos em poucas voltas. Hipótese a confirmar: o 7 RPM resolveu a perda de passos, e o 4096 passou a acumular desvio. O teste abaixo separa as duas coisas, **uma constante por vez**.

**Antes de começar:** ligue o Uno com a roda no neutro (não há sensor de referência), e repita o alinhamento depois de qualquer reinício.

1. **Sentido do desvio**, com 7 RPM e 4096: faça 5 voltas sem pedidos pelo Serial Monitor (`CMD:SEP:A` → `CMD:SEP:B` → `CMD:SEP:0`) e anote, a cada volta, se a marca da roda para **adiantada** (passou da marca da base) ou **atrasada**, e quanto (em graus ou em mm na borda).
2. **Se adiantar** de forma regular: passos por volta demais. Volte para `SEPARADOR_PASSOS_POR_VOLTA` 4076, mantendo 7 RPM, e repita as 5 voltas.
3. **Se atrasar** de forma regular: passos por volta de menos. Ajuste pela fórmula abaixo.
4. **Se o desvio for irregular** (varia de uma volta para outra, ou aparece mais em um trecho): perda de passos. Conferir atrito da roda com a abertura da base e a fixação no eixo, antes de mudar o RPM.
5. Com a volta fechando, conferir os **compartimentos centrados** e os **pedidos seguidos**, como no Bloco 1b da [Semana 13](semana_13_09-13_novembro.md).

**Fórmula do ajuste fino:** com o desvio médio por volta `d` (em graus, positivo se adiantar), `passos novos = passos atuais × 360 ÷ (360 + d)`. Exemplo: com 4096 e a marca adiantando 1,8° por volta, 4096 × 360 ÷ 361,8 ≈ 4076. Manter `SEPARADOR_PASSOS_BIBLIOTECA` ≥ o valor novo e múltiplo de 4.

| Teste | RPM | Passos por volta | Desvio por volta (sentido e tamanho) | Resultado | Commit |
|---|---:|---:|---|---|---|
| 5 voltas (16/11) | 7 | 4096 | cresce a cada volta (sentido e tamanho não registrados) | ⚠️ 1ª volta certa | `2a1f775` |
| 5 voltas (16/11) | 6 | 4096 | muito fora das posições | ❌ | — |
| 5 voltas | 7 | 4096 |  |  |  |
| 5 voltas | 7 | 4076 |  |  |  |
| Compartimentos A, B e C centrados |  |  |  |  |  |
| Pedidos seguidos |  |  |  |  |  |

Ao fechar, atualizar o comentário de `SEPARADOR_PASSOS_POR_VOLTA` e `SEPARADOR_RPM` no `config.h` com o valor final e o motivo.

**Critério de saída:** [ ] a volta completa fecha na marca 5 vezes seguidas · [ ] cada compartimento centrado sob o ponto de queda · [ ] produto no compartimento certo em pedidos seguidos · [ ] valores finais e commit registrados.

---

## Bloco 2 — acabamento e reteste

Itens dos Blocos 2 e 3 da [Semana 13](semana_13_09-13_novembro.md):

- [ ] Fiação organizada, sem contato com partes móveis; motor de passo em fonte de 12 V dedicada, com **GND comum** ao Uno; cabos do I²C e da serial afastados dos cabos dos motores.
- [ ] Acabamento da base e dos cabos, sem interferir nas esteiras, nos sensores nem na roda.
- [ ] Ajuste mecânico da passagem de A e C para a esteira principal, com ≥ 5 entregas de cada.
- [ ] Tempo do produto entre a junção e o fim da esteira principal (para `SEPARADOR_ESPERA_APOS_ENTREGA_MS`).

Depois do acabamento, ≥ 5 entregas por esteira:

| Esteira | Referência (04/11) | Depois do acabamento | Ciclos | Falhas | Observações |
|---|---:|---:|---:|---|---|
| A | 5513 ms |  |  |  |  |
| B | 4437 ms |  |  |  |  |
| C | 4086 ms |  |  |  |  |

**Critério de saída:** [ ] nenhuma esteira mudou de comportamento · [ ] a volta da roda continua fechando na marca · [ ] sistema energiza sem reinício (`inicio` só no boot).

---

## Bloco 3 — integração total do projeto

Com o Bloco 1 fechado, seguir o Bloco 4 da [Semana 13](semana_13_09-13_novembro.md) (critérios do card [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66)), já com o CX9240. A falta de energia (B4) foi testada em 16/11; na integração, basta repetir uma queda **durante uma entrega** e conferir que o estoque não é debitado.

**Critério de saída:** [ ] integração total concluída com logs e sequência de eventos registrados · [ ] sistema estável em operação em série · [ ] falhas classificadas como pendência ou ajuste de bancada.

---

## Fechamento e evidências

Registrar ao fim de cada dia, conforme o [mapa da documentação](../../README.md):

- resultados em [`resultados.md`](../resultados.md) (estado atual, registro e diário);
- uma entrada curta no [`CHANGELOG.md`](../../CHANGELOG.md), em `[Não publicado]`;
- fotos depois do acabamento e da integração total, em [`img/prototipo/`](../../../img/prototipo/);
- comentário nos cards [#65](https://github.com/MatheusNespolo/DataFlowInventory/issues/65) (roda separadora e produtos), [#66](https://github.com/MatheusNespolo/DataFlowInventory/issues/66) (integração total), [#80](https://github.com/MatheusNespolo/DataFlowInventory/issues/80) (falta de energia) e [#9](https://github.com/MatheusNespolo/DataFlowInventory/issues/9) (testes do sistema).

Marcar cada item como **aprovado**, **falhou**, **bloqueado** ou **não executado**.
