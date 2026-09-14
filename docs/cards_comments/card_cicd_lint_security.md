# Card: CI/CD — GitHub Actions (Linting + Secret Detection)

**Template:** A (Definition of Done)

---

## 🎯 Objetivo

Implementar validação automatizada de commits para evitar erros de sintaxe, credenciais versionadas e garantir qualidade de código antes do merge.

## 📄 Referências

- **Guia:** `docs/CONTRIBUTING.md` §5 (validações antes do PR)
- **Tecnologias:** ESLint (JS), truffleHog (secrets), arduino-cli (firmware), npm audit
- **Workflow:** GitHub Actions triggers em push/PR (branches `main`, `dev`)
- **Documentação:** `docs/CI-CD.md` — pipelines, procedimentos, troubleshooting

## ✅ Critério de Aceite

- [ ] `.github/workflows/lint-and-security.yaml` criado e funcional
  - **Job 1:** ESLint em `server/` + `simulator/` (sem erros críticos)
  - **Job 2:** Secret detection (truffleHog) — detecta `.env`, `secrets.h`, AWS keys, etc.
  - **Job 3:** npm audit (vulnerabilidades críticas bloqueiam)
  - **Job 4:** arduino-cli compila 4 sketches (Uno principal, ESP32 gateway, teste AB)
- [ ] `.github/workflows/test.yaml` criado (futura Sprint 6 — Docker E2E + Jest)
- [ ] README.md atualizado com badge [![CI/CD](https://github.com/...)](#)
- [ ] CONTRIBUTING.md ajustado para refletir validações automatizadas
- [ ] Scripts locais criados:
  - [ ] `scripts/setup.sh` — onboarding automatizado
  - [ ] `scripts/validate-env.sh` — detecção de segredos local
  - [ ] `scripts/precommit-checks.sh` — hook Git pré-commit
- [ ] Validação: PR de teste com erro proposital passa pelo CI (falha esperada)
- [ ] Validação: PR de teste sem erros passa pelo CI (sucesso esperado)
- [ ] Resultado registrado em `docs/CHANGELOG.md`

## 🔗 Dependências

- **Bloqueado por:** (nada — pode começar imediatamente)
- **Bloqueia:** Qualquer pipeline futura de testes E2E, deploy automático
- **Relacionado:** Card #separador (ambos parte da Sprint 5)

## 📋 Checklist de Execução

### Fase 1 — Criação de Workflows
- [ ] Criar `.github/workflows/lint-and-security.yaml` com 4 jobs
- [ ] Testar workflow localmente com `act` (opcional) ou via push em branch de teste
- [ ] Validar que arduino-cli instala cores corretas (avr + esp32)
- [ ] Validar que truffleHog roda em histórico completo

### Fase 2 — Scripts de Setup
- [ ] Criar `scripts/setup.sh` (onboarding automatizado)
- [ ] Criar `scripts/validate-env.sh` (validação de segredos)
- [ ] Criar `scripts/precommit-checks.sh` (hook Git)
- [ ] Tornar executáveis: `chmod +x scripts/*.sh`
- [ ] Testar em ambiente limpo (clone fresco do repo)

### Fase 3 — Documentação
- [ ] Atualizar `docs/CI-CD.md` com troubleshooting
- [ ] Atualizar `CONTRIBUTING.md` §5 (validações automatizadas)
- [ ] Adicionar badge ao `README.md`
- [ ] Atualizar `docs/CHANGELOG.md` (Sprint 5 — CI/CD)

### Fase 4 — Validação
- [ ] Push de teste com `.env` em staging → CI bloqueia ✅
- [ ] Push de teste com sintaxe incorreta → CI bloqueia ✅
- [ ] Push limpo → CI passa ✅
- [ ] Mover card para `Done`

## 🗓️ Estimativa

- **Tempo:** 4–6h (implementação + testes + docs)
- **Prioridade:** **P0** (bloqueante para Sprint 5)
- **Data validação:** 15/09/2026 (Semana 5, Bloco 1)
- **Evidência:** SHA do commit + screenshot do workflow verde

---

**Criado em:** 14/09/2026  
**Área:** Infra/CI-CD  
**Bloco de Teste:** N/A (melhoria de processo)  
**Labels:** `area:infra`, `tipo:hardening`, `p0-critico`
