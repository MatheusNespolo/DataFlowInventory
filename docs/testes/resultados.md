# Resultados de Bancada — Data Flow Inventory

**Fonte única do estado da bancada.** Este documento guarda o que foi **executado** e o que resultou: o estado atual, a tabela de resultados por teste e o diário de bancada. Os procedimentos (como testar) ficam no [`plano_de_testes.md`](plano_de_testes.md), o planejamento de cada semana nos [roteiros semanais](roteiros/), e os outros documentos (README, CHANGELOG, guias) apontam para cá em vez de copiar o status.

**Como registrar:** ao fim de cada dia de bancada, (1) atualize o **Estado atual** abaixo, (2) acrescente ou atualize a linha do teste no **Registro de Resultados** e (3) acrescente um bloco datado no fim do **Diário de bancada**. Só fatos com evidência; o que não foi feito fica como pendente.

---

## Estado atual

**Situação de validação atualizada (bancada, 29/10/2026):** as três esteiras rodaram em bancada em 21/10, com PWM e kick registrados (`ddf526a`, `1e8fbf1`, `d4ecc2f`). Na Semana 11 a montagem final começou em 28/10: a **esteira A foi montada na base** e fez **10 entregas com sucesso, entre 4650 e 5000 ms** (igual à calibração de 21/10, sem mudança de código; peça improvisada). Seguem pendentes a montagem e o teste de B e C na base, a integração total, as peças 3D do separador e da peça transportada, e o reteste do display (B3, agora OLED).

**Pendências/retestes:** (1) montagem de B e C na base e garantia de que a estrutura não altera a operação original (A já montada), (2) teste individual e sequencial de B e C fixadas na base, com tempos e ciclos registrados (A aprovada: 10 entregas, 4650–5000 ms), (3) validação das peças 3D do separador e da peça que percorre as esteiras (a A foi testada com uma peça improvisada), (4) integração total, prevista para 30/10 e sujeita a replanejamento, (5) reteste B3 com o display OLED, que deve chegar em 29–30/10. O separador automático segue como item de validação em hardware, condicionado a evidência de bancada. Consulte os roteiros da [Semana 8 (resultados)](roteiros/semana_08_05-09_outubro.md), [Semana 9 (14–18/10)](roteiros/semana_09_14-18_outubro.md), [Semana 10 (19–23/10)](roteiros/semana_10_19-23_outubro.md) e [Semana 11 (26–30/10)](roteiros/semana_11_26-30_outubro.md).

---

## Registro de Resultados

| # | Teste | Data | Resultado | Observações |
|---|-------|------|-----------|-------------|
| B0.1 | Setup da placa (Blink + Serial) | 12/08/2026 | ✅ Aprovado | Teste inicial |
| B0.2 | Sensor IR isolado | 01/09/2026 | ✅ Aprovado | Sensores TCRT5000 testados e calibrados isoladamente (sensores de topo e de junção para as esteiras adicionais B e C) |
| B0.3 | Motor isolado (IRF520) | 12/08/2026 | ✅ Aprovad | PWM mínimo: 150 |
| 1 | Serial Arduino ↔ ESP32 | 12/08/2026 | ✅ Aprovado | JSON recebido corretamente no ESP32 |
| B1 | Bancada 3.1 — Ciclo completo | 18/08/2026 | ✅ Aprovado | tempo_ms: 5000 · PWM mínimo: 150 (calibrações aplicadas ao sketch principal) |
| B2 | Bancada 3.2 — Sem estoque | 18/08/2026 | ✅ Aprovado | Rejeição `peca_indisponivel` + recuperação via reset OK |
| B3 | Bancada 3.3 — LCD I2C | 18/08/2026 | ✅ Aprovado | Endereço I2C: 0x27 |
| B3 (reteste) | Bancada 3.3 — Display OLED 0,96" (SSD1306) | Semana 11 | ⬜ Pendente | LCD 16x2 trocado em 27/10 (`i2c_n 0`, falha elétrica); conferir `lcd_end` = 60 |
| 2 | ESP32 → Broker → Node.js | 25/08/2026 | ✅ Aprovado | JSONs do Uno chegam via ESP32 aos tópicos dataflow/#; broker 0.0.0.0:1883 OK |
| 3 | Comando via MQTT Box | 01/09/2026 | ✅ Aprovado | Comando direto via MQTT Box em `dataflow/comandos/sub` validado de forma desacoplada; ESP32 repassa `CMD:PECA:A` e FSM aciona esteira com confirmação em `dataflow/comandos/pub` |
| 4 | End-to-End (Dashboard) | 25/08/2026 | ✅ Aprovado | Pedido de peça A via Dashboard → esteira parte → entrega completa |
| 5 | Três esteiras (A + B + C) | 08–12/09/2026 | ✅ Aprovado | 3 esteiras integradas (3× IRF520 + 6× TCRT5000), entregas A/B/C e rejeições validadas |
| 6 | Migração para broker remoto (HiveMQ Cloud) | 02/09/2026 | ⚠️ Parcial | Conexão TLS 8883 e tópicos retained OK; E2E remoto em teste paralelo |
| S | Scripts de Setup e CI/CD (S1–S6) | 15/09/2026 | ✅ Aprovado | Scripts `.sh`/`.ps1` (setup, validate-env, precommit), GitHub Actions e saneamento Git |
| 7.D | Diagnóstico IRF520 B/C (Semana 7) | 03/10/2026 | ✅ Aprovado | B e C movem; entrega ótima e timeout até o `ERRO` OK (firmware anterior à v3.0). Módulo IRF520 e motor da C trocados; C usa provisoriamente o módulo da A |
| BK | Beckhoff — Historiador SQLite (CX9240) | 15/09/2026 | ✅ Aprovado | Persistência no SQLite local (`/var/lib/dfi/historian.db`) via TF6701 + TF6420 validada com simulador MQTT |
| M1 | Montagem mecânica das esteiras | 15/09/2026 | ✅ Aprovado | Alinhamento e fixação das esteiras na estrutura mecânica concluídos |
| M2 | Montagem final na base — esteira A (Semana 11) | 28/10/2026 | ⚠️ Parcial | Esteira A: ✅ 10 entregas, 4650–5000 ms, sem falha (igual à calibração; sem mudança de código; peça improvisada). B e C ainda não montadas |
| — | Plano B (Simulador) | 25/08/2026 | ✅ Aprovado | Frontend + Simulador validados sem hardware físico |

---

## Diário de bancada

Em ordem cronológica (o mais recente no fim).

### 25/08

- `TIMEOUT_ENTREGA` ajustado de 8 s → **12 s** preliminarmente (peça chegava no sensor mas não saía da esteira secundária)
- Adicionado `publicarEstoque()` em `setup()` e `CMD:RESET` para sincronizar LCD ↔ Dashboard
- Divisor 1k/2kΩ + GND comum confirmados como críticos para UART Uno↔ESP32

### 26/08

- Introduzida automação de validação de infraestrutura (`docs/testes/validações/validar_infra.ps1`) e checklist de rede/infra correspondente
- Sistema ainda opera com **broker local (Mosquitto)**; conexão com **broker remoto (HiveMQ Cloud)** planejada para rodada futura (Teste 6), condicionada à consolidação da esteira A

### 27–28/08

- `TIMEOUT_ENTREGA` recalibrado para **9 s** (`TIMEOUT_ENTREGA = 9000` + `TEMPO_SAIDA_ESTEIRA_MS = 3000`) após validação com esteira A física (travessia ~5 s até o sensor + 3 s de saída cabem com folga em 9 s). Aprovado com recuperação via `CMD:RESET`.
- Separação de tópicos de status (`dataflow/status` para gateway ESP32 e `dataflow/status/server` para backend Node.js), eliminando conflito de sobrescrita de mensagem retained.
- Estoque retained em `dataflow/estoque` aprovado: Dashboard sincroniza imediatamente no carregamento inicial e reconexões.
- Rejeições explícitas de comando (`peca_invalida`, `ocupado`, `comando_desconhecido`) e tolerância a payloads malformados validadas no gateway ESP32.

### 01/09

- **Sensores das Esteiras Adicionais (B e C):** Realizado o teste e calibração prévia dos sensores reflexivos infravermelhos (TCRT5000) de topo e junção destinados às esteiras B e C, garantindo detecção e resposta digital estável (LOW/HIGH) antes da montagem mecânica completa (`B0.2`).
- **Robustez e LWT do Gateway:** Queda de alimentação/desconexão física do ESP32 dispara publicação do LWT `{"type":"gateway","status":"offline"}` em `dataflow/status` e badge vermelho no Dashboard; religamento do ESP32 restabelece status `online` automaticamente sem necessidade de reload manual.
- **Reconexão do Broker:** Queda e reinicialização do broker Mosquitto restauram a conexão do ESP32 e do Servidor Node.js, preservando mensagens com flag retained (`dataflow/estoque` e `dataflow/status`).
- **Rejeições Explícitas e Resiliência da FSM:** Injeção direta via MQTT dos cenários `ocupado`, `peca_invalida`, `comando_desconhecido` e JSON malformado tratadas com resposta explícita pelo ESP32 e sem travamento da FSM do Arduino Uno.
- **Teste 3 Puro (MQTT Box):** Validado e aprovado via cliente MQTT externo (MQTT Box / Explorer), formalizando a evidência de controle remoto desacoplada da interface web.
- **Teste 5 (Esteiras A + B):** Mantido como `⬜ Pendente` / `Blocked` aguardando a disponibilização do segundo módulo IRF520 na bancada física.
- **Teste 6 (HiveMQ Cloud):** Mantido como `⬜ Pendente` em Backlog como stretch goal.

### 02/09

- **Teste 6 (HiveMQ Cloud) — Parcialmente Validado:** Conexão TLS/8883 estabelecida com sucesso tanto no ESP32 (`WiFiClientSecure` + `setCACert`) quanto no Node.js (`mqtts://` + opções TLS). Tópicos retained (`dataflow/estoque`, `dataflow/status`) sincronizam corretamente. Comando via MQTT Box remoto (desacoplado do Dashboard) validado.
- **Dashboard E2E Remoto (Pendente):** Tentativa de validação end-to-end via Dashboard ficou bloqueada por questões de firewall corporativo; equipe abortou ajuste temporário. Itens **Bloco 4** (Dashboard E2E remoto) e **Bloco 5** (LWT offline/online remoto, reconexão Wi-Fi, reinício Node.js) ficaram pendentes para 03/09.
- **Teste 5 (Esteiras A + B):** Permanece `⬜ Blocked` aguardando segundo módulo IRF520 MOSFET.

### 03/09

- **Fix de Rejeição de Comandos:** Corrigido bug crítico onde comandos inválidos (ex.: `CMD:PECA:Z`) ou rejeitados pelo gateway (ex.: `peca_invalida`, `sem_estoque`) apareciam como "Comando enviado" no histórico do Dashboard. Causa raiz dupla: (1) `server.js` emitia evento `comando` para **todas** as mensagens do tópico `dataflow/comandos/pub`, independente do campo `status`; (2) `app.js` adicionava entradas de histórico **antes** da confirmação do servidor (optimistic UI sem rollback). Solução: `server.js` agora inspeciona `msgJson.status` e roteia `'rejeitado'` para evento `comando_erro` separado; `app.js` só adiciona histórico após receber confirmação via Socket.IO. Validação pendente de execução (roteiro de hoje).
- **Teste 6 (HiveMQ Cloud) — Validação Completa Pendente:** Blocos 4 e 5 (Dashboard E2E remoto, LWT/reconexão remota) aguardando execução conforme roteiro de 03/09, condicionado à resolução do firewall ou ambiente de rede alternativo.
- **Teste 5 (Esteiras A + B):** Permanece `⬜ Blocked` aguardando hardware.

### 08–12/09

- **Teste 5 (Três Esteiras A+B+C) — CONCLUÍDO:** Hardware adicional (2º/3º driver IRF520 + motores + sensores TCRT5000 de topo/junção para B e C) integrado com sucesso. Comando MQTT Box enviado com sucesso para peças B e C. Cenários de rejeição (timeout, comando inválido, `ocupado`, `sem_estoque`) replicados com sucesso seguindo o padrão validado para a esteira A. Calibração de sensores revalidada na montagem real. Ajuste mecânico das demais esteiras concluído. Card #9 → **Done**.
- **Subtarefa HiveMQ Cloud:** Permanece em `⬜ Pendente` como subtarefa — executar somente se Blocos 1–3 fecharem com folga (fecharam ✅). Blocos 4 e 5 (Dashboard E2E remoto, LWT/reconexão remota) ainda aguardando resolução de firewall ou ambiente de rede alternativo.
- **Spec Beckhoff CX9240:** Escopo definido como apenas especificação (sem implementação). Contrato de tópico/payload proposto em `arquitetura_mqtt.md` para validação cruzada com o agente do Beckhoff.
- **Tarefas mecânicas restantes:** Base MDF, soldagem/fiação, pintura e estética do protótipo.

### 15/09 (Roteiro Semana 5)

- **Roteiro da semana elaborado:** `docs/testes/roteiros/semana_05_15-19_setembro.md` criado. Foco: verificação de solda dos módulos IRF520 (B/C), conclusão da subtarefa HiveMQ Cloud (Teste 6 — Blocos 4 e 5), diagrama elétrico consolidado e avanço na spec de persistência DB para integração com Beckhoff CX9240.
- **Teste 6 (HiveMQ Cloud):** Permanece como subtarefa de alta prioridade, condicionada à resolução do firewall/ambiente de rede alternativo. Bloco 1 (solda IRF520) deve ser aprovado antes de sua execução.
- **Beckhoff CX9240 (Historiador SQLite) — CONCLUÍDO:** Projeto TwinCAT 3 (`CX9240_DataFlowInventory`) comissionado no RT Linux ARM64 do Beckhoff CX9240. TF6701 assina `dataflow/estoque` e `dataflow/eventos`, e TF6420 em SQL Expert Mode grava transacionalmente no SQLite local (`/var/lib/dfi/historian.db`, WAL mode) preenchendo as tabelas `estoque_hist` e `eventos_hist`. Validado de ponta a ponta com o simulador `DataFlowInventory` (`MQTT_PUBLISH=true`).
- **Avanços Mecânicos e Soldagem:** Realizados avanços estruturais na fixação e alinhamento mecânico das esteiras B e C na bancada. A etapa de soldagem dos drivers IRF520 e medições elétricas foi replanejada para a rodada seguinte por restrição de tempo.
- **Scripts e CI/CD Validados (Sprint 5 / Bloco 5):** Criação e aprovação multiplataforma dos scripts de automação (`setup.sh`/`setup.ps1`, `validate-env.sh`/`validate-env.ps1`, `precommit-checks.sh`/`precommit-checks.ps1`), workflow GitHub Actions e remoção dos arquivos `node_modules` órfãos do cache Git.
- **Validação Nó Historiador Beckhoff CX9240 (15/09):** O projeto TwinCAT 3 no CX9240 (`CX9240_DataFlowInventory`) foi comissionado com sucesso no RT Linux ARM64. O CLP assina os tópicos `dataflow/estoque` e `dataflow/eventos` via TF6701 e grava no banco local SQLite (`/var/lib/dfi/historian.db`, WAL mode) via TF6420 em SQL Expert Mode, preenchendo as tabelas `estoque_hist` e `eventos_hist`. Validação de ponta a ponta executada contra o simulador `DataFlowInventory` com `MQTT_PUBLISH=true`, comprovando a persistência autônoma das variáveis de estoque (`pecaA`, `pecaB`, `pecaC`) e logs operacionais.
- **Avanços Mecânicos e Soldagem (15/09):** Realizados avanços na fixação e alinhamento mecânico das esteiras B e C na bancada. A etapa final de soldagem e testes elétricos dos módulos IRF520 foi replanejada para a rodada seguinte devido à restrição de tempo.

### 16/09 (Sprint 5 — Continuidade e Frentes Paralelas)

- **Continuidade de Hardware:** Continuidade e verificação elétrica dos módulos MOSFET IRF520 das esteiras B e C (Bloco 1 do roteiro).
- **Trabalho Paralelo:** Execução da transição do broker (HiveMQ Cloud Teste 6.3 E2E remoto sob rede 4G sem bloqueio de porta 8883) e integração física da roda de separação de 3 compartimentos.

### 19/09 (HiveMQ Cloud + CX9240 com o sistema real)

- **Validação Integrada HiveMQ Cloud + CX9240 com Sistema Real (19/09):** Realizada a migração e validação de ponta a ponta com o broker remoto HiveMQ Cloud. Resolvido o erro de autorização no servidor Node.js através da padronização das credenciais em `server/.env`. O CLP Beckhoff CX9240 foi conectado à internet via ICS do Windows (DNS `8.8.8.8` e saída TCP 8883), recebendo telemetria real dos sensores e acionamentos físicos das esteiras via MQTT TLS e gravando com sucesso nas tabelas de histórico SQLite locais. O fluxo completo (Arduino Uno/ESP32 → HiveMQ Cloud → Node.js/Dashboard → Beckhoff CX9240/SQLite) foi testado e homologado com sucesso.

### 22–23/09

- **Problema 1 (MQTT rc=-2 — HiveMQ Cloud):** Quarta recorrência do bloqueio de firewall corporativo (02/09, 03/09, 15/09, agora 22-23/09). WiFi conectado com sucesso, mas TCP/TLS na porta 8883 falha. Broker local (Mosquitto/1883) validado como funcional. Mitigação: validação via hotspot 4G agendada; documentação em `troubleshooting_bancada_22-23_09.md`.
- **Problema 2 (Esteiras B/C fracas):** Após soldagem das placas de passagem IRF520, motores B/C apresentam velocidade/potência reduzida. Hipótese principal: queda de tensão nos novos cabos (comprimento/bitola vs. jumpers originais). Secundárias: solda fria, dano térmico do MOSFET, fonte sobrecarregada. Diagnóstico estruturado documentado. Mitigação em curso: aquisição de 2 expansores 110/220V→5V (alimentação dedicada, já prevista no diagrama elétrico).
- **Gap de documentação resolvido:** tabela de troubleshooting desdobrada para cobrir tanto broker local (1883) quanto Cloud (8883/TLS).

### 29/09–01/10 (Semana 7)

- **Desbaste mecânico e falha de acionamento B/C (29/09; atualizado em 03/10):** desbaste concluído nas três esteiras. B e C voltaram a acionar; entrega ótima e timeout até `ERRO` funcionam com o firmware anterior à v3.0, que estava correto. A falha era elétrica: módulo IRF520 e motor da C defeituosos; a partida travava todo o sistema. Módulo e motor foram trocados; **provisoriamente, C usa o módulo da A**. Ver Semana 7, seção 4.2.1.
- **Burn-in (S1–S7):** Segue agendado para 30/09–02/10, condicionado ao diagnóstico de B/C. Durante o burn-in, observar os dashboards Grafana em paralelo (latência p50/p95/p99, reconexões, quedas do gateway) quando o stack de observabilidade estiver validado.
- **Telemetria Prometheus/Grafana (Card #25):** Implementação entregue (`GET /metrics`, stack Docker, 3 dashboards, testes sem Docker). **Não validado:** execução real do stack. Pendências: rodar `scripts/observability-smoke.ps1` após instalar o Docker e conferir no Grafana as cores dos painéis, as legendas dos state-timelines e se os gráficos de latência mostram lacunas (e não zeros) quando não há tráfego.
- **Deployment Guide (Card #22):** `docs/DEPLOYMENT.md` criado em versão inicial; falta executá-lo do zero em máquina limpa.
- **Telemetria Prometheus/Grafana (Card #25) — Concluída (01/10/2026):** o stack foi validado (smoke test e conferência dos painéis) e as capturas dos dashboards foram anexadas ao card. Esta observação substitui o "Não validado" e as pendências de 30/09, e o burn-in pode observar os dashboards Grafana em paralelo.

### 13/10 (firmware v3.0 em bancada)

- **Firmware Uno v3.0 — validado em bancada (13/10/2026):** a equipe confirmou sucesso nos itens 1.1–1.11 e no Bloco 2; as esteiras B e C foram testadas com o firmware novo e estão funcionando. Não foram fornecidos valores de medições de tempo/PWM nem evidências para declarar o Bloco 3 (A+B+C e calibração) concluído. Registro detalhado: [`semana_08_05-09_outubro.md`](roteiros/semana_08_05-09_outubro.md).
- **Bancada — esteiras B e C (atualização 13/10/2026):** o registro de 03/10 (no bloco de 29/09–01/10, acima) descreve os testes com firmware anterior. Em 13/10, a equipe confirmou que B e C foram testadas e estão funcionando com firmware v3.0. A medição de tempo topo → junção e a calibração conjunta permanecem pendentes; ver roteiro da Semana 10.
- **Histórico — Firmware Uno, pendências registradas em 02/10/2026 (substituídas pelos resultados de 13/10; calibração e A+B+C continuam abertas):** a compilação dos 4 sketches foi verificada com `arduino-cli` (procedimento em `docs/CI-CD.md`), mas o comportamento não foi testado em hardware. Ao voltar à bancada: (1) calibrar o PWM da esteira C (`VELOCIDADE_ESTEIRA_C`, inicial 140), medindo o tempo topo → junção, que deve ficar próximo ao de A e B (~5 s) e bem abaixo dos 12,5 s do timeout; (2) provocar o timeout de 12,5 s (com peça no topo, impedindo-a de chegar à junção) e conferir `ERRO`, motor desligado e estoque intacto; (3) iniciar um pedido com o sensor de junção já bloqueado e confirmar que o estoque não é debitado sem uma passagem; (4) executar antes o diagnóstico B/C do roteiro da Semana 7, ainda não realizado.

### 28/10 (Semana 11 — montagem final na base)

- **Esteira A na base:** primeira esteira fixada na estrutura final; **10 entregas com sucesso**, tempo de entrega entre **4650 e 5000 ms**, sem falha. Bate com a calibração de 21/10 (A: ~4950 ms, PWM 245 / kick 180 ms): a montagem na base não alterou o comportamento. Nenhuma mudança de firmware ou de parâmetros; só a mecânica da base mudou.
- **Peça usada:** improvisada. A peça impressa em 3D ainda não foi verificada (Bloco 4 do roteiro).
- **Display:** o OLED ainda não chegou (previsto para 29–30/10); reteste B3 pendente.
- **Sem avanço em 26–27/10:** as atividades previstas para segunda e terça (revisão da bancada e montagem do conjunto) não foram executadas; B e C na base, integração total e peças 3D ficaram concentradas em 29–30/10. Ver [roteiro da Semana 11](roteiros/semana_11_26-30_outubro.md).
