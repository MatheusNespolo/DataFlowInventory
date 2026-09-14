# Card: Integração CX9240 (Beckhoff): Persistência MQTT → Banco de Dados

**Template:** A (Definition of Done) — **Card JÁ CRIADO**, comentários abaixo para adicionar

---

## 🎯 Objetivo

Validar contrato de tópico/payload com PC industrial Beckhoff CX9240 para persistência de estoque em banco de dados (MySQL/MariaDB/PostgreSQL), conforme especificação documentada em Sprint 4.

## 📄 Referências

- **Spec inicial:** `docs/testes/roteiros/semana_04_08-12_setembro.md` §7
- **Contrato:** `docs/ARCHITECTURE.md` §9.1 — tópico, payload, QoS, retained
- **Código simulador:** `simulator/server.js` (linhas 58–100) — publicação MQTT opcional
- **Payload:** `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}` (retained, QoS 1)
- **Modo Beckhoff:** `MQTT_PUBLISH=true npm start` ou `npm run start:mqtt`
- **Documentação:** `docs/INTEGRATION_GUIDE.md` §1 — passo a passo completo

## ✅ Critério de Aceite

### Lado Simulador — ✅ CONCLUÍDO em 15/09/2026

- [x] **Simulador publica em `dataflow/estoque`** (retained, QoS 1)
  - Commit: `b1bee14` + `17a51be`
  - Dependência `mqtt@^5.10.0` adicionada ao `simulator/package.json`
  - Modo configurável: `MQTT_PUBLISH=true` (padrão: `false`)
  - Script npm: `npm run start:mqtt`
  - Publica a cada mudança de estoque **e** imediatamente ao conectar
- [x] **Testado localmente com Mosquitto**
  - Validação: `mosquitto_sub -t dataflow/estoque -C 1`
  - Mensagem confirmada retained: `{"type":"estoque","pecaA":5,"pecaB":5,"pecaC":5}`
  - Ver `semana_05_15-19_setembro.md` §6 (Bloco 4)
- [x] **Modo não-bloqueante**
  - Falhas de conexão MQTT não afetam funcionamento offline via Socket.IO
  - Simulador continua operando localmente mesmo sem broker acessível
- [x] **Documentação atualizada**
  - `simulator/README.md` — seção "Modo Beckhoff" ✅
  - `docs/ARCHITECTURE.md` §9.1 — contrato ✅
  - `docs/INTEGRATION_GUIDE.md` §1 — passo a passo ✅
  - `simulator/.env.example` criado com variáveis MQTT ✅

### Lado Beckhoff CX9240 — ⏳ PENDENTE (Outro Agente)

- [ ] **Bancada de testes própria** (separada da esteira A principal)
- [ ] **Subscriber MQTT implementado** no TwinCAT 3 (biblioteca Beckhoff MQTT Client)
- [ ] **Parser JSON** validado: extrai `pecaA`, `pecaB`, `pecaC` corretamente
- [ ] **Tabela DB criada** — schema sugerido:
  ```sql
  CREATE TABLE dataflow_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    peca_a INT NOT NULL,
    peca_b INT NOT NULL,
    peca_c INT NOT NULL,
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **INSERT em banco validado** — cada mensagem MQTT gera registro no DB
- [ ] **Validação cruzada de contrato** com agente Beckhoff:
  - Tópico: `dataflow/estoque` ✅ acordado
  - Payload: `{type, pecaA, pecaB, pecaC}` ✅ acordado
  - QoS: 1 ✅ acordado
  - Retained: sim ✅ acordado
- [ ] **Teste E2E completo:**
  1. Simulador publica estoque → broker (Mosquitto ou HiveMQ)
  2. CX9240 recebe via MQTT
  3. CX9240 grava no banco
  4. Query no banco confirma dados corretos

## 🔗 Dependências

- **Desbloqueado por:** CI/CD ativo ✅ + documentação centralizada (ARCHITECTURE.md) ✅
- **Bloqueado por:** Disponibilidade do agente Beckhoff para bancada própria
- **Relacionado:** Card #CI/CD, Card #Separador (Sprint 5)
- **Não bloqueia:** Nenhum card crítico — funcionalidade é **melhoria futura**

## 📋 Checklist de Execução (Lado Beckhoff — Próximos Steps)

### Fase 1 — Preparação (Agente Beckhoff)
- [ ] Ler `docs/INTEGRATION_GUIDE.md` §1 completo
- [ ] Configurar ambiente de teste: PC Beckhoff + broker Mosquitto (ou usar HiveMQ Cloud)
- [ ] Instalar biblioteca MQTT no TwinCAT 3 (ex.: `Tc3_IotBase`)

### Fase 2 — Implementação
- [ ] Criar programa TwinCAT 3:
  - Subscriber para `dataflow/estoque` (QoS 1)
  - Parser JSON (extrair `pecaA`, `pecaB`, `pecaC`)
  - Conexão com banco de dados (MySQL/MariaDB)
  - INSERT a cada mensagem recebida
  - Tratamento de reconexão MQTT
- [ ] Compilar e fazer upload no CX9240

### Fase 3 — Validação com Simulador
- [ ] Terminal 1: subir broker Mosquitto (ou usar HiveMQ Cloud)
- [ ] Terminal 2: rodar simulador modo MQTT (`MQTT_PUBLISH=true npm start`)
- [ ] Terminal 3: rodar programa CX9240
- [ ] Solicitar peças no dashboard → estoque muda → CX9240 recebe → banco atualiza
- [ ] Query no banco: `SELECT * FROM dataflow_estoque ORDER BY id DESC LIMIT 10;`
- [ ] Validar timestamps, valores corretos

### Fase 4 — Teste com Arduino Real (Opcional)
- [ ] Substituir simulador por Arduino real + ESP32
- [ ] Repetir ciclo: solicitar peça → entrega → estoque decrementa → CX9240 grava
- [ ] Confirmar sincronismo: estoque LCD = Dashboard = Banco

### Fase 5 — Documentação Final
- [ ] Registrar resultados em `plano_de_testes.md` (novo Teste T8 — Beckhoff DB)
- [ ] Atualizar `CHANGELOG.md` (Beckhoff integração concluída)
- [ ] Atualizar `ARCHITECTURE.md` §9.1 (status: ✅ Implementado)
- [ ] Mover card para `Done`

## 🗓️ Estimativa

- **Lado Simulador:** ✅ Concluído (2h — 15/09/2026)
- **Lado Beckhoff:** ⏳ Estimado 6–8h (implementação TwinCAT + DB + testes)
- **Prioridade:** **P2** (melhoria futura, não bloqueia protótipo principal)
- **Data validação:** TBD (aguarda agente Beckhoff + bancada própria)
- **Evidência:** SHA do commit simulador (17a51be) + foto/vídeo do banco populado (futuro)

## ⚠️ Observações

- **Lado do simulador está 100% pronto e testado localmente.** Não há mais trabalho pendente nesta parte.
- **Lado do Beckhoff** depende de outro agente e bancada separada (não interferir com testes da esteira A).
- **Contrato MQTT está validado e documentado.** Qualquer mudança deve ser acordada entre os dois agentes e refletida em `docs/ARCHITECTURE.md`.
- **Persistência em banco** é **melhoria futura** — o protótipo principal (esteiras + separador) funciona independentemente desta integração.

---

**Atualizado em:** 14/09/2026 · Sprint 5  
**Área:** Backend + Beckhoff (externo)  
**Bloco de Teste:** T8 (futuro — Beckhoff DB)  
**Labels:** `area:backend`, `tipo:feature`, `stretch:beckhoff`, `p2-medio`
