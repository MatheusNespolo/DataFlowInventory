# Teste com Broker Local (Mosquitto) — Passo a Passo

Guia para validar toda a cadeia de comunicação MQTT usando um broker local no Windows, **antes** de migrar para o HiveMQ Cloud.

---

## Etapa A — Instalar e configurar o Mosquitto

1. Baixar o instalador em [mosquitto.org/download](https://mosquitto.org/download/) e instalar (padrão: `C:\Program Files\mosquitto`).

2. Criar um arquivo `mosquitto.conf` (por exemplo em `C:\mosquitto\mosquitto.conf`) com o conteúdo mínimo:

```conf
# Aceita conexões de qualquer interface (necessário para o ESP32 acessar pelo IP do PC)
listener 1883 0.0.0.0
allow_anonymous true
```

> ⚠ O Mosquitto 2.x por padrão só aceita conexões de `localhost`. Sem esse arquivo, o ESP32 **não conseguirá conectar**.

3. Iniciar o broker em modo verbose (debug):

```powershell
& "C:\Program Files\mosquitto\mosquitto.exe" -c C:\mosquitto\mosquitto.conf -v
```

4. **Firewall do Windows:** liberar a porta 1883 (regra de entrada TCP):

```powershell
# PowerShell como Administrador
New-NetFirewallRule -DisplayName "Mosquitto MQTT" -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow
```

---

## Etapa B — Validar o broker (sem hardware)

Em dois terminais separados:

```powershell
# Terminal 1 — inscrever em todos os tópicos do projeto
& "C:\Program Files\mosquitto\mosquitto_sub.exe" -h localhost -t "dataflow/#" -v
```

```powershell
# Terminal 2 — publicar mensagem de teste
& "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -t "dataflow/status" -m "{\"type\":\"status\",\"estado\":\"Teste\"}"
```

✅ **Critério de sucesso:** a mensagem aparece no Terminal 1.

---

## Etapa C — Conectar o Server Node ao broker local

1. Copiar o modelo de configuração:

```powershell
cd server
copy .env.example .env
```

2. Editar o `.env` para apontar ao broker local:

```env
MQTT_BROKER_URL=mqtt://localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
PORT=3000
```

3. Iniciar o servidor:

```powershell
npm install
npm start
```

✅ **Critério de sucesso:** log `MQTT conectado` no console.

4. **Testar o caminho broker → server → frontend sem hardware:**
   abrir `http://localhost:3000` no navegador e publicar mensagens simulando o ESP32:

```powershell
# Simular atualização de estoque
mosquitto_pub -h localhost -t "dataflow/estoque" -m "{\"type\":\"estoque\",\"pecaA\":4,\"pecaB\":5,\"pecaC\":5}"

# Simular evento de entrega
mosquitto_pub -h localhost -t "dataflow/eventos" -m "{\"type\":\"evento\",\"evento\":\"entrega\",\"peca\":\"A\",\"estoqueA\":4,\"estoqueB\":5,\"estoqueC\":5}"

# Simular esteira ligada
mosquitto_pub -h localhost -t "dataflow/esteiras" -m "{\"type\":\"esteiras\",\"principal\":1,\"secA\":1,\"secB\":0,\"secC\":0}"

# Simular gateway online (LWT)
mosquitto_pub -h localhost -t "dataflow/gateway" -m "{\"status\":\"online\"}"
```

✅ **Critério de sucesso:** o dashboard atualiza em tempo real (estoque, histórico, diagrama, badge "ESP32 Online").

5. **Testar o caminho reverso (frontend → broker):** clicar em "Solicitar A" no dashboard e verificar no `mosquitto_sub` (Terminal 1) a chegada do comando em `dataflow/comandos/sub`.

---

## Etapa D — Conectar o ESP32 ao broker local

1. Obter o **IP local do PC** onde o Mosquitto está rodando:

```powershell
ipconfig
# Anotar o "Endereço IPv4" da interface Wi-Fi/Ethernet (ex.: 192.168.0.10)
```

2. No `esp32/gateway_mqtt/gateway_mqtt.ino`, configurar:

```cpp
#define USE_TLS false                    // broker local, sem TLS
const char* MQTT_SERVER = "192.168.0.10"; // IP do PC (ipconfig)
const int   MQTT_PORT   = 1883;
const char* MQTT_USER   = "";            // vazio = sem autenticação
const char* MQTT_PASS   = "";
```

   E o Wi-Fi (`SSID` / `SENHA`) — **o ESP32 deve estar na mesma rede do PC**.

3. Fazer upload no ESP32 e abrir o Monitor Serial (115200):

✅ **Critérios de sucesso:**
   - `WiFi conectado` com IP na mesma faixa do PC;
   - `MQTT conectado`;
   - Badge **"ESP32 Online"** acende no dashboard (LWT publicado em `dataflow/gateway`).

4. Testar comando remoto: clicar em "Solicitar A" no dashboard → o ESP32 deve exibir no monitor serial o envio de `CMD:PECA:A` pela Serial2 (validável **mesmo sem o Arduino conectado**).

5. Desligar/resetar o ESP32 e verificar se o badge muda para **"ESP32 Offline"** (teste do LWT).

---

## Etapa E — Migração para HiveMQ Cloud (futuro)

Quando o teste local estiver validado, a migração exige apenas configuração:

1. **`server/.env`:**

```env
MQTT_BROKER_URL=mqtts://<SEU_CLUSTER>.s1.eu.hivemq.com
MQTT_PORT=8883
MQTT_USERNAME=<usuario>
MQTT_PASSWORD=<senha>
```

2. **`gateway_mqtt.ino`:**

```cpp
#define USE_TLS true
const char* MQTT_SERVER = "<SEU_CLUSTER>.s1.eu.hivemq.com";
const int   MQTT_PORT   = 8883;
const char* MQTT_USER   = "<usuario>";
const char* MQTT_PASS   = "<senha>";
```

Nenhuma outra alteração de código é necessária.

---

## Resumo dos critérios de aceite (checklist para o GitHub Projects)

- [ ] Mosquitto instalado e rodando com `listener 1883 0.0.0.0`
- [ ] `mosquitto_pub`/`mosquitto_sub` trocando mensagens localmente
- [ ] Server Node conecta ao broker (`MQTT conectado` no log)
- [ ] Dashboard atualiza ao publicar mensagens de teste via `mosquitto_pub`
- [ ] Comando do dashboard chega em `dataflow/comandos/sub` (visto no `mosquitto_sub`)
- [ ] ESP32 conecta ao broker pelo IP local (badge "ESP32 Online")
- [ ] Comando do dashboard chega ao ESP32 (`CMD:PECA:A` no monitor serial)
- [ ] LWT funciona (badge "ESP32 Offline" ao desligar o ESP32)