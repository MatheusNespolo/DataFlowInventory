# Deployment Guide — Data Flow Inventory

Passo a passo para implantar o sistema do zero em um novo ambiente (bancada, demonstração ou desenvolvimento).

> **Status: versão inicial (30/09/2026), revisada em 01/10/2026.** Os comandos foram reunidos a partir do `README.md`, de `server/.env.example`, de `scripts/setup.*`, de `start_services.bat` e dos firmwares, e conferidos contra o código. **Ainda não foram executados em máquina limpa** (Fase 3 do card #22 pendente). Corrija este guia se encontrar atrito.

## Sumário

1. [Escolha o cenário](#1-escolha-o-cenário)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Setup de hardware](#3-setup-de-hardware)
4. [Setup de firmware](#4-setup-de-firmware)
5. [Setup do broker MQTT](#5-setup-do-broker-mqtt)
6. [Setup do servidor](#6-setup-do-servidor)
7. [Setup do dashboard](#7-setup-do-dashboard)
8. [Observabilidade (opcional)](#8-observabilidade-opcional)
9. [Validação pós-deploy](#9-validação-pós-deploy)
10. [Troubleshooting e rollback](#10-troubleshooting-e-rollback)

## 1. Escolha o cenário

| Cenário | Hardware | Broker | Seções a seguir |
|---|---|---|---|
| **A — Bancada local** | Sim | Mosquitto local (porta 1883, sem TLS) | 2–7, 9 |
| **B — Broker remoto** | Sim | HiveMQ Cloud (TLS, porta 8883) | 2–7, 9 |
| **C — Só simulador** | Não | Nenhum (o simulador dispensa broker) | 2, 6 (simulador), 7 |
| **D — Com Beckhoff CX9240** | Sim | Um dos brokers acima | A ou B + `docs/INTEGRATION_GUIDE.md` |

A observabilidade (seção 8) é opcional em qualquer cenário, mas só mostra dados úteis quando o **servidor real** está rodando (A, B ou D), não o simulador.

**Ordem de subida recomendada (A e B):** broker → servidor → ESP32 → Arduino → dashboard. O servidor reconecta sozinho se o broker cair; o dashboard só mostra o gateway como online depois que o ESP32 conecta ao broker.

## 2. Pré-requisitos

- **Node.js v22** (o CI usa a 22) e npm; **Git**.
- **Arduino IDE** (Uno e ESP32) — cenários A, B e D. Bibliotecas usadas pelos firmwares:
  - Uno: `LiquidCrystal_I2C` e `ArduinoJson`.
  - ESP32 (instale o suporte à placa ESP32 no Gerenciador de Placas): `PubSubClient` e `ArduinoJson`.
- **Mosquitto** — cenário A (`docs/broker_local_mosquitto.md`).
- **Docker Desktop** ou Docker Engine + Compose v2 — apenas para a observabilidade.
- Script de onboarding: verifica Node/npm/Git, roda `npm install` em `server/`, `simulator/` e `test/mqtt_probe/`, cria `server/.env`, `simulator/.env` e `esp32/gateway_mqtt/secrets.h` a partir dos `.example` (sem sobrescrever os existentes) e confirma que esses arquivos estão ignorados pelo Git.

```powershell
.\scripts\setup.ps1      # Windows
```
```bash
bash scripts/setup.sh    # Linux / macOS / Git Bash
```

Depois do script, **você ainda precisa editar** `server/.env` e `secrets.h` com os valores reais (seções 4 e 6).

## 3. Setup de hardware

Monte conforme o diagrama elétrico e confira a lista de materiais do `README.md`:

- Diagrama: `docs/fluxogramas/Diagrama elétrico.png`.
- 3 módulos IRF520 (esteiras A, B e C — a esteira principal liga direto na fonte de 12 V), 6 sensores TCRT5000, LCD I²C (endereço `0x27`, 16x2), Arduino Uno e ESP32.
- **GND comum** entre Uno, ESP32 e drivers; diodo 1N4007 antiparalelo em cada motor.
- **Ligação Uno ↔ ESP32 (UART, 9600 baud):** TX do Uno (pino 1) → RX2 do ESP32 (GPIO16) **através de divisor 1 kΩ/2 kΩ** (o Uno é 5 V e o ESP32 é 3,3 V); TX2 do ESP32 (GPIO17) → RX do Uno (pino 0), direto.
- Se um motor não acionar, use o diagnóstico em `docs/testes/roteiros/semana_07_28_setembro-3_outubro.md` (seção 4.2).

## 4. Setup de firmware

1. **Arduino Uno:** **desconecte o ESP32 dos pinos 0/1** (eles são compartilhados com a USB), abra `arduino/data_flow_inventory/data_flow_inventory.ino`, faça o upload e só então religue o ESP32.
2. **ESP32:** se ainda não existir, copie `esp32/gateway_mqtt/secrets.h.example` para `secrets.h` (o `setup.*` já faz isso) e preencha o Wi-Fi (**rede 2,4 GHz**) e os dados do broker que for usar:
   - **Cenário A (Mosquitto local):** `SECRET_MQTT_SERVER_LOCAL` = IP do PC na rede (`ipconfig`); usuário e senha vazios se o broker for anônimo.
   - **Cenário B (HiveMQ Cloud):** `SECRET_MQTT_SERVER_CLOUD`, `SECRET_MQTT_USER_CLOUD` e `SECRET_MQTT_PASS_CLOUD`.
3. **Escolha o modo no firmware.** Em `esp32/gateway_mqtt/gateway_mqtt.ino` a linha `#define USE_TLS` vem como **`true`** (HiveMQ Cloud, porta 8883). Para o **cenário A** troque para **`false`** (Mosquitto, porta 1883, sem TLS) antes do upload. Esquecer disso é um erro fácil de cometer ao migrar da nuvem para a bancada local.
4. Faça o upload de `gateway_mqtt.ino` para o ESP32 e abra o Monitor Serial a 115200 para acompanhar os logs.
5. `secrets.h` **nunca** é versionado (está no `.gitignore`).

Para isolar problemas de rede/TLS, use o sketch `esp32/test_mqtt_cloud/` (ver o README dele).

## 5. Setup do broker MQTT

**Cenário A — Mosquitto local:** siga `docs/broker_local_mosquitto.md` (inclui a liberação de firewall da porta 1883 de entrada). O broker precisa escutar em `0.0.0.0` (não só no loopback) para o ESP32 alcançá-lo; o `start_services.bat` cria `C:\mosquitto\mosquitto.conf` com `listener 1883 0.0.0.0` e `allow_anonymous true` se ele não existir. Use `127.0.0.1`, não `localhost`, no `.env` do servidor.

> **Atenção (Windows):** se o serviço automático do Mosquitto estiver ativo, ele ocupa a porta 1883 e um segundo broker cria uma rede MQTT particionada (servidor num broker, ESP32 no outro; o dashboard fica em "ESP32 Offline"). O `start_services.bat` detecta isso e orienta: `net stop mosquitto; sc.exe config mosquitto start= demand` (PowerShell como Administrador).

**Cenário B — HiveMQ Cloud:** crie o cluster em <https://cloud.hivemq.com>, crie um par usuário/senha em *Access Management*, anote o endpoint e use `mqtts://` na porta 8883 no `server/.env`. Se o ESP32 não conectar, veja `docs/testes/validações/troubleshooting_bancada_22-23_09.md` (SSID correto e "Maximizar compatibilidade" ativada no hotspot foram causas reais).

## 6. Setup do servidor

Se você já rodou o `setup.*`, pule para a edição do `.env`.

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env  (só se o setup.* não criou)
```

Edite `server/.env`:

| Variável | Cenário A | Cenário B |
|---|---|---|
| `PORT` | `3000` | `3000` |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | `http://localhost:3000` (ou a URL pela qual o dashboard é acessado) |
| `MQTT_BROKER_URL` | `mqtt://127.0.0.1` | `mqtts://<cluster>.s1.eu.hivemq.com` |
| `MQTT_PORT` | `1883` | `8883` |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | vazios (broker anônimo) | usuário e senha do HiveMQ |

Os demais itens (`MQTT_TOPIC_*`, `COMANDO_INTERVALO_MS`, `METRICS_CONFIRMACAO_TIMEOUT_MS`) têm padrões corretos; só altere se souber o motivo. Os tópicos precisam ser iguais aos do firmware. Depois:

```bash
npm start
```

Se o broker estiver fora, o servidor sobe mesmo assim e tenta reconectar (`/api/status` responde 503 até conectar).

**Cenário C (simulador, sem hardware e sem broker):**

```bash
cd simulator
npm install
npm start            # dashboard em http://localhost:3000
```

O simulador e o servidor real usam a porta 3000: não rode os dois ao mesmo tempo sem alterar `PORT`. Para o simulador também publicar em um broker (integração com o CX9240), use `npm run start:mqtt` (veja `simulator/README.md`).

**Atalho no Windows (cenário A):** `start_services.bat`, na raiz, abre Mosquitto, `mqtt_probe` e servidor em janelas separadas e instala as dependências que faltarem.

## 7. Setup do dashboard

Abra <http://localhost:3000>. Vistas: `#/` (painel principal) e `#/status` (histórico e equipamentos). O dashboard é servido pelo próprio servidor; não há build separado. Se aparecer "ESP32 Offline", o servidor está conectado ao broker, mas o gateway ainda não publicou `online` em `dataflow/status` (veja a seção 10).

## 8. Observabilidade (opcional)

Prometheus + Grafana em Docker, com os dashboards *Visão Geral*, *Performance* e *Confiabilidade*. O servidor Node precisa estar rodando no host.

```bash
cp observability/.env.example observability/.env     # preencha GRAFANA_ADMIN_PASSWORD
docker compose --env-file observability/.env up -d
```

- Grafana: <http://127.0.0.1:3030> (usuário `admin`); Prometheus: <http://127.0.0.1:9090>.
- Smoke test: `.\scripts\observability-smoke.ps1` (Windows) ou `bash scripts/observability-smoke.sh`.
- Detalhes, operação e problemas comuns: [`observability/README.md`](../observability/README.md). Catálogo de métricas: `docs/ARCHITECTURE.md` (seção 7).

> A execução real do stack e a renderização dos painéis ainda **não foram validadas** (falta Docker na máquina de desenvolvimento).

## 9. Validação pós-deploy

Execute na ordem; cada linha depende da anterior.

| Verificação | Comando / ação | Esperado |
|---|---|---|
| Servidor no ar | `curl http://localhost:3000/api/status` | JSON com `"server":"online"`; HTTP 200 com broker conectado, **503** se o broker estiver indisponível |
| Métricas | `curl http://localhost:3000/metrics` | contém `dfi_mqtt_connected 1` |
| Broker (local) | `mosquitto_sub -h 127.0.0.1 -t "dataflow/#" -v` | `dataflow/status` com `online` (retained) assim que o ESP32 conectar |
| Probe | `cd test/mqtt_probe && node probe.js` | mensagens dos tópicos `dataflow/*` |
| Comando | `mosquitto_pub -h 127.0.0.1 -t dataflow/comandos/sub -m '{"acao":"solicitar_peca","peca":"A"}'` | esteira da peça A aciona; confirmação em `dataflow/comandos/pub`. O campo `acao` é obrigatório e `peca` é `A`, `B` ou `C` |
| Dashboard | abrir <http://localhost:3000> | badges de conexão verdes, estoque visível; ao pedir uma peça pelo botão, esteira e evento aparecem |
| Infra de rede | `docs/testes/validações/validar_infra.ps1` (parâmetro `-PosSubida` com os serviços no ar) | checagens de broker e firewall OK |

No PowerShell, o `mosquitto_pub` pode exigir outro escape de aspas no JSON; o `start_services.bat` mostra um exemplo que funciona (`& "C:\Program Files\mosquitto\mosquitto_pub.exe" ...`). No cenário C, só se aplicam servidor, dashboard e `/api/status`.

## 10. Troubleshooting e rollback

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Dashboard em "ESP32 Offline" com servidor conectado | ESP32 em outro broker (rede particionada) ou desligado | confirme um único broker na 1883 (seção 5) e o IP em `secrets.h` |
| Dashboard isolado do gateway | `localhost` resolvendo para IPv6 | use `MQTT_BROKER_URL=mqtt://127.0.0.1` |
| ESP32 não conecta no Mosquitto local | `USE_TLS` ainda `true` no `.ino`, firewall na 1883 ou IP errado em `secrets.h` | seções 4 e 5; teste com `mosquitto_sub` a partir de outro dispositivo |
| ESP32 com `rc=-2` no HiveMQ | rede, SSID ou TLS | ver `troubleshooting_bancada_22-23_09.md` |
| `rc=5` | credenciais erradas | conferir `secrets.h` e `server/.env` |
| Upload no Uno falha | ESP32 ligado aos pinos 0/1 | desconecte o ESP32 durante o upload |
| Motor não gira / gira fraco | GND não comum, solda, MOSFET | roteiro da Semana 7, seção 4.2 |
| `EADDRINUSE` ao subir o servidor | simulador ou outro processo na porta 3000 | pare o outro processo ou altere `PORT` |
| Alvo `dfi-server` DOWN no Prometheus | servidor parado ou firewall na porta 3000 | `observability/README.md` (Problemas comuns) |
| Grafana ignora a senha nova | senha só vale na 1ª criação do volume | `down -v` ou redefinir pela interface |

**Rollback:** pare o servidor (Ctrl+C). Para a observabilidade, `docker compose --env-file observability/.env down` (mantém dados) ou `down -v` (apaga). O servidor não depende do stack, então desligá-lo não afeta a bancada. Para o firmware, refaça o upload do `.ino` de um commit anterior (`git checkout <sha> -- arduino/ esp32/`; o seu `secrets.h` não é versionado e permanece).

Histórico de problemas já resolvidos: `docs/CHANGELOG.md`.
