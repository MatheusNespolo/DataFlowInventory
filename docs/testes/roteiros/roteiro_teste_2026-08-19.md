# Roteiro de Testes — 19/08/2026

Continuação do [`roteiro_teste_2026-08-18.md`](roteiro_teste_2026-08-18.md), com base em: [`plano_de_testes.md`](../plano_de_testes.md), [`README.md`](../../../README.md), sketch principal `arduino/data_flow_inventory/`, gateway `esp32/gateway_mqtt/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** destravar o ambiente do **ESP32** (compilação/upload lentos que bloquearam o dia 18) e concluir a cadeia de rede — **Testes 2, 3 e 4** — fechando a integração End-to-End da esteira A (sensor → Arduino → ESP32 → Broker → Server → Dashboard).

---

## 1. Revisão — o que já foi feito

### Status dos testes (plano_de_testes.md)

| # | Teste | Status |
|---|-------|--------|
| 1 | Serial Arduino ↔ ESP32 | ✅ **Aprovado (12/08)** |
| B1 | Bancada 3.1 — Ciclo completo (motor + sensor) | ✅ **Aprovado (18/08)** — tempo_ms: 5000 · PWM mínimo: 150 |
| B2 | Bancada 3.2 — Peça inexistente | ✅ **Aprovado (18/08)** |
| B3 | Bancada 3.3 — LCD I2C | ✅ **Aprovado (18/08)** — endereço 0x27 |
| 2 | ESP32 → Broker → Node.js | ⬜ **Hoje** — bloqueado ontem (build/upload lentos do ESP32) |
| 3 | Comando remoto (MQTT Box) | ⬜ **Hoje** |
| 4 | End-to-End (Dashboard) | ⬜ **Hoje** |
| 5 | Duas esteiras (A + B) | ⬜ Pendente — sketches `test/esteira_peca_b/` prontos |

### Calibrações obtidas em 18/08 → já aplicadas ao sketch principal

| Medição | Valor | Aplicação em `arduino/data_flow_inventory/` | Status |
|---------|-------|---------------------------------------------|--------|
| `tempo_ms` da entrega | 5000 ms | `TIMEOUT_ENTREGA` ajustado com margem (~7000–8000 ms) — o valor antigo de 3000 ms causaria timeout falso | ✅ Aplicado |
| PWM mínimo que move a esteira | 150 | `VELOCIDADE_MOTOR` com margem de torque (~180–200) | ✅ Aplicado |
| Endereço I2C do LCD | 0x27 | Já era o default do sketch | ✅ OK |

> Restante: fazer o upload do sketch principal atualizado no Uno (**ESP32 desconectado dos pinos 0/1 durante o upload**) e validar rapidamente pelo monitor serial antes do Bloco 1.

---

## 2. Bloco 0 — Destravar o ambiente ESP32 (bloqueio de ontem)

> Sintoma de 18/08: compilação e upload do `gateway_mqtt.ino` demorando demais, inviabilizando os Testes 2–4.

### Por que acontece
- A **primeira compilação** do core ESP32 compila centenas de arquivos (WiFi, BT, FreeRTOS...). As seguintes reutilizam o **cache de build** e caem para segundos/poucos minutos — desde que o cache não seja apagado entre uploads.
- No Windows, a causa nº 1 de builds extremamente lentas é o **antivírus (Windows Defender)** escaneando cada arquivo objeto gerado.

### Ações (nesta ordem)

1. **Exclusões no Windows Defender** (Configurações → Segurança do Windows → Proteção contra vírus → Exclusões):
   - `%LOCALAPPDATA%\Arduino15` (cores, toolchains e cache de build)
   - A pasta dos sketches do projeto
2. **Upload Speed = 921600** em Ferramentas → Upload Speed (padrão 115200 é ~8× mais lento).
3. **Fechar o Serial Monitor antes do upload** (porta ocupada trava/atrasa o esptool).
4. Se travar em `Connecting........_____`: segurar o botão **BOOT** do ESP32 até iniciar a gravação.
5. **Compilar 1× "a seco" (Verify)** o `gateway_mqtt.ino` para popular o cache — as próximas builds serão rápidas.
6. Conferir as configurações no sketch antes do upload: `USE_TLS=false`, SSID/senha do Wi-Fi 2,4 GHz, `MQTT_SERVER` = **IP do PC** (`ipconfig`), nunca `localhost`.

**Critério para avançar:** upload do `gateway_mqtt.ino` concluído em tempo aceitável + monitor serial (115200) mostrando `[WiFi] Conectado!` e `[MQTT] Conectado!`.

> 💡 Plano B se o upload continuar inviável: usar o sketch reduzido `test/esteira_peca_a/esp32_peca_a/` (menos dependências, mesmo fluxo Serial2 ↔ MQTT limitado à peça A) — suficiente para cumprir os Testes 2–4 de hoje.

---

## 3. Roteiro de execução do dia

### ☑ Checklist de materiais antes de começar

- [ ] Arduino Uno + cabo USB (sketch principal já calibrado)
- [ ] ESP32 + divisor de tensão (1kΩ + 2kΩ) já validado no Teste 1
- [ ] 1× IRF520 + esteira A (motor DC) + fonte externa do motor + diodo 1N4007
- [ ] 1× TCRT5000 calibrado (trimpot ajustado em 18/08)
- [ ] LCD 16x2 I2C (0x27)
- [ ] PC com: Mosquitto instalado, Node.js, pasta `server/` com `npm install` feito
- [ ] PC e ESP32 na **mesma rede Wi-Fi 2,4 GHz** + IP do PC anotado (`ipconfig`)

### Bloco 1 — Cadeia de rede: Testes 2 e 3

1. **Sanidade do Uno:** upload do sketch principal calibrado (ESP32 fora dos pinos 0/1) → monitor serial 9600 → `CMD:PECA:A` deve completar o ciclo sem timeout falso (agora com `TIMEOUT_ENTREGA` folgado).
2. **Teste 2:** Mosquitto (`mosquitto -v -c mosquitto.conf`) + `mosquitto_sub -h localhost -t "dataflow/#" -v` (ou `node test/mqtt_probe/probe.js`).
   - Ligar o ESP32 (gateway do Bloco 0) → validar `online` retained em `dataflow/status`.
   - Conectar o Arduino → JSONs nos tópicos `dataflow/...`.
   - `npm start` no `server/` → logs `[MQTT] Conectado` e `[WS →] ...`.
   - Desligar o ESP32 → LWT `offline` no broker.
3. **Teste 3:** MQTT Box/Explorer publicando em `dataflow/comandos/sub`:
   - `{"acao":"solicitar_peca","peca":"A"}` → **esteira física aciona** e entrega → confirmação em `dataflow/comandos/pub`.
   - `{"acao":"reset"}` → FSM volta a `AGUARDANDO_PEDIDO`.

### Bloco 2 — End-to-End: Teste 4

4. Dashboard em `http://localhost:3000`: clicar **Solicitar Peça A** → esteira executa → estado/estoque/histórico atualizam em tempo real.
5. Cenários de erro: sem estoque, timeout (segurar a peça) → `ERRO` no dashboard → **Reset** pelo dashboard.
6. Desligar o ESP32 → dashboard indica gateway offline (LWT).

**✅ Marco do dia:** esteira A 100% integrada, do sensor ao dashboard.

---

## 4. Caminho rápido para as esteiras B e C

Com a esteira A validada End-to-End, a expansão é **incremental e já preparada**:

1. **Teste 5 (A + B):** usar `test/esteira_peca_b/` (`arduino_esteiras_ab/` + `esp32_esteiras_ab/`) — FSM completa com cenários `peca_indisponivel`, `ocupado` e timeout. Hardware adicional: +1 IRF520, +2 TCRT5000 (topo B + junção J2).
2. **Incorporar ao sketch principal:** o protocolo Serial/MQTT já suporta as três peças (`CMD:PECA:A/B/C`, `estoqueA/B/C`) — a mudança no `.ino` principal é basicamente **pinagem e replicação das funções da esteira A**, sem alterar server nem frontend.
3. **Esteira C:** replicação direta da B (mesmo padrão de ligação e código). Pinos previstos na Alternativa A do README: motores em 3, 5, 6, 9 (PWM) e sensores em 2, 4, 7, 8, 12, A0.
4. **Nuvem (card #5):** após o sistema completo funcionar no Mosquitto local, trocar `USE_TLS=true` + credenciais HiveMQ no ESP32 e no `server/.env` — nenhuma outra mudança necessária.

---

## 5. Documentação e board — fazer hoje

- [x] **Transferir os resultados de B1–B3 para a tabela oficial do [`plano_de_testes.md`](../plano_de_testes.md)** (data 18/08, tempo_ms 5000, PWM 150, LCD 0x27).
- [ ] **Atualizar os cards do GitHub Projects:**
  - **#3** Máquina de estados no Arduino → **Done** (implementada, calibrada e validada em bancada B1–B2)
  - **#4** Gateway ESP32 → **In Progress** (código pronto + Teste 1 aprovado; mover para Done após o Teste 2)
  - **#6** Servidor Node.js → **In Progress** (mover para Done após o Teste 2/4)
  - **#9** Testes e validação → **In Progress** (registrar B1–B3 aprovados; é o trabalho de hoje)
  - **#2** Diagrama elétrico e ligações → candidato a **Done** (B1–B3 validaram as ligações)
- [ ] Ao final do dia, registrar os resultados dos Testes 2–4 na tabela do `plano_de_testes.md` e neste roteiro.

---

## 6. Registro de resultados do dia (preencher durante os testes)

| Teste | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| Bloco 0 — Ambiente ESP32 destravado | ⬜ | Tempo de build/upload após ajustes: ____ |
| Sanidade Uno (sketch calibrado) | ⬜ | Ciclo sem timeout falso? |
| 2 — ESP32 → Broker → Node | ⬜ | IP do PC: ____ |
| 3 — Comando MQTT Box | ⬜ | |
| 4 — End-to-End Dashboard | ⬜ | |

> Ao final, transferir os resultados para a tabela oficial em [`plano_de_testes.md`](../plano_de_testes.md) e atualizar os cards do GitHub Projects (#2, #3, #4, #6 e #9).
