# Teste 5 — Duas Esteiras (A + B)

Etapa intermediária entre o teste de uma esteira (`test/esteira_peca_a/`) e o sistema completo (`arduino/data_flow_inventory/` + `esp32/gateway_mqtt/`).

Este teste já utiliza a **máquina de estados de 5 etapas** e o **protocolo Serial JSON idênticos ao código final**, controlando 2 esteiras secundárias (A e B). A peça C é rejeitada graciosamente com o evento `peca_indisponivel`.

## Estrutura

| Pasta | Placa | Descrição |
|---|---|---|
| `arduino_esteiras_ab/` | Arduino Uno | FSM completa (5 estados), 2 esteiras + principal, publica JSON via Serial |
| `esp32_esteiras_ab/` | ESP32 | Gateway MQTT (mesma lógica do gateway final, client `dataflow-esp32-teste-ab`) |

## Materiais

- Arduino Uno
- ESP32 DevKit
- 2× módulo IRF520 (esteiras A + B — a principal liga direto na fonte, sem driver)
- 3× esteiras com motor DC (principal + A + B)
- 4× sensores TCRT5000 (topo A, topo B, junção J1, junção J2)
- Divisor de tensão (1kΩ + 2kΩ) para o TX do Uno → RX2 do ESP32
- Fonte 12V DC

## Pinagem (Arduino Uno)

| Função | Pino |
|---|---|
| Motor A (IRF520 SIG) | 5 (PWM) |
| Motor B (IRF520 SIG) | 6 (PWM) |
| Sensor topo A | A0 |
| Sensor topo B | A1 |
| Sensor junção J1 | A3 |
| Sensor junção J2 | 4 |

Sensores em `INPUT_PULLUP` — **LOW = peça presente**.

## Como testar

### Fase 1 — Só o Arduino (monitor serial)

1. Faça upload de `arduino_esteiras_ab.ino` no Uno (ESP32 desconectado dos pinos 0/1).
2. Abra o monitor serial (9600 baud).
3. Envie `CMD:PECA:A` → deve verificar sensor do topo, acionar esteira A e aguardar J1.
4. Repita com `CMD:PECA:B`.
5. Envie `CMD:PECA:C` → deve responder `{"evento":"erro","tipo":"peca_indisponivel"}` sem travar.
6. Provoque um timeout (sem peça na junção) → estado `ERRO`; envie `CMD:RESET` para voltar.

### Fase 2 — Com ESP32 + broker local (Mosquitto)

1. Configure `SSID`, `SENHA` e `MQTT_SERVER` (IP do PC) em `esp32_esteiras_ab.ino` (`USE_TLS false`).
2. Suba o Mosquitto local (ver `docs/broker_local_mosquitto.md`).
3. Conecte Uno ↔ ESP32 pela Serial2 (com divisor de tensão no TX do Uno).
4. Use o probe MQTT para observar os tópicos e enviar comandos:
   ```
   cd test/mqtt_probe
   npm install
   node probe.js
   ```
5. Publique em `dataflow/comandos/sub`:
   ```json
   {"acao":"solicitar_peca","peca":"A"}
   {"acao":"solicitar_peca","peca":"B"}
   {"acao":"reset"}
   ```

## Critérios de validação

- [ ] Pedidos consecutivos de A e B entregam corretamente e decrementam o estoque
- [ ] Pedido durante entrega em andamento é rejeitado com evento `ocupado`
- [ ] Pedido de peça C retorna `peca_indisponivel` sem travar a FSM
- [ ] **Timeout de 9 s** leva a `ERRO` e `CMD:RESET` recupera o sistema
- [ ] Status periódico (`status`, `sensores`, `esteiras`) chega a cada ~1 s nos tópicos MQTT
- [ ] LWT: desligar o ESP32 gera `{"type":"gateway","status":"offline"}` em `dataflow/status`

## O que difere do código final

| Item | Teste 5 | Final |
|---|---|---|
| Esteiras secundárias | A e B | A, B e C |
| LCD | Opcional (`USE_LCD 0`) | Habilitado |
| Lógica da FSM | Parametrizada por arrays | Idêntica em comportamento |
| Peça C | Rejeitada (`peca_indisponivel`) | Atendida normalmente |
| Gateway ESP32 | Mesmo código, client `dataflow-esp32-teste-ab` | Client `dataflow-esp32-gateway` |