# Governança do Board — GitHub Projects (Data Flow Inventory)

Guia de organização e sincronização do board [Data Flow Inventory (GitHub Projects #3)](https://github.com/users/MatheusNespolo/projects/3).

Define **colunas, campos customizados, labels, templates de comentário, automações e o ritual de bancada** — incluindo as validações de bancada concluídas em 27–28/08/2026 e o roadmap de testes em nuvem via HiveMQ Cloud.

> **Uma fonte para cada coisa:** o andamento de cada frente vive **só no board** (cards e comentários nas issues); o estado da bancada vive **só** em [`resultados.md`](../testes/resultados.md); este guia só define as **regras**. O catálogo antigo de cards e os rascunhos de comentários estão arquivados em [`docs/cards_comments/`](../cards_comments/README.md).

> **Princípio de rastreabilidade:** o board é a camada de acompanhamento visual; os documentos em `docs/` ([`resultados.md`](../testes/resultados.md), [`plano_de_testes.md`](../testes/plano_de_testes.md), [roteiros semanais](../testes/roteiros/), [`CHANGELOG.md`](../CHANGELOG.md) e `docs/artigo/Projeto de pesquisa - Final.docx`) são a fonte da verdade técnica. Todo card deve referenciar o documento ou commit comprobatório.

---

## 1. Estrutura do board

### 1.1 Colunas (campo `Status`)

| Coluna | Descrição | Regra de entrada / saída |
|---|---|---|
| `Backlog` | Ideias, melhorias futuras e *stretch goals* sem data de execução. | Demanda mapeada, sem pré-requisito de bancada atendido. |
| `Todo` | Priorizado para a próxima rodada de bancada. | Critério de aceite definido e sem bloqueios. |
| `In Progress` | Execução ativa nesta semana (**WIP máximo: 3**; acima disso, devolver para `Todo` o que não andou). | Atuação em código, circuito ou montagem. Um PR aberto com `Closes #N` mantém o card aqui até o merge. |
| `Blocked` | Impedido por dependência física, componente ou decisão externa. | Comentário obrigatório com motivo e desbloqueador. |
| `Done` | Concluído, validado e documentado. | Movido **automaticamente** quando o PR com `Closes #N` é mergeado (ou a issue é fechada). Evidência em [`resultados.md`](../testes/resultados.md) e/ou `CHANGELOG.md`. |

> Não há coluna `In Review`: o estado "em revisão" é o próprio PR aberto, vinculado ao card pelo `Closes #N`.

### 1.2 Campos customizados

| Campo | Tipo | Valores | Objetivo |
|---|---|---|---|
| `Área` | Single select | `Hardware`, `Firmware-Uno`, `Firmware-ESP32`, `Backend`, `Frontend`, `Infra/Rede`, `Docs/Artigo` | Identificar gargalos por disciplina. Preenchido a partir do label `area:*` principal do card. |
| `Prioridade` | Single select | `P0-Crítico`, `P1-Alto`, `P2-Médio`, `P3-Baixo` | Ordenar backlog e triagem. |
| `Bloco de Teste` | Single select | `B0`, `B1-B3`, `T1`, `T2`, `T3`, `T4`, `T5`, `T6-HiveMQ`, `Infra`, `N/A` | Mapear com a Tabela de Testes do `plano_de_testes.md` e o registro do `resultados.md`. |
| `Data Validação` | Date | Data da bancada | Rastrear histórico de aprovação em hardware. |
| `Evidência` | Text / URL | SHA do commit, link do roteiro ou seção do CHANGELOG | Auditoria técnica imediata. |

### 1.3 Labels padronizadas

```
area:hardware          area:firmware-uno       area:firmware-esp32
area:backend           area:frontend           area:infra
area:docs              tipo:feature            tipo:bug
tipo:hardening         tipo:teste              tipo:documentacao
status:blocked-hw      status:aguarda-bancada  stretch:hivemq-cloud
```

### 1.4 Views recomendadas

| View | Layout | Configuração |
|---|---|---|
| `Kanban` | Board | Agrupado por `Status` |
| `Por área` | Board | Agrupado por `Área` |
| `Rodada de bancada` | Table | Filtro `Data Validação`, ordenado por `Prioridade` |
| `Matriz de testes` | Table | Agrupado por `Bloco de Teste` — espelha o `plano_de_testes.md` |

---

## 2. Templates de comentário

### Template A — Abertura de card (Definition of Done)

    ## 🎯 Objetivo
    <uma frase>

    ## 📄 Referências
    - Plano de testes: `docs/testes/plano_de_testes.md#<âncora>`
    - Roteiro: `docs/testes/roteiros/semana_XX_DD-DD_mês.md`
    - Código: `<caminho/arquivo>`

    ## ✅ Critério de aceite
    - [ ] <verificável 1>
    - [ ] <verificável 2>
    - [ ] Resultado registrado no `resultados.md`

    ## 🔗 Dependências
    - Bloqueado por: #<n> | Bloqueia: #<n>

### Template B — Registro de bancada

    ## 🧪 Rodada de bancada — DD/MM/AAAA

    **Roteiro:** `docs/testes/roteiros/semana_XX_DD-MM_mês.md`
    **Ambiente:** Mosquitto local `<IP>:1883` · Wi-Fi 2,4 GHz `<SSID>` · Node v22+
    **Firmware vigente:** `<commit SHA ou tag> — ver `git log --oneline -1`

    | Etapa | Resultado | Medição |
    |---|---|---|
    | Pré-voo (`validar_infra.ps1`) | ✅/❌ | N/N PASS |
    | <etapa> | ✅/⚠️/❌ | |

    ### 📌 Conclusão
    - **Aprovado:** <itens>
    - **Pendente:** <itens> → replanejado para DD/MM

    ### 📝 Sincronização
    - [ ] Registrado no Registro de Resultados do `resultados.md`
    - [ ] `CHANGELOG.md` atualizado (se houve mudança de código)
    - [ ] Card movido para `<coluna>`

### Template C — Bloqueio

    ## 🔒 BLOQUEADO — DD/MM/AAAA

    **Motivo:** <descrição objetiva>
    **Tipo:** Hardware / Dependência externa / Decisão pendente
    **Desbloqueador:** <o que precisa acontecer>
    **Impacto:** bloqueia #<n>, #<n>
    **Workaround ativo:** <ex.: Plano B — simulador>
    **Reavaliar em:** DD/MM/AAAA

### Template D — Correção de bug

    ## 🐛 Correção — <título>

    **Sintoma:** <o que era observado>
    **Causa-raiz:** <análise técnica>
    **Correção:** <o que mudou>
    **Commit:** `<sha>`
    **Validação em bancada:** <como foi comprovado>
    **Ação manual necessária:** <ex.: limpar retained>

---

## 3. Automações do board

A automação principal não depende de configuração: **todo PR que resolve um card diz `Closes #N`** na descrição (o template de PR já traz a linha). No merge, o GitHub fecha a issue, e o workflow padrão do board "Item closed → Done" move o card.

Workflows do board (Projects → ⋯ → **Workflows**; só o dono do board configura, pela interface):

| Workflow | Ação | Situação |
|---|---|---|
| Item closed | → `Done` | padrão do GitHub; confirmar que está ligado |
| Pull request merged | → `Done` | padrão do GitHub; confirmar que está ligado |
| Item reopened | → `Todo` | ligar |
| Auto-add to project | toda issue nova de `MatheusNespolo/DataFlowInventory` entra no board (filtro `is:issue`) | **ligar** — sem ele, issues novas ficam fora do board (aconteceu com #36–#39) |
| Label `status:blocked-hw` | → `Blocked` | sem workflow nativo; mover à mão |

---

## 4. Ritual por rodada de bancada

```
PRÉ-BANCADA
 ├─ Criar/abrir o roteiro do dia em docs/testes/roteiros/
 ├─ Definir "Data Validação" nos cards-alvo
 ├─ Rodar .\docs\testes\validacoes\validar_infra.ps1 (PowerShell Admin) → todos PASS
 └─ Subir serviços com .\start_services.bat

DURANTE
 ├─ Mover o card para "In Progress" ao iniciar cada bloco
 └─ Preencher a tabela de resultados do roteiro

PÓS-BANCADA
 ├─ Comentar no card usando o Template B
 ├─ Registrar resultados → docs/testes/resultados.md (estado atual, registro e diário)
 ├─ Atualizar docs/CHANGELOG.md se houve mudança de código
 ├─ Mover cards: Done / Blocked / retorno para Todo
 └─ Registrar nova decisão técnica no artigo (docs/artigo/) quando aplicável
```
