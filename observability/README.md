# Observabilidade — Prometheus + Grafana

Métricas de **performance e infraestrutura** do servidor Node (latência MQTT, tempo de resposta da API, throughput de eventos, reconexões, quedas do gateway) com dashboards Grafana. Elas **complementam** o historiador SQLite do Beckhoff CX9240, que guarda os dados de **negócio** (estoque e eventos com precisão por evento) e não muda.

```
server.js (métricas em memória) ◄── consulta a cada 5 s ── Prometheus (Docker) ──► Grafana (Docker)
        GET /metrics                                                                   docs/grafana/*.json
```

O servidor **nunca empurra dados**: se este stack estiver desligado, nada muda no `server.js`. O stack é **opcional** e voltado a desenvolvimento; não é necessário para a bancada básica.

> **Status de validação:** as métricas, o endpoint `/metrics`, a coerência dos dashboards com as métricas e a configuração são cobertos por testes automatizados que **não usam Docker** (`cd test/server_metrics && npm test`). A execução real do stack (`docker compose up`, consultas PromQL e renderização dos painéis) foi validada em 01/10/2026 com o `scripts/observability-smoke.*` e a conferência dos painéis no navegador. Para repetir em outro ambiente, use esses mesmos passos.

## Pré-requisitos

- Docker Desktop (Windows/Mac) ou Docker Engine + plugin Compose v2 (Linux).
- O servidor Node rodando no host: `cd server && npm start` (porta 3000). O Prometheus o consulta em `host.docker.internal:3000`.
- Portas livres no host: `9090` (Prometheus) e `3030` (Grafana). O servidor usa a 3000.

## Passo a passo

1. **Crie o `.env` do stack** e escolha a senha do Grafana:
   ```bash
   cp observability/.env.example observability/.env        # Linux/Mac/Git Bash
   copy observability\.env.example observability\.env      # Windows (cmd)
   ```
   Edite `observability/.env` e preencha `GRAFANA_ADMIN_PASSWORD`. O arquivo **não é versionado** (`*.env` está no `.gitignore`).
2. **Suba o servidor Node** (`cd server && npm start`) e confira `http://localhost:3000/metrics`.
3. **Suba o stack** (da raiz do repositório):
   ```bash
   docker compose --env-file observability/.env up -d
   ```
4. **Abra o Grafana** em <http://127.0.0.1:3030> (usuário `admin`, senha do passo 1). Os três dashboards aparecem na pasta *Data Flow Inventory*.
5. **Valide** com o smoke script (veja abaixo).

## Verificação (smoke)

```bash
bash scripts/observability-smoke.sh              # Linux/Mac/Git Bash
.\scripts\observability-smoke.ps1                # Windows (PowerShell)
```

Ele confere, nesta ordem: `/metrics` do servidor; `docker compose config`; `promtool check config`; `docker compose up -d`; o alvo `dfi-server` em `up` no Prometheus; a saúde do Grafana e do datasource `dfi-prometheus`; e os três dashboards carregados. Sai com código 1 se algo falhar.

Verificação manual: <http://127.0.0.1:9090/targets> deve mostrar `dfi-server` como **UP**.

## Dashboards

| Dashboard | O que mostra |
|---|---|
| **Visão Geral** | servidor, MQTT e gateway; estoque A/B/C (atual e ao longo do tempo); linha do tempo das 4 esteiras; dashboards conectados |
| **Performance** | p50/p95/p99 da confirmação de comando, do PUBACK do broker e da API (por rota); mensagens por tópico e eventos por tipo; CPU, memória e atraso do event loop |
| **Confiabilidade** | uptime MQTT; reconexões, erros e quedas do gateway na última hora; comandos por resultado; comandos sem resposta e confirmações órfãs |

Os painéis de latência ficam **sem pontos** enquanto ninguém envia comandos: percentis só existem quando há amostras na janela. Envie um pedido pelo dashboard web para vê-los.

O catálogo completo de métricas está em `docs/ARCHITECTURE.md` (seção *Observabilidade*).

### Alterar um dashboard

Os JSON em `docs/grafana/` são a **fonte da verdade** (o Grafana os carrega em modo somente leitura). Para mudar um painel: edite-o na interface, use *Export → Export as JSON* e sobrescreva o arquivo correspondente em `docs/grafana/`. Depois rode `cd test/server_metrics && npm test`: o teste garante que toda consulta cita apenas métricas que o servidor realmente expõe.

## Operação

```bash
docker compose --env-file observability/.env ps          # estado
docker compose --env-file observability/.env logs -f     # logs
docker compose --env-file observability/.env down        # para e MANTÉM os dados
docker compose --env-file observability/.env down -v     # para e APAGA os dados (Prometheus e Grafana)
```

- **Retenção:** 30 dias no Prometheus (volume `dfi-prometheus-data`).
- **Acesso pela rede da bancada:** as portas ficam presas ao `127.0.0.1` de propósito. Para abrir o Grafana a outras máquinas, troque o mapeamento de portas em `docker-compose.yml` e defina uma senha forte.
- **Versões fixadas:** `prom/prometheus:v3.15.0` e `grafana/grafana-oss:12.4.3`.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Alvo `dfi-server` aparece **DOWN** em `/targets` | servidor Node parado, ou o Firewall do Windows bloqueia a entrada na porta 3000 vinda do Docker | suba o servidor; libere a porta 3000 de entrada (mesma ideia do broker: veja `docs/broker_local_mosquitto.md`, seção do firewall) |
| `host.docker.internal` não resolve (Linux) | o nome só existe por padrão no Docker Desktop | o `docker-compose.yml` já mapeia `host.docker.internal:host-gateway`; use Docker 20.10+ |
| `docker compose up` reclama de `GRAFANA_ADMIN_PASSWORD` | faltou o `--env-file` ou a senha está vazia | use `--env-file observability/.env` e preencha a senha |
| `GRAFANA_ADMIN_PASSWORD` contém `$` | Docker Compose interpola variáveis `$` em arquivos `.env` | escreva `$$` (ex: senha `p@ss$word` vira `p@ss$$word` no `.env`) |
| Mudei a senha no `.env` e o Grafana continua com a antiga | `GRAFANA_ADMIN_PASSWORD` só vale na **PRIMEIRA** criação do volume `grafana-data` | apague o volume (`down -v`, perde os dados do Grafana) ou troque a senha na interface / com `grafana cli admin reset-admin-password` |
| Painéis de latência vazios | ninguém enviou comandos na janela | envie um pedido pelo dashboard web |
| Painel vazio depois de renomear uma métrica | a consulta ainda cita o nome antigo | rode `npm test` em `test/server_metrics`: o teste aponta a métrica inexistente |
| Porta 9090 ou 3030 ocupada | outro programa usa a porta | defina `PROMETHEUS_PORT` / `GRAFANA_PORT` em `observability/.env` |

## Relação com o Deployment Guide

O [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) (versão inicial, 30/09/2026) referencia este README na seção 8 (Observabilidade). Este README continua sendo a fonte dos passos detalhados do stack.
