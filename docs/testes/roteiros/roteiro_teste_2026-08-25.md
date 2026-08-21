# Roteiro de Testes — 25/08/2026

Continuação do [`roteiro_teste_2026-08-20.md`](roteiro_teste_2026-08-20.md). Referências: [`plano_de_testes.md`](../plano_de_testes.md), [`broker_local_mosquitto.md`](../../broker_local_mosquitto.md), gateway `esp32/gateway_mqtt/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** destravar os **dois bloqueios independentes** do dia 20 — (a) comunicação Serial Arduino ↔ ESP32 e (b) conexão MQTT do ESP32 ao broker — e concluir os **Testes 2, 3 e 4** (End-to-End da esteira A).

---

## 1. Diagnóstico do dia 20/08

Progresso: com rede Wi-Fi externa (não o hotspot do celular), o ESP32 conectou ao Wi-Fi ✅. Bloqueios restantes:

| Sintoma | Causa mais provável | Correção (hoje) |
|---------|--------------------|-----------------|
| Nenhuma mensagem do Arduino chegou ao ESP32 (Serial silenciosa), apesar dos dois uploads terem ocorrido normalmente | **Montagem física da UART**: (1) GND comum ausente — causa nº 1 de silêncio total; (2) **divisor de tensão ausente** (TX 5V do Uno → RX2 3,3V do ESP32); (3) TX/RX trocados ou GPIO errado | Bloco 0.A abaixo — montar divisor + GND comum e revalidar o **Teste 1** (só Serial, sem rede) antes de qualquer outra coisa |
| `[WiFi] Conectado!` OK, mas `[MQTT] Conectado!` **não** apareceu | Broker inacessível a partir do ESP32: firewall bloqueando a porta 1883, `mosquitto.conf` não carregado (modo local-only) ou `MQTT_SERVER` apontando para IP errado da nova rede | Bloco 0.B — smoke test do broker + anotar o código `rc=` do monitor serial; se `rc=-2`, liberar a 1883 no firewall |

> Nota: no dia 19 chegaram "mensagens não-JSON" no ESP32 — a Serial **já funcionou** uma vez. Algo mudou na fiação entre as sessões, o que reforça que o problema é de **montagem física**, não de código.

---

## 2. Bloco 0.A — Bancada Serial (SEM rede) — obrigatório antes de tudo

> Regra: **não ligar Wi-Fi/MQTT antes de a Serial Arduino ↔ ESP32 estar comprovadamente viva.**

### 2.1 Materiais

- [ ] Resistores para o divisor de tensão: **1kΩ + 2kΩ** (ou 10kΩ + 20kΩ)
- [ ] Protoboard com trilha de GND dedicada + jumpers extras
- [ ] Arduino Uno com o sketch principal calibrado
- [ ] ESP32 com o sketch `test/esteira_peca_a/esp32_teste_serial/` (só Serial, sem Wi-Fi — isola a variável)

### 2.2 Checklist de fiação (conferir item a item ANTES de energizar)

| De | Para | Observação |
|----|------|------------|
| TX do Uno (pino 1) | Divisor 1kΩ/2kΩ → **GPIO16 (RX2)** do ESP32 | 5V → ~3,3V. O 1kΩ entra em série no TX; o 2kΩ vai do nó ao GND |
| **GPIO17 (TX2)** do ESP32 | RX do Uno (pino 0) | Direto (3,3V é lido como HIGH pelo Uno) |
| GND do Uno | GND do ESP32 | **GND comum obrigatório** — sem ele, silêncio total |
| — | — | Baud: **9600 dos dois lados** (`Serial.begin(9600)` no Uno / `Serial2.begin(9600)` no ESP32) |

⚠️ Regras dos pinos 0/1 do Uno:
- **Desconectar o ESP32 dos pinos 0/1 durante o upload** do sketch do Uno
- **Fechar o Serial Monitor do Uno** durante a operação com o ESP32 (a USB compartilha os mesmos pinos)

### 2.3 Procedimento (revalidação do Teste 1)

1. Upload no Uno (ESP32 desconectado dos pinos 0/1) → upload no ESP32 (`esp32_teste_serial`)
2. Conectar a fiação conforme a tabela 2.2
3. Abrir o monitor serial **do ESP32** (115200) e gerar um evento no Arduino (botão / publicação periódica)
4. Critério de liberação:
   - [ ] JSONs do Uno aparecem no monitor do ESP32: `[Serial2] {"type":"status",...}`
   - [ ] Enviar comando de teste do ESP32 → Uno reage (`CMD:PECA:A` visível no LCD/estado)

**Se falhar:** trocar TX↔RX (inversão é o erro mais comum), reconferir GND, testar continuidade dos jumpers. Não prosseguir para o Bloco 0.B sem este critério.

---

## 3. Bloco 0.B — Rede e serviços (ordem fixa de inicialização)

1. **Rede:** hotspot do Windows em **2,4 GHz** (IP fixo do PC: `192.168.137.1`) — ou a mesma rede externa que funcionou no dia 20 (anotar o IP do PC via `ipconfig`; ele muda a cada sessão!)
2. **Serviços:** `start_services.bat` (Mosquitto com conf + mqtt_probe + server Node)
3. **Smoke test do broker (sem hardware):**
   ```bash
   netstat -ano | findstr :1883
   ::  Esperado: TCP 0.0.0.0:1883 ... LISTENING (se só 127.0.0.1, o conf não foi carregado!)
   mosquitto_pub -h localhost -t "dataflow/status" -m '{"type":"status","estado":"smoke-test"}'
   ```
   - [ ] `netstat` mostra `0.0.0.0:1883 LISTENING`
   - [ ] Mensagem aparece no mqtt_probe E nos logs do server
4. **ESP32 (agora com o gateway completo `esp32/gateway_mqtt/`):**
   - Editar SSID/senha da rede escolhida e `MQTT_SERVER` = IP do PC (nunca `localhost`), `USE_TLS=false`
   - Upload (Speed 921600, Serial Monitor fechado) → monitor 115200:
   - [ ] `[WiFi] Conectado!`
   - [ ] `[MQTT] Conectado!` — **se falhar, anotar o `rc=`:**

| rc | Significado | Ação |
|----|-------------|------|
| -2 | Broker inacessível (rede/firewall) | `netsh advfirewall firewall add rule name="Mosquitto 1883" dir=in action=allow protocol=TCP localport=1883` (como Admin) |
| -4 | Timeout de conexão | Conferir IP do PC e se broker está de pé |
| 4/5 | Autenticação/não autorizado | Conferir `allow_anonymous true` no conf |

   - [ ] mqtt_probe mostra o retained `{"type":"gateway","status":"online"}` em `dataflow/status`

---

## 4. Roteiro de execução do dia

### Bloco 1 — Testes 2 e 3 (cadeia de rede)

1. **Teste 2** (Blocos 0.A e 0.B completos):
   - Conectar o Arduino ao ESP32 (fiação já validada no Bloco 0.A)
   - [ ] JSONs do Arduino aparecem no `mqtt_probe` nos tópicos `dataflow/...`
   - [ ] Server Node loga as mensagens (`[WS →] ...`)
   - [ ] Desligar o ESP32 → LWT `{"type":"gateway","status":"offline"}` no probe
2. **Teste 3** — MQTT Box/Explorer (host `localhost:1883`):
   - Publicar em `dataflow/comandos/sub`: `{"acao":"solicitar_peca","peca":"A"}`
   - [ ] ESP32 loga `[MQTT ←]` + `[Serial2 →] CMD:PECA:A`
   - [ ] **Esteira física aciona** e completa a entrega; confirmação em `dataflow/comandos/pub`
   - [ ] `{"acao":"reset"}` retorna a FSM a `AGUARDANDO_PEDIDO`

### Bloco 2 — Teste 4 (End-to-End no dashboard)

3. Navegador em `http://localhost:3000`:
   - [ ] Indicadores de conexão OK (WebSocket + gateway online)
   - [ ] **Solicitar Peça A** → esteira executa → estado/estoque/histórico atualizam em tempo real
   - [ ] Cenários de erro: sem estoque e timeout (segurar a peça) → `ERRO` no dashboard → **Reset** pelo dashboard
   - [ ] Desligar o ESP32 → dashboard indica gateway offline

**✅ Marco do dia:** esteira A 100% integrada, do sensor ao dashboard.

### Plano B — progresso garantido em software (se o hardware travar de novo)

1. `start_services.bat` (broker + probe + server)
2. `cd simulator && npm start` — publica nos mesmos tópicos `dataflow/...` que o ESP32 faria
3. Dashboard em `http://localhost:3000` → validar Teste 4 "virtual" (comandos, estados, estoque, histórico)

> Fecha a validação de **frontend** (card #7) independentemente do hardware. Recomendado executar mesmo que o hardware funcione, como evidência formal do card.

---

## 5. Próximos passos após o marco (se sobrar tempo)

1. **Teste 5 (A + B):** `test/esteira_peca_b/` (`arduino_esteiras_ab/` + `esp32_esteiras_ab/`) — hardware adicional: +1 IRF520, +2 TCRT5000 (topo B + junção J2)
2. **Incorporar ao sketch principal:** o protocolo já suporta as três peças — a mudança é basicamente pinagem e replicação das funções da esteira A

---

## 6. Documentação e board

- [ ] Registrar os resultados na tabela abaixo (transferir para o `plano_de_testes.md` oficial apenas os testes aprovados/reprovados)
- [ ] **Atualizar os cards do GitHub Projects** ao final:
  - **#4** Gateway ESP32 → Done após Teste 2
  - **#7** Dashboard web → Done após Teste 4 (real ou via Plano B)
  - **#9** Testes e validação → registrar 2–4

---

## 7. Registro de resultados do dia (preencher durante os testes)

| Etapa | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| 0.A — Serial Uno ↔ ESP32 (com divisor) | ⬜ | Divisor: ____Ω/____Ω · GND comum conferido? |
| 0.B — Rede escolhida | ⬜ | SSID: ____ · IP do PC: ____ |
| 0.B — Smoke test do broker | ⬜ | `netstat` mostrou 0.0.0.0:1883? |
| 0.B — ESP32: WiFi + MQTT | ⬜ | IP do ESP32: ____ · rc de erro (se houver): ____ |
| 2 — ESP32 → Broker → Node | ⬜ | |
| 3 — Comando MQTT Box | ⬜ | |
| 4 — End-to-End Dashboard | ⬜ | |
| Plano B (simulador) | ⬜ | |

> Ao final: transferir resultados dos Testes 2–4 para o [`plano_de_testes.md`](../plano_de_testes.md) e atualizar os cards (#4, #7, #9).
