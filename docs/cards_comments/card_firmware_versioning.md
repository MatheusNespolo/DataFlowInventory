# Card: Firmware Versioning — Tags Git e Versão em Sketches

**Template:** A (Definition of Done) — **Status:** 📋 Backlog · **Prioridade:** 🟡 Média

---

## 🎯 Objetivo

Introduzir rastreamento explícito de versão nos firmwares embarcados (`arduino/data_flow_inventory.ino`, `esp32/gateway_mqtt/gateway_mqtt.ino`) e nas tasks TwinCAT do Beckhoff CX9240, com tags Git correspondentes e registro consistente no `CHANGELOG.md` — eliminando a ambiguidade de "qual versão de firmware está rodando na bancada".

## 📄 Referências

- **Firmware Arduino:** `arduino/data_flow_inventory/data_flow_inventory.ino`
- **Firmware ESP32:** `esp32/gateway_mqtt/gateway_mqtt.ino`
- **Projeto TwinCAT:** `TwinCAT/Banco-de-Dados/CX9240_DataFlowInventory`
- **Histórico de mudanças:** `docs/CHANGELOG.md` (já rastreia mudanças por SHA de commit, mas não por versão semântica do firmware)
- **Gap identificado em:** `docs/testes/roteiros/semana_06_22-26_setembro.md` §7.2

## ✅ Critério de Aceite

### Versionamento em Firmware
- [ ] `data_flow_inventory.ino`: comentário de cabeçalho com `// Versão: vX.Y.Z` + changelog resumido inline
- [ ] `gateway_mqtt.ino`: mesmo padrão de cabeçalho
- [ ] Versão publicada via MQTT (opcional): novo campo `firmwareVersion` no payload `dataflow/status`
- [ ] TwinCAT `CX9240_DataFlowInventory`: versão do projeto documentada em `docs/2026-09-08-cx9240-mqtt-historian-design.md` ou README próprio

### Tags Git
- [ ] Convenção de tag definida: `firmware-uno-vX.Y.Z`, `firmware-esp32-vX.Y.Z`
- [ ] Tags criadas retroativamente para marcos já validados (Teste 5, Teste 6)
- [ ] `CONTRIBUTING.md` documenta processo de criação de tags ao validar firmware em bancada

### Documentação
- [ ] `docs/CHANGELOG.md`: nova convenção — cada entrada de firmware referencia a tag correspondente
- [ ] `README.md` §"Como Rodar": menciona versão mínima recomendada de firmware
- [ ] `docs/ARCHITECTURE.md`: seção de compatibilidade entre versões Arduino/ESP32/TwinCAT

## 🔗 Dependências

- **Bloqueado por:** (nada — pode iniciar imediatamente)
- **Bloqueia:** Rastreabilidade de bugs/regressões por versão de firmware
- **Relacionado:** `docs/CHANGELOG.md` (convenção Keep a Changelog já em uso)

## 📋 Checklist de Execução

### Fase 1 — Definição de Convenção
- [ ] Definir esquema SemVer (MAJOR.MINOR.PATCH) para firmwares
- [ ] Documentar critério: quando incrementar MAJOR/MINOR/PATCH

### Fase 2 — Aplicação Retroativa
- [ ] Identificar marcos históricos no `CHANGELOG.md` (35fe3d5, 9a7ce25, b2ec47d, etc.)
- [ ] Atribuir versões retroativas (ex: v1.0.0 = Teste 4 E2E, v1.1.0 = Teste 5 três esteiras)
- [ ] Criar tags Git correspondentes (`git tag firmware-uno-v1.1.0 <sha>`)

### Fase 3 — Aplicação Prospectiva
- [ ] Adicionar cabeçalho de versão nos `.ino` atuais
- [ ] Atualizar processo em `CONTRIBUTING.md`
- [ ] Validar nova tag no próximo firmware alterado

### Fase 4 — Documentação
- [ ] Atualizar `CHANGELOG.md`, `README.md`, `ARCHITECTURE.md`
- [ ] Mover card para `Done`

## 🗓️ Estimativa

- **Tempo:** 3–4h (definição 1h + aplicação retroativa 1h + docs 1–2h)
- **Prioridade:** **P2** (organização/rastreabilidade, não bloqueante)
- **Data alvo:** Semana 7 (29/09 a 03/10/2026)
- **Evidência:** Tags visíveis em `git tag -l`, SHA do commit de documentação

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Versionamento retroativo impreciso | Baixo | Basear-se em datas/SHAs já documentados no CHANGELOG |
| Esquecimento de tag em mudanças futuras | Médio | Incluir passo no checklist de `CONTRIBUTING.md` §5 |
| Divergência entre versão do `.ino` e tag Git | Baixo | CI futuro pode validar consistência (extensão do Card E2E) |

---

**Criado em:** 21/09/2026
**Área:** Firmware/Processo
**Bloco de Teste:** N/A (organização/processo)
**Labels:** `area:firmware-uno`, `area:firmware-esp32`, `tipo:chore`, `p2-medio`
