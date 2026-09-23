# Arquitetura Unificada — Data Flow Inventory

> **Documento consolidado de referência técnica**  
> Data: 14/09/2026 · Versão: 2.0 (Sprint 5 — Limpeza + CI/CD)  
> Substitui: `arquitetura_mqtt.md`, `fluxogramas/fluxograma_funcionamento.md` (conteúdo consolidado aqui; arquivos originais mantidos para histórico)

---

## 1. Visão Geral do Sistema

O **Data Flow Inventory** é um protótipo IoT de **intralogística automatizada em escala reduzida**, que simula um centro de distribuição com:

- **3 esteiras transportadoras secundárias** (A, B, C) + 1 principal (direto na fonte)
- **6 sensores infravermelhos** (TCRT5000) para detecção de peças
- **Roda giratória com 3 compartimentos** (motor de passo 28BYJ-48) para separação final
- **Controle centralizado via dashboard web em tempo real**
- **Comunicação bidirecional Arduino ↔ ESP32 ↔ Broker MQTT ↔ Server Node.js ↔ Frontend**

**Setor:** Indústria 4.0 · Automação Industrial · Logística  
**Instituição:** SENAI São Caetano do Sul — Engenharia de Controle e Automação  
**Ano:** 2026

---

## 2. Arquitetura de Comunicação

### 2.1 Camadas (Simplificado)

```
Arduino Uno (FSM) ←→ ESP32 (Gateway MQTT) ←→ Broker ←→ Server Node.js ←→ Dashboard
     ↑                                                            ↑
     └────────────── Simulador (Modo Offline) ─────────────────┘
```

### 2.2 Tópicos MQTT Principais

| Tópico | Direção | Retained | QoS | Descrição |
|--------|---------|----------|-----|-----------|
| `dataflow/status` | ESP32 → | ✅ | 1 | Gateway online/offline (LWT) — **exclusivo gateway** |
| `dataflow/status/server` | Server → | ✅ | 1 | Server online/offline — **não contamina dataflow/status** |
| `dataflow/estoque` | Arduino → | ✅ | 1 | `{pecaA: N, pecaB: N, pecaC: N}` — sincronismo LCD/Dashboard |
| `dataflow/eventos` | Arduino → | ❌ | 1 | Histórico de entregas |
| `dataflow/comandos/sub` | Server → | ❌ | 1 | Comandos do dashboard → Arduino |

---

## 3. Máquina de Estados (Arduino)

**5 estados:**
1. **AGUARDANDO_PEDIDO** → recebe comando
2. **VERIFICANDO_ESTOQUE** → verifica se há peça
3. **ACIONANDO_ESTEIRA** → liga motor, aguarda sensores
4. **ENTREGANDO_PECA** → pausa, decrementa, publica
5. **ERRO** → timeout ou rejeição (requer CMD:RESET)

**Rejeições explícitas:**
- `peca_indisponivel` — Peça não existe (ex.: "C" sem estoque)
- `ocupado` — Comando durante acionamento
- `comando_desconhecido` — Inválido

---

## 4. Hardware

| Componente | Qtd | Arduino Pins | Alimentação |
|-----------|-----|-------------|-------------|
| Motor DC (esteiras) | 3 | PWM 9, 10, 11 | 12V (via IRF520) |
| Sensor IR TCRT5000 | 6 | A0, A1, A2, A3, 2, 4 | 5V |
| LCD 16x2 I2C | 1 | SDA/SCL (A4/A5) | 5V |
| Motor de Passo 28BYJ-48 (Separador) | 1 | 5, 6, 7, 8 (ULN2003) | 5V |

> 📐 **Diagrama elétrico completo:** [`docs/fluxogramas/Diagrama elétrico.png`](fluxogramas/Diagrama%20el%C3%A9trico.png) — esquema unifilar com todos os componentes, pinagem, alimentação e proteções recomendadas (fusível 12V, diodos flyback nos motores DC). Fonte editável: [`Diagrama elétrico.pptx`](fluxogramas/Diagrama%20el%C3%A9trico.pptx). *(Publicado em 23/09/2026)*

---

## 5. Modos de Operação

- **Modo 1:** Hardware Real + MQTT Local (Mosquitto)
- **Modo 2:** Hardware Real + MQTT Remoto (HiveMQ Cloud / TLS 8883)
- **Modo 3:** Simulador Offline (sem hardware, Node.js)
  - Modo Beckhoff: `MQTT_PUBLISH=true npm start` (publica estoque em MQTT opcionalmente)

---

## 6. Integrações Planejadas

### 6.1 Beckhoff CX9240 (Historiador Local MQTT → SQLite)

**Status:** ✅ **CONCLUÍDO E VALIDADO (15/09/2026)**

- **Hardware/OS:** Beckhoff CX9240 rodando TwinCAT 3 em RT Linux ARM64.
- **Banco de Dados:** SQLite local (`/var/lib/dfi/historian.db`) em modo WAL, operado via TF6420 Database Server (SQL Expert Mode).
- **Assinatura MQTT:** TF6701 IoT Communication assinando `dataflow/estoque` e `dataflow/eventos` (QoS 1).
- **Tabelas:** `estoque_hist` (snapshots por alteração e amostragem periódica) e `eventos_hist` (histórico de entregas, erros e alarmes).
- **Integração:** Validado de ponta a ponta com o simulador `DataFlowInventory` (`MQTT_PUBLISH=true`).

### 6.2 Separador — Roda de Separação

**Status:** Código comentado; integração em Sprint 5–6

**Hardware:** Motor 28BYJ-48 + ULN2003 (pinos 5-8)  
**Integração:** Nova etapa FSM após ENTREGANDO_PECA

---

## 7. Documentação Correlata

- `README.md` — Visão geral + quick start
- `docs/fluxogramas/Diagrama elétrico.png` — **[NOVO]** Esquema unifilar completo do protótipo *(23/09/2026)*
- `docs/broker_local_mosquitto.md` — Setup Mosquitto + firewall
- `docs/testes/plano_de_testes.md` — Testes B0–6 completos
- `docs/CI-CD.md` — **[NOVO]** GitHub Actions, validações, pipelines
- `docs/INTEGRATION_GUIDE.md` — **[NOVO]** Integração Beckhoff + Separador
- `CONTRIBUTING.md` — Fluxo de trabalho, PRs, validações
- `docs/CHANGELOG.md` — Histórico de mudanças

