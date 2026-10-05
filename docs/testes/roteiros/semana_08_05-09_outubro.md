# Roteiro de Testes — Semana 8 (05–09/10/2026)

**Objetivo:** validar em bancada o firmware do Uno v3.0 (supervisão por marcos), começando pela esteira A e adicionando B e C gradualmente, calibrar tempos e PWM de cada esteira, e finalizar a mecânica e a integração do separador final.

> **Data:** 05–09/10/2026
> **Continuação de:** [`semana_07_28_setembro-3_outubro.md`](semana_07_28_setembro-3_outubro.md)
> **Blocos:** 6 (0 a 5), um por dia; segunda concentra os blocos 0 e 1
> **Regra de aprovação:** cada bloco termina com um **portão de aprovação**. O bloco seguinte só começa depois que o portão do anterior for assinado (✅). Se o resultado for ❌, registre a causa, corrija e repita o bloco; não avance.

---

## 1. Herança validada (Semana 7)

| Marco | Data | Status |
|-------|------|--------|
| Esteiras A, B e C movem; entrega ótima e timeout até o `ERRO` funcionam (firmware anterior à v3.0) | 03/10 | ✅ |
| Módulo IRF520 e motor da esteira C trocados (a partida travava o sistema inteiro) | 03/10 | ✅ |
| **Provisório:** esteira C usa o módulo IRF520 da esteira A | 03/10 | ⚠️ módulo definitivo da C a reinstalar |
| Firmware v3.0 na `main` (PR #43), 43 testes de lógica no PC | 03/10 | ✅ no PC · ⬜ em bancada |
| Tempo topo → junção da C com o motor novo | — | ⬜ **não registrado** |

**Contexto:** o firmware anterior estava correto; a falha de 29/09 era elétrica (ver [Semana 7, seção 4.2.1](semana_07_28_setembro-3_outubro.md)). A v3.0 **não corrige um defeito**: ela traz os marcos do processo (partida, trânsito, saída), mais próximos do padrão de automação produtiva, e dá erros com `fase` e `t_ms` que facilitam o diagnóstico. Por isso a validação começa pela esteira A, a mais conhecida, e acrescenta as outras uma a uma.

**Referências do firmware v3.0:** estados, marcos e erros em [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (seção 3); parâmetros por esteira em `arduino/data_flow_inventory/config.h` (`PARAM_ESTEIRA_A/B/C`: PWM 200, kick 150 ms, M1 3 s, M2 12,5 s, saída 3 s, pulso mínimo 20 ms).

**Rollback:** se a v3.0 se mostrar instável em bancada, o firmware v2.x está no commit `fddde08`.

---

## 2. Cronograma

| Dia | Bloco | Atividade |
|-----|-------|-----------|
| **05/10 (Seg)** | 0 e 1 | Pré-voo + esteira A isolada com a v3.0 |
| **06/10 (Ter)** | 2 | A + B |
| **07/10 (Qua)** | 3 | A + B + C, seguido da **rodada de calibração** |
| **08/10 (Qui)** | 4 | Mecânica e integração do separador |
| **09/10 (Sex)** | 5 | Documentação, CHANGELOG e cards |

---

## 3. Bloco 0 — Pré-voo (05/10)

### 3.1 — Infraestrutura

- [ ] `start_services.bat` → Mosquitto + probe + server rodando
- [ ] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [ ] Wi-Fi/credenciais confirmados (2,4 GHz)
- [ ] Firmware v3.0 compilado e gravado no Uno (ESP32 desconectado dos pinos 0/1 durante o upload)
- [ ] ESP32 com o gateway atual (`Serial2.setRxBufferSize(2048)`)

### 3.2 — Hardware

- [ ] Alimentação 12 V / 5 V conferida; **GND comum** entre Uno, drivers e fontes
- [ ] Esteira C: confirmar qual módulo IRF520 está ligado (provisório: o da A) e **anotar a fiação** que será desfeita quando o módulo definitivo voltar
- [ ] Diodo antiparalelo (1N4007) em cada motor
- [ ] 6 sensores TCRT5000 (topo A/B/C e junção J1/J2/J3) fixos e alinhados
- [ ] Fios dos motores afastados dos sensores e do I²C do LCD

### 3.3 — Cuidado com o ponto de falha conhecido

A falha de 29/09 travava todo o sistema na partida do motor. Na primeira partida de **cada** esteira, observe: se o Uno parar de responder, **desligue a alimentação dos motores** e registre qual esteira e qual módulo estavam ligados. Com a v3.0, um travamento do loop por 2 s reinicia o Uno (watchdog) e aparece como `reset: watchdog` no `inicio`.

### 🔒 Portão de aprovação — Bloco 0

| Critério | Resultado |
|----------|-----------|
| Pré-voo 3.1 completo | ⬜ |
| Pré-voo 3.2 completo | ⬜ |
| Aprovado por | ⬜ nome · data |

---

## 4. Bloco 1 — Esteira A isolada com a v3.0 (05/10)

> **Pré-requisito:** portão do Bloco 0 aprovado. Use apenas a esteira A; mantenha B e C com o motor desligado ou desconectado.
> Base: [`firmware_uno_v3_validacao.md`](firmware_uno_v3_validacao.md) (passos 1 a 8), restrita à A.

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 1.1 Boot | Ligar o Uno | `evento: inicio` com `versao: 3.0`, `reset: energia`, `lcd: true` (anotar `ram_livre`) | ⬜ |
| 1.2 Sensores | Esteiras vazias; passar uma peça sobre o topo A e sobre J1 | `topo` e `J1` vão a 1 com a peça e voltam a 0; ajustar o potenciômetro do TCRT5000 se ficar fixo | ⬜ |
| 1.3 Entrega | Peça no topo A; pedir A pelo dashboard | `ACIONANDO_ESTEIRA` → esteira liga → `entrega` com estoque de A −1 → ~3 s depois a esteira para → `AGUARDANDO_PEDIDO` | ⬜ |
| 1.4 Tempos | Repetir 3 vezes e anotar `tempo_ms` da entrega | Valores estáveis e bem abaixo de 12,5 s | ⬜ |
| 1.5 Motor travado | Peça no topo; segurar a esteira e pedir A | Em ~3 s `motor_sem_avanco` (fase `partida`), motor parado, **sem novo `inicio`** | ⬜ |
| 1.6 Timeout | Retirar a peça antes da junção | Em 12,5 s `timeout` (fase `transito`), motor parado, estoque intacto | ⬜ |
| 1.7 Peça presa | Segurar a peça sobre J1 | `entrega` e, 3 s depois, `peca_presa_saida` | ⬜ |
| 1.8 Junção obstruída | Peça no topo + outra parada sobre J1; pedir A | `juncao_obstruida` (fase `verificacao`), **sem ligar o motor** | ⬜ |
| 1.9 Sem peça no topo | Topo vazio e estoque > 0; pedir A | `sem_peca_topo` | ⬜ |
| 1.10 Recuperação | Após cada erro, enviar Reiniciar | Volta a `AGUARDANDO_PEDIDO` | ⬜ |
| 1.11 Resistência | 10 entregas seguidas de A | Sem `inicio` no meio; `ram_livre` estável | ⬜ |

**Em caso de falha:** copie a linha completa do `erro` (inclui `fase`, `t_ms` e `bordas_juncao`) para a seção 9 antes de qualquer ajuste.

### 🔒 Portão de aprovação — Bloco 1

| Critério | Resultado |
|----------|-----------|
| Passos 1.1 a 1.11 aprovados | ⬜ |
| Nenhum reset inesperado (`inicio` fora do boot) | ⬜ |
| `tempo_ms` da A registrado (seção 9) | ⬜ |
| Aprovado por | ⬜ nome · data |

---


## 5. Bloco 2 — Esteiras A + B (06/10)

> **Pré-requisito:** portão do Bloco 1 aprovado. Conecte o motor B e repita o ciclo de entrega.

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 2.1 Sensores B | Passar peça sobre topo B e J2 | Valores vão a 1 e voltam a 0 | ⬜ |
| 2.2 Entrega B | Pedir B (peça no topo B) | Entrega completa; estoque de B −1; **estoque de A inalterado** | ⬜ |
| 2.3 Tempos B | 3 entregas; anotar `tempo_ms` | Estável, abaixo de 12,5 s | ⬜ |
| 2.4 Motor travado B | Segurar a esteira B | `motor_sem_avanco` em ~3 s | ⬜ |
| 2.5 Timeout B | Retirar a peça antes de J2 | `timeout` em 12,5 s; estoque intacto | ⬜ |
| 2.6 Peça presa B | Segurar a peça sobre J2 | `peca_presa_saida` 3 s depois da entrega | ⬜ |
| 2.7 Alternância | A, B, A, B (4 pedidos, esperando cada término) | Sem erro, sem reset | ⬜ |
| 2.8 Pedido ocupado | Enviar um 2º pedido durante uma entrega | `erro` `ocupado` sem mudar o estado | ⬜ |
| 2.9 Resistência | 10 entregas alternando A e B | Sem `inicio` no meio | ⬜ |

### 🔒 Portão de aprovação — Bloco 2

| Critério | Resultado |
|----------|-----------|
| Passos 2.1 a 2.9 aprovados | ⬜ |
| Bloco 1 continua válido (A não regrediu) | ⬜ |
| `tempo_ms` da B registrado (seção 9) | ⬜ |
| Aprovado por | ⬜ nome · data |

---

## 6. Bloco 3 — Esteiras A + B + C e rodada de calibração (07/10)

> **Pré-requisito:** portão do Bloco 2 aprovado. Conecte o motor C (módulo provisório da A, se o definitivo ainda não voltou).
> Atenção: se a C usa o módulo da A, a fiação deve impedir que A e C sejam acionadas ao mesmo tempo. A FSM entrega uma esteira por vez, mas confirme a ligação antes de começar.

### 6.1 — Validação com três esteiras

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 3.1 Sensores C | Passar peça sobre topo C e J3 | Valores vão a 1 e voltam a 0 | ⬜ |
| 3.2 Entrega C | Pedir C | Entrega completa; estoque de C −1 | ⬜ |
| 3.3 Partida sem travar | Primeira partida do motor C | **O sistema não trava** (sem `reset: watchdog`, comunicação com o ESP32 mantida) | ⬜ |
| 3.4 Motor travado C | Segurar a esteira C | `motor_sem_avanco` em ~3 s | ⬜ |
| 3.5 Timeout C | Retirar a peça antes de J3 | `timeout` em 12,5 s; estoque intacto | ⬜ |
| 3.6 Peça presa C | Segurar a peça sobre J3 | `peca_presa_saida` | ⬜ |
| 3.7 Sequência A→B→C | 3 pedidos seguidos | Sem erro | ⬜ |
| 3.8 Estoque | Esgotar uma peça (15 pedidos) e pedir mais uma | `sem_estoque`; Reiniciar recupera | ⬜ |
| 3.9 Resistência | 15 entregas alternando A, B e C | Sem `inicio` no meio; `ram_livre` estável | ⬜ |
| 3.10 Dashboard e LCD | Conferir estoque no dashboard e no LCD após o ciclo | Valores iguais | ⬜ |

### 🔒 Portão de aprovação — Bloco 3 (validação)

| Critério | Resultado |
|----------|-----------|
| Passos 3.1 a 3.10 aprovados | ⬜ |
| Blocos 1 e 2 continuam válidos | ⬜ |
| Aprovado por | ⬜ nome · data |

### 6.2 — Rodada de calibração (após a aprovação acima)

> **Objetivo:** com as três esteiras validadas, ajustar PWM e prazos de cada uma para que se comportem de forma parecida e com folga nos marcos. Altere **um parâmetro por vez** em `config.h`, regrave e repita 3 entregas.

| Medida | A | B | C | Referência |
|--------|---|---|---|-----------|
| PWM de regime (`PARAM_ESTEIRA_x`, atual 200) | ⬜ | ⬜ | ⬜ | Menor PWM que move a esteira **com peça** (histórico: ~150) |
| Tempo topo → junção (média de 3) | ⬜ | ⬜ | ⬜ | ~5 s para A e B; **C ainda sem registro** |
| Tempo da saída (junção → fim) | ⬜ | ⬜ | ⬜ | M3 em 3 s |
| Folga em M1 (topo livre / 3 s) | ⬜ | ⬜ | ⬜ | Registre o `t_ms` real; folga sugerida ≥ 30% |
| Folga em M2 (junção / 12,5 s) | ⬜ | ⬜ | ⬜ | Registre o `t_ms` real; folga sugerida ≥ 50% |
| Pulso de 20 ms ainda detecta a peça? | ⬜ | ⬜ | ⬜ | Com o PWM calibrado |

Regras:
- Se a C divergir de A e B, ajuste só a C (`PARAM_ESTEIRA_C`) e anote o motivo.
- Após qualquer mudança em `config.h`, rode os testes de lógica (`test/firmware_uno`) e recompile antes de gravar.
- Ao fim, repita os passos 3.2, 3.5 e 3.9 com os valores finais.

### 🔒 Portão de aprovação — Bloco 3 (calibração)

| Critério | Resultado |
|----------|-----------|
| Tabela de calibração preenchida para A, B e C | ⬜ |
| Valores finais gravados em `config.h` e commitados | ⬜ |
| Passos 3.2, 3.5 e 3.9 repetidos com os valores finais | ⬜ |
| Aprovado por | ⬜ nome · data |

---


## 7. Bloco 4 — Mecânica e integração do separador (08/10)

> **Pré-requisito:** portão do Bloco 3 (validação e calibração) aprovado.
>
> **Situação do código:** o firmware v3.0 **não inclui** o separador. O rascunho existe só no histórico do git, comentado no `.ino` da v2.x (commit `15922e7`): motor de passo 28BYJ-48 + driver ULN2003 nos pinos D5–D8, 2048 passos por volta (a confirmar), três posições (0°, 120° e 240°). Decida se o rascunho será reaproveitado na estrutura modular da v3.0.
>
> **Restrições:** o Uno já usa D2, D4, D9–D11, A0–A3 (sensores e motores) e A4/A5 (I²C do LCD); D5–D8 estão livres. A integração não pode bloquear o loop (o watchdog é de 2 s).

### 7.1 — Mecânica

- [ ] Roda de separação montada e centrada no fim da esteira principal
- [ ] Três compartimentos (A, B, C) alinhados com a saída da esteira
- [ ] Posição neutra (0°) definida e marcada; folga mecânica da roda verificada
- [ ] Motor de passo fixado, sem esforço lateral no eixo
- [ ] Fiação do ULN2003 e do motor afastada dos sensores e do I²C

### 7.2 — Teste isolado do motor de passo (sem a FSM)

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 4.1 | Alimentar o ULN2003 (5 V, GND comum) e girar 1 volta em sketch de teste | A roda dá uma volta completa (confirmar passos por volta) | ⬜ |
| 4.2 | Ir às posições 0°, 120° e 240° e voltar | Posições repetíveis, sem desalinhar do compartimento | ⬜ |
| 4.3 | Medir o tempo de cada deslocamento | Registrar (define o prazo da etapa de separação) | ⬜ |
| 4.4 | Testar com uma peça no compartimento | Não perde passo | ⬜ |

### 7.3 — Integração com o firmware (somente após 7.2 aprovado)

- [ ] Decisão registrada: onde entra a etapa do separador na FSM e se é um novo marco ou parte do M3
- [ ] Novo erro e `fase` definidos e documentados em `ARCHITECTURE.md`
- [ ] Movimento sem bloquear o loop (incremental por ciclo)
- [ ] Testes de lógica no PC para a nova etapa (padrão de `test/firmware_uno`)
- [ ] Compilação do Uno dentro do limite de RAM do projeto
- [ ] Ciclo completo em bancada: pedido → entrega → separação no compartimento correto, para A, B e C

> **Nota:** se não houver tempo para a integração, encerre o bloco com 7.1 e 7.2 aprovados e registre a integração como pendência na seção 9.

### 🔒 Portão de aprovação — Bloco 4

| Critério | Resultado |
|----------|-----------|
| Mecânica (7.1) concluída | ⬜ |
| Teste isolado (7.2) aprovado | ⬜ |
| Integração (7.3) aprovada **ou** registrada como pendência | ⬜ |
| Aprovado por | ⬜ nome · data |

---

## 8. Bloco 5 — Documentação e cards (09/10)

> **Pré-requisito:** portão do Bloco 4 aprovado (ou pendência registrada).

| Artefato | Localização | Status |
|----------|-------------|--------|
| Resultados dos blocos 1 a 4 | Seção 9 deste roteiro | ⬜ |
| Valores calibrados | `arduino/data_flow_inventory/config.h` e `docs/ARCHITECTURE.md` | ⬜ |
| Registro da semana | `docs/testes/plano_de_testes.md` (Registro de Resultados) | ⬜ |
| Entrada da Semana 8 | `docs/CHANGELOG.md` | ⬜ |
| Separador | `docs/ARCHITECTURE.md`, `docs/INTEGRATION_GUIDE.md` e card #19 | ⬜ |
| Módulo IRF520 definitivo da C | `docs/DEPLOYMENT.md` e card #1 | ⬜ |
| Roteiro da Semana 9 | `docs/testes/roteiros/` | ⬜ |

### 🔒 Portão de aprovação — Bloco 5

| Critério | Resultado |
|----------|-----------|
| Documentos acima atualizados | ⬜ |
| Aprovado por | ⬜ nome · data |

---

## 9. Resultados consolidados da semana

> Preencher progressivamente. Não registrar resultado que não foi medido.

| Bloco | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ⬜ | — |
| 1 — Esteira A (v3.0) | ⬜ | — |
| 2 — A + B | ⬜ | — |
| 3 — A + B + C | ⬜ | — |
| 3 — Calibração | ⬜ | — |
| 4 — Separador | ⬜ | — |
| 5 — Documentação | ⬜ | — |

**Falhas e linhas de erro capturadas:** _(nenhuma registrada)_

---

## 10. Plano B — Simulador

Se a bancada estiver indisponível:

```bash
start_services.bat
cd simulator && MQTT_PUBLISH=true npm start
```

O simulador valida o dashboard e a API sem hardware, mas **não** substitui a validação do firmware v3.0.

---

## 11. Referências

- [`semana_07_28_setembro-3_outubro.md`](semana_07_28_setembro-3_outubro.md)
- [`firmware_uno_v3_validacao.md`](firmware_uno_v3_validacao.md)
- [`plano_de_testes.md`](../plano_de_testes.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [`CHANGELOG.md`](../../CHANGELOG.md)

---

**Criado:** 03/10/2026 | **Próximo review:** 09/10/2026

