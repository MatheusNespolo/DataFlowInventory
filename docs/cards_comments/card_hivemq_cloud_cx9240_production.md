# Card: Migração HiveMQ Cloud (TLS/8883) e Integração CX9240 em Produção

**Template:** B (Registro de bancada) / Conclusão — **Status:** ✅ **CONCLUÍDO e VALIDADO em 19/09/2026**

---

## 🎯 Objetivo

Concluir a migração da infraestrutura MQTT do broker local para o HiveMQ Cloud (TLS/8883), integrando o PC industrial Beckhoff CX9240 (TwinCAT 3 + SQLite) com o fluxo de hardware real (Arduino Uno + ESP32 + Esteiras) e o backend Node.js.

## 📄 Referências

- **Plano de Testes:** `docs/testes/plano_de_testes.md` (Teste 6 e Cards #15–17, #21, #22)
- **Roteiro da Semana:** `docs/testes/roteiros/semana_05_15-19_setembro.md` (Bloco 2 e Resultados)
- **Notas de Integração:** `docs/2026-09-19-hivemq-cx9240-integration-notes.md`
- **Guia de Integração:** `docs/INTEGRATION_GUIDE.md`

---

## 💬 Comentário 1: Card #17 — HiveMQ Cloud (E2E Remoto)

```markdown
## 🧪 Rodada de Bancada — 19/09/2026 (Card #17)

**Roteiro:** `docs/testes/roteiros/semana_05_15-19_setembro.md` §4 (Bloco 2)  
**Ambiente:** HiveMQ Cloud (`s1.eu.hivemq.cloud:8883` com TLS) · Wi-Fi 2,4 GHz · Node v22+  
**Firmware vigente:** `431825d` / `gateway_mqtt.ino` (USE_TLS=true)

| Etapa | Resultado | Medição / Observação |
|---|---|---|
| Handshake TLS Broker (8883) | ✅ | Conectado com sucesso no ESP32 e no Node.js |
| Correção Credenciais `.env` | ✅ | Ajustado `MQTT_USER`/`MQTT_PASS` para `MQTT_USERNAME`/`MQTT_PASSWORD` |
| Sincronização Retained (`dataflow/status`) | ✅ | Status `online` sincronizado corretamente no dashboard |
| Ciclo End-to-End Remoto (Dashboard ↔ Hardware) | ✅ | Pedido acionado no Dashboard executado pelas esteiras físicas |

### 📌 Conclusão
- **Aprovado:** Conexão remota segura via TLS (porta 8883) homologada para toda a cadeia de hardware e backend.
- **Card movido para:** `Done` ✅
```

---

## 💬 Comentário 2: Card #21 — Beckhoff CX9240: Historiador em Produção (Broker Remoto)

```markdown
## 🧪 Rodada de Bancada — 19/09/2026 (Card #21)

**Roteiro:** `docs/testes/roteiros/semana_05_15-19_setembro.md` §10  
**Ambiente:** Beckhoff CX9240 (RT Linux ARM64) · TwinCAT 3 (TF6701 + TF6420) · HiveMQ Cloud TLS  
**Banco:** SQLite local (`/var/lib/dfi/historian.db`, modo WAL)

| Etapa | Resultado | Medição / Observação |
|---|---|---|
| TF6701 Assinatura HiveMQ | ✅ | Conexão TLS mantida em `dataflow/estoque` e `dataflow/eventos` |
| Ingestão de Dados do Hardware Real | ✅ | Eventos de passagem nas esteiras reais capturados pelo PLC |
| Persistência em SQLite | ✅ | Registros confirmados em `estoque_hist` e `eventos_hist` |

### 📌 Conclusão
- **Aprovado:** O nó historiador industrial CX9240 saiu do modo simulador e agora opera integrado ao sistema físico real através de broker em nuvem, garantindo histórico com timestamp preciso e modo WAL ativo.
- **Card movido para:** `Done` ✅
```

---

## 💬 Comentário 3: Card #22 — Descoberta de Rede: Compartilhamento de Conexão (ICS)

```markdown
## ℹ️ Registro Técnico de Infraestrutura — 19/09/2026 (Card #22)

**Ambiente:** Windows 10/11 Host + Beckhoff CX9240 via cabo Ethernet direto (ponto-a-ponto)

### 📌 Diagnóstico e Resolução
1. **Problema:** O CX9240 em conexão direta Ethernet com o PC não possuía rota padrão (gateway) nem DNS para resolver e acessar o cluster HiveMQ Cloud na internet.
2. **Solução Adotada:**
   - Ativação do **Internet Connection Sharing (ICS)** no adaptador Wi-Fi do Windows, compartilhando o acesso com a interface Ethernet do CLP.
   - Configuração de DNS público (`8.8.8.8`) e sincronização de relógio (NTP) no CX9240 para validação de certificados TLS.
   - Liberação da porta de saída TCP 8883 no firewall.
3. **Ponto de Atenção:** Durante a configuração inicial do ICS, o IP da interface Ethernet foi alterado pelo Windows para a faixa `192.168.137.x`, exigindo conferência de rotas para evitar conflito com a sub-rede Wi-Fi local.
```
