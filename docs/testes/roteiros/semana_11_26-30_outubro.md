# Roteiro de Testes — Semana 11 (26–30/10/2026)

> **Estado da bancada (23/10/2026):** a funcionalidade básica das esteiras foi validada na quarta-feira da Semana 10; o ajuste de PWM/kick foi registrado nos últimos commits e o que resta é a montagem na base e a validação final do sistema montado na estrutura do projeto. Esta semana será tratada como a última bancada de teste, com integração total ao final do período.

> **Atualização de estado (29/10/2026):** os avanços da semana só começaram na quarta-feira (28/10): até então não houve atividade de bancada, e as tarefas de 26 e 27/10 ficaram sem execução. Em 28/10 a **esteira A foi montada na base** e fez **10 entregas com sucesso**, com tempo de entrega entre **4650 e 5000 ms** — dentro do medido na calibração de 21/10 (~4950 ms), sem nenhuma mudança de firmware ou de parâmetros (só a mecânica da base mudou). Foi usada uma **peça improvisada**: a peça impressa em 3D ainda não foi verificada. As esteiras B e C na base, a integração e a validação das peças 3D seguem pendentes, agora concentradas em 29 e 30/10.

| Item | Status atualizado (29/10/2026) | Evidência |
|---|---|---|
| Revisão da bancada e checklist de montagem (26/10) | ⬜ Não executado | sem atividade de bancada até 28/10 |
| Montagem final do conjunto (27/10) | ⬜ Não executado | idem |
| Esteira A montada na base | ✅ Concluído | relato da equipe, 28/10 |
| Entregas da esteira A na base | ✅ Aprovado | 10 entregas em 28/10, 4650–5000 ms, sem falha; peça improvisada |
| Esteiras B e C montadas e testadas na base | ⬜ Pendente | — |
| Integração A/B/C na base | ⬜ Pendente | — |
| Peças 3D (roda separadora e peça) | ⬜ Pendente | — |
| Display OLED (reteste B3) | ⬜ Pendente | firmware pronto (PRs #68 e #70); o display ainda não chegou (previsto para 29–30/10) |

> ⚠️ **Risco de prazo:** com as atividades de segunda a quarta comprimidas em um dia, os blocos 2 a 4 (B e C na base, integração total e peças 3D) cabem com dificuldade em 29–30/10. O que não for concluído deve ser registrado como **pendente**, sem presumir aprovação, e replanejado na semana seguinte.

## Resumo e objetivo

1. Fixar as esteiras na base e testar uma a uma na estrutura final, garantindo que a montagem não altere o funcionamento padrão.
2. Validar o comportamento do sistema como um conjunto, com cargas/entregas repetidas e sem reset ou perda de sincronismo.
3. Testar as impressões 3D: roda separadora para motor de passo e peça que percorre as esteiras.
4. Encerrar a semana com a integração total do sistema e o registro documental do resultado final.

## Cronograma

| Data | Atividade | Saída esperada | Status (29/10) |
|---|---|---|---|
| **26/10 (seg.)** | Revisão da bancada e checklist final de montagem. | Base/estrutura, fixação das esteiras, alinhamento, GND e alimentação conferidos. | ⬜ Não executado |
| **27/10 (ter.)** | Inspeção mecânica e montagem final do conjunto. | Esteiras fixadas e sem obstruções, deslocamento e alinhamento registrados. | ⬜ Não executado |
| **28/10 (qua.)** | Teste individual por esteira na base. | Resultado por esteira com falhas/ajustes documentados. | ✅ Parcial: esteira A montada na base, 10 entregas com sucesso (4650–5000 ms); B e C não montadas |
| **29/10 (qui.)** | Integração parcial e ciclo de pedido A/B/C. | Sequência operacional estável; registro de falhas e reset. | ⬜ Pendente (antes: montar e testar B e C na base) |
| **30/10 (sex.)** | Validação das peças 3D + integração total final. | Evidência final de funcionamento e fechamento da bancada. | ⬜ Pendente |

---

## Bloco 1 — montagem final na estrutura do projeto

### Checklist obrigatório

> **28/10/2026:** esteira A fixada na base, sem mudança de firmware nem de parâmetros; o tempo de entrega ficou igual ao da calibração (critério de saída atendido para a A). Os itens abaixo continuam abertos até que as três esteiras estejam montadas e conferidas.

- [ ] Base e estrutura conferidas e alinhadas.
- [ ] Esteiras fixadas na base sem tensão mecânica excessiva.
- [ ] Sentido de rotação e alinhamento dos motores revisados.
- [ ] Fiação reorganizada para evitar contato, atrito ou movimento de cabo.
- [ ] Sensores e entradas de detecção preservados na mesma geometria de teste anterior.
- [ ] GND comum e alimentação estáveis antes de qualquer energia.

### Critério de saída

- [ ] A montagem não altera a lógica da FSM nem a calibração já registrada.
- [ ] Nenhuma esteira apresenta travamento, folga excessiva ou intermitência após a fixação.
- [ ] Registro fotográfico e observações de alinhamento ficam no relatório da semana.

---

## Bloco 2 — teste individual de cada esteira na base

### Procedimento

1. Instalar uma esteira por vez na estrutura final e deixar a bancada estável.
2. Testar pedido individual da peça correspondente.
3. Registrar tempo de trânsito, partida, entrega, parada e retorno ao estado de espera.
4. Repetir ao menos 5 ciclos sem falhas para confirmar robustez.
5. Repetir a mesma sequência com cada uma das esteiras antes de avançar para a integração total.

### Tabela de registro

| Esteira | Resultado | Tempo de entrega | Ciclos | Falhas | Observações |
|---|---|---:|---:|---|---|
| A | ✅ Aprovado (28/10) | 4650–5000 ms | 10 | nenhuma | Primeira esteira montada na base; tempo igual ao da calibração de 21/10 (~4950 ms), sem mudança de código. Peça improvisada (a impressa em 3D ainda não foi verificada) |
| B | ⬜ Pendente |  |  |  | Não montada na base |
| C | ⬜ Pendente |  |  |  | Não montada na base |

### Critério de saída

- [ ] Cada esteira funciona no mesmo ponto de montagem previsto para a estrutura.
- [ ] Nenhuma mudança de comportamento severa foi observada após a fixação.
- [ ] Falhas mecânicas, elétricas ou de detecção são registradas e tratadas antes da integração total.

---

## Bloco 3 — integração parcial e total

### Fase de integração parcial

- [ ] Conduzir sequência A/B/C individual e alternada sem reset inesperado.
- [ ] Verificar entregas, estoque, timeouts e recuperação.
- [ ] Testar a operação com peças em fila e eventos em sequência.

### Fase de integração total

- [ ] Executar sequência contínua de pedidos com as três esteiras ativas.
- [ ] Verificar ocorrência de ocupação, rejeição, overrun e sincronização de sensores.
- [ ] Garantir que a estrutura final não introduziu pontos de colisão, desalinhamento ou bloqueio.

### Critério de saída

- [ ] Integração total concluída com registro de logs e sequência de eventos.
- [ ] Sistema estável em operação em série ao fim da semana.
- [ ] Qualquer falha restante é explicitamente classificada como pendência ou ajuste de bancada.

---

## Bloco 4 — validação das impressões 3D

### Produto 1 — roda separadora para motor de passo

- [ ] Verificar encaixe e alinhamento do eixo do motor de passo.
- [ ] Confirmar giro sem atrito excessivo ou ressalto.
- [ ] Validar que a posição dos compartimentos permanece consistente na operação.
- [ ] Registrar desvio do centro, vibração e ruído.

### Produto 2 — peça que percorre as esteiras

- [ ] Confirmar encaixe e estabilidade ao longo da esteira.
- [ ] Validar que a peça não entala, não derruba sensores nem altera o fluxo normal.
- [ ] Testar em diferentes condições de deslocamento e em ciclos múltiplos.
- [ ] Medir e registrar qualquer aspecto que exija ajuste de tolerância.

### Critério de saída

- [ ] A peça e a roda separadora operam sem interferência na bancada.
- [ ] Ajustes de impressão, tolerância ou montagem são registrados para correção imediata.

---

## Fechamento e evidências

Ao final da semana, anexar:

- logs Serial/MQTT relevantes;
- fotos da montagem final;
- tabela de teste por esteira;
- resultados do separador e das peças 3D;
- relatório final de integração total;
- ajuste de firmware ou montagem que tenha sido necessário.

Marcar cada item como **aprovado**, **falhou**, **bloqueado** ou **não executado**.

Também registrar:

- **Display:** OLED 0,96" I²C (SSD1306) instalado no lugar do LCD 16x2: conferir `lcd_end` = 60 (0x3C) e `i2c_n` ≥ 1 no status, a tela legível (abertura, estoque, entrega e erro) e `lcd_quedas` estável. Procedimento em `docs/testes/plano_de_testes.md`, item B3.
- **Separador automático:** o resultado deve ser explicitado como validado, pendente ou não executado.
- **Estrutura do projeto:** confirmar se as modificações mecânicas da base preservaram o comportamento original.

Registrar os resultados em [`../resultados.md`](../resultados.md) (estado atual, registro e diário; fonte única) e atualizar [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md), [`../../INTEGRATION_GUIDE.md`](../../INTEGRATION_GUIDE.md) e [`../../CHANGELOG.md`](../../CHANGELOG.md) com os resultados reais, sem transformar plano em aprovação sem evidência.
