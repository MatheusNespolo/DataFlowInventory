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
| B0.1 | Setup da placa (Blink + Serial) | Arduino Uno | Validar upload, GPIO e comunicação Serial básica | LED pisca + mensagens no monitor serial |
| B0.2 | Sensor IR isolado | Arduino Uno + 1 TCRT5000 | Validar leitura digital e calibração do trimpot | Detecção estável da peça (LOW/HIGH sem oscilação) |
| B0.3 | Motor isolado | Arduino Uno + IRF520 + 1 motor DC | Validar acionamento PWM via driver | Motor liga/desliga e varia velocidade por comando |
| **1** | **Serial Arduino ↔ ESP32** | Arduino Uno + ESP32 + divisor de tensão | Arduino publica status via Serial → ESP32 recebe | ESP32 imprime JSON recebido no monitor serial ✅ **(CONCLUÍDO)** |
| **B1** | **Bancada 3.1 — Ciclo completo** | Arduino Uno + IRF520 + 1 esteira + 1 TCRT5000 | Solicitar peça A → acionar motor → sensor detecta saída → parar motor | Ciclo completo funcionando |
| **B2** | **Bancada 3.2 — Sem estoque** | Mesma montagem do B1 | Solicitar peça B/C (inexistente) → retorna "peca_indisponivel" | Resposta de erro correta + recuperação via reset |
| **B3** | **Bancada 3.3 — LCD I2C** | Arduino Uno + LCD 16x2 I2C | Exibir estoque e status no display | LCD mostra informações legíveis |
| 2 | ESP32 → Broker → Node.js | Item 1 + PC com Mosquitto + server Node | ESP32 publica no broker → Node.js recebe | Mensagem aparece nos logs do servidor |
| 3 | Comando remoto (MQTT Box) | Item 2 + MQTT Box/Explorer | Enviar comando via MQTT Box → ESP32 → Arduino | Arduino processa comando (muda de estado / LCD) |
| 4 | End-to-End (Dashboard) | Item 2 + navegador | Clicar no dashboard → Arduino executa → dashboard atualiza | Ciclo completo pedido → entrega refletido na UI |
| 5 | Duas esteiras (A + B) | Itens 1–3 + 2ª esteira secundária + 2 sensores | Validar FSM completa com 2 esteiras e cenários de rejeição | Entregas A/B, rejeição de C, `ocupado`, timeout + reset |

---

## Testes de Bancada B0 (Componentes isolados)

> Objetivo: validar cada componente individualmente antes de qualquer integração. São pré-requisitos dos testes B1–B3.

### B0.1 — Setup da placa (Blink + Serial)

**Sketch:** `test/esteira_peca_a/arduino_teste_setup/`

1. Upload do sketch e abrir o monitor serial em **9600 baud**
2. Conferir o LED onboard piscando e as mensagens periódicas na serial

- [ ] LED pisca no intervalo esperado
- [ ] Mensagens legíveis no monitor serial (baud correto)

### B0.2 — Sensor IR TCRT5000 isolado

**Sketch:** `test/esteira_peca_a/arduino_teste_sensor/`

1. Ligar o TCRT5000 (VCC/GND/D0 → pino 2) e fazer upload
2. Aproximar/afastar uma peça e observar a leitura na serial
3. Ajustar o trimpot do módulo com a peça na distância real da esteira

- [ ] Saída D0 vai a LOW com a peça presente e HIGH sem peça
- [ ] Leitura estável (sem oscilação) na distância de operação

### B0.3 — Motor DC isolado (driver IRF520)

**Sketch:** `test/esteira_peca_a/arduino_teste_motor/`

1. Ligar o IRF520 (SIG → pino 3, fonte externa do motor, **GND comum**) e fazer upload
2. Testar comandos de liga/desliga e variação de PWM pela serial

- [ ] Motor responde ao PWM (liga, desliga, varia velocidade)
- [ ] **Registrar** o menor PWM que move a esteira (calibra `VELOCIDADE_MOTOR`)

---

## Testes de Bancada B1–B3 (Hardware: motor, sensor e LCD)

> Objetivo: validar os componentes físicos integrados antes de conectá-los à cadeia MQTT. Correspondem aos itens 3.1, 3.2 e 3.3 do plano do artigo.

### B1 (3.1) — Ciclo completo: solicitar → acionar → detectar → parar

**Sketch:** `test/esteira_peca_a/arduino_teste_integracao/`

#### Materiais e ligações
| Componente | Ligação | Observação |
|------------|---------|------------|
| IRF520 SIG | Pino 3 (PWM) | Sinal de controle do motor |
| IRF520 V+ / V- | Fonte externa do motor | **Nunca alimentar o motor pelo USB do Uno** |
| IRF520 GND | GND do Uno | **GND comum obrigatório** (sem ele o PWM não funciona) |
| Diodo 1N4007 | Antiparalelo nos terminais do motor | Flyback — o módulo IRF520 comum **não tem** proteção |
| TCRT5000 VCC/GND | 5V / GND do Uno | Usar módulo com comparador (saída D0) |
| TCRT5000 D0 | Pino 2 | Ajustar trimpot com a peça na distância real |

⚠️ **Cuidados:** manter os fios do motor afastados do sensor IR; se houver ruído/reset ao ligar o motor, adicionar capacitores 100 nF + 470 µF na alimentação.

#### Procedimento
1. Montar o circuito e posicionar uma peça sobre o sensor do topo (D0 deve ir a LOW — conferir LED do módulo)
2. Upload do sketch e abrir o monitor serial em **9600 baud**
3. Enviar `CMD:PECA:A`
4. Observar a sequência: `acionando` → motor liga com soft-start (rampa ~300 ms) → peça sai do sensor → motor para → evento `entregue` com `tempo_ms`
5. Repetir **sem peça** no sensor → evento `erro` tipo `sem_estoque` → enviar `CMD:RESET`
6. Repetir **segurando a peça** sobre o sensor → após 5 s, `erro` tipo `timeout` → `CMD:RESET`

#### Critérios de validação
- [ ] Ciclo completo: comando → motor liga → peça sai do sensor → motor para → `{"evento":"entregue","tempo_ms":...}`
- [ ] Sem peça: `{"evento":"erro","tipo":"sem_estoque"}` sem acionar o motor
- [ ] Timeout de 5 s funciona e para o motor
- [ ] `CMD:RESET` recupera o sistema do estado ERRO
- [ ] **Registrar** o `tempo_ms` medido (calibra o `TIMEOUT_ENTREGA` da versão final)
- [ ] **Registrar** o menor PWM que move a esteira com peça (calibra `VELOCIDADE_MOTOR`)

### B2 (3.2) — Peça inexistente

**Sketch:** o mesmo do B1 (cenário incluído).

#### Procedimento
1. Com a montagem do B1 funcionando, enviar `CMD:PECA:B` e depois `CMD:PECA:C`
2. Observar: motor **não** liga e o Arduino responde `{"evento":"erro","tipo":"peca_indisponivel","peca":"B"}`
3. Enviar `CMD:RESET` e confirmar retorno a AGUARDANDO
4. Enviar comando malformado (ex.: `CMD:XYZ`) → deve ser reportado como desconhecido, sem travar a FSM

#### Critérios de validação
- [ ] Peça B/C rejeitada com resposta explícita `peca_indisponivel` (não silenciosa)
- [ ] Motor permanece desligado durante a rejeição
- [ ] `CMD:RESET` recupera o sistema
- [ ] Comando inválido não trava a FSM

### B3 (3.3) — LCD I2C 16x2

**Sketch:** `test/esteira_peca_a/arduino_teste_lcd/`

#### Materiais e ligações
| LCD I2C | Arduino Uno |
|---------|-------------|
| SDA | A4 |
| SCL | A5 |
| VCC | 5V |
| GND | GND |

#### Procedimento
1. Upload do sketch e abrir o monitor serial (9600)
2. O sketch roda um **scanner I2C** no boot e informa o endereço encontrado (0x27 ou 0x3F, conforme o módulo)
3. Conferir a tela de boot ("Data Flow / Inventory v2.1") e a alternância automática Estoque ↔ Estado a cada 3 s
4. Testar comandos pela serial:
   - `LCD:ESTOQUE:4,5,5` → linha de estoque atualiza
   - `LCD:ESTADO:SEPARANDO A` → tela de estado fixa
   - `LCD:ERRO:TIMEOUT J1` → tela de erro fixa
5. Se o texto sair corrompido ou o display em branco: ajustar o trimpot de contraste no verso do módulo

#### Critérios de validação
- [ ] Scanner encontra o endereço do módulo (anotar o valor)
- [ ] Estoque e status exibidos corretamente, sem caracteres corrompidos
- [ ] Comandos via serial refletem no display

#### Troubleshooting (B1–B3)
| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Motor não gira | GND não comum / PWM baixo | Conferir GND Uno↔IRF520; aumentar `VELOCIDADE_MOTOR` |
| Motor gira fraco | IRF520 não satura a 5 V | Aceitável para motor 3–6 V; se insuficiente, usar PWM 255 ou driver logic-level |
| Sensor sempre LOW/HIGH | Trimpot desajustado | Calibrar com a peça na distância real da esteira |
| Entrega "confirmada" sem a peça sair | Ruído no sensor | Aumentar `DEBOUNCE_SENSOR` (50 → 100 ms) |
| Arduino reseta ao ligar motor | Pico de corrente / ruído | Fonte externa + capacitores 100 nF/470 µF; afastar fiação |
| LCD em branco | Contraste ou endereço errado | Trimpot do módulo; usar endereço do scanner |
| Nenhum dispositivo I2C | Fiação SDA/SCL invertida | SDA→A4, SCL→A5 |

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

> 💡 Alternativa reduzida: para validar a cadeia com **uma única esteira (Peça A)**, use o sketch `test/esteira_peca_a/esp32_peca_a/` no lugar do gateway completo. Ele implementa o mesmo fluxo Serial2 ↔ MQTT, porém limitado à Peça A — útil como etapa intermediária antes do gateway completo.

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
| B0.1 | Setup da placa (Blink + Serial) | | ⬜ Pendente | |
| B0.2 | Sensor IR isolado | | ⬜ Pendente | Anotar distância/trimpot calibrados |
| B0.3 | Motor isolado (IRF520) | | ⬜ Pendente | Registrar PWM mínimo |
| 1 | Serial Arduino ↔ ESP32 | 12/08/2026 | ✅ Aprovado | JSON recebido corretamente no ESP32 |
| B1 | Bancada 3.1 — Ciclo completo | | ⬜ Pendente | Registrar tempo_ms e PWM mínimo |
| B2 | Bancada 3.2 — Sem estoque | | ⬜ Pendente | |
| B3 | Bancada 3.3 — LCD I2C | | ⬜ Pendente | Anotar endereço I2C encontrado |
| 2 | ESP32 → Broker → Node.js | | ⬜ Pendente | |
| 3 | Comando via MQTT Box | | ⬜ Pendente | |
| 4 | End-to-End (Dashboard) | | ⬜ Pendente | |
| 5 | Duas esteiras (A + B) | | ⬜ Pendente | |
