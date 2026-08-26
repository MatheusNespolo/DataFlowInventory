# Roteiro de Testes — 26/08/2026

Continuação do [`roteiro_teste_2026-08-25.md`](roteiro_teste_2026-08-25.md). Referências: [`plano_de_testes.md`](../plano_de_testes.md), [`broker_local_mosquitto.md`](../../broker_local_mosquitto.md), [checklist de infra](../validações/checklist_pre_teste_rede_infra.md), gateway `esp32/gateway_mqtt/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** **validar as duas correções aplicadas hoje** (timeout de entrega 8 s → 12 s e sincronismo de estoque LCD ↔ Dashboard) e realizar uma **bateria de testes de robustez** na esteira A, já que a esteira B ainda não está montada. Consolidar a esteira A como subsistema 100% estável antes de escalar para múltiplas esteiras.

---

## 1. Onde estamos — herança dos testes já validados

Antes de executar, relembrar o que já está **fechado** para não retrabalhar:

| Marco | Data | Status | Card |
|-------|------|--------|------|
| Serial Arduino ↔ ESP32 (com divisor 1k/2kΩ + GND comum) | 25/08 | ✅ Validado | #1 |
| Teste 2 — ESP32 → Broker → Node (JSONs em `dataflow/#`) | 25/08 | ✅ Validado | #4 |
| Teste 3 — Comando via MQTT Box (isolado) | 25/08 | ⚠️ Parcial (via Dashboard, não via MQTT Box puro) | #9 |
| Teste 4 — End-to-End Dashboard (pedido A → entrega) | 25/08 | ✅ Validado | #7 |
| Plano B — Simulador (frontend sem hardware) | 25/08 | ✅ Validado | #7 |

**Correções aplicadas hoje (commit `b2ec47d`) — a serem validadas neste roteiro:**
1. `TIMEOUT_ENTREGA` 8000 → **12000 ms** (peça chegava ao sensor mas não saía da esteira secundária)
2. `publicarEstoque()` adicionado no `setup()` e no `CMD:RESET` (dessincronismo LCD vs Dashboard: LCD marcava 3, Dashboard marcava 0)

> ⚠️ **Ponto crucial recorrente:** o divisor de tensão 1k/2kΩ + GND comum na UART foi a causa-raiz de 3 bloqueios anteriores (19–20/08). **Sempre reconferir a fiação antes de energizar** — é o item nº 1 de silêncio total na Serial.

---

## 2. Bloco 0 — Pré-voo (checklist de infra)

> Regra herdada: **não ligar Wi-Fi/MQTT antes de a Serial Arduino ↔ ESP32 estar comprovadamente viva.**

- [ ] Executar [`validar_infra.ps1`](../validações/validar_infra.ps1) como Admin → todos PASS
- [ ] Rodar o [checklist de rede/infra](../validações/checklist_pre_teste_rede_infra.md) (seções 1 a 5)
- [ ] Confirmar `MQTT_SERVER` no ESP32 = IP do PC de hoje (`ipconfig`) — se a rede mudou desde 25/08, **atualizar e regravar o ESP32**
- [ ] Fiação UART reconferida (TX→divisor→GPIO16 / GPIO17→RX / GND comum)
- [ ] **Reupload dos sketches corrigidos hoje:**
  - [ ] `arduino/data_flow_inventory/` no Uno (ESP32 fora dos pinos 0/1 durante upload)
  - [ ] `esp32/gateway_mqtt/` no ESP32
- [ ] Subir serviços: `start_services.bat` (broker + probe + server) + Dashboard em `http://localhost:3000`

Critério de liberação do Bloco 0:
- [ ] `mqtt_probe` mostra JSONs periódicos do Uno em `dataflow/status`, `dataflow/sensores`, `dataflow/esteiras`
- [ ] Dashboard indica **WebSocket conectado** + **gateway online**

---

## 3. Bloco 1 — Validação da correção do TIMEOUT (12 s)

**Objetivo:** confirmar que o novo tempo permite a peça sair completamente da esteira secundária.

1. Colocar peça A no sensor do topo, garantir `estoque[A] > 0`.
2. **Solicitar Peça A** pelo Dashboard.
3. Cronometrar e observar:
   - [ ] Motor da esteira A liga (soft-start)
   - [ ] Peça atravessa e **sai fisicamente** da esteira secundária (não apenas chega ao sensor)
   - [ ] Evento `entrega` publicado antes de estourar o timeout
   - [ ] LCD mostra `Entrega OK!` e o novo estoque
4. **Teste de timeout real** (segurar a peça sobre o sensor de junção):
   - [ ] Após **~12 s**, estado vira `ERRO` tipo `timeout`, motor para
   - [ ] `CMD:RESET` (botão Reset do Dashboard) recupera para `AGUARDANDO_PEDIDO`

📝 **Registrar:** tempo real de travessia (s) da peça A. Se ainda insuficiente, calibrar `TIMEOUT_ENTREGA` novamente.

---

## 4. Bloco 2 — Validação do SINCRONISMO de estoque (LCD ↔ Dashboard)

**Objetivo:** confirmar que LCD e Dashboard mostram sempre o **mesmo** valor de estoque, em todas as situações.

1. **Sincronismo inicial:** reiniciar o Uno (botão reset físico) e observar:
   - [ ] Dashboard recebe o estoque inicial (`A:5 B:5 C:5`) **sem precisar de um pedido** — valida `publicarEstoque()` no `setup()`
   - [ ] LCD e Dashboard idênticos após boot
2. **Sincronismo após entrega bem-sucedida:**
   - [ ] Solicitar A → após entrega, LCD e Dashboard decrementam **juntos** (ex.: ambos vão a `A:4`)
3. **Sincronismo após ERRO + RESET** (o cenário que falhou em 25/08):
   - [ ] Forçar timeout (segurar peça) → `ERRO`
   - [ ] `CMD:RESET` pelo Dashboard → LCD e Dashboard voltam a mostrar o **mesmo** estoque — valida `publicarEstoque()` no `CMD:RESET`
4. **Teste de estresse do relato de 25/08** (5 pedidos, alguns falhos):
   - [ ] Executar 5 solicitações de A (misturar sucessos e timeouts forçados)
   - [ ] Ao final, **LCD == Dashboard** (o bug era LCD=3 / Dashboard=0)

📝 **Registrar:** valores finais de LCD e Dashboard após a sequência de 5 pedidos.

---

## 5. Bloco 3 — Testes de robustez (esteira A)

Aproveitar que a esteira A está integrada para cobrir cenários de borda antes de escalar.

1. **Pedido com FSM ocupada:** solicitar A e, durante a entrega, solicitar A de novo:
   - [ ] Segundo pedido é ignorado/rejeitado sem travar a FSM
2. **Peça indisponível:** solicitar B ou C (sem esteira/estoque):
   - [ ] Evento `sem_estoque` / `peca_indisponivel` sem acionar motor
3. **Reset fora do estado ERRO:** enviar `CMD:RESET` em `AGUARDANDO_PEDIDO`:
   - [ ] Sistema permanece estável (reset só age em `ERRO`)
4. **Resiliência de rede (LWT)** — os itens que ficaram pendentes em 25/08:
   - [ ] Desligar o ESP32 → `mqtt_probe` recebe `{"type":"gateway","status":"offline"}` (LWT)
   - [ ] Dashboard indica **gateway offline**
   - [ ] Religar o ESP32 → volta a `online` e o Dashboard reconecta
5. **Reconexão do broker:** derrubar o Mosquitto e subir de novo:
   - [ ] Server Node e ESP32 reconectam automaticamente (reconnectPeriod 5 s)

📝 **Registrar:** qualquer estado inconsistente ou necessidade de reset manual.

---

## 6. Plano B — progresso garantido em software (se o hardware travar)

1. `start_services.bat` (broker + probe + server)
2. `cd simulator && npm start` — publica nos mesmos tópicos `dataflow/...`
3. Dashboard em `http://localhost:3000` → revalidar sincronismo de estoque e histórico no modo virtual

> Mesmo com hardware OK, rodar ao menos uma vez como evidência formal do card #7.

---

## 7. Próximos passos após o marco (rumo à continuidade do projeto)

Pontos **cruciais** para prosseguir depois de estabilizar a esteira A:

1. **Esteira B (Teste 5):** montar hardware adicional (+1 IRF520, +2 TCRT5000: topo B + junção J2 no pino D2). Sketches em `test/esteira_peca_b/`.
2. **Incorporar B ao sketch principal:** o protocolo já suporta as 3 peças — a mudança é essencialmente pinagem + replicação das funções da esteira A. O sketch principal **já tem** MOTOR_B (pino 10) e J2 (pino 2) mapeados.
3. **Esteira C + separador:** o código do separador (roda giratória) está comentado no sketch principal — decidir implementação futura.
4. **Fechar o Teste 3 puro** (MQTT Box isolado) para evidência formal, hoje só validado via Dashboard.

---

## 8. Documentação e board

- [ ] Registrar resultados na tabela abaixo
- [ ] Transferir aprovados/reprovados para o [`plano_de_testes.md`](../plano_de_testes.md)
- [ ] **Atualizar os cards do GitHub Projects:**
  - **#11** Sincronismo estoque LCD/Dashboard → Done após Bloco 2
  - **#12** Timeout 12 s → Done após Bloco 1
  - **#10** Teste 5 (esteira B) → continua Blocked (aguarda hardware)
  - Novo card: Robustez/LWT esteira A → conforme Bloco 3

---

## 9. Registro de resultados do dia (preencher durante os testes)

| Etapa | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| 0 — Pré-voo (infra + reupload) | ⬜ | IP do PC hoje: ____ · rede: ____ |
| 1 — Timeout 12 s (travessia real) | ⬜ | Tempo real de travessia: ____ s |
| 1 — Timeout forçado → ERRO/RESET | ⬜ | |
| 2 — Sync inicial (boot do Uno) | ⬜ | LCD == Dashboard no boot? ____ |
| 2 — Sync após entrega | ⬜ | |
| 2 — Sync após ERRO + RESET | ⬜ | |
| 2 — Estresse 5 pedidos | ⬜ | LCD final: ____ · Dashboard final: ____ |
| 3 — FSM ocupada / peça indisponível | ⬜ | |
| 3 — LWT gateway offline/online | ⬜ | |
| 3 — Reconexão do broker | ⬜ | |
| Plano B (simulador) | ⬜ | |

> Ao final: transferir resultados para o [`plano_de_testes.md`](../plano_de_testes.md) e atualizar os cards do board.

