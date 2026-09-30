# Card: Deployment Guide — Guia de Implantação Completa

**Template:** A (Definition of Done) — **Status:** 🔄 In Progress · **Prioridade:** 🟡 Média

> **Atualização 30/09/2026:** versão inicial de docs/DEPLOYMENT.md redigida (seções 1–10, cenários A–D, inclui a observabilidade Prometheus/Grafana). **Pendente:** Fase 3 (executar do zero em máquina limpa, cronometrar e corrigir atritos) e linkar no CHANGELOG. Nenhum comando foi testado em máquina limpa ainda.

---

## 🎯 Objetivo

Criar documento (`docs/DEPLOYMENT.md`) com passo a passo completo para implantar o sistema DataFlowInventory do zero em um novo ambiente — cobrindo pré-requisitos, setup de hardware, configuração de software (broker, servidor, dashboard) e validação pós-deploy — servindo como runbook de produção/bancada.

## 📄 Referências

- **Scripts existentes:** `scripts/setup.sh` / `scripts/setup.ps1` (onboarding automatizado)
- **Setup atual disperso em:** `README.md` §"Como Rodar", `server/README.md`, `simulator/README.md`
- **Broker local:** `docs/broker_local_mosquitto.md`
- **Broker remoto:** `docs/INTEGRATION_GUIDE.md` (HiveMQ Cloud)
- **Checklist de rede:** `docs/testes/validações/checklist_pre_teste_rede_infra.md`
- **Gap identificado em:** `docs/testes/roteiros/semana_06_22-26_setembro.md` §7.2

## ✅ Critério de Aceite

### Estrutura do Documento
- [x] Arquivo `docs/DEPLOYMENT.md` criado com seções:
  - **1. Pré-requisitos** (Node.js v22, Arduino IDE, mosquitto, hardware físico)
  - **2. Setup de Hardware** (montagem, fiação — cross-ref `BILL_OF_MATERIALS.md` e diagrama elétrico)
  - **3. Setup de Firmware** (upload Arduino Uno + ESP32, `secrets.h`)
  - **4. Setup de Broker** (local Mosquitto OU nuvem HiveMQ — decisão documentada)
  - **5. Setup de Servidor** (`server/.env`, `npm install`, `npm start`)
  - **6. Setup de Dashboard** (acesso via navegador, validação visual)
  - **7. Validação Pós-Deploy** (checklist de saúde: `/api/status`, badges, MQTT probe)
  - **8. Rollback/Troubleshooting** (problemas comuns e soluções)

### Cobertura de Cenários
- [ ] Cenário A: Deploy local completo (bancada isolada, sem nuvem)
- [ ] Cenário B: Deploy com broker remoto (HiveMQ Cloud)
- [ ] Cenário C: Deploy apenas simulador (sem hardware físico)
- [ ] Cenário D: Deploy com integração Beckhoff CX9240 (opcional/avançado)

### Automação
- [ ] Scripts `scripts/setup.sh`/`.ps1` referenciados e testados a partir do zero
- [ ] Comando único de "smoke test" pós-deploy documentado (ex: `curl localhost:3000/api/status`)

## 🔗 Dependências

- **Bloqueado por:** Card #Diagrama Elétrico (deploy de hardware referencia o diagrama)
- **Bloqueia:** Onboarding de novos integrantes/avaliadores externos
- **Relacionado:** Card #BOM (lista de componentes necessários para o deploy)

## 📋 Checklist de Execução

### Fase 1 — Levantamento
- [x] Mapear todos os passos manuais realizados desde clone até dashboard funcional
- [x] Identificar dependências ocultas (variáveis de ambiente, portas, drivers)

### Fase 2 — Redação
- [x] Escrever seções 1–8 do `DEPLOYMENT.md`
- [ ] Incluir comandos copy-paste testados (bash e PowerShell)
- [x] Adicionar troubleshooting dos problemas já documentados no `CHANGELOG.md`

### Fase 3 — Validação
- [ ] Executar o guia do zero em máquina limpa (ou VM)
- [ ] Cronometrar tempo total de deploy
- [ ] Corrigir pontos de fricção identificados

### Fase 4 — Documentação
- [x] `README.md` linka para `DEPLOYMENT.md`
- [ ] `CHANGELOG.md` registra criação do guia
- [ ] Mover card para `Done`

## 🗓️ Estimativa

- **Tempo:** 5–7h (levantamento 2h + redação 3h + validação prática 2h)
- **Prioridade:** **P2** (importante, não bloqueante)
- **Data alvo:** Semana 7 (29/09 a 03/10/2026)
- **Evidência:** SHA do commit + log de execução em máquina limpa

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Passos desatualizados após mudanças futuras | Médio | Revisão a cada release/sprint relevante |
| Ambiente de teste não replicável (hardware físico) | Médio | Documentar claramente o Cenário C (simulador) como alternativa |
| Divergência Windows/Linux | Baixo | Scripts `.sh` e `.ps1` já existem; documentar ambos |

---

**Criado em:** 21/09/2026
**Área:** Docs/Infra
**Bloco de Teste:** N/A (documentação/processo)
**Labels:** `area:docs`, `area:infra`, `tipo:documentation`, `p2-medio`
