# Comentários — Semana 7 (28/09–02/10/2026) — Cards #21–#25

> **Instrução de uso:** copie cada bloco abaixo e cole diretamente no comentário do respectivo card no GitHub Projects.
> Mova os cards manualmente: #21 e #22 de `Backlog` → `Todo`; #23, #24 e #25 permanecem em `Backlog`.

---

## Card #21 — BOM (Bill of Materials)

```
## 🧪 Rodada de bancada — 28/09/2026

**Roteiro:** `docs/testes/roteiros/semana_07_28_setembro_a_02_outubro.md` §7
**Status atual:** Backlog → **Todo** (prioridade P1 confirmada)

| Etapa | Resultado | Observações |
|---|---|---|
| Diagrama elétrico (pré-requisito visual) | ✅ | Publicado em 23/09 — `docs/fluxogramas/Diagrama elétrico.png` |
| Levantamento físico (Fase 1) | ⬜ Agendado 01/10 | Inventário dos componentes na bancada |
| Pesquisa de fornecedores (Fase 2) | ⬜ Agendado 02–03/10 | SKUs, preços, datasheets |
| Documentação `BILL_OF_MATERIALS.md` (Fase 3) | ⬜ Agendado 03/10 | Tabela completa com colunas: componente, qtd, SKU, fornecedor, custo |
| Revisão por pares (Fase 4) | ⬜ Semana 8 | Cross-reference com README + ARCHITECTURE |

### 📌 Conclusão parcial — 28/09
- **Aprovado:** pré-requisito do diagrama elétrico ✅ (23/09)
- **Iniciando:** Fase 1 agendada para 01/10 (paralela ao acabamento MDF)
- **Pendente:** Fases 2–4 → 03/10 / Semana 8

### 📝 Sincronização
- [ ] Transferir resultados para `semana_07_28_setembro_a_02_outubro.md` §10
- [ ] `CHANGELOG.md` atualizado quando `BILL_OF_MATERIALS.md` for criado
- [ ] Card movido para `In Progress` ao iniciar Fase 1
```

---

## Card #22 — Deployment Guide

```
## 🧪 Rodada de bancada — 28/09/2026

**Roteiro:** `docs/testes/roteiros/semana_07_28_setembro_a_02_outubro.md` §7
**Status atual:** Backlog → **Todo** (prioridade P2, dependência desbloqueada)

| Etapa | Resultado | Observações |
|---|---|---|
| Diagrama elétrico (bloqueador) | ✅ DESBLOQUEADO | Publicado em 23/09 |
| `docs/INTEGRATION_GUIDE.md` (HiveMQ) | ✅ Disponível | Referência para Cenário B |
| `docs/broker_local_mosquitto.md` | ✅ Disponível | Referência para Cenário A |
| Levantamento de passos manuais (Fase 1) | ⬜ Agendado 02/10 | Mapear setup do zero até dashboard |
| Redação `DEPLOYMENT.md` seções 1–8 (Fase 2) | ⬜ Agendado 03/10 | Cenários A (local), B (HiveMQ), C (simulador) |
| Validação em máquina limpa (Fase 3) | ⬜ Semana 8 | Cronometrar e corrigir fricções |
| Documentação final (Fase 4) | ⬜ Semana 8 | README + CHANGELOG |

### 📌 Conclusão parcial — 28/09
- **Aprovado:** bloqueador do diagrama elétrico resolvido ✅
- **Iniciando:** Fase 1 agendada para 02/10 (sexta-feira)
- **Pendente:** Fases 2–4 → 03/10 / Semana 8

### 📝 Sincronização
- [ ] Transferir resultados para `semana_07_28_setembro_a_02_outubro.md` §10
- [ ] Card movido para `In Progress` ao iniciar Fase 1
```

---

## Card #23 — Testes E2E Automatizados

```
## 🧪 Rodada de bancada — 28/09/2026

**Roteiro:** `docs/testes/roteiros/semana_07_28_setembro_a_02_outubro.md` §7
**Status atual:** Backlog (mantém — prioridade P2, não-bloqueante)

| Etapa | Resultado | Observações |
|---|---|---|
| `simulator/server.js` (ambiente de teste) | ✅ Disponível | Semana 5 — backend ideal para E2E sem hardware |
| `.github/workflows/lint-and-security.yaml` | ✅ Disponível | Base para extensão com job `e2e-tests` |
| Avaliação Cypress vs Playwright | ⬜ Semana 8 | Suporte WebSocket/Socket.IO |
| Setup framework + primeiro spec (Fase 1) | ⬜ Semana 8 | Smoke test: dashboard carrega |
| Implementação E2E1–E2E6 (Fase 2) | ⬜ Semana 8 | Fluxo feliz + rejeições + reconexão |
| Integração CI + job `e2e-tests` (Fase 3) | ⬜ Semana 8 | Headless; bloqueia merge em main |

### 📌 Conclusão parcial — 28/09
- **Aprovado:** pré-requisitos disponíveis (simulador + CI base)
- **Decisão:** adiado para Semana 8 — foco da Semana 7 em hardware (IRF520 B/C) e documentação (BOM, Deployment)
- **Sem bloqueadores:** pode iniciar a qualquer momento na Semana 8

### 📝 Sincronização
- [ ] Revisar em planning da Semana 8 (06/10)
- [ ] Card permanece em `Backlog`
```

---

## Card #24 — Firmware Versioning

```
## 🧪 Rodada de bancada — 28/09/2026

**Roteiro:** `docs/testes/roteiros/semana_07_28_setembro_a_02_outubro.md` §7
**Status atual:** Backlog → **Todo** (prioridade P2, não-bloqueante)

| Etapa | Resultado | Observações |
|---|---|---|
| `docs/CHANGELOG.md` com SHAs históricos | ✅ Disponível | Base para atribuição retroativa de versões |
| Convenção SemVer definida (Fase 1) | ⬜ Agendado 02/10 | Critérios MAJOR/MINOR/PATCH para firmware |
| Tags retroativas (Fase 2) | ⬜ Agendado 02/10 | v1.0.0 = Teste 4 E2E · v1.1.0 = Teste 5 (3 esteiras) · v1.2.0 = Teste 6 (HiveMQ Cloud) |
| Cabeçalhos nos `.ino` (Fase 3) | ⬜ Semana 8 | `// Versão: vX.Y.Z` em `data_flow_inventory.ino` e `gateway_mqtt.ino` |
| Documentação em CONTRIBUTING.md (Fase 4) | ⬜ Semana 8 | Passo "criar tag" no checklist de bancada |

### 📌 Conclusão parcial — 28/09
- **Aprovado:** CHANGELOG com histórico de SHAs disponível como base ✅
- **Iniciando:** Fases 1–2 agendadas para 02/10 (rápidas: ~1–2h)
- **Pendente:** Fases 3–4 → Semana 8

### 📝 Sincronização
- [ ] `git tag -l` após criação das tags retroativas
- [ ] `CHANGELOG.md` atualizado com nova convenção de versão
- [ ] Card movido para `In Progress` ao definir a convenção SemVer
```

---

## Card #25 — Telemetria Histórica (Grafana/InfluxDB)

```
## 🧪 Rodada de bancada — 28/09/2026

**Roteiro:** `docs/testes/roteiros/semana_07_28_setembro_a_02_outubro.md` §7
**Status atual:** Backlog (mantém — prioridade P3, bloqueado por #22)

| Etapa | Resultado | Observações |
|---|---|---|
| Historiador SQLite CX9240 (dados de negócio) | ✅ Validado 19/09 | Base de dados de negócio funcional |
| Card #22 Deployment Guide (bloqueador) | ⬜ Em andamento | Setup de observabilidade depende do guia de deploy |
| Provisionar InfluxDB + Grafana (Fase 1) | ⬜ Sprint futura | `docker-compose.yml` com stack de observabilidade |
| Instrumentar `server.js` (Fase 2) | ⬜ Sprint futura | Métricas: latência p50/p95/p99, throughput, uptime |
| Dashboards Grafana (Fase 3) | ⬜ Sprint futura | Visão Geral · Performance · Confiabilidade |

### 📌 Conclusão parcial — 28/09
- **Aprovado:** historiador de negócio (CX9240/SQLite) já validado — escopo bem delimitado
- **Bloqueado por:** Card #22 (Deployment Guide) — setup de observabilidade se apoia no guia de deploy
- **Decisão:** mantém Backlog; reavaliar após #22 concluído (Semana 8+)

### 📝 Sincronização
- [ ] Revisar em planning após conclusão do Card #22
- [ ] Card permanece em `Backlog`
```

---

**Arquivo gerado em:** 28/09/2026
**Referência:** `docs/testes/roteiros/semana_07_28_setembro_a_02_outubro.md` §7
**Movimentações manuais no board:**
- Card #21: `Backlog` → `Todo`
- Card #22: `Backlog` → `Todo`
- Card #23: permanece `Backlog`
- Card #24: `Backlog` → `Todo`
- Card #25: permanece `Backlog`
