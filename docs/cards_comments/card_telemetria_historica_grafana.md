# Card: Telemetria Histórica — Grafana/InfluxDB (Métricas de Performance)

**Template:** A (Definition of Done) — **Status:** 📋 Backlog · **Prioridade:** 🟢 Baixa

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
- [ ] InfluxDB (ou Prometheus) provisionado (Docker local para desenvolvimento)
- [ ] Grafana provisionado e conectado à fonte de dados
- [ ] `docker-compose.yml` (novo ou estendido) inclui os serviços de observabilidade

### Instrumentação
- [ ] `server/server.js` publica métricas: latência de resposta MQTT (publish → ack), tempo de processamento de comando, contagem de eventos por tipo
- [ ] Métricas de conexão: uptime do broker, reconexões, mensagens perdidas (LWT)
- [ ] Métricas de estoque: histórico de variação ao longo do tempo (complementar ao SQLite do CX9240)

### Dashboards Grafana
- [ ] Dashboard "Visão Geral": status esteiras, estoque em tempo real
- [ ] Dashboard "Performance": latência p50/p95/p99, throughput
- [ ] Dashboard "Confiabilidade": reconexões, erros, uptime

### Documentação
- [ ] `docs/ARCHITECTURE.md`: nova seção de Observabilidade
- [ ] `docs/DEPLOYMENT.md` (se já existir — ver Card Deployment): passo a passo de setup do stack de observabilidade
- [ ] `docs/CHANGELOG.md` registra a introdução da telemetria histórica

## 🔗 Dependências

- **Bloqueado por:** Card #Deployment Guide (setup de observabilidade se apoia no guia de deploy)
- **Bloqueia:** (nada — melhoria incremental, não bloqueia outras frentes)
- **Relacionado:** Integração CX9240 (`card_beckhoff_cx9240_comment.md`) — fonte de dados de negócio já validada; esta iniciativa foca em performance/infra

## 📋 Checklist de Execução

### Fase 1 — Infraestrutura
- [ ] Provisionar InfluxDB via Docker (`docker-compose.yml`)
- [ ] Provisionar Grafana via Docker, conectar ao InfluxDB
- [ ] Validar ingestão de dados de teste (ping/pong simples)

### Fase 2 — Instrumentação
- [ ] Adicionar client InfluxDB (ou Prometheus exporter) em `server/server.js`
- [ ] Instrumentar pontos críticos: recepção MQTT, processamento de comando, resposta ao dashboard
- [ ] Validar métricas aparecendo no InfluxDB

### Fase 3 — Dashboards
- [ ] Criar os 3 dashboards Grafana (Visão Geral, Performance, Confiabilidade)
- [ ] Exportar JSON dos dashboards para versionamento (`docs/grafana/*.json`)

### Fase 4 — Documentação e Validação
- [ ] Atualizar `ARCHITECTURE.md` e `DEPLOYMENT.md`
- [ ] Rodar burn-in test (ver `semana_06_22-26_setembro.md` Bloco 4) observando os dashboards em paralelo
- [ ] Registrar no `CHANGELOG.md`
- [ ] Mover card para `Done`

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
