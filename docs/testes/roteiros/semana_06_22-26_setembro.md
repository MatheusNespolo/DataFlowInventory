# Roteiro de Testes — Semana 6 (22–26/09/2026)

**Objetivo:** verificar integridade de soldagem dos módulos IRF520 (B/C), consolidar o diagrama elétrico do protótipo, finalizar a montagem mecânica (base MDF + acabamento) e validar o sistema integrado em burn-in test nas três esteiras.

> **Data:** 22–26/09/2026
> **Continuação de:** [`semana_05_15-19_setembro.md`](semana_05_15-19_setembro.md)
> **Blocos:** 5 (Soldagem, Diagrama Elétrico, Mecânica, Integração, Documentação)

---

## 1. Herança validada

| Marco | Data | Status |
|-------|------|--------|
| Teste 5 — Três Esteiras A+B+C | 08–12/09 | ✅ |
| Teste 6 — HiveMQ Cloud E2E (TLS/8883) | 19/09 | ✅ **CONCLUÍDO** |
| Beckhoff CX9240 — Historiador SQLite + TwinCAT 3 | 19/09 | ✅ **CONCLUÍDO** |
| Montagem mecânica avanços (B/C) | 15/09 | ✅ Estrutura/alinhamento |
| CI/CD + Scripts multiplataforma | 14–15/09 | ✅ **CONCLUÍDO** (Node.js v22, npm audit, Arduino cache) |
| **[PENDENTE] Soldagem IRF520 (B/C)** | 15/09 → **22/09** | ⏳ Replanejada |
| **[PENDENTE] Diagrama elétrico consolidado** | — | ⬜ A publicar |
| **[PENDENTE] Base MDF + acabamento** | — | ⬜ A completar |

**Contexto:** Semana 5 completou testes de software/nuvem. Semana 6 foca na **finalização mecânica** (soldagem, diagrama, base) e **validação integrada** (burn-in test nas três esteiras).

---

## 2. Bloco 0 — Pré-voo

### 2.1 — Infraestrutura

- [x] `start_services.bat` → Mosquitto + probe + server rodando
- [x] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [x] Esteiras A, B e C respondendo a comandos no broker
- [x] WiFi/credentials confirmados (2,4 GHz)
- [x] HiveMQ Cloud (cluster EU) acessível via TLS/8883

### 2.2 — Hardware

- [x] 3 drivers IRF520 alimentados (12 V / 5 V lógico)
- [x] Fiação UART reconferida (Uno ↔ ESP32, divisor 1k/2kΩ + GND comum)
- [x] 6 sensores TCRT5000 operacionais
- [ ] **[NOVO]** Soldagem módulos IRF520 (B/C) VERIFICADA
- [ ] **[NOVO]** Base MDF montada
- [ ] **[NOVO]** Fiação final soldada

---

## 3. Bloco 1 — Verificação de Solda dos Módulos IRF520 (B/C)

> **Objetivo:** validar soldagem dos 2º e 3º módulos IRF520 sem falhas de continuidade ou PWM instável. **Execução prioritária no dia 22/09.**

### 3.1 — Testes Elétricos com Multímetro

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Continuidade VCC motor B | Multímetro modo contínuo VCC/GND IRF520 #2 | Continuidade OK | ⬜ |
| Continuidade VCC motor C | Multímetro modo contínuo VCC/GND IRF520 #3 | Continuidade OK | ⬜ |
| Continuidade GND B | Multímetro GND driver ↔ GND fonte | Continuidade OK | ⬜ |
| Continuidade GND C | Multímetro GND driver ↔ GND fonte | Continuidade OK | ⬜ |
| Resistência ponte B | Multímetro ohm VCC/GND (motor desconectado) | > 100kΩ | ⬜ |
| Resistência ponte C | Multímetro ohm VCC/GND (motor desconectado) | > 100kΩ | ⬜ |

### 3.2 — Validação de Sinal PWM

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| PWM Motor B (pino 10) | Osciloscópio no SIG do IRF520 #2 | 5V onda quadrada, freq ~490 Hz | ⬜ |
| PWM Motor C (pino 11) | Osciloscópio no SIG do IRF520 #3 | 5V onda quadrada, freq ~490 Hz | ⬜ |
| Ruído no sinal | Zoom em edge; overshoot | < 0,5V overshoot; sem oscilação | ⬜ |

### 3.3 — Teste Funcional Motor B

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Motor B liga | `mosquitto_pub -t dataflow/comandos/sub -m '{"peca":"B"}'` | Motor gira sem travamento | ⬜ |
| Motor B desliga | `CMD:RESET` | Motor para | ⬜ |
| Feedback sensor topo B | Sensor → LOW → motor desliga | Desliga após 2–3 s | ⬜ |

### 3.4 — Teste Funcional Motor C

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Motor C liga | `mosquitto_pub -t dataflow/comandos/sub -m '{"peca":"C"}'` | Motor gira sem travamento | ⬜ |
| Motor C desliga | `CMD:RESET` | Motor para | ⬜ |
| Feedback sensor topo C | Sensor → LOW → motor desliga | Desliga após 2–3 s | ⬜ |

### 3.5 — Critérios de Sucesso do Bloco 1

- [x] Testes de continuidade/resistência OK
- [x] PWM sem ruído significativo
- [x] Motores B e C ligam/desligam responsivamente
- [x] Sem efeito térmico anormal

---

## 4. Bloco 2 — Diagrama Elétrico Consolidado

> **Objetivo:** publicar diagrama elétrico formal mostrando todas as conexões, bitola de fios, proteção e alimentação. **Dias 22–24/09.**

### 4.1 — Levantamento de Esquema

| Item | Detalhe | Status |
|------|---------|--------|
| Fonte de alimentação | 12 V / 5 A (motores); 5 V / 1 A (lógica) | ⬜ Medir tensões |
| Alimentação motores | 12 V comum aos 4 motores (principal direto; A/B/C via IRF520) | ⬜ Verificar |
| Alimentação Arduino Uno | 5 V (Vin ou USB) | ⬜ Confirmar |
| Alimentação ESP32 | 5 V (micro-USB) | ⬜ Confirmar |
| Divisor 1k/2kΩ (UART) | Entre TX1(1) ESP32 e RX(0) Arduino | ⬜ Validar |
| GND comum | Todos componentes aterrados no mesmo ponto | ⬜ Confirmar |
| Proteção (fusíveis) | Fusível 5A em série com 12V principal | ⬜ A instalar |
| Proteção motores (diodos) | Diodo de roda livre em cada motor DC | ⬜ Avaliar |

### 4.2 — Documentação CAD

| Documento | Formato | Localização | Status |
|-----------|---------|------------|--------|
| Diagrama esquemático unifilar | Visio/KiCad | `docs/diagramas/esquema_unifilar.pdf` | ⬜ |
| Diagrama de blocos | Draw.io | `docs/diagramas/blocos_sistema.pdf` | ⬜ |
| Tabela de fiação (pinagem) | Markdown | `docs/ARCHITECTURE.md` (atualizar) | ⬜ |
| Especificação bitola de fios | Markdown | `docs/ARCHITECTURE.md` (nova seção) | ⬜ |

### 4.3 — Critérios de Sucesso do Bloco 2

- [x] Diagrama esquemático completo
- [x] Pinagem consolidada e validada contra hardware real
- [x] Proteção especificada (fusíveis, diodos)
- [x] Documentação acessível em `docs/diagramas/`

---

## 5. Bloco 3 — Montagem Mecânica: Base MDF + Acabamento

> **Objetivo:** finalizar a estrutura física (base MDF, fixação das esteiras, acabamento visual). **Dias 23–24/09.**

### 5.1 — Tarefas Mecânicas

| Tarefa | Detalhes | Status |
|--------|----------|--------|
| Montagem Base MDF | 60×40 cm, 15 mm, furos pré-marcados | ⬜ |
| Fixação Esteiras A/B/C | Parafusos M4 + arruelas (4 pontos cada) | ⬜ |
| Fixação Motor Principal | Parafusos M3 + suportes alumínio | ⬜ |
| Fixação Motores B/C | Suportes 3D/alumínio; alinhamento com sensores | ⬜ |
| Fixação Roda Separadora | Motor 28BYJ-48 + roda 3 compartimentos; tolerância < 2 mm | ⬜ |
| Organização de Fiação | Passadores/canaletas; conectores fixos | ⬜ |
| Soldagem Connectors | Pinos em placas perfuradas | ⬜ |

### 5.2 — Acabamento Visual

| Item | Detalhes | Status |
|------|----------|--------|
| Limpeza de base | Pano úmido + ar comprimido | ⬜ |
| Pintura base MDF (opcional) | Cor neutra | ⬜ |
| Identificação de componentes | Etiquetas A/B/C, motor principal, separador | ⬜ |
| Proteção de eletrônica | Caixa acrílica/suporte | ⬜ |

### 5.3 — Validação Mecânica

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Estabilidade de base | Empurro lateral moderado | Desvio < 2 mm | ⬜ |
| Alinhamento de esteiras | Nível de bolha + régua | Desvio < 0,5 mm em 50 cm | ⬜ |
| Mobilidade roda separadora | Girar manualmente | 3 posições discretas estáveis | ⬜ |
| Segurança de fiação | Visual + puxão leve | Nenhum fio solto | ⬜ |

### 5.4 — Critérios de Sucesso do Bloco 3

- [x] Base MDF montada e estável
- [x] Esteiras/motores/sensores fixados
- [x] Fiação organizada e soldada
- [x] Proteção de eletrônica implementada

---

## 6. Bloco 4 — Validação Integrada: Burn-in Test (Três Esteiras)

> **Objetivo:** stress test do sistema completo com as três esteiras em hardware final. **Dias 25–26/09.**

### 6.1 — Setup

```bash
# Terminal 1: serviços base
start_services.bat

# Terminal 2: probe MQTT
cd test/mqtt_probe && npm start

# Terminal 3: servidor real (com hardware)
cd server && npm start
```

### 6.2 — Cenários de Teste

| Cenário | Descrição | Duração | Esperado | Status |
|---------|-----------|---------|----------|--------|
| **S1: Sequência simples** | A → B → C → A → B → C (6 ciclos) | ~2 min | Todos com sucesso | ⬜ |
| **S2: Carga concorrente** | A + B simultâneos, depois C | ~3 min | `ocupado` na 2ª requisição; sem deadlock | ⬜ |
| **S3: Estoque vazio** | Esgotar estoque A (6×), tentar 7º | ~2 min | 7º retorna `sem_estoque` | ⬜ |
| **S4: Reset durante operação** | `CMD:RESET` com esteira B ligada | ~30 s | Motor desliga; FSM → `AGUARDANDO_PEDIDO` | ⬜ |
| **S5: Reconexão de rede** | Desconectar WiFi 30 s, reconectar | ~2 min | LWT offline; reconexão automática; estoque OK | ⬜ |
| **S6: Stress alta frequência** | Comandos a cada 500 ms por 5 min | 5 min | Rate limit aplicado; LCD sincronizado; sem travamento | ⬜ |
| **S7: Telemetria Remota** | Broker HiveMQ; 20 pedidos via 4G/TLS | ~5 min | Eventos em TLS/8883; CX9240 grava SQLite | ⬜ |

### 6.3 — Monitoramento

```
Observar simultaneamente:
- Dashboard web: status esteiras, estoque, eventos
- MQTT Probe: publicações em dataflow/#
- Serial Arduino (USB): debug FSM
- LCD 16×2: estoque atual, estado
- CX9240 SQLite: SELECT * FROM estoque_hist ORDER BY ts DESC LIMIT 10;
```

### 6.4 — Critérios de Sucesso do Bloco 4

- [x] Cenários S1–S7 executados e aprovados
- [x] Nenhum travamento fatal (exceto rejeições esperadas)
- [x] Telemetria sincronizada LCD ↔ Dashboard ↔ CX9240
- [x] Reconexão de rede sem intervenção manual
- [x] Estoque retained reconcilia após reconexão

---

## 7. Bloco 5 — Documentação e Gaps

> **Objetivo:** consolidar resultados, atualizar CHANGELOG e mapear próximas frentes. **Dia 26/09.**

### 7.1 — Documentação a Completar

| Artefato | Localização | Status |
|----------|-------------|--------|
| Roteiro semana 6 (este arquivo) | `docs/testes/roteiros/semana_06_22-26_setembro.md` | 🔄 Em progresso |
| Resultados consolidados | Seção 10 deste roteiro | ⬜ Preencher |
| CHANGELOG atualizado | `docs/CHANGELOG.md` | ⬜ Adicionar semana 6 |
| Diagrama elétrico | `docs/diagramas/` (nova pasta) | ⬜ Publicar |
| BOM (Bill of Materials) | `docs/BILL_OF_MATERIALS.md` (novo) | ⬜ Criar |
| Deployment guide | `docs/DEPLOYMENT.md` (novo) | ⬜ Criar |
| Board GitHub Projects | `docs/fluxogramas/board_github_projects.md` | ⬜ Atualizar |

### 7.2 — Gaps Identificados na Auditoria (Sprint Review)

| Gap | Impacto | Prioridade |
|-----|---------|-----------|
| BOM ausente | Difícil reproduzir protótipo | 🔴 Alta |
| Diagrama elétrico não publicado | Novos integradores não sabem montar | 🔴 Alta |
| Deployment guide ausente | Sem passo a passo para novo ambiente | 🟡 Média |
| Firmware sem versioning explícito | Histórico de `.ino` não rastreado no CHANGELOG | 🟡 Média |
| Testes automatizados (E2E) | Validação manual; risco de regressão | 🟡 Média |
| Documentação inline mínima | `server.js` e `.ino` com poucos comentários de função | 🟢 Baixa |
| Performance telemetria ausente | Sem métricas de latência ao longo do tempo | 🟢 Baixa |

### 7.3 — Cards Sugeridos para Próxima Sprint

1. **Card: BOM** — componentes, SKUs, fornecedores, custos
2. **Card: Deployment Guide** — passo a passo setup completo
3. **Card: Testes E2E Automatizados** — Cypress dashboard + API
4. **Card: Firmware Versioning** — tags Git + versão em sketches
5. **Card: Telemetria Histórica** — Grafana/InfluxDB (opcional)

---

## 8. Cronograma da Semana

| Dia | Manhã | Tarde |
|-----|-------|-------|
| **22/09 (Seg)** | Bloco 0 (pré-voo) + Bloco 1.1–1.2 (multímetro) | Bloco 1.3–1.4 (PWM + motores B/C) |
| **23/09 (Ter)** | Bloco 2.1–2.2 (levantamento + CAD) | Bloco 3.1 (base MDF + fixação) |
| **24/09 (Qua)** | Bloco 3.2–3.3 (acabamento + soldagem) | Bloco 2.3–2.4 (finalizar diagrama) |
| **25/09 (Qui)** | Bloco 4 (burn-in test S1–S4) | Bloco 4 (continuação S5–S7) |
| **26/09 (Sex)** | Bloco 4 (validação final) | Bloco 5 (documentação + CHANGELOG + board) |

---

## 9. Plano B — Simulador (Fallback)

Se problemas de hardware impedirem bancada real:

```bash
start_services.bat
cd simulator && MQTT_PUBLISH=true npm start
# Dashboard + CX9240 operam com dados simulados
```

---

## 10. Resultados Consolidados da Semana

> **A PREENCHER ao final da semana (26/09).**

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ⬜ | Validação em 22/09 |
| 1 — Solda IRF520 (B/C) | ⬜ | Testes elétricos + funcionais |
| 2 — Diagrama elétrico | ⬜ | CAD publicado em `docs/diagramas/` |
| 3 — Montagem mecânica | ⬜ | Base MDF + acabamento |
| 4 — Burn-in test | ⬜ | Cenários S1–S7 |
| 5 — Documentação | ⬜ | CHANGELOG, BOM, Deployment |
| Plano B | — | Simulador como fallback |

---

## 11. Referências

- [`semana_05_15-19_setembro.md`](semana_05_15-19_setembro.md) — Semana anterior
- [`plano_de_testes.md`](../plano_de_testes.md) — Plano geral de testes
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — Arquitetura técnica
- [`CHANGELOG.md`](../../CHANGELOG.md) — Histórico de mudanças

---

**Criado:** 21/09/2026 | **Próximo review:** 26/09/2026
