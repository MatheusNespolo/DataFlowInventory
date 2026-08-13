# Plano de Testes — Data Flow Inventory

Este documento define os testes de integração da cadeia de comunicação do sistema, do link Serial (Arduino ↔ ESP32) até o teste End-to-End (Dashboard ↔ Arduino).

**Documentos relacionados:**
- 🧪 [`broker_local_mosquitto.md`](broker_local_mosquitto.md) — Instalação e configuração do broker local
- 📊 [`fluxograma_funcionamento.md`](fluxograma_funcionamento.md) — Máquina de estados e sequência de comunicação
- 🏗 [`arquitetura_mqtt.md`](arquitetura_mqtt.md) — Arquitetura geral, tópicos e formatos de mensagem

---

## Tabela de Testes

| # | Teste | Materiais | Objetivo | Validação |
|---|-------|-----------|----------|-----------|
| **1** | **Serial Arduino ↔ ESP32** | Arduino Uno + ESP32 + divisor de tensão | Arduino publica status via Serial → ESP32 recebe | ESP32 imprime JSON recebido no monitor serial ✅ **(CONCLUÍDO)** |
| 2 | ESP32 → Broker → Node.js | Item 1 + PC com Mosquitto + server Node | ESP32 publica no broker → Node.js recebe | Mensagem aparece nos logs do servidor |
| 3 | Comando remoto (MQTT Box) | Item 2 + MQTT Box/Explorer | Enviar comando via MQTT Box → ESP32 → Arduino | Arduino processa comando (muda de estado / LCD) |
| 4 | End-to-End (Dashboard) | Item 2 + navegador | Clicar no dashboard → Arduino executa → dashboard atualiza | Ciclo completo pedido → entrega refletido na UI |
| 5 | Duas esteiras (A + B) | Itens 1–3 + 2ª esteira secundária + 2 sensores | Validar FSM completa com 2 esteiras e cenários de rejeição | Entregas A/B, rejeição de C, `ocupado`, timeout + reset |

---

## Teste 1 — Serial Arduino ↔ ESP32

### Materiais
- Arduino Uno com sketch `arduino/data_flow_inventory/data_flow_inventory.ino` (ou `test/esteira_peca_a/arduino_teste_serial/`)
- ESP32 com sketch `test/esteira_peca_a/esp32_teste_serial/` (ou o gateway completo)
- Divisor de tensão (1kΩ + 2kΩ) entre TX do Uno e RX2 do ESP32
- GND comum entre as duas placas

### Ligações
| Arduino Uno | ESP32 | Observação |
|-------------|-------|------------|
| TX (pino 1) | RX2 (GPIO16) | Via divisor de tensão 5V → 3,3V |
| RX (pino 0) | TX2 (GPIO17) | Direto |
| GND | GND | Comum obrigatório |

### Procedimento
1. Fazer upload do sketch no Uno **com o ESP32 desconectado dos pinos 0/1**
2. Reconectar o ESP32 e fazer upload do sketch do ESP32
3. Abrir o monitor serial do ESP32 em **115200 baud**
4. Gerar um evento no Arduino (pressionar botão / aguardar publicação periódica)

### Critério de validação
- [x] O monitor serial do ESP32 exibe as linhas JSON vindas do Arduino, ex.:
  ```
  [Serial2] {"type":"status","estado":"AGUARDANDO_PEDIDO",...}
  ```
- [x] Linhas de debug não-JSON aparecem marcadas como `[Serial2 nao-JSON]`

### Resultado
✅ **Aprovado** — JSON recebido e impresso corretamente pelo ESP32.

---

## Teste 2 — ESP32 → Broker MQTT → Node.js

> Objetivo: validar que o ESP32 publica no Mosquitto e que o servidor Node.js recebe as mensagens.

### Materiais
- Montagem do Teste 1 funcionando
- PC com **Mosquitto** instalado e rodando (ver [`broker_local_mosquitto.md`](broker_local_mosquitto.md))
- PC e ESP32 na **mesma rede Wi-Fi**
- Pasta `server/` com dependências instaladas (`npm install`)

### Preparação

**2.1 — Broker rodando e testado (sem hardware):**
```bash
# Iniciar o Mosquitto (verbose para acompanhar conexões)
mosquitto -v -c mosquitto.conf

# Terminal 2 — inscrever em todos os tópicos do projeto
mosquitto_sub -h localhost -t "dataflow/#" -v

# Terminal 3 — publicar mensagem de teste
mosquitto_pub -h localhost -t "dataflow/status" -m "{\"type\":\"status\",\"estado\":\"Teste\"}"
```
✔ A mensagem deve aparecer no terminal do `mosquitto_sub`. Isso confirma que o broker funciona **antes** de envolver o hardware.

**2.2 — Configurar o ESP32 (`esp32/gateway_mqtt/gateway_mqtt.ino`):**
- `USE_TLS` = `false`
- `SSID` / `SENHA` = credenciais do Wi-Fi (mesma rede do PC)
- `MQTT_SERVER` = IP do PC (obter com `ipconfig` → "Endereço IPv4")
- Fazer upload no ESP32 e abrir o monitor serial (115200)

**2.3 — Configurar o servidor (`server/.env`):**
```
MQTT_BROKER_URL=mqtt://localhost
MQTT_PORT=1883
```

### Procedimento (incremental)

| Etapa | Ação | Resultado esperado |
|-------|------|--------------------|
| A | Ligar o ESP32 (sem Arduino) | Monitor serial: `[WiFi] Conectado!` e `[MQTT] Conectado!` |
| B | Observar o `mosquitto_sub` (ou o `mqtt_probe`, ver abaixo) | Mensagem retained `{"type":"gateway","status":"online"}` em `dataflow/status` |
| C | Conectar o Arduino ao ESP32 | JSONs do Arduino aparecem no `mosquitto_sub` nos tópicos `dataflow/...` |
| D | Rodar `npm start` na pasta `server/` | Logs: `[MQTT] Conectado ao broker` + `[MQTT] Inscrito no tópico: dataflow/...` |
| E | Gerar evento no Arduino | Log no servidor, ex.: `[WS →] Estoque: A=4 B=5 C=5` |

> 💡 Alternativa ao `mosquitto_sub`: use o script `test/mqtt_probe/` (Node.js), que imprime todas as mensagens com timestamp — útil para registrar evidências dos testes. Ver instruções no próprio arquivo `test/mqtt_probe/probe.js`.

### Critérios de validação
- [ ] ESP32 conecta ao Wi-Fi e ao broker (logs no monitor serial)
- [ ] Mensagens do ESP32 visíveis no `mosquitto_sub` / `mqtt_probe`
- [ ] Servidor Node.js loga as mensagens recebidas (`[WS →] ...`)
- [ ] Desligar o ESP32 da alimentação → após alguns segundos, o broker publica o LWT `{"type":"gateway","status":"offline"}` (visível no `mosquitto_sub`)

### Troubleshooting
| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| `[WiFi] Falha ao conectar` | SSID/senha errados ou rede 5GHz | ESP32 só suporta 2,4GHz; conferir credenciais |
| `[MQTT] Falha na conexao. rc=-2` | Broker inacessível | Conferir IP (`ipconfig`), Mosquitto rodando, firewall liberado na porta 1883 |
| `rc=5` | Não autorizado | `allow_anonymous true` no `mosquitto.conf` ou configurar user/pass |
| ESP32 conecta mas nada chega no broker | `MQTT_SERVER` = `localhost` no ESP32 | Usar o **IP do PC**, nunca `localhost` no ESP32 |
| Servidor não recebe | `.env` errado ou tópicos diferentes | Conferir `MQTT_BROKER_URL` e nomes dos tópicos (devem ser iguais no `.ino` e no `.env`) |
| Broker recusa conexão externa | Mosquitto em modo local-only | Usar `mosquitto.conf` com `listener 1883` + `allow_anonymous true` |

---

## Teste 3 — Comando remoto via MQTT Box → ESP32 → Arduino

> Objetivo: validar o caminho reverso (comando da rede para o hardware), sem depender ainda do dashboard.

### Materiais
- Montagem do Teste 2 funcionando
- **MQTT Box** ([mqttbox.app](http://workswithweb.com/mqttbox.html)) ou **MQTT Explorer** ([mqtt-explorer.com](https://mqtt-explorer.com/)) instalado no PC

### Procedimento
1. Abrir o MQTT Box e criar um cliente:
   - **Protocol:** `mqtt/tcp`
   - **Host:** `IP_DO_PC:1883` (ou `localhost:1883` se rodando no mesmo PC do broker)
   - Sem username/password (broker anônimo)
2. Conectar e criar um **subscriber** no tópico `dataflow/comandos/pub` (para ver as confirmações)
3. Criar um **publisher** no tópico `dataflow/comandos/sub` com o payload:
   ```json
   {"acao":"solicitar_peca","peca":"A"}
   ```
4. Publicar e observar a cadeia:
   - **Monitor serial do ESP32:** `[MQTT ←] Topico: dataflow/comandos/sub | ...` seguido de `[Serial2 →] Comando enviado ao Arduino: CMD:PECA:A`
   - **Arduino:** processa o comando (transição para `VERIFICANDO_ESTOQUE`, mensagem no LCD/serial)
   - **MQTT Box (subscriber):** recebe a confirmação `{"type":"comando","acao":"solicitar_peca","status":"encaminhado","peca":"A"}`
5. Repetir com o comando de reset:
   ```json
   {"acao":"reset"}
   ```

### Critérios de validação
- [ ] ESP32 recebe o comando MQTT e envia `CMD:PECA:A` pela Serial2
- [ ] Arduino processa o comando (mudança de estado visível no LCD ou serial)
- [ ] Confirmação publicada em `dataflow/comandos/pub`
- [ ] Comando `reset` retorna o sistema ao estado `AGUARDANDO_PEDIDO`

### Troubleshooting
| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| ESP32 não loga `[MQTT ←]` | Tópico errado no publisher | Publicar exatamente em `dataflow/comandos/sub` |
| `[MQTT] Erro ao parsear comando` | JSON malformado | Conferir aspas duplas e sintaxe do payload |
| ESP32 loga mas Arduino não reage | Serial2 desconectada / baud diferente | Conferir fiação TX2→RX e 9600 baud dos dois lados |
| Arduino reage errado | Parser de `CMD:` no sketch do Uno | Conferir tratamento de `CMD:PECA:X` e `CMD:RESET` no `.ino` do Uno |

---

## Teste 4 — End-to-End (Dashboard ↔ Arduino)

> Objetivo: validar o ciclo completo com o front-end no lugar do MQTT Box.

### Materiais
- Montagem do Teste 3 funcionando
- Servidor Node.js rodando (`cd server && npm start`)
- Navegador em `http://localhost:3000`

### Procedimento
1. Confirmar no dashboard o indicador de conexão (WebSocket + gateway ESP32 online)
2. Clicar em **"Solicitar Peça A"**
3. Acompanhar a cadeia completa:
   ```
   Dashboard → Socket.IO → Node.js → MQTT (comandos/sub) → ESP32 → Serial2 → Arduino
   Arduino executa FSM → Serial2 → ESP32 → MQTT (eventos/estoque) → Node.js → Socket.IO → Dashboard
   ```
4. Verificar no dashboard: estado da FSM, esteira acionada, estoque decrementado e evento no histórico
5. Testar cenários de erro:
   - Solicitar peça sem estoque → dashboard exibe erro
   - Provocar timeout (remover a peça antes da junção) → estado `ERRO` no dashboard → clicar em **Reset**

### Critérios de validação
- [ ] Comando do dashboard chega ao Arduino e aciona a esteira
- [ ] Entrega confirmada atualiza estoque e histórico no dashboard em tempo real
- [ ] Cenário de erro (timeout/sem estoque) refletido no dashboard
- [ ] Reset via dashboard retorna o sistema ao estado inicial
- [ ] Ao desligar o ESP32, o dashboard indica gateway offline (LWT)

---

## Teste 5 — Duas Esteiras (A + B)

> Objetivo: validar a máquina de estados completa (5 estados) e o protocolo Serial JSON final com duas esteiras secundárias, incluindo cenários de rejeição, antes de escalar para as três esteiras.

### Materiais
- Sketches em `test/esteira_peca_b/`:
  - `arduino_esteiras_ab/` no Arduino Uno
  - `esp32_esteiras_ab/` no ESP32
- 3× IRF520 (principal + A + B), 4× TCRT5000 (topo A/B, junções J1/J2)
- Broker Mosquitto local + `test/mqtt_probe/` (ou MQTT Box)

### Procedimento
1. **Fase 1 (sem ESP32):** upload no Uno e testes pelo monitor serial (9600):
   - `CMD:PECA:A` e `CMD:PECA:B` → ciclo completo de entrega
   - `CMD:PECA:C` → rejeição `peca_indisponivel`
   - Pedido durante entrega → rejeição `ocupado`
   - Timeout (peça não chega em J1/J2) → `ERRO` → `CMD:RESET`
2. **Fase 2 (com ESP32 + broker):** repetir os comandos publicando em `dataflow/comandos/sub` e observar os tópicos `dataflow/#` com o `mqtt_probe`.

Detalhes completos (pinagem, ligações e checklists): [`test/esteira_peca_b/README.md`](../test/esteira_peca_b/README.md)

### Critérios de validação
- [ ] Entregas consecutivas de A e B decrementam o estoque corretamente
- [ ] Peça C rejeitada com `{"evento":"erro","tipo":"peca_indisponivel"}` sem travar a FSM
- [ ] Pedido com FSM ocupada gera evento `ocupado`
- [ ] Timeout de 3 s → `ERRO`; `CMD:RESET` recupera o sistema
- [ ] Status periódico (`status`, `sensores`, `esteiras`) publicado a cada ~1 s nos tópicos MQTT

---

## Registro de Resultados

| # | Teste | Data | Resultado | Observações |
|---|-------|------|-----------|-------------|
| 1 | Serial Arduino ↔ ESP32 | 12/08/2026 | ✅ Aprovado | JSON recebido corretamente no ESP32 |
| 2 | ESP32 → Broker → Node.js | | ⬜ Pendente | |
| 3 | Comando via MQTT Box | | ⬜ Pendente | |
| 4 | End-to-End (Dashboard) | | ⬜ Pendente | |
| 5 | Duas esteiras (A + B) | | ⬜ Pendente | |
