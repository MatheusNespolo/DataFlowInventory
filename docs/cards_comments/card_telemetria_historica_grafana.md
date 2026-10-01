# Card: Telemetria Histórica — Prometheus/Grafana (Métricas de Performance)

> **Atualização 01/10/2026 — Status: ✅ Done.** Telemetria concluída e validada; as capturas de tela dos dashboards ficam anexadas ao card #25 no GitHub Projects. O texto a seguir é o registro de 30/09/2026, quando a validação ainda estava pendente. **Atualização 30/09/2026 — Status: 🔄 In Progress.** Implementação entregue (PR #29) com **Prometheus** (modelo *pull*) no lugar de InfluxDB: `GET /metrics`, `docker-compose.yml`, 3 dashboards em `docs/grafana/`, testes sem Docker e job de CI. **Pendente:** validação real com Docker (`scripts/observability-smoke.ps1`), conferência visual no Grafana (cores, legendas dos state-timelines, lacunas em vez de zeros nos gráficos de latência sem tráfego), burn-in observado e screenshots. Itens abaixo marcados `[x]` foram entregues; `[ ]` dependem de Docker/bancada. Onde o texto cita InfluxDB, leia Prometheus.

**Template:** A (Definition of Done) — **Status:** ✅ Done (01/10/2026) · **Prioridade:** 🟢 Baixa

---

## 🎯 Objetivo

Implementar camada de observabilidade com séries temporais (InfluxDB ou Prometheus) e dashboards Grafana para métricas de performance do sistema — latência MQTT, tempo de resposta da API, throughput de eventos — complementando o historiador SQLite do CX9240 (que foca em dados de negócio, não performance).

## 📄 Referências

- **Historiador atual (dados de negócio):** `TwinCAT/Banco-de-Dados/CX9240_DataFlowInventory` + `docs/2026-09-08-cx9240-mqtt-historian-design.md`
- **Broker MQTT:** Mosquitto local / HiveMQ Cloud (`docs/INTEGRATION_GUIDE.md`)
- **Servidor:** `server/server.js` (ponto de instrumentação de métricas)
- **Gap identificado em:** `docs/testes/roteiros/semana_06_22-26_setembro.md` §7.2

## ✅ Critério de Aceite

### Infraestrutura
- [x] Prometheus provisionado (Docker local para desenvolvimento; InfluxDB descartado)
- [x] Grafana provisionado e conectado à fonte de dados
- [x] `docker-compose.yml` (novo ou estendido) inclui os serviços de observabilidade

### Instrumentação
- [x] `server/server.js` publica métricas: latência de resposta MQTT (publish → ack), tempo de processamento de comando, contagem de eventos por tipo
- [x] Métricas de conexão: uptime do broker, reconexões, mensagens perdidas (LWT)
- [x] Métricas de estoque: histórico de variação ao longo do tempo (complementar ao SQLite do CX9240)

### Dashboards Grafana
- [x] Dashboard "Visão Geral": status esteiras, estoque em tempo real
- [x] Dashboard "Performance": latência p50/p95/p99, throughput
- [x] Dashboard "Confiabilidade": reconexões, erros, uptime

### Documentação
- [x] `docs/ARCHITECTURE.md`: nova seção de Observabilidade
- [x] `docs/DEPLOYMENT.md`: passo a passo de setup do stack de observabilidade (seção 8, versão inicial)
- [x] `docs/CHANGELOG.md` registra a introdução da telemetria histórica

## 🔗 Dependências

- **Bloqueado por:** Card #Deployment Guide (setup de observabilidade se apoia no guia de deploy)
- **Bloqueia:** (nada — melhoria incremental, não bloqueia outras frentes)
- **Relacionado:** Integração CX9240 (`card_beckhoff_cx9240_comment.md`) — fonte de dados de negócio já validada; esta iniciativa foca em performance/infra

## 📋 Checklist de Execução

### Fase 1 — Infraestrutura
- [x] Provisionar Prometheus via Docker (`docker-compose.yml`)
- [x] Provisionar Grafana via Docker, conectar ao Prometheus
- [x] Validar ingestão de dados de teste (ping/pong simples)

### Fase 2 — Instrumentação
- [x] Adicionar exporter Prometheus (`prom-client`) em `server/server.js`
- [x] Instrumentar pontos críticos: recepção MQTT, processamento de comando, resposta ao dashboard
- [x] Validar métricas aparecendo no Prometheus (smoke com Docker)

### Fase 3 — Dashboards
- [x] Criar os 3 dashboards Grafana (Visão Geral, Performance, Confiabilidade)
- [x] Exportar JSON dos dashboards para versionamento (`docs/grafana/*.json`)

### Fase 4 — Documentação e Validação
- [x] Atualizar `ARCHITECTURE.md` e `DEPLOYMENT.md`
- [x] Rodar burn-in test (ver `semana_06_22-26_setembro.md` Bloco 4) observando os dashboards em paralelo
- [x] Registrar no `CHANGELOG.md`
- [x] Mover card para `Done`

## 🗓️ Estimativa

- **Tempo:** 10–14h (infra 3h + instrumentação 4h + dashboards 3h + docs 2–3h)
- **Prioridade:** **P3** (melhoria de observabilidade, não bloqueante)
- **Data alvo:** Sprint futura (após conclusão de BOM/Deployment/E2E)
- **Evidência:** SHA do commit + screenshots dos dashboards + JSON exportado

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Overhead de instrumentação no `server.js` | Baixo | Métricas assíncronas, não bloqueantes (mesma filosofia do MQTT atual) |
| Complexidade operacional adicional (mais serviços) | Médio | Escopo opcional/dev; não obrigatório para bancada básica |
| Duplicação de dados com SQLite do CX9240 | Baixo | Escopo claro: CX9240 = dados de negócio; InfluxDB = performance/infra |

---

**Criado em:** 21/09/2026
**Área:** Infra/Observabilidade
**Bloco de Teste:** N/A (infraestrutura opcional)
**Labels:** `area:infra`, `tipo:feature`, `p3-baixo`
