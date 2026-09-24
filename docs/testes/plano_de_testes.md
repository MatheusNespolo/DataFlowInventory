# Plano de Testes â€” Data Flow Inventory

Este documento define os testes de integraÃ§Ã£o da cadeia de comunicaÃ§Ã£o do sistema, do link Serial (Arduino â†” ESP32) atÃ© o teste End-to-End (Dashboard â†” Arduino).

**Documentos relacionados:**
- ðŸ§ª [`broker_local_mosquitto.md`](../broker_local_mosquitto.md) â€” InstalaÃ§Ã£o e configuraÃ§Ã£o do broker local
- ðŸ“Š [`fluxograma_funcionamento.md`](../fluxogramas/fluxograma_funcionamento.md) â€” MÃ¡quina de estados e sequÃªncia de comunicaÃ§Ã£o
- ðŸ— [`arquitetura_mqtt.md`](../arquitetura_mqtt.md) â€” Arquitetura geral, tÃ³picos e formatos de mensagem

---

## Tabela de Testes

| # | Teste | Materiais | Objetivo | ValidaÃ§Ã£o |
|---|-------|-----------|----------|-----------|
| B0.1 | Setup da placa (Blink + Serial) | Arduino Uno | Validar upload, GPIO e comunicaÃ§Ã£o Serial bÃ¡sica | LED pisca + mensagens no monitor serial |
| B0.2 | Sensor IR isolado | Arduino Uno + 1 TCRT5000 | Validar leitura digital e calibraÃ§Ã£o do trimpot | DetecÃ§Ã£o estÃ¡vel da peÃ§a (LOW/HIGH sem oscilaÃ§Ã£o) |
| B0.3 | Motor isolado | Arduino Uno + IRF520 + 1 motor DC | Validar acionamento PWM via driver | Motor liga/desliga e varia velocidade por comando |
| **1** | **Serial Arduino â†” ESP32** | Arduino Uno + ESP32 + divisor de tensÃ£o | Arduino publica status via Serial â†’ ESP32 recebe | ESP32 imprime JSON recebido no monitor serial âœ… **(CONCLUÃDO)** |
| **B1** | **Bancada 3.1 â€” Ciclo completo** | Arduino Uno + IRF520 + 1 esteira + 1 TCRT5000 | Solicitar peÃ§a A â†’ acionar motor â†’ sensor detecta saÃ­da â†’ parar motor | Ciclo completo funcionando |
| **B2** | **Bancada 3.2 â€” Sem estoque** | Mesma montagem do B1 | Solicitar peÃ§a B/C (inexistente) â†’ retorna "peca_indisponivel" | Resposta de erro correta + recuperaÃ§Ã£o via reset |
| **B3** | **Bancada 3.3 â€” LCD I2C** | Arduino Uno + LCD 16x2 I2C | Exibir estoque e status no display | LCD mostra informaÃ§Ãµes legÃ­veis |
| 2 | ESP32 â†’ Broker â†’ Node.js | Item 1 + PC com Mosquitto + server Node | ESP32 publica no broker â†’ Node.js recebe | Mensagem aparece nos logs do servidor |
| 3 | Comando remoto (MQTT Box) | Item 2 + MQTT Box/Explorer | Enviar comando via MQTT Box â†’ ESP32 â†’ Arduino | Arduino processa comando (muda de estado / LCD) |
| 4 | End-to-End (Dashboard) | Item 2 + navegador | Clicar no dashboard â†’ Arduino executa â†’ dashboard atualiza | Ciclo completo pedido â†’ entrega refletido na UI |
| 5 | **TrÃªs esteiras (A + B + C)** | Itens 1â€“3 + 2Âª/3Âª esteira secundÃ¡ria + 4 sensores TCRT5000 + 3 drivers IRF520 | Validar FSM completa com 3 esteiras e cenÃ¡rios de rejeiÃ§Ã£o | Entregas A/B/C, rejeiÃ§Ã£o de peÃ§a inexistente, `ocupado`, timeout + reset |
| 6 | MigraÃ§Ã£o para broker remoto (HiveMQ Cloud) | Item 2 aprovado + conta HiveMQ Cloud + `USE_TLS=true` no ESP32 | Repetir a cadeia de comunicaÃ§Ã£o (Serial â†’ MQTT â†’ Dashboard) usando um broker em nuvem via TLS, sem alterar lÃ³gica de FSM | âœ… **(CONCLUÃDO)** ConexÃ£o TLS/8883, integraÃ§Ã£o real, E2E validado |

---

## Testes de Bancada B0 (Componentes isolados)

> Objetivo: validar cada componente individualmente antes de qualquer integraÃ§Ã£o. SÃ£o prÃ©-requisitos dos testes B1â€“B3.

### B0.1 â€” Setup da placa (Blink + Serial)

**Sketch:** `test/esteira_peca_a/arduino_teste_setup/`

1. Upload do sketch e abrir o monitor serial em **9600 baud**
2. Conferir o LED onboard piscando e as mensagens periÃ³dicas na serial

- [ ] LED pisca no intervalo esperado
- [ ] Mensagens legÃ­veis no monitor serial (baud correto)

### B0.2 â€” Sensor IR TCRT5000 isolado

**Sketch:** `test/esteira_peca_a/arduino_teste_sensor/`

1. Ligar o TCRT5000 (VCC/GND/D0 â†’ pino 2) e fazer upload
2. Aproximar/afastar uma peÃ§a e observar a leitura na serial
3. Ajustar o trimpot do mÃ³dulo com a peÃ§a na distÃ¢ncia real da esteira

- [ ] SaÃ­da D0 vai a LOW com a peÃ§a presente e HIGH sem peÃ§a
- [ ] Leitura estÃ¡vel (sem oscilaÃ§Ã£o) na distÃ¢ncia de operaÃ§Ã£o

### B0.3 â€” Motor DC isolado (driver IRF520)

**Sketch:** `test/esteira_peca_a/arduino_teste_motor/`

1. Ligar o IRF520 (SIG â†’ pino 3, fonte externa do motor, **GND comum**) e fazer upload
2. Testar comandos de liga/desliga e variaÃ§Ã£o de PWM pela serial

- [ ] Motor responde ao PWM (liga, desliga, varia velocidade)
- [ ] **Registrar** o menor PWM que move a esteira (calibra `VELOCIDADE_MOTOR`)

---

## Testes de Bancada B1â€“B3 (Hardware: motor, sensor e LCD)

> Objetivo: validar os componentes fÃ­sicos integrados antes de conectÃ¡-los Ã  cadeia MQTT. Correspondem aos itens 3.1, 3.2 e 3.3 do plano do artigo.

### B1 (3.1) â€” Ciclo completo: solicitar â†’ acionar â†’ detectar â†’ parar

**Sketch:** `test/esteira_peca_a/arduino_teste_integracao/`

#### Materiais e ligaÃ§Ãµes
| Componente | LigaÃ§Ã£o | ObservaÃ§Ã£o |
|------------|---------|------------|
| IRF520 SIG | Pino 3 (PWM) | Sinal de controle do motor |
| IRF520 V+ / V- | Fonte externa do motor | **Nunca alimentar o motor pelo USB do Uno** |
| IRF520 GND | GND do Uno | **GND comum obrigatÃ³rio** (sem ele o PWM nÃ£o funciona) |
| Diodo 1N4007 | Antiparalelo nos terminais do motor | Flyback â€” o mÃ³dulo IRF520 comum **nÃ£o tem** proteÃ§Ã£o |
| TCRT5000 VCC/GND | 5V / GND do Uno | Usar mÃ³dulo com comparador (saÃ­da D0) |
| TCRT5000 D0 | Pino 2 | Ajustar trimpot com a peÃ§a na distÃ¢ncia real |

âš ï¸ **Cuidados:** manter os fios do motor afastados do sensor IR; se houver ruÃ­do/reset ao ligar o motor, adicionar capacitores 100 nF + 470 ÂµF na alimentaÃ§Ã£o.

#### Procedimento
1. Montar o circuito e posicionar uma peÃ§a sobre o sensor do topo (D0 deve ir a LOW â€” conferir LED do mÃ³dulo)
2. Upload do sketch e abrir o monitor serial em **9600 baud**
3. Enviar `CMD:PECA:A`
4. Observar a sequÃªncia: `acionando` â†’ motor liga com soft-start (rampa ~300 ms) â†’ peÃ§a sai do sensor â†’ motor para â†’ evento `entregue` com `tempo_ms`
5. Repetir **sem peÃ§a** no sensor â†’ evento `erro` tipo `sem_estoque` â†’ enviar `CMD:RESET`
6. Repetir **segurando a peÃ§a** sobre o sensor â†’ apÃ³s **9 s**, `erro` tipo `timeout` â†’ `CMD:RESET`

#### CritÃ©rios de validaÃ§Ã£o
- [ ] Ciclo completo: comando â†’ motor liga â†’ peÃ§a sai do sensor â†’ motor para â†’ `{"evento":"entregue","tempo_ms":...}`
- [ ] Sem peÃ§a: `{"evento":"erro","tipo":"sem_estoque"}` sem acionar o motor
- [ ] **Timeout de 9 s** funciona e para o motor
- [ ] `CMD:RESET` recupera o sistema do estado ERRO
- [ ] **Registrar** o `tempo_ms` medido (calibra o `TIMEOUT_ENTREGA` da versÃ£o final)
- [ ] **Registrar** o menor PWM que move a esteira com peÃ§a (calibra `VELOCIDADE_MOTOR`)

### B2 (3.2) â€” PeÃ§a inexistente

**Sketch:** o mesmo do B1 (cenÃ¡rio incluÃ­do).

#### Procedimento
1. Com a montagem do B1 funcionando, enviar `CMD:PECA:B` e depois `CMD:PECA:C`
2. Observar: motor **nÃ£o** liga e o Arduino responde `{"evento":"erro","tipo":"peca_indisponivel","peca":"B"}`
3. Enviar `CMD:RESET` e confirmar retorno a AGUARDANDO
4. Enviar comando malformado (ex.: `CMD:XYZ`) â†’ deve ser reportado como desconhecido, sem travar a FSM

#### CritÃ©rios de validaÃ§Ã£o
- [ ] PeÃ§a B/C rejeitada com resposta explÃ­cita `peca_indisponivel` (nÃ£o silenciosa)
- [ ] Motor permanece desligado durante a rejeiÃ§Ã£o
- [ ] `CMD:RESET` recupera o sistema
- [ ] Comando invÃ¡lido nÃ£o trava a FSM

### B3 (3.3) â€” LCD I2C 16x2

**Sketch:** `test/esteira_peca_a/arduino_teste_lcd/`

#### Materiais e ligaÃ§Ãµes
| LCD I2C | Arduino Uno |
|---------|-------------|
| SDA | A4 |
| SCL | A5 |
| VCC | 5V |
| GND | GND |

#### Procedimento
1. Upload do sketch e abrir o monitor serial (9600)
2. O sketch roda um **scanner I2C** no boot e informa o endereÃ§o encontrado (0x27 ou 0x3F, conforme o mÃ³dulo)
3. Conferir a tela de boot ("Data Flow / Inventory v2.1") e a alternÃ¢ncia automÃ¡tica Estoque â†” Estado a cada 3 s
4. Testar comandos pela serial:
   - `LCD:ESTOQUE:4,5,5` â†’ linha de estoque atualiza
   - `LCD:ESTADO:SEPARANDO A` â†’ tela de estado fixa
   - `LCD:ERRO:TIMEOUT J1` â†’ tela de erro fixa
5. Se o texto sair corrompido ou o display em branco: ajustar o trimpot de contraste no verso do mÃ³dulo

#### CritÃ©rios de validaÃ§Ã£o
- [ ] Scanner encontra o endereÃ§o do mÃ³dulo (anotar o valor)
- [ ] Estoque e status exibidos corretamente, sem caracteres corrompidos
- [ ] Comandos via serial refletem no display

#### Troubleshooting (B1â€“B3)
| Sintoma | Causa provÃ¡vel | SoluÃ§Ã£o |
|---------|----------------|---------|
| Motor nÃ£o gira | GND nÃ£o comum / PWM baixo | Conferir GND Unoâ†”IRF520; aumentar `VELOCIDADE_MOTOR` |
| Motor gira fraco | IRF520 nÃ£o satura a 5 V | AceitÃ¡vel para motor 3â€“6 V; se insuficiente, usar PWM 255 ou driver logic-level |
| Sensor sempre LOW/HIGH | Trimpot desajustado | Calibrar com a peÃ§a na distÃ¢ncia real da esteira |
| Entrega "confirmada" sem a peÃ§a sair | RuÃ­do no sensor | Aumentar `DEBOUNCE_SENSOR` (50 â†’ 100 ms) |
| Arduino reseta ao ligar motor | Pico de corrente / ruÃ­do | Fonte externa + capacitores 100 nF/470 ÂµF; afastar fiaÃ§Ã£o |
| LCD em branco | Contraste ou endereÃ§o errado | Trimpot do mÃ³dulo; usar endereÃ§o do scanner |
| Nenhum dispositivo I2C | FiaÃ§Ã£o SDA/SCL invertida | SDAâ†’A4, SCLâ†’A5 |

---

## Teste 1 â€” Serial Arduino â†” ESP32

### Materiais
- Arduino Uno com sketch `arduino/data_flow_inventory/data_flow_inventory.ino` (ou `test/esteira_peca_a/arduino_teste_serial/`)
- ESP32 com sketch `test/esteira_peca_a/esp32_teste_serial/` (ou o gateway completo)
- Divisor de tensÃ£o (1kÎ© + 2kÎ©) entre TX do Uno e RX2 do ESP32
- GND comum entre as duas placas

### LigaÃ§Ãµes
| Arduino Uno | ESP32 | ObservaÃ§Ã£o |
|-------------|-------|------------|
| TX (pino 1) | RX2 (GPIO16) | Via divisor de tensÃ£o 5V â†’ 3,3V |
| RX (pino 0) | TX2 (GPIO17) | Direto |
| GND | GND | Comum obrigatÃ³rio |

### Procedimento
1. Fazer upload do sketch no Uno **com o ESP32 desconectado dos pinos 0/1**
2. Reconectar o ESP32 e fazer upload do sketch do ESP32
3. Abrir o monitor serial do ESP32 em **115200 baud**
4. Gerar um evento no Arduino (pressionar botÃ£o / aguardar publicaÃ§Ã£o periÃ³dica)

### CritÃ©rio de validaÃ§Ã£o
- [x] O monitor serial do ESP32 exibe as linhas JSON vindas do Arduino, ex.:
  ```
  [Serial2] {"type":"status","estado":"AGUARDANDO_PEDIDO",...}
  ```
- [x] Linhas de debug nÃ£o-JSON aparecem marcadas como `[Serial2 nao-JSON]`

### Resultado
âœ… **Aprovado** â€” JSON recebido e impresso corretamente pelo ESP32.

---

## Teste 2 â€” ESP32 â†’ Broker MQTT â†’ Node.js

> Objetivo: validar que o ESP32 publica no Mosquitto e que o servidor Node.js recebe as mensagens.

### Materiais
- Montagem do Teste 1 funcionando
- PC com **Mosquitto** instalado e rodando (ver [`broker_local_mosquitto.md`](../broker_local_mosquitto.md))
- PC e ESP32 na **mesma rede Wi-Fi**
- Pasta `server/` com dependÃªncias instaladas (`npm install`)

### PreparaÃ§Ã£o

**2.1 â€” Broker rodando e testado (sem hardware):**
```bash
# Iniciar o Mosquitto (verbose para acompanhar conexÃµes)
mosquitto -v -c mosquitto.conf

# Terminal 2 â€” inscrever em todos os tÃ³picos do projeto
mosquitto_sub -h localhost -t "dataflow/#" -v

# Terminal 3 â€” publicar mensagem de teste
mosquitto_pub -h localhost -t "dataflow/status" -m "{\"type\":\"status\",\"estado\":\"Teste\"}"
```
âœ” A mensagem deve aparecer no terminal do `mosquitto_sub`. Isso confirma que o broker funciona **antes** de envolver o hardware.

**2.2 â€” Configurar o ESP32 (`esp32/gateway_mqtt/gateway_mqtt.ino`):**

> ðŸ’¡ Alternativa reduzida: para validar a cadeia com **uma Ãºnica esteira (PeÃ§a A)**, use o sketch `test/esteira_peca_a/esp32_peca_a/` no lugar do gateway completo. Ele implementa o mesmo fluxo Serial2 â†” MQTT, porÃ©m limitado Ã  PeÃ§a A â€” Ãºtil como etapa intermediÃ¡ria antes do gateway completo.

- `USE_TLS` = `false`
- `SSID` / `SENHA` = credenciais do Wi-Fi (mesma rede do PC)
- `MQTT_SERVER` = IP do PC (obter com `ipconfig` â†’ "EndereÃ§o IPv4")
- Fazer upload no ESP32 e abrir o monitor serial (115200)

**2.3 â€” Configurar o servidor (`server/.env`):**
```
MQTT_BROKER_URL=mqtt://localhost
MQTT_PORT=1883
```

### Procedimento (incremental)

| Etapa | AÃ§Ã£o | Resultado esperado |
|-------|------|--------------------|
| A | Ligar o ESP32 (sem Arduino) | Monitor serial: `[WiFi] Conectado!` e `[MQTT] Conectado!` |
| B | Observar o `mosquitto_sub` (ou o `mqtt_probe`, ver abaixo) | Mensagem retained `{"type":"gateway","status":"online"}` em `dataflow/status` |
| C | Conectar o Arduino ao ESP32 | JSONs do Arduino aparecem no `mosquitto_sub` nos tÃ³picos `dataflow/...` |
| D | Rodar `npm start` na pasta `server/` | Logs: `[MQTT] Conectado ao broker` + `[MQTT] Inscrito no tÃ³pico: dataflow/...` |
| E | Gerar evento no Arduino | Log no servidor, ex.: `[WS â†’] Estoque: A=4 B=5 C=5` |

> ðŸ’¡ Alternativa ao `mosquitto_sub`: use o script `test/mqtt_probe/` (Node.js), que imprime todas as mensagens com timestamp â€” Ãºtil para registrar evidÃªncias dos testes. Ver instruÃ§Ãµes no prÃ³prio arquivo `test/mqtt_probe/probe.js`.

### CritÃ©rios de validaÃ§Ã£o
- [ ] ESP32 conecta ao Wi-Fi e ao broker (logs no monitor serial)
- [ ] Mensagens do ESP32 visÃ­veis no `mosquitto_sub` / `mqtt_probe`
- [ ] Servidor Node.js loga as mensagens recebidas (`[WS â†’] ...`)
- [ ] Desligar o ESP32 da alimentaÃ§Ã£o â†’ apÃ³s alguns segundos, o broker publica o LWT `{"type":"gateway","status":"offline"}` (visÃ­vel no `mosquitto_sub`)

### Troubleshooting
| Sintoma | Causa provÃ¡vel | SoluÃ§Ã£o |
|---------|----------------|---------|
| `[WiFi] Falha ao conectar` | SSID/senha errados ou rede 5GHz | ESP32 sÃ³ suporta 2,4GHz; conferir credenciais |
| `[MQTT] Falha na conexao. rc=-2` (USE_TLS false / local) | Broker local inacessível | Conferir IP (`ipconfig`), Mosquitto rodando, firewall liberado na porta 1883 |
| `[MQTT] Falha na conexao. rc=-2` (USE_TLS true / HiveMQ 8883) | Firewall corporativo bloqueando 8883 · cluster hibernado | Testar via hotspot 4G · `Test-NetConnection -Port 8883` · Ver `docs/testes/validações/troubleshooting_bancada_22-23_09.md` |
| `rc=5` | NÃ£o autorizado | `allow_anonymous true` no `mosquitto.conf` ou configurar user/pass |
| ESP32 conecta mas nada chega no broker | `MQTT_SERVER` = `localhost` no ESP32 | Usar o **IP do PC**, nunca `localhost` no ESP32 |
| Servidor nÃ£o recebe | `.env` errado ou tÃ³picos diferentes | Conferir `MQTT_BROKER_URL` e nomes dos tÃ³picos (devem ser iguais no `.ino` e no `.env`) |
| Broker recusa conexÃ£o externa | Mosquitto em modo local-only | Usar `mosquitto.conf` com `listener 1883` + `allow_anonymous true` |

---

## Teste 3 â€” Comando remoto via MQTT Box â†’ ESP32 â†’ Arduino

> Objetivo: validar o caminho reverso (comando da rede para o hardware), sem depender ainda do dashboard.

### Materiais
- Montagem do Teste 2 funcionando
- **MQTT Box** ([mqttbox.app](http://workswithweb.com/mqttbox.html)) ou **MQTT Explorer** ([mqtt-explorer.com](https://mqtt-explorer.com/)) instalado no PC

### Procedimento
1. Abrir o MQTT Box e criar um cliente:
   - **Protocol:** `mqtt/tcp`
   - **Host:** `IP_DO_PC:1883` (ou `localhost:1883` se rodando no mesmo PC do broker)
   - Sem username/password (broker anÃ´nimo)
2. Conectar e criar um **subscriber** no tÃ³pico `dataflow/comandos/pub` (para ver as confirmaÃ§Ãµes)
3. Criar um **publisher** no tÃ³pico `dataflow/comandos/sub` com o payload:
   ```json
   {"acao":"solicitar_peca","peca":"A"}
   ```
4. Publicar e observar a cadeia:
   - **Monitor serial do ESP32:** `[MQTT â†] Topico: dataflow/comandos/sub | ...` seguido de `[Serial2 â†’] Comando enviado ao Arduino: CMD:PECA:A`
   - **Arduino:** processa o comando (transiÃ§Ã£o para `VERIFICANDO_ESTOQUE`, mensagem no LCD/serial)
   - **MQTT Box (subscriber):** recebe a confirmaÃ§Ã£o `{"type":"comando","acao":"solicitar_peca","status":"encaminhado","peca":"A"}`
5. Repetir com o comando de reset:
   ```json
   {"acao":"reset"}
   ```

### CritÃ©rios de validaÃ§Ã£o
- [ ] ESP32 recebe o comando MQTT e envia `CMD:PECA:A` pela Serial2
- [ ] Arduino processa o comando (mudanÃ§a de estado visÃ­vel no LCD ou serial)
- [ ] ConfirmaÃ§Ã£o publicada em `dataflow/comandos/pub`
- [ ] Comando `reset` retorna o sistema ao estado `AGUARDANDO_PEDIDO`

### Troubleshooting
| Sintoma | Causa provÃ¡vel | SoluÃ§Ã£o |
|---------|----------------|---------|
| ESP32 nÃ£o loga `[MQTT â†]` | TÃ³pico errado no publisher | Publicar exatamente em `dataflow/comandos/sub` |
| `[MQTT] Erro ao parsear comando` | JSON malformado | Conferir aspas duplas e sintaxe do payload |
| ESP32 loga mas Arduino nÃ£o reage | Serial2 desconectada / baud diferente | Conferir fiaÃ§Ã£o TX2â†’RX e 9600 baud dos dois lados |
| Arduino reage errado | Parser de `CMD:` no sketch do Uno | Conferir tratamento de `CMD:PECA:X` e `CMD:RESET` no `.ino` do Uno |

---

## Teste 4 â€” End-to-End (Dashboard â†” Arduino)

> Objetivo: validar o ciclo completo com o front-end no lugar do MQTT Box.

### Materiais
- Montagem do Teste 3 funcionando
- Servidor Node.js rodando (`cd server && npm start`)
- Navegador em `http://localhost:3000`

### Procedimento
1. Confirmar no dashboard o indicador de conexÃ£o (WebSocket + gateway ESP32 online)
2. Clicar em **"Solicitar PeÃ§a A"**
3. Acompanhar a cadeia completa:
   ```
   Dashboard â†’ Socket.IO â†’ Node.js â†’ MQTT (comandos/sub) â†’ ESP32 â†’ Serial2 â†’ Arduino
   Arduino executa FSM â†’ Serial2 â†’ ESP32 â†’ MQTT (eventos/estoque) â†’ Node.js â†’ Socket.IO â†’ Dashboard
   ```
4. Verificar no dashboard: estado da FSM, esteira acionada, estoque decrementado e evento no histÃ³rico
5. Testar cenÃ¡rios de erro:
   - Solicitar peÃ§a sem estoque â†’ dashboard exibe erro
   - Provocar timeout (remover a peÃ§a antes da junÃ§Ã£o) â†’ estado `ERRO` no dashboard â†’ clicar em **Reset**

### CritÃ©rios de validaÃ§Ã£o
- [ ] Comando do dashboard chega ao Arduino e aciona a esteira
- [ ] Entrega confirmada atualiza estoque e histÃ³rico no dashboard em tempo real
- [ ] CenÃ¡rio de erro (timeout/sem estoque) refletido no dashboard
- [ ] Reset via dashboard retorna o sistema ao estado inicial
- [ ] Ao desligar o ESP32, o dashboard indica gateway offline (LWT)

---

## Teste 5 â€” Duas Esteiras (A + B)

> Objetivo: validar a mÃ¡quina de estados completa (5 estados) e o protocolo Serial JSON final com duas esteiras secundÃ¡rias, incluindo cenÃ¡rios de rejeiÃ§Ã£o, antes de escalar para as trÃªs esteiras.

### Materiais
- Sketches em `test/esteira_peca_b/`:
  - `arduino_esteiras_ab/` no Arduino Uno
  - `esp32_esteiras_ab/` no ESP32
- 2Ã— IRF520 (esteiras A + B â€” a principal liga direto na fonte, sem driver), 4Ã— TCRT5000 (topo A/B, junÃ§Ãµes J1/J2)
- Broker Mosquitto local + `test/mqtt_probe/` (ou MQTT Box)

### Procedimento
1. **Fase 1 (sem ESP32):** upload no Uno e testes pelo monitor serial (9600):
   - `CMD:PECA:A` e `CMD:PECA:B` â†’ ciclo completo de entrega
   - `CMD:PECA:C` â†’ rejeiÃ§Ã£o `peca_indisponivel`
   - Pedido durante entrega â†’ rejeiÃ§Ã£o `ocupado`
   - Timeout (peÃ§a nÃ£o chega em J1/J2) â†’ `ERRO` â†’ `CMD:RESET`
2. **Fase 2 (com ESP32 + broker):** repetir os comandos publicando em `dataflow/comandos/sub` e observar os tÃ³picos `dataflow/#` com o `mqtt_probe`.

Detalhes completos (pinagem, ligaÃ§Ãµes e checklists): [`test/esteira_peca_b/README.md`](../../test/esteira_peca_b/README.md)

### CritÃ©rios de validaÃ§Ã£o
- [ ] Entregas consecutivas de A e B decrementam o estoque corretamente
- [ ] PeÃ§a C rejeitada com `{"evento":"erro","tipo":"peca_indisponivel"}` sem travar a FSM
- [ ] Pedido com FSM ocupada gera evento `ocupado`
- [ ] **Timeout de 9 s** â†’ `ERRO`; `CMD:RESET` recupera o sistema
- [ ] Status periÃ³dico (`status`, `sensores`, `esteiras`) publicado a cada ~1 s nos tÃ³picos MQTT

---

## Teste 6 â€” MigraÃ§Ã£o para Broker Remoto (HiveMQ Cloud)

> Objetivo: validar a mesma cadeia de comunicaÃ§Ã£o (Serial â†’ MQTT â†’ Dashboard) usando um broker em **nuvem via TLS**, isolando a variÃ¡vel "rede/TLS" da lÃ³gica de FSM jÃ¡ validada localmente (Teste 2 e Teste 4). Executar apenas com o sistema estÃ¡vel no broker local.

### Materiais
- Sistema local jÃ¡ validado (Testes 1, 2 e 4 aprovados)
- Conta gratuita em [cloud.hivemq.com](https://cloud.hivemq.com) + cluster criado
- Credenciais (username/password) do cluster

### Procedimento
1. Criar cluster gratuito no HiveMQ Cloud e gerar credenciais de acesso.
2. **ESP32** (`esp32/gateway_mqtt/gateway_mqtt.ino`): alterar `USE_TLS` para `true`, `MQTT_SERVER` para `<cluster>.s1.eu.hivemq.com`, `MQTT_PORT` para `8883`, preencher `MQTT_USER`/`MQTT_PASS` â†’ reupload.
3. **Servidor** (`server/.env`): `MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com`, `MQTT_PORT=8883` + credenciais â†’ reiniciar `npm start`.
4. Repetir o fluxo do Teste 4 (pedido de peÃ§a A via Dashboard â†’ entrega completa) usando o broker remoto.
5. Validar a persistÃªncia do LWT (`gateway offline/online`) tambÃ©m no broker remoto.
6. Ao final, reverter para `USE_TLS=false` (broker local) caso a bancada continue em uso no mesmo dia.

### CritÃ©rios de validaÃ§Ã£o
- [ ] ESP32 conecta ao broker remoto via TLS (monitor serial: `[MQTT] Conectado!`)
- [ ] Servidor Node conecta ao broker remoto (`mqtts://`, porta 8883)
- [ ] Ciclo completo pedido â†’ entrega refletido no Dashboard via nuvem
- [ ] LWT (`gateway offline/online`) funciona igual ao broker local
- [ ] Nenhuma alteraÃ§Ã£o de lÃ³gica de FSM foi necessÃ¡ria (apenas configuraÃ§Ã£o de conexÃ£o)

> ðŸ’¡ Ver detalhes de configuraÃ§Ã£o em [`docs/broker_local_mosquitto.md`](../broker_local_mosquitto.md#etapa-e--migraÃ§Ã£o-para-hivemq-cloud-futuro) e [`docs/arquitetura_mqtt.md`](../arquitetura_mqtt.md#opÃ§Ã£o-2-hivemq-cloud-nuvem-tls).

---

## Registro de Resultados

| # | Teste | Data | Resultado | ObservaÃ§Ãµes |
|---|-------|------|-----------|-------------|
| B0.1 | Setup da placa (Blink + Serial) | 12/08/2026 | âœ… Aprovado | Teste inicial |
| B0.2 | Sensor IR isolado | 01/09/2026 | âœ… Aprovado | Sensores TCRT5000 testados e calibrados isoladamente (sensores de topo e de junÃ§Ã£o para as esteiras adicionais B e C) |
| B0.3 | Motor isolado (IRF520) | 12/08/2026 | âœ… Aprovad | PWM mÃ­nimo: 150 |
| 1 | Serial Arduino â†” ESP32 | 12/08/2026 | âœ… Aprovado | JSON recebido corretamente no ESP32 |
| B1 | Bancada 3.1 â€” Ciclo completo | 18/08/2026 | âœ… Aprovado | tempo_ms: 5000 Â· PWM mÃ­nimo: 150 (calibraÃ§Ãµes aplicadas ao sketch principal) |
| B2 | Bancada 3.2 â€” Sem estoque | 18/08/2026 | âœ… Aprovado | RejeiÃ§Ã£o `peca_indisponivel` + recuperaÃ§Ã£o via reset OK |
| B3 | Bancada 3.3 â€” LCD I2C | 18/08/2026 | âœ… Aprovado | EndereÃ§o I2C: 0x27 |
| 2 | ESP32 â†’ Broker â†’ Node.js | 25/08/2026 | âœ… Aprovado | JSONs do Uno chegam via ESP32 aos tÃ³picos dataflow/#; broker 0.0.0.0:1883 OK |
| 3 | Comando via MQTT Box | 01/09/2026 | âœ… Aprovado | Comando direto via MQTT Box em `dataflow/comandos/sub` validado de forma desacoplada; ESP32 repassa `CMD:PECA:A` e FSM aciona esteira com confirmaÃ§Ã£o em `dataflow/comandos/pub` |
| 4 | End-to-End (Dashboard) | 25/08/2026 | âœ… Aprovado | Pedido de peÃ§a A via Dashboard â†’ esteira parte â†’ entrega completa |
| 5 | TrÃªs esteiras (A + B + C) | 08â€“12/09/2026 | âœ… Aprovado | 3 esteiras integradas (3Ã— IRF520 + 6Ã— TCRT5000), entregas A/B/C e rejeiÃ§Ãµes validadas |
| 6 | MigraÃ§Ã£o para broker remoto (HiveMQ Cloud) | 02/09/2026 | âš ï¸ Parcial | ConexÃ£o TLS 8883 e tÃ³picos retained OK; E2E remoto em teste paralelo |
| S | Scripts de Setup e CI/CD (S1â€“S6) | 15/09/2026 | âœ… Aprovado | Scripts `.sh`/`.ps1` (setup, validate-env, precommit), GitHub Actions e saneamento Git |
| BK | Beckhoff â€” Historiador SQLite (CX9240) | 15/09/2026 | âœ… Aprovado | PersistÃªncia no SQLite local (`/var/lib/dfi/historian.db`) via TF6701 + TF6420 validada com simulador MQTT |
| M1 | Montagem mecÃ¢nica das esteiras | 15/09/2026 | âœ… Aprovado | Alinhamento e fixaÃ§Ã£o das esteiras na estrutura mecÃ¢nica concluÃ­dos |
| â€” | Plano B (Simulador) | 25/08/2026 | âœ… Aprovado | Frontend + Simulador validados sem hardware fÃ­sico |

**ObservaÃ§Ãµes 25/08:**
- `TIMEOUT_ENTREGA` ajustado de 8 s â†’ **12 s** preliminarmente (peÃ§a chegava no sensor mas nÃ£o saÃ­a da esteira secundÃ¡ria)
- Adicionado `publicarEstoque()` em `setup()` e `CMD:RESET` para sincronizar LCD â†” Dashboard
- Divisor 1k/2kÎ© + GND comum confirmados como crÃ­ticos para UART Unoâ†”ESP32

**ObservaÃ§Ãµes 26/08:**
- Introduzida automaÃ§Ã£o de validaÃ§Ã£o de infraestrutura (`docs/testes/validaÃ§Ãµes/validar_infra.ps1`) e checklist de rede/infra correspondente
- Sistema ainda opera com **broker local (Mosquitto)**; conexÃ£o com **broker remoto (HiveMQ Cloud)** planejada para rodada futura (Teste 6), condicionada Ã  consolidaÃ§Ã£o da esteira A

**ObservaÃ§Ãµes 27â€“28/08:**
- `TIMEOUT_ENTREGA` recalibrado para **9 s** (`TIMEOUT_ENTREGA = 9000` + `TEMPO_SAIDA_ESTEIRA_MS = 3000`) apÃ³s validaÃ§Ã£o com esteira A fÃ­sica (travessia ~5 s atÃ© o sensor + 3 s de saÃ­da cabem com folga em 9 s). Aprovado com recuperaÃ§Ã£o via `CMD:RESET`.
- SeparaÃ§Ã£o de tÃ³picos de status (`dataflow/status` para gateway ESP32 e `dataflow/status/server` para backend Node.js), eliminando conflito de sobrescrita de mensagem retained.
- Estoque retained em `dataflow/estoque` aprovado: Dashboard sincroniza imediatamente no carregamento inicial e reconexÃµes.
- RejeiÃ§Ãµes explÃ­citas de comando (`peca_invalida`, `ocupado`, `comando_desconhecido`) e tolerÃ¢ncia a payloads malformados validadas no gateway ESP32.

**ObservaÃ§Ãµes 01/09:**
- **Sensores das Esteiras Adicionais (B e C):** Realizado o teste e calibraÃ§Ã£o prÃ©via dos sensores reflexivos infravermelhos (TCRT5000) de topo e junÃ§Ã£o destinados Ã s esteiras B e C, garantindo detecÃ§Ã£o e resposta digital estÃ¡vel (LOW/HIGH) antes da montagem mecÃ¢nica completa (`B0.2`).
- **Robustez e LWT do Gateway:** Queda de alimentaÃ§Ã£o/desconexÃ£o fÃ­sica do ESP32 dispara publicaÃ§Ã£o do LWT `{"type":"gateway","status":"offline"}` em `dataflow/status` e badge vermelho no Dashboard; religamento do ESP32 restabelece status `online` automaticamente sem necessidade de reload manual.
- **ReconexÃ£o do Broker:** Queda e reinicializaÃ§Ã£o do broker Mosquitto restauram a conexÃ£o do ESP32 e do Servidor Node.js, preservando mensagens com flag retained (`dataflow/estoque` e `dataflow/status`).
- **RejeiÃ§Ãµes ExplÃ­citas e ResiliÃªncia da FSM:** InjeÃ§Ã£o direta via MQTT dos cenÃ¡rios `ocupado`, `peca_invalida`, `comando_desconhecido` e JSON malformado tratadas com resposta explÃ­cita pelo ESP32 e sem travamento da FSM do Arduino Uno.
- **Teste 3 Puro (MQTT Box):** Validado e aprovado via cliente MQTT externo (MQTT Box / Explorer), formalizando a evidÃªncia de controle remoto desacoplada da interface web.
- **Teste 5 (Esteiras A + B):** Mantido como `â¬œ Pendente` / `Blocked` aguardando a disponibilizaÃ§Ã£o do segundo mÃ³dulo IRF520 na bancada fÃ­sica.
- **Teste 6 (HiveMQ Cloud):** Mantido como `â¬œ Pendente` em Backlog como stretch goal.

**ObservaÃ§Ãµes 02/09:**
- **Teste 6 (HiveMQ Cloud) â€” Parcialmente Validado:** ConexÃ£o TLS/8883 estabelecida com sucesso tanto no ESP32 (`WiFiClientSecure` + `setCACert`) quanto no Node.js (`mqtts://` + opÃ§Ãµes TLS). TÃ³picos retained (`dataflow/estoque`, `dataflow/status`) sincronizam corretamente. Comando via MQTT Box remoto (desacoplado do Dashboard) validado.
- **Dashboard E2E Remoto (Pendente):** Tentativa de validaÃ§Ã£o end-to-end via Dashboard ficou bloqueada por questÃµes de firewall corporativo; equipe abortou ajuste temporÃ¡rio. Itens **Bloco 4** (Dashboard E2E remoto) e **Bloco 5** (LWT offline/online remoto, reconexÃ£o Wi-Fi, reinÃ­cio Node.js) ficaram pendentes para 03/09.
- **Teste 5 (Esteiras A + B):** Permanece `â¬œ Blocked` aguardando segundo mÃ³dulo IRF520 MOSFET.

**ObservaÃ§Ãµes 03/09:**
- **Fix de RejeiÃ§Ã£o de Comandos:** Corrigido bug crÃ­tico onde comandos invÃ¡lidos (ex.: `CMD:PECA:Z`) ou rejeitados pelo gateway (ex.: `peca_invalida`, `sem_estoque`) apareciam como "Comando enviado" no histÃ³rico do Dashboard. Causa raiz dupla: (1) `server.js` emitia evento `comando` para **todas** as mensagens do tÃ³pico `dataflow/comandos/pub`, independente do campo `status`; (2) `app.js` adicionava entradas de histÃ³rico **antes** da confirmaÃ§Ã£o do servidor (optimistic UI sem rollback). SoluÃ§Ã£o: `server.js` agora inspeciona `msgJson.status` e roteia `'rejeitado'` para evento `comando_erro` separado; `app.js` sÃ³ adiciona histÃ³rico apÃ³s receber confirmaÃ§Ã£o via Socket.IO. ValidaÃ§Ã£o pendente de execuÃ§Ã£o (roteiro de hoje).
- **Teste 6 (HiveMQ Cloud) â€” ValidaÃ§Ã£o Completa Pendente:** Blocos 4 e 5 (Dashboard E2E remoto, LWT/reconexÃ£o remota) aguardando execuÃ§Ã£o conforme roteiro de 03/09, condicionado Ã  resoluÃ§Ã£o do firewall ou ambiente de rede alternativo.
- **Teste 5 (Esteiras A + B):** Permanece `â¬œ Blocked` aguardando hardware.

**ObservaÃ§Ãµes 08â€“12/09:**
- **Teste 5 (TrÃªs Esteiras A+B+C) â€” CONCLUÃDO:** Hardware adicional (2Âº/3Âº driver IRF520 + motores + sensores TCRT5000 de topo/junÃ§Ã£o para B e C) integrado com sucesso. Comando MQTT Box enviado com sucesso para peÃ§as B e C. CenÃ¡rios de rejeiÃ§Ã£o (timeout, comando invÃ¡lido, `ocupado`, `sem_estoque`) replicados com sucesso seguindo o padrÃ£o validado para a esteira A. CalibraÃ§Ã£o de sensores revalidada na montagem real. Ajuste mecÃ¢nico das demais esteiras concluÃ­do. Card #9 â†’ **Done**.
- **Subtarefa HiveMQ Cloud:** Permanece em `â¬œ Pendente` como subtarefa â€” executar somente se Blocos 1â€“3 fecharem com folga (fecharam âœ…). Blocos 4 e 5 (Dashboard E2E remoto, LWT/reconexÃ£o remota) ainda aguardando resoluÃ§Ã£o de firewall ou ambiente de rede alternativo.
- **Spec Beckhoff CX9240:** Escopo definido como apenas especificaÃ§Ã£o (sem implementaÃ§Ã£o). Contrato de tÃ³pico/payload proposto em `arquitetura_mqtt.md` para validaÃ§Ã£o cruzada com o agente do Beckhoff.
- **Tarefas mecÃ¢nicas restantes:** Base MDF, soldagem/fiaÃ§Ã£o, pintura e estÃ©tica do protÃ³tipo.

**ObservaÃ§Ãµes 15/09 (Roteiro Semana 5):**
- **Roteiro da semana elaborado:** `docs/testes/roteiros/semana_05_15-19_setembro.md` criado. Foco: verificaÃ§Ã£o de solda dos mÃ³dulos IRF520 (B/C), conclusÃ£o da subtarefa HiveMQ Cloud (Teste 6 â€” Blocos 4 e 5), diagrama elÃ©trico consolidado e avanÃ§o na spec de persistÃªncia DB para integraÃ§Ã£o com Beckhoff CX9240.
- **Teste 6 (HiveMQ Cloud):** Permanece como subtarefa de alta prioridade, condicionada Ã  resoluÃ§Ã£o do firewall/ambiente de rede alternativo. Bloco 1 (solda IRF520) deve ser aprovado antes de sua execuÃ§Ã£o.
- **Beckhoff CX9240 (Historiador SQLite) â€” CONCLUÃDO:** Projeto TwinCAT 3 (`CX9240_DataFlowInventory`) comissionado no RT Linux ARM64 do Beckhoff CX9240. TF6701 assina `dataflow/estoque` e `dataflow/eventos`, e TF6420 em SQL Expert Mode grava transacionalmente no SQLite local (`/var/lib/dfi/historian.db`, WAL mode) preenchendo as tabelas `estoque_hist` e `eventos_hist`. Validado de ponta a ponta com o simulador `DataFlowInventory` (`MQTT_PUBLISH=true`).
- **AvanÃ§os MecÃ¢nicos e Soldagem:** Realizados avanÃ§os estruturais na fixaÃ§Ã£o e alinhamento mecÃ¢nico das esteiras B e C na bancada. A etapa de soldagem dos drivers IRF520 e mediÃ§Ãµes elÃ©tricas foi replanejada para a rodada seguinte por restriÃ§Ã£o de tempo.
- **Scripts e CI/CD Validados (Sprint 5 / Bloco 5):** CriaÃ§Ã£o e aprovaÃ§Ã£o multiplataforma dos scripts de automaÃ§Ã£o (`setup.sh`/`setup.ps1`, `validate-env.sh`/`validate-env.ps1`, `precommit-checks.sh`/`precommit-checks.ps1`), workflow GitHub Actions e remoÃ§Ã£o dos arquivos `node_modules` Ã³rfÃ£os do cache Git.

**Observações 22–23/09:**
- **Problema 1 (MQTT rc=-2 — HiveMQ Cloud):** Quarta recorrência do bloqueio de firewall corporativo (02/09, 03/09, 15/09, agora 22-23/09). WiFi conectado com sucesso, mas TCP/TLS na porta 8883 falha. Broker local (Mosquitto/1883) validado como funcional. Mitigação: validação via hotspot 4G agendada; documentação em `troubleshooting_bancada_22-23_09.md`.
- **Problema 2 (Esteiras B/C fracas):** Após soldagem das placas de passagem IRF520, motores B/C apresentam velocidade/potência reduzida. Hipótese principal: queda de tensão nos novos cabos (comprimento/bitola vs. jumpers originais). Secundárias: solda fria, dano térmico do MOSFET, fonte sobrecarregada. Diagnóstico estruturado documentado. Mitigação em curso: aquisição de 2 expansores 110/220V→5V (alimentação dedicada, já prevista no diagrama elétrico).
- **Gap de documentação resolvido:** tabela de troubleshooting desdobrada para cobrir tanto broker local (1883) quanto Cloud (8883/TLS).


**ObservaÃ§Ãµes 16/09 (Sprint 5 â€” Continuidade e Frentes Paralelas):**
- **Continuidade de Hardware:** Continuidade e verificaÃ§Ã£o elÃ©trica dos mÃ³dulos MOSFET IRF520 das esteiras B e C (Bloco 1 do roteiro).
- **Trabalho Paralelo:** ExecuÃ§Ã£o da transiÃ§Ã£o do broker (HiveMQ Cloud Teste 6.3 E2E remoto sob rede 4G sem bloqueio de porta 8883) e integraÃ§Ã£o fÃ­sica da roda de separaÃ§Ã£o de 3 compartimentos.

---

## SugestÃµes de ComentÃ¡rios para Cards do GitHub Projects

> **InstruÃ§Ã£o:** copiar e colar nos respectivos cards do board. Ajustar datas e detalhes conforme feedback do time.

### Card #9 â€” IntegraÃ§Ã£o Esteiras B/C

> **Status: Done âœ…** (08â€“12/09/2026)
>
> Esteiras B e C integradas com sucesso. Hardware adicional (2Âº/3Âº IRF520, motores, 4 sensores TCRT5000) instalado e alimentado. Comando MQTT Box validado para peÃ§as B e C. Todos os cenÃ¡rios de rejeiÃ§Ã£o (timeout, `ocupado`, `sem_estoque`, `CMD:RESET`) replicados seguindo o padrÃ£o da esteira A. CalibraÃ§Ã£o de sensores revalidada na montagem real. Ajuste mecÃ¢nico das demais esteiras concluÃ­do.
>
> **Feito por:** [nome] Â· **Tempo total:** [X]h Â· **ReferÃªncia:** `docs/testes/roteiros/semana_04_08-12_setembro.md` Â§3, Â§4, Â§5

### Card #15 â€” HiveMQ Cloud (Credenciais)

> **Status: Done âœ…**
>
> Cluster HiveMQ (`s1.eu.hivemq.cloud`) configurado. Credenciais salvas em `esp32/gateway_mqtt/secrets.h` (USE_TLS=true). ConexÃ£o TLS/8883 validada no ESP32 e no Node.js. TÃ³picos retained sincronizando corretamente.

### Card #16 â€” HiveMQ Cloud (TLS/8883)

> **Status: Done âœ…**
>
> TLS/8883 validado entre ESP32 â†’ HiveMQ Cloud e HiveMQ Cloud â†’ Node.js. Certificado CA embutido via `WiFiClientSecure`. Teste 3 puro (MQTT Box remoto) aprovado.

### Card #17 â€” HiveMQ Cloud (E2E Remoto)

> **Status: Done âœ…** (19/09/2026)
>
> ValidaÃ§Ã£o End-to-End remota concluÃ­da com sucesso apÃ³s resoluÃ§Ã£o da divergÃªncia de variÃ¡veis de ambiente (`MQTT_USERNAME`/`MQTT_PASSWORD` no `.env`). ComunicaÃ§Ã£o completa Arduino/ESP32 â†’ HiveMQ Cloud (TLS/8883) â†’ Node.js Server â†’ SQLite â†’ Dashboard Web e CLP Beckhoff CX9240 operando sincronizados em nuvem.

### Card #21 â€” Beckhoff CX9240: Historiador em ProduÃ§Ã£o (Broker Remoto)

> **Status: Done âœ…** (19/09/2026)
>
> NÃ³ historiador TwinCAT 3 no PC industrial Beckhoff CX9240 validado operando contra o broker remoto HiveMQ Cloud e o sistema fÃ­sico real. O CLP recebe eventos reais de acionamento e atualizaÃ§Ã£o de estoque das esteiras e grava de forma transacional no banco SQLite local (`/var/lib/dfi/historian.db`, tabelas `estoque_hist` e `eventos_hist`).

### Card #22 â€” Infraestrutura de Rede: Compartilhamento de Internet (ICS) para CX9240

> **Status: Documentado â„¹ï¸** (19/09/2026)
>
> Identificado que a conexÃ£o do CX9240 ponto-a-ponto com o computador de bancada exige ativaÃ§Ã£o do Internet Connection Sharing (ICS) no Windows para que o CLP obtenha rota de saÃ­da para a internet (DNS + Gateway) e estabeleÃ§a o handshake TLS com o broker remoto HiveMQ Cloud.

- **ValidaÃ§Ã£o Integrada HiveMQ Cloud + CX9240 com Sistema Real (19/09):** Realizada a migraÃ§Ã£o e validaÃ§Ã£o de ponta a ponta com o broker remoto HiveMQ Cloud. Resolvido o erro de autorizaÃ§Ã£o no servidor Node.js atravÃ©s da padronizaÃ§Ã£o das credenciais em `server/.env`. O CLP Beckhoff CX9240 foi conectado Ã  internet via ICS do Windows (DNS `8.8.8.8` e saÃ­da TCP 8883), recebendo telemetria real dos sensores e acionamentos fÃ­sicos das esteiras via MQTT TLS e gravando com sucesso nas tabelas de histÃ³rico SQLite locais. O fluxo completo (Arduino Uno/ESP32 â†’ HiveMQ Cloud â†’ Node.js/Dashboard â†’ Beckhoff CX9240/SQLite) foi testado e homologado com sucesso.

### Card novo â€” Melhoria: IntegraÃ§Ã£o Simulador â†” Beckhoff CX9240

> **Status: Backlog ðŸ“‹** Â· **Template: A** Â· **Prioridade: Baixa** Â· **Milestone: Futuro**
>
> **Como** responsÃ¡vel pelo PC industrial Beckhoff CX9240,
> **Quero** que o simulador publique o estoque de peÃ§as via MQTT (`dataflow/estoque`, retained, QoS 1),
> **Para que** eu possa inscrever o CX9240 e persistir o estoque em banco MySQL/MariaDB.
>
> **CritÃ©rio de aceite:**
> - [x] Simulador publica em `dataflow/estoque` com payload `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}` â€” implementado em `simulator/server.js`, testado localmente (retained confirmado via `mosquitto_sub`)
> - [x] Modo `MQTT_PUBLISH=true` configurÃ¡vel em `simulator/package.json` (dependÃªncia `mqtt@^5.10.0` + script `start:mqtt`)
> - [ ] Teste em bancada prÃ³pria (separada da esteira A): CX9240 recebe e grava no banco
> - [ ] Contrato de tÃ³pico/payload validado cruzadamente entre os dois agentes
>
> **AtualizaÃ§Ã£o 15/09:** lado do simulador **concluÃ­do e testado**. Detalhes em `docs/arquitetura_mqtt.md` (seÃ§Ã£o "IntegraÃ§Ã£o Beckhoff CX9240") e `docs/testes/roteiros/semana_05_15-19_setembro.md` (Bloco 4). Card pode avanÃ§ar de `Backlog` para `Ready` assim que o agente do Beckhoff confirmar disponibilidade para a bancada prÃ³pria.
>
> **DependÃªncia:** alinhar tÃ³picos com o agente do Beckhoff antes de implementar. NÃ£o interferir no fluxo do Teste 5.
>
> **ReferÃªncia:** `docs/testes/roteiros/semana_04_08-12_setembro.md` Â§7

- **ValidaÃ§Ã£o NÃ³ Historiador Beckhoff CX9240 (15/09):** O projeto TwinCAT 3 no CX9240 (`CX9240_DataFlowInventory`) foi comissionado com sucesso no RT Linux ARM64. O CLP assina os tÃ³picos `dataflow/estoque` e `dataflow/eventos` via TF6701 e grava no banco local SQLite (`/var/lib/dfi/historian.db`, WAL mode) via TF6420 em SQL Expert Mode, preenchendo as tabelas `estoque_hist` e `eventos_hist`. ValidaÃ§Ã£o de ponta a ponta executada contra o simulador `DataFlowInventory` com `MQTT_PUBLISH=true`, comprovando a persistÃªncia autÃ´noma das variÃ¡veis de estoque (`pecaA`, `pecaB`, `pecaC`) e logs operacionais.
- **AvanÃ§os MecÃ¢nicos e Soldagem (15/09):** Realizados avanÃ§os na fixaÃ§Ã£o e alinhamento mecÃ¢nico das esteiras B e C na bancada. A etapa final de soldagem e testes elÃ©tricos dos mÃ³dulos IRF520 foi replanejada para a rodada seguinte devido Ã  restriÃ§Ã£o de tempo.

