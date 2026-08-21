# Roteiro de Testes — 18/08/2026

Preparação do dia de testes com base em: [`plano_de_testes.md`](../plano_de_testes.md), [`README.md`](../../../README.md), sketch principal `arduino/data_flow_inventory/`, sketches auxiliares de `test/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** integrar completamente a **esteira A** com toda a cadeia (sensor → Arduino → ESP32 → Broker → Server → Dashboard), abrindo caminho para replicar rapidamente nas esteiras B e C.

---

## 1. Revisão — o que já foi feito

### Status dos testes (plano_de_testes.md)

| # | Teste | Status |
|---|-------|--------|
| 1 | Serial Arduino ↔ ESP32 | ✅ **Aprovado (12/08)** |
| B1 | Bancada 3.1 — Ciclo completo (motor + sensor) | ⬜ Pendente — sketch pronto |
| B2 | Bancada 3.2 — Peça inexistente | ⬜ Pendente — sketch pronto |
| B3 | Bancada 3.3 — LCD I2C | ⬜ Pendente — sketch pronto |
| 2 | ESP32 → Broker → Node.js | ⬜ Pendente — gateway/server/probe prontos |
| 3 | Comando remoto (MQTT Box) | ⬜ Pendente |
| 4 | End-to-End (Dashboard) | ⬜ Pendente — frontend/server prontos |
| 5 | Duas esteiras (A + B) | ⬜ Pendente — sketches `test/esteira_peca_b/` prontos |

### Cruzamento com o GitHub Projects

| Card | Status no board | Situação real no repositório | Ação sugerida |
|------|-----------------|------------------------------|---------------|
| #1 Montagem mecânica das esteiras | In Progress | Esteira A em montagem/bancada | Manter |
| #2 Diagrama elétrico e ligações | In Progress | Ligações documentadas no plano de testes | Manter (fechar após B1–B3) |
| #3 Implementar máquina de estados no Arduino | **Todo** | `data_flow_inventory.ino` **já implementado** (FSM 5 estados + Serial JSON) | **Mover para In Progress/Done** |
| #4 Desenvolver gateway ESP32 (Serial ↔ MQTT) | **Todo** | `gateway_mqtt.ino` **já implementado** e Teste 1 aprovado | **Mover para In Progress/Done** |
| #5 Configurar broker MQTT (HiveMQ Cloud) | In Progress | Estratégia atual: **Mosquitto local** primeiro; HiveMQ depois | Manter |
| #6 Criar servidor Node.js | **Todo** | `server/server.js` **já implementado** (Express + Socket.IO + MQTT) | **Mover para In Progress** (falta validar no Teste 2) |
| #7 Criar dashboard web (Frontend) | In Progress | `frontend/` implementado (falta validar no Teste 4) | Manter |
| #8 Documentação e artigo | In Progress | docs/ atualizada continuamente | Manter |
| #9 Testes e validação do sistema completo | Todo | **É o trabalho de hoje** | **Mover para In Progress** |
| #10 Simulador | Done | `simulator/` concluído | ✅ OK |

> ⚠️ O board está defasado em relação ao código: os cards #3, #4 e #6 aparecem como *Todo*, mas os códigos já existem no repositório — falta apenas a **validação com hardware**, que é exatamente o objetivo de hoje.

---

## 2. Roteiro de execução do dia

### ☑ Checklist de materiais antes de começar

- [ ] Arduino Uno + cabo USB
- [ ] ESP32 + divisor de tensão (1kΩ + 2kΩ) já validado no Teste 1
- [ ] 1× IRF520 + esteira A (motor DC) + fonte externa do motor
- [ ] Diodo 1N4007 (flyback no motor)
- [ ] 1× TCRT5000 (módulo com comparador/trimpot)
- [ ] LCD 16x2 I2C
- [ ] PC com: Mosquitto instalado, Node.js, pasta `server/` com `npm install` feito
- [ ] PC e ESP32 na **mesma rede Wi-Fi 2,4 GHz** + IP do PC anotado (`ipconfig`)

### Bloco 1 — Bancada (sem rede): B1 → B2 → B3

**Sketch:** `test/esteira_peca_a/arduino_teste_integracao/` — monitor serial a **9600**.

1. **B1 (3.1):** montar IRF520 (SIG → pino 3), TCRT5000 (D0 → pino 2), GND comum, motor na fonte externa, diodo flyback.
   - `CMD:PECA:A` → motor liga (soft-start) → peça sai do sensor → motor para → `{"evento":"entregue","tempo_ms":...}`
   - 📝 **Registrar:** `tempo_ms` da entrega e menor PWM que move a esteira com peça (calibram `TIMEOUT_ENTREGA` e `VELOCIDADE_MOTOR` do sketch final).
2. **B2 (3.2):** `CMD:PECA:B` e `CMD:PECA:C` → motor **não** liga + `{"evento":"erro","tipo":"peca_indisponivel"}` → `CMD:RESET` recupera. Testar também comando malformado (`CMD:XYZ`).
3. **B3 (3.3):** sketch `test/esteira_peca_a/arduino_teste_lcd/` — LCD em A4/A5.
   - 📝 **Registrar:** endereço I2C encontrado pelo scanner (0x27 ou 0x3F).
   - Testar `LCD:ESTOQUE:4,5,5`, `LCD:ESTADO:SEPARANDO A`, `LCD:ERRO:TIMEOUT J1`.

**Critério para avançar:** ciclo completo da esteira A funcionando na bancada + valores de calibração anotados.

### Bloco 2 — Cadeia de rede: Testes 2 e 3

4. **Aplicar as calibrações** (`tempo_ms` → `TIMEOUT_ENTREGA`; PWM mínimo → velocidade) no sketch principal `arduino/data_flow_inventory/` e fazer upload no Uno (**ESP32 desconectado dos pinos 0/1 durante o upload**).
5. **Teste 2:** Mosquitto (`mosquitto -v -c mosquitto.conf`) + `mosquitto_sub -h localhost -t "dataflow/#" -v` (ou `node test/mqtt_probe/probe.js`).
   - Gateway ESP32: `USE_TLS=false`, `MQTT_SERVER` = **IP do PC** (nunca localhost).
   - Validar: `online` retained em `dataflow/status` → JSONs do Arduino nos tópicos → `npm start` no `server/` recebendo (`[WS →] ...`) → LWT `offline` ao desligar o ESP32.
6. **Teste 3:** MQTT Box/Explorer publicando em `dataflow/comandos/sub`:
   - `{"acao":"solicitar_peca","peca":"A"}` → **esteira física aciona** e entrega → confirmação em `dataflow/comandos/pub`.
   - `{"acao":"reset"}` → FSM volta a `AGUARDANDO_PEDIDO`.

### Bloco 3 — End-to-End: Teste 4

7. Dashboard em `http://localhost:3000`: clicar **Solicitar Peça A** → esteira executa → estado/estoque/histórico atualizam em tempo real.
8. Cenários de erro: sem estoque, timeout (segurar a peça) → `ERRO` no dashboard → **Reset** pelo dashboard.
9. Desligar o ESP32 → dashboard indica gateway offline (LWT).

**✅ Marco do dia:** esteira A 100% integrada, do sensor ao dashboard.

---

## 3. Caminho rápido para as esteiras B e C

Com a esteira A validada End-to-End, a expansão é **incremental e já preparada**:

1. **Teste 5 (A + B):** usar `test/esteira_peca_b/` (`arduino_esteiras_ab/` + `esp32_esteiras_ab/`) — FSM completa com cenários `peca_indisponivel`, `ocupado` e timeout. Hardware adicional: +1 IRF520, +2 TCRT5000 (topo B + junção J2).
2. **Incorporar ao sketch principal:** o protocolo Serial/MQTT já suporta as três peças (`CMD:PECA:A/B/C`, `estoqueA/B/C`) — a mudança no `.ino` principal é basicamente **pinagem e replicação das funções da esteira A**, sem alterar server nem frontend.
3. **Esteira C:** replicação direta da B (mesmo padrão de ligação e código). Pinos previstos na Alternativa A do README: motores em 3, 5, 6, 9 (PWM) e sensores em 2, 4, 7, 8, 12, A0.
4. **Nuvem (card #5):** após o sistema completo funcionar no Mosquitto local, trocar `USE_TLS=true` + credenciais HiveMQ no ESP32 e no `server/.env` — nenhuma outra mudança necessária.

---

## 4. Registro de resultados do dia (preencher durante os testes)

| Teste | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| B1 — Ciclo completo | ✅ | tempo_ms: 5000 · PWM mínimo: 150 |
| B2 — Peça inexistente | ✅ | |
| B3 — LCD I2C | ✅ | Endereço I2C: 0x27 |
| 2 — ESP32 → Broker → Node | ⬜ | IP do PC: ____ |
| 3 — Comando MQTT Box | ⬜ | |
| 4 — End-to-End Dashboard | ⬜ | |

> Ao final, transferir os resultados para a tabela oficial em [`plano_de_testes.md`](../plano_de_testes.md) e atualizar os cards do GitHub Projects (#3, #4, #6 e #9).
