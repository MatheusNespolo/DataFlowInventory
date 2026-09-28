# Roteiro de Testes — Semana 7 (28/09–02/10/2026)

**Objetivo:** validar conexão HiveMQ Cloud via hotspot 4G (diagnóstico rc=-2), concluir testes funcionais dos módulos IRF520 (B/C) com diagnóstico de queda de potência, executar burn-in test nas três esteiras, finalizar acabamento mecânico (MDF + desbaste de esteiras) e consolidar documentação dos Cards #21–#25.

> **Data:** 28/09–02/10/2026
> **Continuação de:** [`semana_06_22-26_setembro.md`](semana_06_22-26_setembro.md)
> **Blocos:** 5 (HiveMQ/Hotspot, Funcionais IRF520, Burn-in, MDF, Documentação)

---

## 1. Herança validada

| Marco | Data | Status |
|-------|------|--------|
| Teste 5 — Três Esteiras A+B+C | 08–12/09 | ✅ |
| Teste 6 — HiveMQ Cloud E2E (TLS/8883) | 19/09 | ✅ **CONCLUÍDO** |
| Beckhoff CX9240 — Historiador SQLite + TwinCAT 3 | 19/09 | ✅ **CONCLUÍDO** |
| CI/CD + Scripts multiplataforma | 14–15/09 | ✅ **CONCLUÍDO** (Node.js v22, npm audit, Arduino cache) |
| Soldagem IRF520 (B/C) — placas de passagem | 22/09 | ✅ **CONCLUÍDO** — Continuidade aprovada |
| Diagrama elétrico consolidado | 23/09 | ✅ **CONCLUÍDO** — `docs/fluxogramas/Diagrama elétrico.png` |
| Base MDF — montagem principal | 22/09 | ✅ **CONCLUÍDO** — resta acabamento |
| Sketch isolado `test_mqtt_cloud.ino` | 24–25/09 | ✅ **CONCLUÍDO** — diagnóstico modular MQTT/TLS |
| **[PENDENTE] Validação HiveMQ Cloud via hotspot 4G** | 28/09 | 🔄 Em progresso hoje |
| **[PENDENTE] Testes funcionais IRF520 B/C (potência)** | 29/09 | ⬜ Agendado |
| **[PENDENTE] Burn-in test completo (S1–S7)** | 30/09–02/10 | ⬜ Agendado |
| **[PENDENTE] Acabamento MDF + Desbaste esteiras** | 01/10 | ⏳ Reagendado 25–27/09 → 01/10 |
| **[PENDENTE] Documentação cards #21–#25** | 02/10 | ⬜ Agendado |

**Contexto:** Semana 6 completou soldagem, diagrama elétrico e base MDF. Semana 7 foca em **resolução dos dois problemas abertos** (rc=-2 HiveMQ e queda de potência B/C), **burn-in test** e **finalização mecânica + documentação**.

---

## 2. Bloco 0 — Pré-voo

### 2.1 — Infraestrutura

- [ ] `start_services.bat` → Mosquitto + probe + server rodando
- [ ] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [ ] Esteiras A, B e C respondendo a comandos no broker local
- [ ] WiFi/credentials confirmados (2,4 GHz)
- [ ] **Hotspot 4G ativado** no celular para validação HiveMQ Cloud

### 2.2 — Hardware

- [x] 3 drivers IRF520 alimentados (12 V / 5 V lógico)
- [x] Fiação UART reconferida (Uno ↔ ESP32, divisor 1k/2kΩ + GND comum)
- [x] 6 sensores TCRT5000 operacionais
- [x] Soldagem módulos IRF520 (B/C) — continuidade aprovada
- [ ] Diagnóstico queda de potência B/C concluído
- [ ] Base MDF — acabamento visual finalizado
- [ ] Desbaste costura fita esteiras concluído

---

## 3. Bloco 1 — Validação HiveMQ Cloud via Hotspot 4G (28/09)

> **Objetivo:** confirmar se o `rc=-2` é causado por firewall corporativo bloqueando a porta 8883. Método: isolar a variável de rede usando hotspot 4G (rede sem restrições corporativas).
>
> **Referência:** `docs/testes/validações/troubleshooting_bancada_22-23_09.md` §Problema 1

### 3.1 — Procedimento

| Passo | Ação | Resultado esperado |
|-------|------|-------------------|
| 1 | Ativar hotspot 4G no celular (banda 2,4 GHz) | Rede visível no ESP32 |
| 2 | Atualizar `secrets.h` com SSID/senha do hotspot | — |
| 3 | Flash do sketch `esp32/test_mqtt_cloud/test_mqtt_cloud.ino` com `USE_TLS true` | Upload OK |
| 4 | Abrir monitor serial (115200) | Log de diagnóstico aparecer |
| 5 | Observar resultado da conexão HiveMQ Cloud | `[MQTT] Conectado!` **ou** código rc + diagnóstico |

### 3.2 — Resultados Esperados por Cenário

| Cenário | rc/Resultado | Interpretação | Ação |
|---------|-------------|---------------|------|
| **Sucesso** | `[MQTT] Conectado!` | Problema era o firewall corporativo | ✅ Documentar; solicitar liberação 8883 com TI SENAI |
| **Cluster hibernado** | `rc=-2` mesmo no 4G | HiveMQ Free hibernou | Acessar `cloud.hivemq.com` e "wake up" o cluster |
| **TLS timeout** | `rc=-2` com delay ~30s | Handshake TLS lento | Aumentar timeout no sketch |
| **Credenciais erradas** | `rc=5` | User/pass incorretos no `secrets.h` | Conferir credenciais HiveMQ Cloud |

### 3.3 — Teste Diagnóstico de Rede (antes do flash)

```powershell
# No PC — verificar acessibilidade da porta 8883 pelo hotspot
Test-NetConnection -ComputerName "<cluster>.s1.eu.hivemq.com" -Port 8883
# Resultado esperado: TcpTestSucceeded: True
```

### 3.4 — Critérios de Sucesso do Bloco 1

- [ ] Teste executado com hotspot 4G ativo
- [ ] Resultado documentado (rc code ou `Conectado!`)
- [ ] Causa raiz confirmada (firewall vs. cluster vs. credenciais)
- [ ] `troubleshooting_bancada_22-23_09.md` atualizado com resultado

---


## 4. Bloco 2 — Testes Funcionais IRF520 B/C — Diagnóstico de Potência (29/09)

Roteiro de 4 fases para isolar queda de potência nos motores B/C.

### 4.1 — Fase 1: Teste com Jumper Curto

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Motor B com jumper 5–10 cm | Usar jumper curto em vez do cabo | Força normal = problema no cabo | ⬜ |
| Motor C com jumper 5–10 cm | Usar jumper curto em vez do cabo | Força normal = problema no cabo | ⬜ |

### 4.2 — Fase 2: Medição de Tensão Sob Carga

| Ponto de medição | Tolerância | Motor B | Motor C |
|-----------------|-----------|---------|---------|
| Fonte → IRF520 (VCC) | < 0,5 V | ⬜ | ⬜ |
| IRF520 → Motor (saída) | < 0,2 V | ⬜ | ⬜ |
| Tensão motor sob carga | > 10,5 V | ⬜ | ⬜ |

### 4.3 — Fase 3: Resistência das Soldas

| Ponto de solda | Tolerância | Motor B | Motor C |
|---------------|-----------|---------|---------|
| Pad VCC | < 0,1 Ω OK | ⬜ | ⬜ |
| Pad GND | < 0,1 Ω OK | ⬜ | ⬜ |
| Pad SIG | < 0,1 Ω OK | ⬜ | ⬜ |

### 4.4 — Fase 4: Teste do MOSFET (IRF520)

| Teste | Método | Esperado | Motor B | Motor C |
|-------|--------|----------|---------|---------|
| MOSFET G→S | Multímetro diodo | 0,4–0,7 V | ⬜ | ⬜ |
| MOSFET D→S | Multímetro diodo | OL | ⬜ | ⬜ |

### 4.5 — Testes Funcionais

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Motor B liga | `mosquitto_pub -t dataflow/comandos/sub -m '{"peca":"B"}'` | Gira com força normal | ⬜ |
| Motor C liga | `mosquitto_pub -t dataflow/comandos/sub -m '{"peca":"C"}'` | Gira com força normal | ⬜ |

### 4.6 — Critérios de Sucesso

- [ ] Causa identificada (cabo / solda fria / MOSFET / fonte)
- [ ] Motores B e C com força equivalente ao motor A
- [ ] Documentado na Seção 10

---

## 5. Bloco 3 — Burn-in Test — Três Esteiras (30/09 e 01/10)

| Cenário | Procedimento | Critério | Status |
|---------|-------------|----------|--------|
| S1 — Sequência A→B→C | Solicitar as três peças em sequência | 3 entregas sem travamento | ⬜ |
| S2 — Concorrência | Solicitar A e B em menos de 500 ms | Segundo pedido retorna `ocupado` | ⬜ |
| S3 — Estoque vazio | Solicitar peça com estoque zero | Retorna `sem_estoque` | ⬜ |
| S4 — Reset | Resetar durante entrega | Motor para e FSM volta a `idle` | ⬜ |
| S5 — Reconexão | Desligar Wi-Fi por 15 s e reconectar | ESP32 recupera conexão e tópicos | ⬜ |
| S6 — Alta frequência | 10 pedidos A/B/C em até 5 min | Sem travamento da FSM | ⬜ |
| S7 — HiveMQ/CX9240 | Repetir S1–S3 com TLS | Dados chegam ao historiador | ⬜ |

```bash
start_services.bat
mosquitto_sub -h localhost -t "dataflow/#" -v
# Alternativa: cd test/mqtt_probe && node probe.js
```

**Critérios:** S1–S6 aprovados no broker local; S7 executado se o hotspot validar o Cloud; logs de `mqtt_probe` preservados.

---

## 6. Bloco 4 — Acabamento MDF + Desbaste de Esteiras (01/10)

- [ ] Lixar arestas da base MDF (#120 + #220), sem lascas.
- [ ] Fixar componentes e organizar fiação longe das partes móveis.
- [ ] Identificar ponto de atrito girando cada esteira manualmente.
- [ ] Desmontar parcialmente, desbastar a costura da fita e remontar.
- [ ] Validar ciclo manual e depois com motor, sem tranco ou travamento.

**Critério de sucesso:** base segura, fiação organizada e três esteiras com ciclo suave após a remontagem.

---

## 7. Bloco 5 — Documentação e Cards (02/10)

| Artefato | Localização | Status |
|----------|-------------|--------|
| Resultado do hotspot 4G | `docs/testes/validações/troubleshooting_bancada_22-23_09.md` | ⬜ |
| Resultados IRF520 e burn-in | Seção 10 deste roteiro | ⬜ |
| CHANGELOG da Semana 7 | `docs/CHANGELOG.md` | ⬜ |
| Comentários dos Cards #21–#25 | GitHub Projects | ⬜ |

### Direcionamento dos cards

- **#21 BOM:** iniciar levantamento físico e SKUs; alvo inicial 03/10.
- **#22 Deployment Guide:** mapear setup local, HiveMQ e simulador; redação inicial em 02/10.
- **#23 E2E:** manter em Backlog e iniciar na Semana 8.
- **#24 Firmware Versioning:** definir SemVer e planejar tags retroativas.
- **#25 Telemetria:** manter em Backlog; depende do Deployment Guide.

---

## 8. Cronograma da Semana

| Dia | Manhã | Tarde |
|-----|-------|-------|
| **28/09 (Seg)** | Pré-voo + HiveMQ via hotspot 4G | Análise do resultado e troubleshooting |
| **29/09 (Ter)** | Jumper + tensão sob carga | Soldas, MOSFET e testes funcionais B/C |
| **30/09 (Qua)** | Burn-in S1–S4 | Burn-in S5–S6 |
| **01/10 (Qui)** | Acabamento MDF + desbaste | Burn-in S7, se Cloud validado |
| **02/10 (Sex)** | CHANGELOG + comentários dos cards | Revisão e atualização do board |

---

## 9. Plano B — Simulador

Se a bancada física estiver indisponível:

```bash
start_services.bat
cd simulator && MQTT_PUBLISH=true npm start
```

O simulador permite validar os cenários de FSM e a integração Dashboard/API sem hardware.

---

## 10. Resultados Consolidados da Semana

> Preencher progressivamente. Última atualização: 28/09/2026.

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ⬜ | — |
| 1 — HiveMQ via hotspot 4G | ⬜ | Executar em 28/09 |
| 2 — Diagnóstico IRF520 B/C | ⬜ | Executar em 29/09 |
| 3 — Burn-in S1–S6 | ⬜ | Executar em 30/09–01/10 |
| 4 — Acabamento MDF/esteiras | ⬜ | Executar em 01/10 |
| 5 — Documentação/cards | ⬜ | Executar em 02/10 |

---

## 11. Referências

- [`semana_06_22-26_setembro.md`](semana_06_22-26_setembro.md)
- [`plano_de_testes.md`](../plano_de_testes.md)
- [`troubleshooting_bancada_22-23_09.md`](../validações/troubleshooting_bancada_22-23_09.md)
- [`checklist_pre_teste_rede_infra.md`](../validações/checklist_pre_teste_rede_infra.md)
- [`esp32/test_mqtt_cloud/README.md`](../../../esp32/test_mqtt_cloud/README.md)
- [`CHANGELOG.md`](../../CHANGELOG.md)

---

**Criado:** 28/09/2026 | **Próximo review:** 02/10/2026

