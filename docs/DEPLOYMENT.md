# Deployment Guide — Data Flow Inventory

Passo a passo para implantar o sistema do zero em um novo ambiente (bancada, demonstração ou desenvolvimento).

> **Status: versão inicial (30/09/2026).** Os comandos foram reunidos a partir do `README.md`, de `server/.env.example`, de `scripts/setup.*` e de `observability/README.md`. **Ainda não foram executados em máquina limpa** (Fase 3 do card #22 pendente). Corrija este guia se encontrar atrito.

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
| **A — Bancada local** | Sim | Mosquitto local | 2–7, 9 |
| **B — Broker remoto** | Sim | HiveMQ Cloud (TLS 8883) | 2–7, 9 |
| **C — Só simulador** | Não | Nenhum (o simulador dispensa broker) | 2 (Node.js), 6 via simulador, 7 |
| **D — Com Beckhoff CX9240** | Sim | Um dos brokers acima | A ou B + `docs/INTEGRATION_GUIDE.md` |

A observabilidade (seção 8) é opcional em qualquer cenário.

## 2. Pré-requisitos

- **Node.js v22** e npm; **Git**.
- **Arduino IDE** (Uno e ESP32) — cenários A, B e D.
- **Mosquitto** — cenário A (`docs/broker_local_mosquitto.md`).
- **Docker Desktop** ou Docker Engine + Compose v2 — apenas para a observabilidade.
- Script de onboarding que verifica ferramentas, instala dependências e cria os arquivos de configuração:

```powershell
.\scripts\setup.ps1      # Windows
```
```bash
bash scripts/setup.sh    # Linux / macOS / Git Bash
```

## 3. Setup de hardware

Monte conforme o diagrama elétrico e confira a lista de materiais do `README.md`:

- Diagrama: `docs/fluxogramas/Diagrama elétrico.png`.
- 3 módulos IRF520 (esteiras A, B e C — a esteira principal liga direto na fonte de 12 V), 6 sensores TCRT5000, LCD I²C, Arduino Uno e ESP32.
- **GND comum** entre Uno, ESP32 e drivers; divisor 1 kΩ/2 kΩ no TX do Uno para o ESP32; diodo 1N4007 antiparalelo em cada motor.
- Se um motor não acionar, use o diagnóstico em `docs/testes/roteiros/semana_07_28_setembro-3_outubro.md` (seção 4.2).

## 4. Setup de firmware

1. **Arduino Uno:** abra `arduino/data_flow_inventory/data_flow_inventory.ino` e faça o upload.
2. **ESP32:** copie `esp32/gateway_mqtt/secrets.h.example` para `secrets.h`, preencha Wi-Fi (2,4 GHz) e dados do broker, e faça o upload de `esp32/gateway_mqtt/gateway_mqtt.ino`.
3. `secrets.h` **nunca** é versionado.

Para isolar problemas de rede/TLS, use o sketch `esp32/test_mqtt_cloud/` (ver o README dele).

## 5. Setup do broker MQTT

**Cenário A — Mosquitto local:** siga `docs/broker_local_mosquitto.md` (inclui a liberação de firewall). Use `127.0.0.1`, não `localhost`, no `.env` do servidor. No Windows, `start_services.bat` abre broker, probe e servidor.

**Cenário B — HiveMQ Cloud:** crie o cluster em <https://cloud.hivemq.com>, anote endpoint, usuário e senha e use `mqtts://` na porta 8883. Se o ESP32 não conectar, veja `docs/testes/validações/troubleshooting_bancada_22-23_09.md` (SSID correto e "Maximizar compatibilidade" ativada no hotspot foram causas reais).

## 6. Setup do servidor

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edite `server/.env` (`PORT=3000`, `ALLOWED_ORIGIN` e **uma** das opções de broker: `MQTT_BROKER_URL`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`). Depois:

```bash
npm start
```

**Cenário C (simulador):**

```bash
cd simulator
npm install
npm start            # dashboard em http://localhost:3000
```

O simulador e o servidor real usam a porta 3000: não rode os dois ao mesmo tempo sem alterar `PORT`.

## 7. Setup do dashboard

Abra <http://localhost:3000>. Vistas: `#/` (painel principal) e `#/status` (histórico e equipamentos). O dashboard é servido pelo próprio servidor; não há build separado.

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

| Verificação | Comando / ação | Esperado |
|---|---|---|
| Servidor no ar | `curl http://localhost:3000/api/status` | JSON; HTTP 503 se o broker estiver indisponível |
| Métricas | `curl http://localhost:3000/metrics` | contém `dfi_mqtt_connected` |
| Broker (local) | `mosquitto_sub -h 127.0.0.1 -t "dataflow/#" -v` | `dataflow/status` com `online` (retained) |
| Probe | `cd test/mqtt_probe && node probe.js` | mensagens dos tópicos `dataflow/*` |
| Comando | `mosquitto_pub -t dataflow/comandos/sub -m '{"peca":"A"}'` | esteira aciona; confirmação em `dataflow/comandos/pub` |
| Dashboard | abrir <http://localhost:3000> | badges de conexão verdes, estoque visível |
| Infra de rede | `docs/testes/validações/validar_infra.ps1` | checagens de broker e firewall OK |

## 10. Troubleshooting e rollback

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Dashboard isolado do gateway | `localhost` resolvendo para IPv6 | use `MQTT_BROKER_URL=mqtt://127.0.0.1` |
| ESP32 com `rc=-2` no HiveMQ | rede, SSID ou TLS | ver `troubleshooting_bancada_22-23_09.md` |
| `rc=5` | credenciais erradas | conferir `secrets.h` e `server/.env` |
| Motor não gira / gira fraco | GND não comum, solda, MOSFET | roteiro da Semana 7, seção 4.2 |
| Alvo `dfi-server` DOWN no Prometheus | servidor parado ou firewall na porta 3000 | `observability/README.md` (Problemas comuns) |
| Grafana ignora a senha nova | senha só vale na 1ª criação do volume | `down -v` ou redefinir pela interface |

**Rollback:** pare o servidor (Ctrl+C). Para a observabilidade, `docker compose --env-file observability/.env down` (mantém dados) ou `down -v` (apaga). O servidor não depende do stack, então desligá-lo não afeta a bancada. Para o firmware, refaça o upload do `.ino` de um commit anterior (`git checkout <sha> -- arduino/ esp32/`).

Histórico de problemas já resolvidos: `docs/CHANGELOG.md`.

