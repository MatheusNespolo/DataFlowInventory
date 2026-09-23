# Card: Bill of Materials (BOM) — Inventário de Componentes

**Template:** A (Definition of Done) — **Status:** 📋 Backlog · **Prioridade:** 🔴 Alta

---

## 🎯 Objetivo

Publicar documento formal (`docs/BILL_OF_MATERIALS.md`) contendo todos os componentes eletrônicos e mecânicos utilizados no protótipo DataFlowInventory, com SKUs, fornecedores, custos unitários/totais e alternativas técnicas — permitindo reprodução completa por terceiros e rastreabilidade de custos.

## 📄 Referências

- **Hardware documentado parcialmente:** `README.md` §"Hardware Necessário" (tabela sem SKUs/custos)
- **Configurações alternativas:** `README.md` §"Opção A/B/C — IRF520/Mega/L298N"
- **Arquitetura eletrônica:** `docs/ARCHITECTURE.md` §"Hardware — Pinagem e Alimentação"
- **Diagrama elétrico (referência cruzada):** ✅ [`docs/fluxogramas/Diagrama elétrico.png`](../fluxogramas/Diagrama%20el%C3%A9trico.png) + [`.pptx`](../fluxogramas/Diagrama%20el%C3%A9trico.pptx) *(publicado em 23/09/2026)*
- **Gap identificado em:** `docs/testes/roteiros/semana_06_22-26_setembro.md` §7.2

## ✅ Critério de Aceite

### Estrutura do Documento
- [ ] Arquivo `docs/BILL_OF_MATERIALS.md` criado com seções:
  - **1. Eletrônica principal** (Arduino Uno, ESP32, drivers, sensores, LCD)
  - **2. Motores e mecânica** (motores DC, motor de passo 28BYJ-48, roda separadora)
  - **3. Alimentação** (fonte 12V/5A, cabeamento, conectores)
  - **4. Estrutura mecânica** (base MDF, parafusos, suportes)
  - **5. Ferramentas/consumíveis** (solda, fios, termorretrátil)
  - **6. Alternativas técnicas** (L298N vs IRF520, Uno vs Mega — cross-ref README)

### Dados por Item
- [ ] Coluna: **Componente** (nome técnico)
- [ ] Coluna: **Quantidade**
- [ ] Coluna: **SKU/Código** (referência do fornecedor)
- [ ] Coluna: **Fornecedor sugerido** (Baú da Eletrônica, Curto Circuito, AliExpress, etc.)
- [ ] Coluna: **Custo unitário** (R$ — data de referência)
- [ ] Coluna: **Custo total**
- [ ] Coluna: **Datasheet/link** (URL do produto)
- [ ] **Total geral** ao final (custo do protótipo completo)

### Documentação
- [ ] `README.md` §"Hardware Necessário" adiciona link para `BILL_OF_MATERIALS.md`
- [ ] `docs/CHANGELOG.md` registra criação do BOM
- [ ] `docs/ARCHITECTURE.md` faz cross-reference

## 🔗 Dependências

- **Bloqueado por:** (nada — pode iniciar imediatamente)
- **Bloqueia:** Reprodutibilidade do protótipo por terceiros
- **Relacionado:** Card #Diagrama Elétrico (BOM alimenta o diagrama e vice-versa)

## 📋 Checklist de Execução

### Fase 1 — Inventário Físico
- [ ] Levantar lista completa de componentes usados na bancada atual
- [ ] Fotografar cada componente (referência visual)
- [ ] Anotar SKUs a partir de embalagens/notas fiscais

### Fase 2 — Pesquisa de Fornecedores
- [ ] Consultar 2–3 fornecedores por item (comparação de preços)
- [ ] Anotar prazos de entrega estimados
- [ ] Identificar componentes descontinuados/substitutos

### Fase 3 — Documentação
- [ ] Preencher tabela em `docs/BILL_OF_MATERIALS.md`
- [ ] Cross-reference com `README.md` e `ARCHITECTURE.md`
- [ ] Registrar no `CHANGELOG.md`

### Fase 4 — Validação
- [ ] Revisão por pares (2 pessoas confirmam custos e SKUs)
- [ ] Testar reprodutibilidade: pedir para terceiro simular compra
- [ ] Mover card para `Done`

## 🗓️ Estimativa

- **Tempo:** 4–6h (levantamento 2h + pesquisa 2h + documentação 1–2h)
- **Prioridade:** **P1** (essencial para reprodução do protótipo)
- **Data alvo:** Semana 6–7 (22/09 a 03/10/2026)
- **Evidência:** SHA do commit + revisão por pares

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Componente descontinuado | Médio | Listar 2+ alternativas por item crítico |
| Preços desatualizados | Baixo | Data de referência explícita; revisão trimestral |
| SKU incorreto | Médio | Cross-reference com foto e datasheet |

---

**Criado em:** 21/09/2026
**Área:** Docs/Hardware
**Bloco de Teste:** N/A (documentação)
**Labels:** `area:docs`, `area:hardware`, `tipo:documentation`, `p1-alto`
