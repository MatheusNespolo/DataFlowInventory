# Roteiro de Testes — Semana 4 (08–12/09/2026)

**Objetivo:** integrar as esteiras **B e C** (Teste 5 completo A+B+C) — ✅ **CONCLUÍDO**; **HiveMQ Cloud** (Teste 6) vira **subtarefa** — só avança se os blocos de bancada fecharem com folga; ao final, **spec da funcionalidade futura de integração do simulador com o PC industrial Beckhoff CX9240** (persistência de estoque em banco MySQL/PostgreSQL), a ser testada em bancada própria.

> **Data:** 08–12/09/2026
> **Continuação de:** [`semana_03_27-28_agosto.md`](semana_03_27-28_agosto.md)
> **Cards:** #1, #2, #9 (integração B/C) · #15–17 (subtarefa HiveMQ) · **#novo** (melhoria Beckhoff)
> **Commit ref (03/09):** fix de rejeição de comandos · `628182d` · Cluster HiveMQ: s1.eu.hivemq.cloud

---

## 1. Herança validada

| Marco | Data | Status |
|-------|------|--------|
| Serial Arduino ↔ ESP32 (divisor 1k/2kΩ + GND) | 25/08 | ✅ |
| Teste 2 — ESP32 → Broker → Node | 25/08 | ✅ |
| Teste 4 — End-to-End Dashboard | 25/08 | ✅ |
| Timeout 9 s + CMD:RESET | 27–28/08 | ✅ #12 |
| Sync estoque LCD ↔ Dashboard | 27–28/08 | ✅ #11 |
| Plano B — Simulador | 25/08 | ✅ #10 |
| Robustez/LWT + Teste 3 puro | 01/09 | ✅ |
| Fix de rejeição de comandos | 03/09 | ✅ |
| Teste 6 — HiveMQ TLS/8883 (parcial) | 02/09 | ⚠️ Parcial |
| **Teste 5 — Esteiras B/C** | 08–12/09 | ✅ **CONCLUÍDO** |
| Ajuste mecânico demais esteiras | 08–12/09 | ✅ |
| Comando MQTT Box para novas peças | 08–12/09 | ✅ |
| Calibração sensores B/C na montagem real | 08–12/09 | ✅ |

**Novidade da semana:** hardware (2º/3º driver IRF520 + motores + sensores topo/junção B/C) chegou durante o fim de semana (06–07/09). Bloqueio físico do card #9 resolvido. Integração das esteiras B e C concluída: comando MQTT Box enviado com sucesso para peças B e C, cenários de erro (timeout, comando inválido) replicados com sucesso seguindo o padrão da esteira A, calibração de sensores validada na montagem real, e ajuste mecânico das demais esteiras concluído. Foco restante da semana: tarefas mecânicas de estética do protótipo.

---

## 2. Bloco 0 — Pré-voo

### 0.a — Credenciais ESP32

```bash
# esp32/gateway_mqtt/secrets.h (não versionar)
SECRET_WIFI_SSID / SECRET_WIFI_PASS  # 2,4 GHz
SECRET_MQTT_SERVER_LOCAL              # IP do PC (ipconfig)
USE_TLS=false                         # broker local
```

### 0.b — Infraestrutura

- [x] Fiação UART reconferida (divisor + GND comum)
- [x] `start_services.bat` → Mosquitto + probe + server
- [x] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [x] Esteira A operando no broker local
- [x] Checklist: [`checklist_pre_teste_rede_infra.md`](../validações/checklist_pre_teste_rede_infra.md)

### 0.c — Hardware novo (esteiras B e C)

- [x] 2º IRF520 (esteira B) + 3º IRF520 (esteira C) instalados e alimentados
- [x] Motores B e C acionam via PWM (bloco B0.3 replicado)
- [x] TCRT5000 topo B / junção J2 e topo C / junção J3 calibrados
  - Pré-calibrados isoladamente em 01/09 (observação `B0.2`); revalidados **na montagem real** ✅
- [x] Sensores B/C ligados aos pinos do Uno e reportados na serial

> **Referências de sketch:** `test/esteira_peca_b/` (esteira B) e `test/esteira_peca_c/` (esteira C) — replicar valores de `TIMEOUT_ENTREGA`, `TEMPO_SAIDA_ESTEIRA_MS` e pinagem como feito para A/B em 28/08.

---

## 3. Bloco 1 — Integração da Esteira B ✅ CONCLUÍDO

### 1.1 — Comando remoto (MQTT Box / Dashboard)

- [x] Comando MQTT para peça B → esteira B aciona ciclo completo
- [x] Sensor de topo B detecta peça na esteira secundária
- [x] Sensor de junção J2 confirma entrega → motor B para
- [x] Estoque `pecaB` decrementa (LCD ↔ Dashboard sincronizados)

### 1.2 — Rejeições e recuperação

| Injeção | Resposta esperada | Status |
|---------|-------------------|--------|
| Comando `peca=B` durante entrega A | `ocupado` | ✅ |
| Comando `peca=B` sem estoque | `sem_estoque` | ✅ |
| Segurar peça em J2 | `TIMEOUT` + motores param | ✅ |
| `CMD:RESET` | FSM → `IDLE` | ✅ |

> **Padrão de erros validado:** cenários de timeout e comando inválido para a esteira B replicam com sucesso o comportamento já validado na esteira A.
---

## 4. Bloco 2 — Integração da Esteira C ✅ CONCLUÍDO

### 2.1 — Comando remoto (MQTT Box / Dashboard)

- [x] Comando MQTT para peça C → esteira C aciona ciclo completo
- [x] Sensor de topo C detecta peça na esteira secundária
- [x] Sensor de junção J3 confirma entrega → motor C para
- [x] Estoque `pecaC` decrementa (LCD ↔ Dashboard sincronizados)

### 2.2 — Rejeições e recuperação

> **Mesmos cenários do Bloco 1 aplicados à esteira C** — replicados com sucesso seguindo o padrão validado.

| Injeção | Resposta esperada | Status |
|---------|-------------------|--------|
| Comando `peca=C` durante entrega A/B | `ocupado` | ✅ |
| Comando `peca=C` sem estoque | `sem_estoque` | ✅ |
| Segurar peça em J3 | `TIMEOUT` + motores param | ✅ |
| `CMD:RESET` | FSM → `IDLE` | ✅ |

---

## 5. Bloco 3 — Teste 5 completo (FSM 3 esteiras A+B+C) ✅ CONCLUÍDO

### 3.1 — Cenários (comando via MQTT Box)

> **Todos validados com sucesso.** Cenário 10 (reconexão broker) validado indiretamente em teste anterior.

| # | Cenário | Critério | Status |
|---|---------|----------|--------|
| 1 | Pedido A → entrega | Ciclo completo A | ✅ |
| 2 | Pedido B → entrega | Ciclo completo B | ✅ |
| 3 | Pedido C → entrega | Ciclo completo C | ✅ |
| 4 | A + B simultâneos | FSM serializa / `ocupado` explícito | ✅ |
| 5 | B + C simultâneos | FSM serializa / `ocupado` explícito | ✅ |
| 6 | Rejeição de peça inexistente (`peca:Z`) | `peca_invalida` | ✅ |
| 7 | B / C sem estoque | `sem_estoque` | ✅ |
| 8 | Timeout J2/J3 + `CMD:RESET` | FSM → `ERRO` → `IDLE` | ✅ |
| 9 | LWT offline/online gateway (3 esteiras) | badge atualiza | ✅ |
| 10 | Reconexão broker | retained intacto | ✅ |

**Registrar:** Latência local: `____` ms · Tempo ciclo A: `____` s / B: `____` s / C: `____` s
---

## 6. Subtarefa — HiveMQ Cloud (Teste 6)

> **Redefinido como subtarefa da semana.** Só executa se os Blocos 1–3 fecharem com folga. Estado herdado de 02/09:

| Bloco | Etapa | Resultado |
|-------|-------|-----------|
| 0 | Segurança + pré-voo | ✅ |
| 1 | ESP32 TLS/8883 HiveMQ | ✅ |
| 2 | Node.js TLS/8883 HiveMQ | ✅ |
| 3 | Retained + tópicos separados | ✅ |
| 3.2 | MQTT Box desacoplado | ✅ |
| **4** | **Dashboard E2E remoto** | ⬜ Pendente (firewall) |
| **5.1–5.3** | **LWT/reconexão remoto** | ⬜ Pendente |

**Pendências a fechar (se prioridade permitir):**

- [ ] Bloco 4 — Dashboard E2E remoto (latência local × nuvem: `____` ms)
- [ ] Bloco 5.1 — LWT gateway offline/online remoto
- [ ] Bloco 5.2 — Wi-Fi não-bloqueante remoto
- [ ] Bloco 5.3 — Reinício Node.js → reconexão HiveMQ

**Reversão obrigatória:** `USE_TLS=false` + reupload + `server/.env` → `mqtt://127.0.0.1`.

> Cards: #15 ✅ (cluster/credenciais), #16 ✅ (TLS/8883), #17 ⬜ (E2E remoto).

---

## 7. Bloco 4 — Futuro/Melhoria: Integração Simulador ↔ Beckhoff CX9240

> **Funcionalidade de melhoria** a acrescentar ao projeto futuramente. O **programa para o PC industrial Beckhoff CX9240 será desenvolvido por outro agente**. Esta semana fazemos a **spec do contrato** no lado do simulador para viabilizar a integração; a execução completa acontece quando o programa Beckhoff estiver pronto e em **bancada de testes própria**.

### 7.1 — Contexto

- O simulador (`simulator/server.js`, modo `SIMULADO`, sem hardware/MQTT) hoje emite somente eventos Socket.IO.
- Nova capacidade: o simulador deve **publicar os dados de estoque das peças via MQTT**, permitindo que o **PC industrial Beckhoff CX9240** se inscreva e **persista o estoque em banco MySQL (ou similar)**.
- A comunicação é **simulador → MQTT → Beckhoff**, desacoplada do broker de bancada (pode usar o Mosquitto local ou um broker dedicado à melhoria).

### 7.2 — Contrato proposto (a confirmar com o agente do Beckhoff)

| Item | Proposta |
|------|----------|
| Broker | Mosquitto local (ou dedicado) — mesma stack do projeto |
| Tópico de publicação | `dataflow/estoque` (retained, mesmo formato atual) |
| Payload | `{\"pecaA\":N,\"pecaB\":N,\"pecaC\":N}` |
| QoS | 1 |
| Framing adicional | `dataflow/melhorias/beckhoff/estoque` opcional p/ eventos de entrega |

> **Dependência:** alinhar tópicos/formato com o agente responsável pelo código do CX9240.

### 7.3 — Escopo da rodada (spec apenas)

- [ ] Documentar no `arquitetura_mqtt.md` o tópico e o payload da integração Beckhoff
- [ ] Definir se o simulador ganha um modo `MQTT_PUBLISH=true` reutilizando `mqtt.js`
- [ ] Esboçar o card de melhoria (Template A) com critério de aceite para **bancada própria**
- [ ] **Não** implementar a persistência no simulador nem o código do Beckhoff nesta semana

### 7.4 — Bancada de testes própria

- A validação acontecerá em **bancada separada** da esteira A (não interfere no fluxo de produção do Teste 5).
- Pré-requisitos: PC Beckhoff CX9240 + licença/ambiente TwinCAT (ou `TF6720`/cliente MQTT) + MySQL (ou MariaDB/PostgreSQL) + broker MQTT acessível a ambos.
---

## 8. Plano B — Simulador

```bash
start_services.bat
cd simulator && npm start
# Dashboard → validar fix, multi-esteira virtual e cenários de rejeição sem hardware
```

> Usar como fallback se a integração B/C apresentar problema de montagem durante a semana.

---

## 9. Resultados

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ✅ | IP: `____` |
| 0.c — Hardware B/C | ✅ | IRF520 #2/#3 instalados e alimentados |
| 1 — Esteira B (comando + rejeições) | ✅ | Tempo ciclo B: `____` s |
| 2 — Esteira C (comando + rejeições) | ✅ | Tempo ciclo C: `____` s |
| 3 — Teste 5 completo (A+B+C) | ✅ | Latência: `____` ms |
| Subtarefa — HiveMQ (se executada) | ⬜ | E2E remoto: `____` ms |
| Bloco 4 — Spec Beckhoff CX9240 | ⬜ | Contrato publicado em `arquitetura_mqtt.md`? |
| Plano B | — | Não utilizado |

---

## 10. Documentação

- [ ] `CHANGELOG.md` (integração B/C — seção "Adicionado/Corrigido"; entrada da semana)
- [ ] `plano_de_testes.md` (registro de resultados 08–12/09; **desbloqueio** do Teste 5)
- [ ] `board_github_projects.md` (card #9 → Done; subtarefa HiveMQ; novo card de melhoria Beckhoff)
- [ ] `arquitetura_mqtt.md` (contrato de tópico/payload Beckhoff, se aprovado)
- [ ] Cards do board conforme seção "Cards" abaixo

> Transferir para [`plano_de_testes.md`](../plano_de_testes.md) ao final.

---

## 11. Foco em tarefas mecânicas do protótipo

Com a integração eletrônica/software concluída, o foco restante da semana (se houver folga) é mecânico:

- [ ] Base de sustentação MDF para o protótipo (corte e montagem)
- [ ] Soldagem e organização de fiação (cabeamento limpo entre Uno/ESP32/drivers)
- [ ] Pintura e estética do protótipo (caixa externa, labels, acabamento visual)
- [ ] Verificação mecânica de alinhamento das esteiras B e C (rolamento, tensão de correia/timing)

> **Nota:** essas tarefas não impactam funcionalidade de software mas são essenciais para a entrega física do protótipo. Poderão ser distribuídas entre os membros da equipe conforme disponibilidade.

---

## 12. Esboço Semana 5 (15–19/09/2026)

> Rascunho preliminar — sujeito a revisão no planejamento de sexta-feira (11/09).

| # | Tarefa | Prioridade | Dependência |
|---|--------|------------|-------------|
| 1 | Verificação de solda dos novos módulos IRF520 (B/C) com testes unitários | Alta | Bloco 0/1 ✅ |
| 2 | Transição do broker local para HiveMQ Cloud (Teste 6 completo) | Alta | Blocos 1–3 ✅ |
| 3 | Testes de persistência de estoque em banco (spec Beckhoff) | Média | Semana 4 §7 |
| 4 | Diagrama/esquema elétrico consolidado (3 esteiras + gateway) | Média | — |
| 5 | Teste E2E parcial (sem persistência DB, só MQTT → Beckhoff mock) | Baixa | Subtarefa HiveMQ |

> **Foco principal:** fechar a subtarefa HiveMQ Cloud e avançar no esquema elétrico. A persistência em banco é stretch goal para semana 5.
