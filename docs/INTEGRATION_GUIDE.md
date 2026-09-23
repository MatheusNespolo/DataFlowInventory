# Guia de Integração — Beckhoff CX9240 (Historiador SQLite) + Separador (Roda de Separação)

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

### 1.3 Arquitetura de Persistência no CX9240 — SQLite Local (Implementada & Validada)

O Beckhoff CX9240 roda **TwinCAT 3 em RT Linux (ARM64)** com banco de dados local **SQLite** (`/var/lib/dfi/historian.db`), configurado em modo WAL (`PRAGMA journal_mode = WAL;`). Essa decisão de engenharia garante autonomia completa ao CLP, eliminando a dependência de conectividade de rede com servidores MySQL/MariaDB externos.

#### Schema SQLite (`docs/schema_sqlite.sql` no projeto TwinCAT):
```sql
PRAGMA journal_mode = WAL;

-- Histórico de estoque: 1 linha por mudança e por amostra periódica
CREATE TABLE IF NOT EXISTS estoque_hist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts_plc     TEXT    NOT NULL,                        -- 'YYYY-MM-DD HH:MM:SS.mmm' (hora local)
  ts_db      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
  estoque_a  INTEGER NOT NULL,
  estoque_b  INTEGER NOT NULL,
  estoque_c  INTEGER NOT NULL,
  origem     TEXT    NOT NULL CHECK (origem IN ('mudanca', 'periodico'))
);
CREATE INDEX IF NOT EXISTS ix_estoque_ts ON estoque_hist (ts_plc);

-- Histórico de eventos operacionais e erros
CREATE TABLE IF NOT EXISTS eventos_hist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts_plc      TEXT    NOT NULL,
  ts_db       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
  evento      TEXT    NOT NULL,                        -- 'entrega', 'erro', 'inicializacao'
  peca        TEXT,                                    -- 'A', 'B', 'C' ou NULL
  detalhe     TEXT,                                    -- 'timeout', 'sem_estoque' ou NULL
  payload_raw TEXT                                     -- JSON original recebido
);
CREATE INDEX IF NOT EXISTS ix_eventos_ts ON eventos_hist (ts_plc);
```

#### Schema Alternativo MariaDB / MySQL (Apêndice):
```sql
CREATE DATABASE IF NOT EXISTS dataflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dataflow_db;

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

CREATE TABLE IF NOT EXISTS eventos_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evento VARCHAR(50) NOT NULL,
    peca VARCHAR(10) NULL,
    tempo_execucao_ms INT NULL,
    detalhes VARCHAR(255) NULL,
    INDEX idx_evento (evento),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;
```

### 1.4 Blocos de Função TwinCAT 3 (Projeto CX9240_DataFlowInventory)

1. **`FB_IotMqttClient` (TF6701 IoT Communication):** Assina `dataflow/estoque` e `dataflow/eventos` com QoS 1 e reconexão automática.
2. **`FB_DfiSqlBuilder` / Parser JSON:** Extrai as propriedades do JSON e constrói dinamicamente as queries `INSERT INTO estoque_hist ...` e `INSERT INTO eventos_hist ...`.
3. **`FB_DBRecordInsert` (TF6420 Database Server — SQL Expert Mode):** Grava os registros no arquivo SQLite `/var/lib/dfi/historian.db`.
4. **Configuração segura:** Credenciais e rotas carregadas de `/etc/dfi/historian.conf` (com permissão `chmod 600`).
5. **Inspeção de Dados:**
   ```bash
   sqlite3 /var/lib/dfi/historian.db "SELECT * FROM estoque_hist ORDER BY id DESC LIMIT 10;"
   sqlite3 /var/lib/dfi/historian.db "SELECT * FROM eventos_hist ORDER BY id DESC LIMIT 10;"
   ```

### 1.5 Checklist CX9240 — ✅ CONCLUÍDO (15/09/2026)

- [x] Contrato MQTT e payload definidos (`dataflow/estoque` e `dataflow/eventos`)
- [x] Publicação MQTT validada no simulador (`MQTT_PUBLISH=true`)
- [x] Subscriber MQTT implementado no TwinCAT 3 (`FB_IotMqttClient`)
- [x] Parser JSON implementado e integrado
- [x] Banco SQLite comissionado no RT Linux ARM64 (`/var/lib/dfi/historian.db`)
- [x] Inserções SQL validadas via TF6420 Database Server contra o broker e simulador
- [x] Diagnóstico, reconexão e store-and-forward testados no CX9240

---

## 2. Integração Separador — Roda com 3 Compartimentos

> 📐 **Referência:** Veja o diagrama elétrico completo em [`docs/fluxogramas/Diagrama elétrico.png`](../fluxogramas/Diagrama%20el%C3%A9trico.png) para pinagem e integração com os demais componentes (Arduino, ESP32, IRF520, sensores).

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

