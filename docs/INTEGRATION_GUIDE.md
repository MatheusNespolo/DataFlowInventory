# Guia de Integração — Beckhoff CX9240 (Historiador SQLite) + Separador (Roda de Separação)

> **Passo a passo para integração final com PC industrial e roda de separação**  
> ⚠️ **Status (revisado em 18/10/2026):** o historiador CX9240 foi comissionado e o fluxo com o simulador foi validado; consultar §1 para limitações de contrato/teste real. Firmware Uno v3.0 validado em bancada. O separador (§2) está **implementado sem bloqueio** em `src/hw/separador.*`: o giro isolado pelos comandos de bancada foi relatado como funcionando e a roda se prepara de acordo com a peça pedida (`SEPARADOR_AUTOMATICO`), mas o **modo automático ainda não foi validado em hardware**. As instruções antigas da §2.3 são referência histórica e não devem ser aplicadas à v3.0.
> Data: 14/09/2026 · Sprint 5 · Revisado em 13/10/2026

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
# Esperado: {"type":"estoque","pecaA":15,"pecaB":15,"pecaC":15}
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

### 1.5 Checklist CX9240 — 🟡 PARCIALMENTE VALIDADO (15/09/2026; homologado em 19/09/2026)

> Pendências: o contrato `dataflow/eventos` (usado por `eventos_hist`) ainda não foi confirmado com o firmware real, porque o simulador publica só `dataflow/estoque`. O card #27 (E2E) só pode ser marcado como concluído após uma execução verde no GitHub Actions da `main`.

- [x] Contrato MQTT e payload definidos (`dataflow/estoque` e `dataflow/eventos`)
- [x] Publicação MQTT validada no simulador (`MQTT_PUBLISH=true`)
- [x] Subscriber MQTT implementado no TwinCAT 3 (`FB_IotMqttClient`)
- [x] Parser JSON implementado e integrado
- [x] Banco SQLite comissionado no RT Linux ARM64 (`/var/lib/dfi/historian.db`)
- [x] Inserções SQL validadas via TF6420 Database Server contra o broker e simulador
- [x] Diagnóstico, reconexão e store-and-forward testados no CX9240

---

## 2. Integração Separador — Roda com 3 Compartimentos

> 📐 **Referência:** Veja o diagrama elétrico completo em [`docs/fluxogramas/Diagrama elétrico.png`](fluxogramas/Diagrama%20el%C3%A9trico.png) para pinagem e integração com os demais componentes (Arduino, ESP32, IRF520, sensores).

### 2.1 Hardware

| Componente | Especificação | Pinos Arduino | Alimentação |
|-----------|---------------|---------------|-------------|
| **Motor de Passo** | 28BYJ-48 | — | 5V |
| **Driver** | ULN2003 | 5, 6, 7, 8 | 5V + 5-12V motor |

### 2.2 Posições

| Peça | Ângulo (padrão do firmware) | Passos (2038 por volta) |
|------|--------|--------|
| **A** | 120° | 679 |
| **B** | 240° | 1359 |
| **C** e neutro | 0° | 0 |

> Valores padrão de `SEPARADOR_GRAUS_*` em `config.h`, herdados do código da v2.x (a tabela antiga deste guia, A=0°, B=120°, C=240°, **não** era a usada pelo código). A roda real define os ângulos: ajuste as constantes. A roda deve estar no neutro quando o Uno liga (não há sensor de referência).

### 2.3 Ativação — procedimento legado (v2.x; não aplicar à v3.0)

> **Atenção:** este trecho descreve o procedimento antigo da v2.x. Não descomente o `Stepper.h` nem as chamadas no `.ino` da v3.0 sem projeto, revisão e testes específicos: o movimento legado pode bloquear o loop e acionar o watchdog. A lógica incremental foi exercitada em testes no PC, mas ainda precisa de validação em hardware.

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

### 2.4 Testes em bancada — pendentes (replanejados para a Semana 9/10)

> Os testes abaixo são a matriz planejada da Semana 5 e continuam úteis como referência, mas não foram executados/aprovados. Siga o roteiro atualizado antes de energizar a montagem: [`Semana 9`](testes/roteiros/semana_09_14-18_outubro.md) e [`Semana 10`](testes/roteiros/semana_10_19-23_outubro.md).

| Teste | Procedimento | Esperado |
|-------|-----------|----------|
| **T7.1** | Verificar continuidade ULN2003 | Sem curtos |
| **T7.2** | Enviar `CMD:SEP:A` (Serial Monitor; não use `CMD:PECA:A`, que dispara uma entrega completa) | Motor gira → A |
| **T7.3** | Enviar `CMD:SEP:B` | Motor gira → B (pelo caminho mais curto, no sentido contrário) |
| **T7.4** | Enviar `CMD:SEP:C` | Motor gira → C (neutro, por padrão) |
| **T7.5** | 10 ciclos seguidos | Sem travamento |
| **T7.6** | Com `SEPARADOR_AUTOMATICO 1` (padrão), dashboard: A, B, C alternados | A roda se prepara no compartimento do pedido antes de a peça chegar |

---

## 3. Observabilidade de Performance (Prometheus + Grafana)

Camada **complementar** ao historiador do CX9240: o SQLite guarda dado de **negócio** (estoque e eventos com precisão por evento); o Prometheus guarda dado de **performance** do servidor Node (latência de comando, PUBACK do broker, API, reconexões, quedas do gateway).

- O servidor expõe `GET /metrics` (porta 3000). O Prometheus consulta a cada 5 s; se o stack estiver desligado, nada muda no servidor nem na integração com o CX9240.
- Contrato MQTT do CX9240 (seção 1.1) **não muda**: nenhum tópico novo e nenhuma alteração de firmware.
- Dashboards em `docs/grafana/` (Visão Geral, Performance, Confiabilidade). Setup em [`observability/README.md`](../observability/README.md); catálogo de métricas em `docs/ARCHITECTURE.md` (seção 7).
- **Validado em 01/10/2026:** stack com Docker (`scripts/observability-smoke.ps1`) e painéis do Grafana conferidos.
- Implantação completa do sistema: [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 4. Checklist Final

- [ ] Beckhoff: contrato validado, subscriber implementado, DB persistindo
- [ ] Separador: código ativo, testes T7.1–T7.6 passando
- [ ] Documentação: plano_de_testes.md + CHANGELOG.md + cards Done
- [ ] Observabilidade: smoke test com Docker e painéis do Grafana conferidos
- [ ] Referência: ver `docs/testes/roteiros/semana_05_15-19_setembro.md` para execução

