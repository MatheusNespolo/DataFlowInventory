# Governança do Board — GitHub Projects (Data Flow Inventory)

Guia de organização e sincronização do board [Data Flow Inventory (GitHub Projects #3)](https://github.com/users/MatheusNespolo/projects/3).

Define **colunas, campos customizados, labels, hierarquia de épicos/sub-issues, templates de comentário e o catálogo consolidado de cards** — incluindo as validações de bancada concluídas em 27–28/08/2026 e o roadmap de testes em nuvem via HiveMQ Cloud.

> **Princípio de rastreabilidade:** o board é a camada de acompanhamento visual; os documentos em `docs/` ([`plano_de_testes.md`](../testes/plano_de_testes.md), [roteiros diários](../testes/roteiros/), [`CHANGELOG.md`](../CHANGELOG.md) e `docs/artigo/Projeto de pesquisa - Final.docx`) são a fonte da verdade técnica. Todo card deve referenciar o documento ou commit comprobatório.

---

## 1. Estrutura do board

### 1.1 Colunas (campo `Status`)

| Coluna | Descrição | Regra de entrada / saída |
|---|---|---|
| `Backlog` | Ideias, melhorias futuras e *stretch goals* sem data de execução. | Demanda mapeada, sem pré-requisito de bancada atendido. |
| `Todo` | Priorizado para a próxima rodada de bancada. | Critério de aceite definido e sem bloqueios. |
| `In Progress` | Execução ativa (**WIP máximo: 3**). | Atuação em código, circuito ou montagem. |
| `Blocked` | Impedido por dependência física, componente ou decisão externa. | Comentário obrigatório com motivo e desbloqueador. |
| `In Review` | Bancada executada ou PR aberto, aguardando consolidação em documentação. | Roteiro preenchido ou PR aguardando merge. |
| `Done` | Concluído, validado e documentado. | Evidência registrada em `plano_de_testes.md` e/ou `CHANGELOG.md`. |

### 1.2 Campos customizados

| Campo | Tipo | Valores | Objetivo |
|---|---|---|---|
| `Área` | Single select | `Hardware`, `Firmware-Uno`, `Firmware-ESP32`, `Backend`, `Frontend`, `Infra/Rede`, `Docs/Artigo` | Identificar gargalos por disciplina. |
| `Prioridade` | Single select | `P0-Crítico`, `P1-Alto`, `P2-Médio`, `P3-Baixo` | Ordenar backlog e triagem. |
| `Bloco de Teste` | Single select | `B0`, `B1-B3`, `T1`, `T2`, `T3`, `T4`, `T5`, `T6-HiveMQ`, `Infra`, `N/A` | Mapear com a Tabela de Testes do `plano_de_testes.md`. |
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

## 2. Catálogo consolidado de cards

### 🟢 Coluna `Done`

| Card | Título | Área | Bloco | Validação |
|---|---|---|---|---|
| #3 | Implementar máquina de estados no Arduino | `Firmware-Uno` | `B1-B3` | 18/08/2026 |
| #4 | Desenvolver gateway ESP32 (Serial ↔ MQTT) | `Firmware-ESP32` | `T1`, `T2` | 25/08/2026 |
| #6 | Criar servidor Node.js (Express + WebSocket + MQTT) | `Backend` | `T2`, `T4` | 25/08/2026 |
| #7 | Criar dashboard web (Frontend) | `Frontend` | `T4` | 25/08/2026 |
| #10 | Simulador | `Backend`/`Frontend` | `N/A` | 25/08/2026 |
| **#11** | **Sincronismo de estoque LCD ↔ Dashboard** | `Firmware-Uno`/`ESP32`/`Frontend` | `B3`, `T4` | **28/08/2026** |
| **#12** | **Calibração do timeout de entrega (9 s) + recuperação via `CMD:RESET`** | `Firmware-Uno` | `B1`, `T4` | **28/08/2026** |
| #13 | Infraestrutura de teste local (Mosquitto + scripts de validação) | `Infra/Rede` | `Infra` | 26/08/2026 |

### 🟡 Coluna `In Progress`

| Card | Título | Área | Observação |
|---|---|---|---|
| #1 | Montagem mecânica das esteiras | `Hardware` | Épico — esteira A concluída; B/C pendentes |
| #2 | Diagrama elétrico e ligações | `Hardware` | Épico — pinagem da A consolidada; B/C pendentes |
| #8 | Escrever documentação e artigo | `Docs/Artigo` | Épico perene — falta seção de Resultados |

### 🔴 Coluna `Blocked`

| Card | Título | Área | Bloqueio |
|---|---|---|---|
| #9 | Teste 5 — Integração com duas esteiras (A + B) | `Hardware`/`Firmware-Uno` | Aguarda 2º driver IRF520 e sensores topo B / junção J2 |

### ☁️ Coluna `Backlog` — Teste 6 (HiveMQ Cloud)

| Card | Título | Área | Bloco |
|---|---|---|---|
| **#15** | **Teste 6.1 — Provisionar cluster e credenciais HiveMQ Cloud** | `Infra/Rede` | `T6-HiveMQ` |
| **#16** | **Teste 6.2 — Firmware ESP32 com suporte TLS/8883** | `Firmware-ESP32` | `T6-HiveMQ` |
| **#17** | **Teste 6.3 — Validação end-to-end remota via HiveMQ Cloud** | `Infra/Rede`/`Backend`/`Frontend` | `T6-HiveMQ` |

> O card **#5** (“Configurar broker MQTT — HiveMQ Cloud”) deve ser **renomeado para “Teste 6 — Migração para broker remoto (HiveMQ Cloud)”** e convertido em épico guarda-chuva dos cards #15, #16 e #17, movendo-se de `Todo` para `Backlog` com a label `stretch:hivemq-cloud`.

---

## 3. Cards validados em 28/08/2026 (criar já em `Done`)

### 🔹 Card #11 — Sincronismo de estoque LCD ↔ Dashboard

- **Coluna:** `Done`
- **Área:** `Firmware-Uno` / `Firmware-ESP32` / `Frontend`
- **Bloco de Teste:** `B3`, `T4` · **Prioridade:** `P0-Crítico`
- **Data Validação:** **28/08/2026**
- **Labels:** `area:firmware-uno`, `area:frontend`, `tipo:bug`, `tipo:teste`
- **Evidência:** commits `b2ec47d`, `b5727ad` · `docs/testes/plano_de_testes.md` (Observações 27–28/08) · `docs/CHANGELOG.md`

**Descrição:** eliminar a divergência entre a contagem de estoque exibida no display LCD 16x2 I2C (0x27) e a exibida no Dashboard web após reinicializações, `F5` do navegador ou reconexões do gateway.

**Solução aplicada:**
1. Invocação de `publicarEstoque()` no `setup()` do Arduino Uno — o estado inicial é emitido logo após a energização.
2. Invocação de `publicarEstoque()` também no tratamento de `CMD:RESET`, republicando o estoque após limpar o estado de erro da FSM.
3. Publicação com flag **retained** no tópico `dataflow/estoque` pelo gateway ESP32.
4. Servidor Node.js e Dashboard consomem o retained no `connect`, sincronizando a UI no carregamento inicial.

**Critérios de aceite — todos ✅ em 28/08/2026:**
- [x] Ao energizar o Uno, LCD e Dashboard exibem a mesma contagem inicial.
- [x] Após `F5` no navegador, o Dashboard reconstrói o estoque a partir do retained (sem esperar novo evento).
- [x] Após `CMD:RESET`, LCD e Dashboard voltam sincronizados ao estado inicial.
- [x] Reconexão do gateway não gera divergência de contagem.
- [x] Resultado transferido para o Registro de Resultados do `plano_de_testes.md`.

---

### 🔹 Card #12 — Calibração do timeout de entrega (9 s) e recuperação de falhas

- **Coluna:** `Done`
- **Área:** `Firmware-Uno`
- **Bloco de Teste:** `B1`, `T4` · **Prioridade:** `P0-Crítico`
- **Data Validação:** **28/08/2026**
- **Labels:** `area:firmware-uno`, `tipo:hardening`, `tipo:teste`
- **Evidência:** commits `b5727ad`, `ac02d13` · `docs/testes/roteiros/semana_04_01-03_setembro.md` (seção 1) · `docs/testes/plano_de_testes.md`

**Descrição:** o valor original de `TIMEOUT_ENTREGA` (8 s, depois elevado provisoriamente para 12 s em 25/08) não refletia a dinâmica real da esteira A, gerando timeouts falsos ou mascarando travamentos reais.

**Solução aplicada:**
1. `TIMEOUT_ENTREGA` recalibrado para **9000 ms**.
2. Introdução de `TEMPO_SAIDA_ESTEIRA_MS = 3000` — fase explícita de escoamento após o sensor de junção.
3. Valores replicados nos sketches de teste `test/esteira_peca_b/arduino_esteiras_ab/`.

**Medições de bancada (esteira A física):**

| Fase | Tempo medido |
|---|---|
| Partida → sensor de junção J1 | ~5 s |
| Escoamento para a esteira principal | 3 s |
| **Total do ciclo** | **~8 s** |
| **Timeout configurado** | **9 s** (margem de 1 s) |

**Critérios de aceite — todos ✅ em 28/08/2026:**
- [x] Ciclo normal de entrega da peça A conclui sem disparar timeout falso.
- [x] Peça retida artificialmente → FSM transiciona para `ERRO` aos 9000 ms e desliga os motores.
- [x] Estado de erro sinalizado no LCD e propagado ao Dashboard.
- [x] `CMD:RESET` restaura a FSM para `IDLE` sem reinicialização física da placa.
- [x] Resultado transferido para o Registro de Resultados do `plano_de_testes.md`.

---

## 4. Novos cards — Teste 6: validação MQTT via HiveMQ Cloud

Até então o repositório só possuía o card genérico **#5 “Configurar broker MQTT (HiveMQ Cloud)”**, sem critérios de aceite nem decomposição. Os três cards abaixo detalham o **Teste 6** do [`plano_de_testes.md`](../testes/plano_de_testes.md) e a seção “Opção 2: HiveMQ Cloud” do [`arquitetura_mqtt.md`](../arquitetura_mqtt.md).

> **Pré-requisito comum:** esteira A consolidada e Teste 4 (end-to-end local) aprovado — condição já atendida em 25–28/08/2026. A migração valida a **independência da camada de transporte** em relação à lógica da FSM: nenhuma linha de máquina de estados deve mudar.

### 🔹 Card #15 — Teste 6.1: provisionar cluster e credenciais HiveMQ Cloud

- **Coluna:** `Backlog` · **Área:** `Infra/Rede` · **Bloco:** `T6-HiveMQ` · **Prioridade:** `P2-Médio`
- **Labels:** `area:infra`, `tipo:teste`, `stretch:hivemq-cloud`

**Objetivo:** provisionar o cluster Serverless em [cloud.hivemq.com](https://cloud.hivemq.com) e distribuir credenciais sem expô-las no versionamento.

**Critérios de aceite:**
- [ ] Cluster criado, com endpoint `<cluster>.s1.eu.hivemq.com` e porta **8883** (TLS).
- [ ] Credencial de aplicação (usuário/senha) criada no *Access Management* do console.
- [ ] `esp32/gateway_mqtt/secrets.h` preenchido com `SECRET_MQTT_SERVER_CLOUD`, `SECRET_MQTT_USER_CLOUD` e `SECRET_MQTT_PASS_CLOUD`.
- [ ] `server/.env` com `MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com` e `MQTT_PORT=8883` + usuário/senha.
- [ ] Confirmado que `secrets.h` e `.env` **não** aparecem em `git status` (protegidos por `.gitignore`).
- [ ] Conectividade preliminar validada pelo Web Client do próprio console HiveMQ.

---

### 🔹 Card #16 — Teste 6.2: firmware ESP32 com suporte TLS/8883

- **Coluna:** `Backlog` · **Área:** `Firmware-ESP32` · **Bloco:** `T6-HiveMQ` · **Prioridade:** `P2-Médio`
- **Labels:** `area:firmware-esp32`, `tipo:teste`, `stretch:hivemq-cloud`
- **Depende de:** #15

**Objetivo:** validar o cliente MQTT sobre `WiFiClientSecure` no gateway com a flag `USE_TLS = true`, mantendo intacto o comportamento já aprovado no broker local.

**Critérios de aceite:**
- [ ] `esp32/gateway_mqtt/gateway_mqtt.ino` compila com `USE_TLS true` sem estouro de heap/flash.
- [ ] Monitor serial exibe `[MQTT] Conectado!` após handshake TLS na porta 8883.
- [ ] Publicações periódicas em `dataflow/status`, `dataflow/sensores` e `dataflow/esteiras` visíveis no Web Client do HiveMQ.
- [ ] `dataflow/estoque` chega **retained** também no broker remoto.
- [ ] Reconexão Wi-Fi não-bloqueante continua funcionando (não trava o loop da bridge serial).
- [ ] Rejeições explícitas (`peca_invalida`, `ocupado`, `comando_desconhecido`) preservadas.
- [ ] Reversão para `USE_TLS false` testada, garantindo retorno ao broker local sem regressão.

---

### 🔹 Card #17 — Teste 6.3: validação end-to-end remota via HiveMQ Cloud

- **Coluna:** `Backlog` · **Área:** `Infra/Rede` / `Backend` / `Frontend` · **Bloco:** `T6-HiveMQ` · **Prioridade:** `P2-Médio`
- **Labels:** `area:infra`, `area:backend`, `tipo:teste`, `stretch:hivemq-cloud`
- **Depende de:** #15, #16

**Objetivo:** executar o ciclo completo Dashboard → Server → HiveMQ Cloud → ESP32 → Arduino Uno → esteira física, e o retorno da telemetria, integralmente sobre a internet com TLS.

**Critérios de aceite:**
- [ ] Servidor Node.js conecta via `mqtts://` na porta 8883 (log de conexão sem erro de certificado).
- [ ] Pedido disparado no Dashboard aciona fisicamente a esteira A.
- [ ] Ciclo pedido → entrega refletido na UI, equivalente ao Teste 4 local.
- [ ] Estoque decrementa de forma consistente entre LCD e Dashboard (regressão do card #11 no ambiente remoto).
- [ ] LWT `gateway offline` / `online` funciona igual ao broker local, com tópicos separados (`dataflow/status` × `dataflow/status/server`).
- [ ] Sem perda de mensagens sob QoS 1 durante o ciclo.
- [ ] Latência adicional medida e registrada (comparativo local × nuvem).
- [ ] **Nenhuma alteração de lógica da FSM foi necessária** — apenas configuração de transporte.
- [ ] Reversão para `USE_TLS=false` se a bancada continuar local no mesmo dia.
- [ ] Resultado registrado no Registro de Resultados do `plano_de_testes.md` (linha do Teste 6).

---

## 5. Templates de comentário

### Template A — Abertura de card (Definition of Done)

    ## 🎯 Objetivo
    <uma frase>

    ## 📄 Referências
    - Plano de testes: `docs/testes/plano_de_testes.md#<âncora>`
    - Roteiro: `docs/testes/roteiros/roteiro_teste_AAAA-MM-DD.md`
    - Código: `<caminho/arquivo>`

    ## ✅ Critério de aceite
    - [ ] <verificável 1>
    - [ ] <verificável 2>
    - [ ] Resultado registrado no `plano_de_testes.md`

    ## 🔗 Dependências
    - Bloqueado por: #<n> | Bloqueia: #<n>

### Template B — Registro de bancada

    ## 🧪 Rodada de bancada — DD/MM/AAAA

    **Roteiro:** `docs/testes/roteiros/roteiro_teste_AAAA-MM-DD.md`
    **Ambiente:** Mosquitto local `<IP>:1883` · Wi-Fi 2,4 GHz `<SSID>` · Node v18+
    **Firmware vigente:** `TIMEOUT_ENTREGA=9000` · `TEMPO_SAIDA_ESTEIRA_MS=3000`

    | Etapa | Resultado | Medição |
    |---|---|---|
    | Pré-voo (`validar_infra.ps1`) | ✅/❌ | N/N PASS |
    | <etapa> | ✅/⚠️/❌ | |

    ### 📌 Conclusão
    - **Aprovado:** <itens>
    - **Pendente:** <itens> → replanejado para DD/MM

    ### 📝 Sincronização
    - [ ] Transferido para o Registro de Resultados do `plano_de_testes.md`
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

## 6. Automações sugeridas (Projects → ⚙️ Workflows)

| Gatilho | Ação |
|---|---|
| Item criado | → `Backlog` |
| Issue reaberta | → `Todo` |
| PR vinculado aberto | → `In Review` |
| PR merged | → `Done` |
| Label `status:blocked-hw` adicionada | → `Blocked` |
| Item fechado | → `Done` |
| Auto-add | Toda issue nova do repositório entra no board |

---

## 7. Ritual por rodada de bancada

```
PRÉ-BANCADA
 ├─ Criar/abrir o roteiro do dia em docs/testes/roteiros/
 ├─ Definir "Data Validação" nos cards-alvo
 ├─ Rodar .\docs\testes\validações\validar_infra.ps1 (PowerShell Admin) → todos PASS
 └─ Subir serviços com .\start_services.bat

DURANTE
 ├─ Mover o card para "In Progress" ao iniciar cada bloco
 └─ Preencher a tabela de resultados do roteiro

PÓS-BANCADA
 ├─ Comentar no card usando o Template B
 ├─ Transferir resultados → docs/testes/plano_de_testes.md
 ├─ Atualizar docs/CHANGELOG.md se houve mudança de código
 ├─ Mover cards: Done / Blocked / retorno para Todo
 └─ Registrar nova decisão técnica no artigo (docs/artigo/) quando aplicável
```
