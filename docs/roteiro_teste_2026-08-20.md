# Roteiro de Testes — 20/08/2026

Continuação do [`roteiro_teste_2026-08-19.md`](roteiro_teste_2026-08-19.md). Referências: [`plano_de_testes.md`](plano_de_testes.md), [`broker_local_mosquitto.md`](broker_local_mosquitto.md), gateway `esp32/gateway_mqtt/` e o board do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

**Meta do dia:** estabelecer uma **infraestrutura de rede/broker estável e reproduzível** (ordem fixa de inicialização dos serviços) e concluir os **Testes 2, 3 e 4** — fechando a integração End-to-End da esteira A.

---

## 1. Diagnóstico do dia 19/08

Progresso: upload do ESP32 mais rápido (Bloco 0 de ontem funcionou ✅). Bloqueios restantes:

| Sintoma | Causa mais provável | Correção (hoje) |
|---------|--------------------|-----------------|
| ESP32 tentava conectar no hotspot "Iphone de Matheus" mas nunca mostrou `[WiFi] Conectado!` | Hotspot do iPhone em 5 GHz (ESP32 só suporta **2,4 GHz**). No iPhone, 2,4 GHz só é garantido com **"Maximizar Compatibilidade"** ativado; além disso o hotspot "dorme" com a tela bloqueada | **Trocar para o hotspot do Windows** (Opção 1 abaixo) — elimina o problema na raiz |
| Mesmo se o Wi-Fi conectasse, MQTT poderia falhar | Hotspots de celular costumam ter **isolamento de clientes** (ESP32 e PC não se enxergam) e o IP do PC muda a cada sessão | Idem — no hotspot do Windows o IP do PC é **fixo: 192.168.137.1** e não há isolamento |
| Broker/servidor respondeu no início (mensagens "não-JSON" via serial e MQTT Box) e depois **parou de responder** | Hipóteses: (a) Mosquitto iniciado **sem** o `mosquitto.conf` → modo local-only (só localhost funciona, MQTT Box no PC passa, ESP32 não); (b) terminal do VSC com o broker foi interrompido/reutilizado; (c) PC entrou em suspensão | Iniciar tudo pelo **`start_services.bat`** (janelas dedicadas, sempre com config) + smoke test do broker **antes** de ligar hardware |

> Nota: as "mensagens não-JSON" chegando confirmam que a Serial Arduino → ESP32 e parte da cadeia estavam vivas. O problema é de **infraestrutura de rede/broker**, não do código.

---

## 2. Bloco 0 — Rede e serviços (ordem fixa de inicialização)

> Regra do dia: **nenhum hardware entra em cena antes de o smoke test do broker passar.**

### 2.1 Rede — alternativas consolidadas (usar na ordem)

**Opção 1 — Hotspot do Windows (recomendada):**
1. Configurações → Rede e Internet → **Ponto de acesso móvel** → Ativar
2. Em "Propriedades" → Editar → **Banda: 2,4 GHz** (obrigatório)
3. Anotar SSID/senha e usar no sketch do ESP32
4. IP do PC nessa rede: **`192.168.137.1`** (fixo — usar como `MQTT_SERVER`)

**Opção 2 — Roteador doméstico (rede 2,4 GHz):** PC e ESP32 na mesma rede; IP do PC via `ipconfig` (muda com o tempo — reconferir a cada sessão).

**Opção 3 — Hotspot do iPhone (último recurso):** Ajustes → Acesso Pessoal → ativar **"Maximizar Compatibilidade"**; manter a tela do iPhone desbloqueada durante a conexão; reconferir o IP do PC via `ipconfig` a cada sessão. Risco: isolamento de clientes pode bloquear o MQTT mesmo com Wi-Fi conectado.

### 2.2 Serviços — usar o `start_services.bat` (raiz do repositório)

O script abre **3 janelas dedicadas** (assim ninguém derruba o broker sem perceber):
1. **Mosquitto** — sempre com `-c C:\mosquitto\mosquitto.conf -v` (garante `listener 1883 0.0.0.0` + `allow_anonymous true`)
2. **mqtt_probe** — `node test/mqtt_probe/probe.js` inscrito em `dataflow/#` com timestamps (evidência dos testes)
3. **Server Node.js** — `npm start` na pasta `server/`

```
start_services.bat
```

> Antes de rodar: `server/.env` com `MQTT_BROKER_URL=mqtt://localhost` e `MQTT_PORT=1883`. Impedir suspensão do PC durante os testes (Energia → Suspender: Nunca, temporariamente).

### 2.3 Smoke test do broker (sem hardware) — obrigatório

Em um 4º terminal:
```bash
:: 1) Broker escutando em todas as interfaces?
netstat -ano | findstr :1883
::    Esperado: TCP 0.0.0.0:1883 ... LISTENING  (se aparecer só 127.0.0.1, o conf não foi carregado!)

:: 2) Publicar mensagem de teste
mosquitto_pub -h localhost -t "dataflow/status" -m '{"type":"status","estado":"smoke-test"}'
::    Esperado: [WS →] [dataflow/status] {"type":"status","estado":"smoke-test"}
```

**Critérios para liberar o hardware:**
- [X] `netstat` mostra `0.0.0.0:1883 LISTENING`
- [X] Mensagem do `mosquitto_pub` aparece no **mqtt_probe** E nos logs do **server** (`[WS →] ...` ou similar)
- [X] Janela do Mosquitto (`-v`) loga as conexões dos clientes

### 2.4 ESP32 — upload e conexão

1. Editar `esp32/gateway_mqtt/gateway_mqtt.ino`: `USE_TLS=false`, SSID/senha do **hotspot do Windows**, `MQTT_SERVER = "192.168.137.1"` (nunca `localhost`)
2. Fechar o Serial Monitor → upload (Upload Speed 921600; botão BOOT se travar em `Connecting...`)
3. Abrir monitor serial (115200) e aguardar:
   - [X] `[WiFi] Conectado!` (com IP na faixa `192.168.137.x`)
   - [ ] `[MQTT] Conectado!`
   - [ ] `mqtt_probe` mostra o retained `{"type":"gateway","status":"online"}` em `dataflow/status`

**Teste de firewall (se o MQTT falhar com Wi-Fi OK):** no monitor serial, `rc=-2` = broker inacessível → liberar a porta 1883 no firewall:
```bash
netsh advfirewall firewall add rule name="Mosquitto 1883" dir=in action=allow protocol=TCP localport=1883
```
(executar como Administrador — ou criar a regra pela interface do Firewall do Windows)

---

## 3. Roteiro de execução do dia

### Bloco 1 — Testes 2 e 3 (cadeia de rede)

1. **Teste 2** (com o Bloco 0 completo):
   - Conectar o Arduino (sketch principal calibrado) ao ESP32 (divisor de tensão, GND comum)
   - [ ] JSONs do Arduino aparecem no `mqtt_probe` nos tópicos `dataflow/...`
   - [ ] Server Node loga as mensagens (`[WS →] ...`)
   - [ ] Desligar o ESP32 → LWT `{"type":"gateway","status":"offline"}` no probe
2. **Teste 3** — MQTT Box/Explorer (host: `localhost:1883`, já que roda no mesmo PC do broker):
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

**✅ Marco do dia:** esteira A 100% integrada, do sensor ao dashboard, com procedimento de inicialização reproduzível.

### Plano B — progresso garantido em software (se rede/ESP32 travarem de novo)

Validar toda a cadeia de **software** sem hardware, usando o simulador:
1. `start_services.bat` (broker + probe + server)
2. `cd simulator && npm start` — o simulador publica nos mesmos tópicos `dataflow/...` que o ESP32 faria
3. Dashboard em `http://localhost:3000` → validar Teste 4 "virtual" (comandos, estados, estoque, histórico)

> Isso fecha os itens de **server + frontend** (cards #6 e #7) independentemente do hardware, e quando o ESP32 conectar, é só substituir o simulador.

---

## 4. Documentação e board

- [ ] Registrar os resultados do dia na tabela abaixo (transferir para o `plano_de_testes.md` oficial **apenas** os testes 2–4 aprovados/reprovados — sem anotações da discussão)
- [ ] **Usuário atualiza manualmente os cards do GitHub Projects** ao final:
  - **#4** Gateway ESP32 → Done após Teste 2
  - **#6** Servidor Node.js → Done após Teste 2/4 (ou via Plano B)
  - **#9** Testes e validação → In Progress (registrar 2–4)

---

## 5. Registro de resultados do dia (preencher durante os testes)

| Etapa | Resultado | Medições / Observações |
|-------|-----------|------------------------|
| Rede escolhida (Opção 1/2/3) | ⬜ | SSID: ____ · IP do PC: ____ |
| Smoke test do broker (2.3) | ⬜ | `netstat` mostrou 0.0.0.0:1883? |
| ESP32: WiFi + MQTT conectados (2.4) | ⬜ | IP do ESP32: ____ · rc de erro (se houver): ____ |
| 2 — ESP32 → Broker → Node | ⬜ | |
| 3 — Comando MQTT Box | ⬜ | |
| 4 — End-to-End Dashboard | ⬜ | |
| Plano B (simulador), se usado | ⬜ | |

> Ao final: transferir resultados dos Testes 2–4 para o [`plano_de_testes.md`](plano_de_testes.md) e atualizar os cards (#4, #6, #9).