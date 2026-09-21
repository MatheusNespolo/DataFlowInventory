# Card: Testes E2E Automatizados — Dashboard + API

**Template:** A (Definition of Done) — **Status:** 📋 Backlog · **Prioridade:** 🟡 Média

---

## 🎯 Objetivo

Implementar suíte de testes End-to-End automatizados (Cypress ou Playwright) cobrindo o fluxo crítico do Dashboard web e da API REST/WebSocket (`server/server.js`), reduzindo a dependência de validação manual em bancada e detectando regressões antes do merge.

## 📄 Referências

- **CI/CD existente:** `.github/workflows/lint-and-security.yaml` (lint + secret-detection + npm audit + arduino-compile — sem testes funcionais ainda)
- **Simulador (ambiente de teste ideal, sem hardware):** `simulator/server.js`
- **Plano de testes manual atual:** `docs/testes/plano_de_testes.md` (6 tiers, todo bancada/manual)
- **Front-end:** `frontend/` (dashboard Socket.IO)
- **API:** `server/server.js` (`/api/status`, comandos via Socket.IO)
- **Gap identificado em:** `docs/testes/roteiros/semana_06_22-26_setembro.md` §7.2

## ✅ Critério de Aceite

### Setup
- [ ] Framework escolhido e instalado (`Cypress` recomendado — melhor suporte a Socket.IO/WebSocket)
- [ ] `test/e2e/` criado com estrutura de specs
- [ ] `package.json` (raiz ou `test/e2e/`) com scripts `test:e2e` e `test:e2e:ci`

### Cobertura de Cenários (usando `simulator/server.js` como backend de teste)
- [ ] **E2E1:** Dashboard carrega e exibe estoque inicial corretamente
- [ ] **E2E2:** Comando de pedido (peça A/B/C) reflete mudança de estado na UI
- [ ] **E2E3:** Rejeição de comando (`sem_estoque`, `ocupado`) exibe feedback visual correto
- [ ] **E2E4:** Reconexão WebSocket após queda simulada restaura estado
- [ ] **E2E5:** `GET /api/status` retorna schema esperado (status 200/503)
- [ ] **E2E6:** Rate limit de comandos (`COMANDO_INTERVALO_MS`) é respeitado pela API

### Integração CI/CD
- [ ] Novo job `e2e-tests` adicionado a `.github/workflows/lint-and-security.yaml` (ou novo workflow `test.yaml`)
- [ ] Testes rodam contra `simulator/server.js` (sem dependência de hardware físico)
- [ ] Falha de teste E2E bloqueia merge em `main`

### Documentação
- [ ] `docs/CI-CD.md` atualizado com seção de testes E2E
- [ ] `CONTRIBUTING.md` §5 menciona `npm run test:e2e` como validação obrigatória
- [ ] `docs/CHANGELOG.md` registra a introdução da suíte

## 🔗 Dependências

- **Bloqueado por:** (nada — pode iniciar com o simulador já existente)
- **Bloqueia:** Confiabilidade de releases futuras sem regressão manual
- **Relacionado:** Card CI/CD (`card_cicd_lint_security.md`) — extensão natural do pipeline existente

## 📋 Checklist de Execução

### Fase 1 — Setup do Framework
- [ ] Avaliar Cypress vs Playwright (suporte a WebSocket/Socket.IO)
- [ ] Instalar e configurar (`cypress.config.js` ou equivalente)
- [ ] Criar primeiro spec smoke-test (dashboard carrega)

### Fase 2 — Cenários Críticos
- [ ] Implementar E2E1–E2E3 (fluxo feliz + rejeições)
- [ ] Implementar E2E4 (reconexão)
- [ ] Implementar E2E5–E2E6 (API/rate limit)

### Fase 3 — Integração CI
- [ ] Adicionar job no workflow GitHub Actions
- [ ] Validar execução headless no CI (sem display gráfico)
- [ ] Cachear dependências (node_modules do Cypress)

### Fase 4 — Documentação e Rollout
- [ ] Atualizar `CI-CD.md` e `CONTRIBUTING.md`
- [ ] Registrar no `CHANGELOG.md`
- [ ] Mover card para `Done`

## 🗓️ Estimativa

- **Tempo:** 8–12h (setup 2h + specs 5h + integração CI 2h + docs 1–2h)
- **Prioridade:** **P2** (reduz risco de regressão, não bloqueante)
- **Data alvo:** Semana 7–8 (29/09 a 10/10/2026)
- **Evidência:** SHA do commit + link do workflow verde no GitHub Actions

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Testes instáveis (flaky) por timing de Socket.IO | Médio | Usar `cy.wait()` com assertions explícitas, não delays fixos |
| CI mais lento com testes E2E | Baixo | Rodar em job paralelo separado do lint |
| Simulador diverge do hardware real | Médio | E2E cobre lógica de negócio; testes manuais em bancada continuam para hardware |

---

**Criado em:** 21/09/2026
**Área:** QA/CI-CD
**Bloco de Teste:** N/A (nova infraestrutura de teste)
**Labels:** `area:qa`, `area:infra`, `tipo:feature`, `p2-medio`
