# Roteiro de Testes — Semana 4 (08–12/09/2026)

**Objetivo:** integrar as esteiras **B e C** (Teste 5 completo A+B+C) — o hardware chegou no fim de semana e desbloqueia o card #9; **HiveMQ Cloud** (Teste 6) vira **subtarefa** — só avança se os blocos de bancada fecharem com folga; ao final, **spec da funcionalidade futura de integração do simulador com o PC industrial Beckhoff CX9240** (persistência de estoque em banco MySQL/PostgreSQL), a ser testada em bancada própria.

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
| **Teste 5 — Esteiras B/C** | — | ⬜ **PRIORIDADE** |

**Novidade da semana:** hardware (2º/3º driver IRF520 + motores + sensores topo/junção B/C) chegou durante o fim de semana (06–07/09). O bloqueio físico do card #9 deixa de existir.

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

- [ ] Fiação UART reconferida (divisor + GND comum)
- [ ] `start_services.bat` → Mosquitto + probe + server
- [ ] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [ ] Esteira A operando no broker local
- [ ] Checklist: [`checklist_pre_teste_rede_infra.md`](../validações/checklist_pre_teste_rede_infra.md)

### 0.c — Hardware novo (esteiras B e C)

- [ ] 2º IRF520 (esteira B) + 3º IRF520 (esteira C) instalados e alimentados
- [ ] Motores B e C acionam via PWM (bloco B0.3 replicado)
- [ ] TCRT5000 topo B / junção J2 e topo C / junção J3 calibrados
  - Já pré-calibrados isoladamente em 01/09 (observação `B0.2`); revalidar **na montagem real**
- [ ] Sensores B/C ligados aos pinos do Uno e reportados na serial

> **Referências de sketch:** `test/esteira_peca_b/` (esteira B) e `test/esteira_peca_c/` (esteira C) — replicar valores de `TIMEOUT_ENTREGA`, `TEMPO_SAIDA_ESTEIRA_MS` e pinagem como feito para A/B em 28/08.

---

## 3. Bloco 1 — Integração da Esteira B (PRIORIDADE)

### 1.1 — Comando remoto (MQTT Box / Dashboard)

- [ ] `{"acao":"solicitar_peca","peca":"B"}` → esteira B aciona ciclo completo
- [ ] Sensor de topo B detecta peça na esteira secundária
- [ ] Sensor de junção J2 confirma entrega → motor B para
- [ ] Estoque `pecaB` decrementa (LCD ↔ Dashboard sincronizados)

### 1.2 — Rejeições e recuperação

| Injeção | Resposta esperada | Status |
|---------|-------------------|--------|
| `peca:"B"` durante entrega A | `ocupado` | ⬜ |
| `peca:"B"` sem estoque | `sem_estoque` | ⬜ |
| Segurar peça em J2 | `TIMEOUT` + motores param | ⬜ |
| `CMD:RESET` | FSM → `IDLE` | ⬜ |

---

## 4. Bloco 2 — Integração da Esteira C

### 2.1 — Comando remoto

- [ ] `{"acao":"solicitar_peca","peca":"C"}` → esteira C aciona ciclo completo
- [ ] Sensor de topo C + junção J3 validados na montagem real
- [ ] Estoque `pecaC` decrementa (LCD ↔ Dashboard)

### 2.2 — Rejeições e recuperação

Mesmos cenários do Bloco 1 aplicados à esteira C.

---

## 5. Bloco 3 — Teste 5 completo (FSM 3 esteiras A+B+C)

> Objetivo: validar a FSM completa com 3 esteiras e cenários de rejeição, conforme Teste 5 do `plano_de_testes.md`.

| # | Cenário | Critério | Status |
|---|---------|----------|--------|
| 1 | Pedido A → entrega | Ciclo completo A | ⬜ |
| 2 | Pedido B → entrega | Ciclo completo B | ⬜ |
| 3 | Pedido C → entrega | Ciclo completo C | ⬜ |
| 4 | A + B simultâneos | FSM serializa / `ocupado` explícito | ⬜ |
| 5 | B + C simultâneos | FSM serializa / `ocupado` explícito | ⬜ |
| 6 | Rejeição de peça inexistente (`peca:"Z"`) | `peca_invalida` | ⬜ |
| 7 | `peca:"B"` / `"C"` sem estoque | `sem_estoque` | ⬜ |
| 8 | Timeout J2/J3 + `CMD:RESET` | FSM → `ERRO` → `IDLE` | ⬜ |
| 9 | LWT offline/online gateway (3 esteiras) | badge atualiza | ⬜ |
| 10 | Reconexão broker | retained intacto | ⬜ |

**Registrar Latência local:** ____ ms · **Tempo ciclo A/B/C:** ____ s

> Ao fechar, mover **#9** para `Done` com evidência e comentar Template B.


---

## 6. Subtarefa — HiveMQ Cloud (Teste 6)

> **Redefinido como subtarefa da semana.** Só executa se os Blocos 1–3 fecharem com folga de tempo. Estado herdado de 02/09:

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
- [ ] Bloco 4 — Dashboard E2E remoto (latência local × nuvem: ____ ms)
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
| Payload | `{"pecaA":N,"pecaB":N,"pecaC":N}` |
| QoS | 1 |
| Framing adicional | `dataflow/melhorias/beckhoff/estoque` opcional p/ eventos de entrega |

> **Dependência:** alinhar tópicos/formato com o agente responsável pelo código do CX9240 (o contrato de payload acima é **propostal** e não deve ser congelado antes da validação cruzada).

### 7.3 — Escopo da rodada (spec apenas)

- [ ] Documentar no `arquitetura_mqtt.md` o tópico e o payload da integração Beckhoff
- [ ] Definir se o simulador ganha um modo `MQTT_PUBLISH=true` reutilizando `mqtt.js` (dependência a adicionar em `simulator/package.json`)
- [ ] Esboçar o card de melhoria (Template A) com critério de aceite para **bancada própria**
- [ ] **Não** implementar a persistência no simulador nem o código do Beckhoff nesta semana (agentes/sprints futuros)

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
| 0 — Pré-voo | ⬜ | IP: ____ |
| 0.c — Hardware B/C | ⬜ | IRF520 #2/#3 instalados? |
| 1 — Esteira B (comando + rejeições) | ⬜ | Tempo ciclo B: ____ s |
| 2 — Esteira C (comando + rejeições) | ⬜ | Tempo ciclo C: ____ s |
| 3 — Teste 5 completo (A+B+C) | ⬜ | Latência: ____ ms |
| Subtarefa — HiveMQ (se executada) | ⬜ | E2E remoto: ____ ms |
| Bloco 4 — Spec Beckhoff CX9240 | ⬜ | Contrato publicado em `arquitetura_mqtt.md`? |
| Plano B | — | Se usado |

---

## 10. Documentação

- [ ] `CHANGELOG.md` (integração B/C — seção "Adicionado/Corrigido"; entrada da semana)
- [ ] `plano_de_testes.md` (registro de resultados 08–12/09; **desbloqueio** do Teste 5)
- [ ] `board_github_projects.md` (card #9 → Done; subtarefa HiveMQ; novo card de melhoria Beckhoff)
- [ ] `arquitetura_mqtt.md` (contrato de tópico/payload Beckhoff, se aprovado)
- [ ] Cards do board conforme seção "Cards" abaixo

> Transferir para [`plano_de_testes.md`](../plano_de_testes.md) ao final.

