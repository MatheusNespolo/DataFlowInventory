# Card: Integração CX9240 (Beckhoff): Persistência MQTT → Banco de Dados SQLite

**Template:** A (Definition of Done) — **Status:** ✅ **CONCLUÍDO e VALIDADO em 15/09/2026**

---

## 🎯 Objetivo

Implementar e validar o nó historiador no PC industrial Beckhoff CX9240 para persistência local de estoque e eventos operacionais em banco de dados SQLite via MQTT, integrado ao ecossistema DataFlowInventory.

## 📄 Referências

- **Repositório TwinCAT 3:** `TwinCAT/Banco-de-Dados/CX9240_DataFlowInventory`
- **Design Spec:** `docs/2026-09-08-cx9240-mqtt-historian-design.md`
- **Contrato MQTT:** `docs/ARCHITECTURE.md` §6.1 e `docs/INTEGRATION_GUIDE.md` §1
- **Código Simulador:** `simulator/server.js` (`MQTT_PUBLISH=true npm start`)
- **DDL SQLite:** `docs/schema_sqlite.sql` no projeto TwinCAT

---

## ✅ Critérios de Aceite — 100% Concluídos em 15/09/2026

### 1. Lado Simulador (DataFlowInventory) — ✅ CONCLUÍDO
- [x] Publicação em `dataflow/estoque` (retained, QoS 1) com flag `MQTT_PUBLISH=true`.
- [x] Testado localmente contra broker Mosquitto.
- [x] Operação não-bloqueante mantida.

### 2. Lado Beckhoff CX9240 (TwinCAT 3) — ✅ CONCLUÍDO
- [x] **Ambiente:** Comissionado em Beckhoff CX9240 com RT Linux (ARM64).
- [x] **TF6701 (IoT Communication):** Assinatura dos tópicos `dataflow/estoque` e `dataflow/eventos` com QoS 1 e reconexão automática.
- [x] **TF6420 (Database Server):** Escrita SQL Expert Mode (`FB_DfiSqlBuilder` + `FB_DBRecordInsert`).
- [x] **Banco Local SQLite:** Arquivo `/var/lib/dfi/historian.db` com modo WAL ativado (`PRAGMA journal_mode = WAL;`).
- [x] **Tabelas Criadas e Indexadas:**
  - `estoque_hist`: armazena `estoque_a`, `estoque_b`, `estoque_c`, `origem` ('mudanca' | 'periodico'), `ts_plc`, `ts_db`.
  - `eventos_hist`: armazena `evento`, `peca`, `detalhe`, `payload_raw`, `ts_plc`, `ts_db`.
- [x] **Configuração Segura:** Parâmetros de rede/broker desacoplados em `/etc/dfi/historian.conf` (`chmod 600`).
- [x] **Validação E2E com Simulador:**
  1. Simulador enviou alterações de estoque via MQTT.
  2. CX9240 processou o JSON e persistiu com sucesso no SQLite.
  3. Consultas `sqlite3 /var/lib/dfi/historian.db "SELECT * FROM estoque_hist ORDER BY id DESC LIMIT 10;"` comprovaram a integridade dos dados.

---

## 💬 Comentário para colar no Card do GitHub Projects

```markdown
### ✅ Conclusão e Validação da Integração CX9240 (Historiador MQTT → SQLite)

**Data da Validação:** 15/09/2026  
**Ambiente:** Beckhoff CX9240 (RT Linux ARM64) · TwinCAT 3 (v3.1.4024+)  
**Repositório do PLC:** `TwinCAT/Banco-de-Dados/CX9240_DataFlowInventory`

#### 🛠️ O que foi implementado e validado:
1. **Arquitetura de Dados:**
   - Adotado **SQLite local** (`/var/lib/dfi/historian.db`) em modo WAL (`PRAGMA journal_mode = WAL;`) para máxima resiliência e independência de rede no RT Linux.
   - Tabelas criadas e indexadas: `estoque_hist` (amostragem periódica e por mudança) e `eventos_hist` (logs operacionais e alarmes).
2. **TwinCAT 3 Functions:**
   - `TF6701 (IoT Communication)`: Assinatura dos tópicos `dataflow/estoque` e `dataflow/eventos` com QoS 1 e reconexão automática.
   - `TF6420 (Database Server)`: Escrita transacional via SQL Expert Mode (`FB_DfiSqlBuilder` + `FB_DBRecordInsert`).
3. **Teste de Integração End-to-End com Simulador:**
   - Simulador `DataFlowInventory` executado com `MQTT_PUBLISH=true`.
   - Mensagens de alteração de estoque recebidas pelo CX9240 e persistidas com sucesso no banco de dados SQLite.
   - Verificação de integridade realizada via `sqlite3` confirmando valores de `estoque_a`, `estoque_b`, `estoque_c` e timestamps sincronizados.

**Status:** Concluído e Documentado (`docs/INTEGRATION_GUIDE.md` e `docs/ARCHITECTURE.md`).
```
