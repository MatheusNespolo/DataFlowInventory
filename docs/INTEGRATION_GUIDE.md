# Guia de Integração — Beckhoff CX9240 + Separador (Roda de Separação)

> **Passo a passo para integração final com PC industrial e roda de separação**  
> Data: 14/09/2026 · Sprint 5

---

## 1. Integração Beckhoff CX9240 (Persistência DB)

### 1.1 Contrato MQTT

| Item | Valor |
|------|-------|
| **Tópico** | `dataflow/estoque` |
| **QoS** | 1 |
| **Retained** | ✅ Sim |
| **Publicador** | Arduino OU Simulador (modo `MQTT_PUBLISH=true`) |

**Payload:**
```json
{
  "type": "estoque",
  "pecaA": 5,
  "pecaB": 5,
  "pecaC": 5
}
```

### 1.2 Validação Prévia

```bash
# Terminal 1: Simulador
cd simulator
MQTT_PUBLISH=true npm start

# Terminal 2: Validar
mosquitto_sub -h localhost -t "dataflow/estoque" -C 1
# Esperado: {"type":"estoque","pecaA":5,"pecaB":5,"pecaC":5}
```

### 1.3 Especificação do Banco de Dados Relacional (MySQL / MariaDB / PostgreSQL)

Para que o PC industrial Beckhoff CX9240 (ou simulador de persistência) registre o histórico de forma transacional e com auditoria, define-se a seguinte estrutura relacional recomendada:

```sql
-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS dataflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dataflow_db;

-- Tabela de snapshots de estoque (atualizada via dataflow/estoque)
CREATE TABLE IF NOT EXISTS estoque_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    peca_a INT NOT NULL,
    peca_b INT NOT NULL,
    peca_c INT NOT NULL,
    origem VARCHAR(50) DEFAULT 'MQTT_GATEWAY',
    raw_payload JSON NULL,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;

-- Tabela de histórico de eventos operacionais (atualizada via dataflow/eventos)
CREATE TABLE IF NOT EXISTS eventos_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evento VARCHAR(50) NOT NULL,          -- 'pedido', 'entregue', 'erro', 'status'
    peca VARCHAR(10) NULL,               -- 'A', 'B', 'C'
    tempo_execucao_ms INT NULL,          -- tempo medido do ciclo de entrega
    detalhes VARCHAR(255) NULL,          -- 'sem_estoque', 'timeout_j1', etc.
    INDEX idx_evento (evento),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;
```

### 1.4 Arquitetura no TwinCAT 3 (PLC Beckhoff CX9240)

No ambiente TwinCAT 3, a persistência segue a seguinte estrutura de blocos de função (FBs):
1. **`FB_IotMqttClient` (TF6701 IoT Communication):** Assina o tópico `dataflow/estoque` (QoS 1) com reconexão automática.
2. **`FB_JsonDomParser` (TF6701 IoT Communication):** Converte a string JSON recebida para variáveis estruturadas (`ST_Estoque: pecaA, pecaB, pecaC`).
3. **`FB_DBRecordInsert` (TF6420 Database Server):** Executa o comando `INSERT INTO estoque_snapshots (peca_a, peca_b, peca_c) VALUES (...)` acionado por borda de subida (`R_TRIG`) a cada alteração de payload.

### 1.5 Checklist CX9240

- [x] Contrato MQTT e payload definidos (`dataflow/estoque`)
- [x] Publicação MQTT validada no simulador (`MQTT_PUBLISH=true`)
- [ ] Subscriber MQTT criado no TwinCAT 3 (`FB_IotMqttClient`)
- [ ] Parser JSON implementado (`FB_JsonDomParser`)
- [ ] Tabelas `estoque_snapshots` e `eventos_log` criadas no SGBD
- [ ] Inserção SQL testada contra o broker Mosquitto
- [ ] Tratamento de reconexão e buffers offline no CLP

---

## 2. Integração Separador — Roda com 3 Compartimentos

### 2.1 Hardware

| Componente | Especificação | Pinos Arduino | Alimentação |
|-----------|---------------|---------------|-------------|
| **Motor de Passo** | 28BYJ-48 | — | 5V |
| **Driver** | ULN2003 | 5, 6, 7, 8 | 5V + 5-12V motor |

### 2.2 Posições

| Peça | Ângulo | Passos |
|------|--------|--------|
| **A** | 0° | 0 |
| **B** | 120° | 683 |
| **C** | 240° | 1365 |

### 2.3 Ativação (Arduino IDE)

1. **Descomentarincludes:**
   ```cpp
   #include <Stepper.h>  // linha ~67
   #define STEPPER_IN1 5  // linhas ~68-79
   ```

2. **Inicializar no setup():**
   ```cpp
   motorSeparador.setSpeed(SEPARADOR_RPM);  // linha ~440
   ```

3. **Integrar na FSM (ENTREGANDO_PECA):**
   ```cpp
   if (pecaSolicitada == 1) moverSeparador('A');
   ```

4. **Compilar e fazer upload**

### 2.4 Testes (Semana 5, Bloco 3)

| Teste | Procedimento | Esperado |
|-------|-----------|----------|
| **T7.1** | Verificar continuidade ULN2003 | Sem curtos |
| **T7.2** | Enviar CMD:PECA:A | Motor gira → A |
| **T7.3** | Enviar CMD:PECA:B | Motor gira → B |
| **T7.4** | Enviar CMD:PECA:C | Motor gira → C |
| **T7.5** | 10 ciclos seguidos | Sem travamento |
| **T7.6** | Dashboard: A, B, C alternados | Separador acompanha |

---

## 3. Checklist Final

- [ ] Beckhoff: contrato validado, subscriber implementado, DB persistindo
- [ ] Separador: código ativo, testes T7.1–T7.6 passando
- [ ] Documentação: plano_de_testes.md + CHANGELOG.md + cards Done
- [ ] Referência: ver `docs/testes/roteiros/semana_05_15-19_setembro.md` para execução

