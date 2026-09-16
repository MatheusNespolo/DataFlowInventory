# Roteiro de Testes — Semana 5 (15–19/09/2026)

**Objetivo:** verificar integridade de soldagem dos módulos IRF520 (B/C), concluir a subtarefa HiveMQ Cloud (Teste 6 completo), consolidar o diagrama elétrico do protótipo e avançar na spec de persistência DB para integração com Beckhoff CX9240.

> **Data:** 15–19/09/2026
> **Continuação de:** [`semana_04_08-12_setembro.md`](semana_04_08-12_setembro.md)
> **Cards:** #15–17 (HiveMQ — subtarefa), **#novo** (melhoria Beckhoff), #1/#2 (diagrama/montagem)

---

## 1. Herança validada

| Marco | Data | Status |
|-------|------|--------|
| Serial Arduino ↔ ESP32 (divisor 1k/2kΩ + GND) | 25/08 | ✅ |
| Teste 2 — ESP32 → Broker → Node | 25/08 | ✅ |
| Teste 4 — End-to-End Dashboard | 25/08 | ✅ |
| Timeout 9 s + CMD:RESET | 27–28/08 | ✅ #12 |
| Sync estoque LCD ↔ Dashboard | 27–28/08 | ✅ #11 |
| Plano B — Simulador | 25/08 | ✅ #10 |
| Robustez/LWT + Teste 3 puro | 01/09 | ✅ |
| Fix de rejeição de comandos | 03/09 | ✅ |
| Teste 5 — Três Esteiras A+B+C | 08–12/09 | ✅ **CONCLUÍDO** |
| Ajuste mecânico demais esteiras | 08–12/09 | ✅ |
| Comando MQTT Box para peças B/C | 08–12/09 | ✅ |
| Calibração sensores B/C na montagem real | 08–12/09 | ✅ |
| Teste 6 — HiveMQ TLS/8883 (parcial) | 02/09 | ⚠️ Parcial (Bloco 4+5 pendentes) |
| Beckhoff CX9240 — Spec definida | 08–12/09 | ⬜ Spec apenas |

**Contexto da semana:** Teste 5 está completo e validado. O foco desta semana é (1) garantir integridade elétrica dos novos módulos IRF520, (2) fechar a subtarefa HiveMQ Cloud — que depende de resolução de firewall ou ambiente de rede alternativo — e (3) avançar na documentação técnica (diagrama elétrico + spec Beckhoff).

---

## 2. Bloco 0 — Pré-voo

### 2.1 — Infraestrutura

- [✅] `start_services.bat` → Mosquitto + probe + server rodando
- [✅] `mqtt_probe` mostra `online` retained em `dataflow/status`
- [✅] Esteiras A, B e C operando no broker local
- [✅] MQTT Box conectado ao broker local
- [✅] WiFi/credentials confirmados (2,4 GHz)

### 2.2 — Hardware

- [✅] 3 drivers IRF520 alimentados (12 V / 5 V lógico)
- [✅] Fiação UART reconferida (Uno ↔ ESP32, divisor + GND comum)
- [✅] 4 sensores TCRT5000 (topo B, junção J2, topo C, junção J3) reportando na serial
- [✅] Sensores topo A e junção J1 da esteira principal operacionais
---

## 3. Bloco 1 — Verificação de solda dos módulos IRF520 (B/C)

> **Objetivo:** validar que a soldagem dos 2º e 3º módulos IRF520 não introduziu falhas de continuidade, resistência parasita ou instabilidade no sinal PWM. Executar antes de qualquer teste funcional desta semana. (Foi feita soldagem apenas da alimentação nas placas).

### 3.1 — Testes elétricos com multímetro

| Teste | Método | Esperado | Status |
|-------|--------|----------|--------|
| Continuidade VCC motor B | Multímetro modo contínuo entre pinos VCC e GND do IRF520 #2 | Continuidade confirmada | ⬜ |
| Continuidade VCC motor C | Multímetro modo contínuo entre pinos VCC e GND do IRF520 #3 | Continuidade confirmada | ⬜ |
| Curto-circuito VCC/GND B | Multímetro modo contínuo entre VCC e GND sem motor | Sem curto | ⬜ |
| Curto-circuito VCC/GND C | Multímetro modo contínuo entre VCC e GND sem motor | Sem curto | ⬜ |
| Tensão PWM B (ativo) | Multímetro modo DC entre pino PWM IRF520 #2 e GND, motor acionando | ~5 V (HIGH) | ⬜ |
| Tensão PWM C (ativo) | Multímetro modo DC entre pino PWM IRF520 #3 e GND, motor acionando | ~5 V (HIGH) | ⬜ |

### 3.2 — Testes de firmware pós-soldagem

| Teste | Comando / Procedimento | Esperado | Status |
|-------|----------------------|----------|--------|
| Acionamento motor B via serial | Enviar comando `CMD:PECA:B` via serial do Uno | Motor B aciona ciclo completo | ⬜ |
| Acionamento motor C via serial | Enviar comando `CMD:PECA:C` via serial do Uno | Motor C aciona ciclo completo | ⬜ |
| Leitura sensor topo B | Aproximar peça do TCRT5000 topo B | Serial mostra transição de detecção | ⬜ |
| Leitura sensor junção J2 | Aproximar peça do TCRT5000 J2 | Serial mostra transição de detecção | ⬜ |
| Leitura sensor topo C | Aproximar peça do TCRT5000 topo C | Serial mostra transição de detecção | ⬜ |
| Leitura sensor junção J3 | Aproximar peça do TCRT5000 J3 | Serial mostra transição de detecção | ⬜ |
| Calibração `TIMEOUT_ENTREGA` | Observar timing da entrega B/C | Dentro do valor configurado (`____` s) — sem timeout falso | ⬜ |
| Calibração `TEMPO_SAIDA_ESTEIRA_MS` | Observar escoamento pós-junção B/C | Motor para após `____` ms de confirmação | ⬜ |

> **Referências:** `test/esteira_peca_b/` e `test/esteira_peca_c/` — valores de `TIMEOUT_ENTREGA`, `TEMPO_SAIDA_ESTEIRA_MS` e pinagem.

---

## 4. Bloco 2 — Transição HiveMQ Cloud (Teste 6 completo) (não houve avanço na transição Broker Local -> HiveMQ)

> **Prioridade: ALTA.** Só executa se o Bloco 1 estiver aprovado e o problema de firewall/rede for resolvido (ou ambiente alternativo disponível — ex.: rede doméstica, 4G via hotspot).

### 4.1 — Pré-requisito — Verificação de rede

Antes de prosseguir, confirmar:

- [ ] ESP32 consegue resolver DNS de `s1.eu.hivemq.cloud` (teste via monitor serial)
- [ ] Porta 8883 (TLS) não está bloqueada pela rede atual
- [ ] Credenciais HiveMQ Cloud válidas (testar no Web Client do console)
- [ ] Node.js `server/.env` configurado com `MQTT_BROKER_URL=mqtts://s1.eu.hivemq.cloud`

> **Se qualquer item falhar:** reverter para broker local (`USE_TLS=false`) e adiar este bloco para semana futura. Não comprometer a bancada local.

### 4.2 — Bloco 4: Dashboard E2E remoto

- [ ] ESP32 conecta ao HiveMQ Cloud via TLS/8883 (monitor serial: `[MQTT] Conectado!`)
- [ ] Node.js conecta ao HiveMQ Cloud via `mqtts://`
- [ ] Pedido de peça A via Dashboard (remoto) → esteira A aciona ciclo completo
- [ ] Estoque decrementa corretamente entre LCD e Dashboard
- [ ] Mensagens retained (`dataflow/estoque`, `dataflow/status`) sincronizam ao reconectar
- [ ] **Medir latência:** tempo entre clique no Dashboard e acionamento do motor (registrar `____` ms)

### 4.3 — Bloco 5: LWT e reconexão remota

- [ ] **5.1 — LWT gateway offline/online:** desconectar fisicamente o ESP32 → badge vermelho no Dashboard (remoto); religar → badge verde restaurado
- [ ] **5.2 — Wi-Fi não-bloqueante:** interromper WiFi por 5 s → reconexão automática sem travamento da FSM
- [ ] **5.3 — Reinício Node.js:** matar e reiniciar `node server.js` → conexão com HiveMQ restaurada, retained intacto

### 4.4 — Reversão

> **Obrigatória ao final do teste:**
> 1. `USE_TLS=false` no `secrets.h` + reupload para ESP32
> 2. `server/.env` → `MQTT_BROKER_URL=mqtt://127.0.0.1`
> 3. Reiniciar `start_services.bat`
> 4. Confirmar operação local: `mqtt_probe` → `online` retained

### 4.5 — Registro

| Métrica | Valor |
|---------|-------|
| Latência local × nuvem | `____` ms |
| Tempo de reconexão WiFi | `____` s |
| Status LWT remoto | ⬜ Aprovado / ⬜ Reprovado |
| Cards | #15 ✅, #16 ✅, #17 ⬜ |
---

## 5. Bloco 3 — Diagrama/esquema elétrico consolidado

> **Objetivo:** produzir um diagrama unificado do protótipo com as 3 esteiras + gateway ESP32, servindo como referência para manutenção e apresentação.

### 5.1 — Escopo do diagrama

- [ ] Arduino Uno + pinagem de todos os sensores (4 × TCRT5000) e drivers (3 × IRF520)
- [ ] ESP32 gateway + divisor de tensão UART (1k/2kΩ)
- [ ] Alimentação: fonte 12 V → reguladores para 5 V lógico / 12 V motores
- [ ] LCD 16x2 I2C (endereço 0x27)
- [ ] Notas de corrente máxima por driver, queda de tensão, referências de pino

### 5.2 — Entregáveis

- [ ] Esquemático em formato Markdown ou imagem (`docs/diagramas/`)
- [ ] Tabela de pinagem consolidada (Uno → componente → pino)
- [ ] Referências ao sketch correspondente para cada bloco de teste

---

## 6. Bloco 4 — Persistência DB (spec Beckhoff CX9240)

> **Objetivo:** avançar na especificação do contrato de integração com o PC industrial Beckhoff CX9240, sem implementar código Beckhoff nem persistência em banco. Esta semana: documentar e validar o contrato de tópico/payload.
>
> **Atualização:** escopo avançou além do previsto — o simulador agora publica de fato no broker MQTT (modo opcional `MQTT_PUBLISH=true`), validado localmente contra Mosquitto. O código/persistência do **lado Beckhoff** continua fora do escopo (outro agente).

### 6.1 — Documentação do contrato

- [x] Publicar tópico e payload da integração Beckhoff em `arquitetura_mqtt.md` (seção "Integração Beckhoff CX9240")
- [x] Simulador ganhou modo `MQTT_PUBLISH=true` (dependência `mqtt@^5.10.0` em `simulator/package.json`)
- [ ] Confirmar se o payload `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}` é aceitável para o agente do Beckhoff (pendente de validação cruzada)

### 6.2 — Validação do contrato (implementada e testada localmente)

- [x] Simulador publica em `dataflow/estoque` via `mqtt.js` (retained, QoS 1) — testado com `MQTT_PUBLISH=true npm start`
- [x] Confirmado via `mosquitto_sub -t dataflow/estoque -C 1` que a mensagem chega retained: `{"type":"estoque","pecaA":5,"pecaB":5,"pecaC":5}`
- [ ] Validação com subscriber real do Beckhoff (aguarda ambiente/agente)

### 6.3 — Escopo NESTA semana

- [x] Implementado no simulador: publicação MQTT opcional, não-bloqueante, desativada por padrão
- [ ] **Não** implementar persistência DB (fica para o lado Beckhoff)
- [ ] **Não** implementar código para o Beckhoff CX9240
- [ ] Esboçar card de melhoria (Template A) com critério de aceite para bancada própria — atualizar critério de aceite já que a publicação MQTT do simulador está pronta

> **Dependência externa:** alinhar tópicos/formato com o agente do Beckhoff antes de avançar para a bancada própria. Lado simulador já não é mais bloqueante.

---

## 7. Bloco 5 — Validação dos Scripts de Setup e Automação (15/09/2026)

> **Objetivo:** testar e validar os novos scripts criados na Sprint 5 (`scripts/setup.sh` / `setup.ps1`, `scripts/validate-env.sh` / `validate-env.ps1`, `scripts/precommit-checks.sh` / `precommit-checks.ps1` e `.github/workflows/lint-and-security.yaml`) em ambiente limpo, garantindo que o onboarding automatizado e a detecção de segredos funcionam sem falhas antes de formalizar o processo de CI/CD.

### 7.1 — Itens de Validação dos Scripts

| # | Script / Teste | Procedimento | Esperado | Status |
|---|----------------|--------------|----------|--------|
| **S1** | `scripts/setup.sh` / `setup.ps1` em ambiente limpo | Executar `bash scripts/setup.sh` ou `.\scripts\setup.ps1` em diretório de teste | Detecta Node/npm/Git, instala deps em `server/`, `simulator/`, `test/mqtt_probe/`, cria `.env`/`secrets.h` a partir dos `.example` | ✅ |
| **S2** | `scripts/validate-env.sh` / `validate-env.ps1` (caso positivo) | Executar `bash scripts/validate-env.sh` ou `.\scripts\validate-env.ps1` com repo limpo | Retorna código 0 ("Nenhum arquivo sensível em staging") | ✅ |
| **S3** | `scripts/validate-env.sh` / `validate-env.ps1` (caso negativo) | Forçar `git add server/.env` (em branch de teste) e rodar o script | Detecta o arquivo sensível e retorna erro (código > 0) | ✅ |
| **S4** | `scripts/precommit-checks.sh` / `precommit-checks.ps1` | Instalar como hook (`cp scripts/precommit-checks.sh .git/hooks/pre-commit`) ou rodar `.\scripts\precommit-checks.ps1` e tentar commit de teste | Valida segredos + sintaxe JS com `node --check` | ✅ |
| **S5** | `simulator/.env.example` | Copiar para `simulator/.env` e rodar `MQTT_PUBLISH=true npm start` | Simulador lê as variáveis do `.env` e conecta ao broker | ✅ |
| **S6** | Workflow CI local (simulação) | Rodar `node --check server/server.js` e `node --check simulator/server.js` | Sintaxe 100% válida em todos os arquivos | ✅ |

### 7.2 — Critérios de Sucesso do Bloco 5
- [✅] Todos os itens S1 a S6 retornam resultado esperado
- [✅] Nenhum falso-positivo de detecção de segredos em arquivos `.example`
- [✅] Scripts documentados e com suporte tanto a Bash (Linux/macOS/CI) quanto a PowerShell (Windows)

---

## 8. Plano B — Simulador

```bash
start_services.bat
cd simulator && npm start
# Dashboard → validar fix, multi-esteira virtual e cenários de rejeição sem hardware
```

> Usar como fallback se a integração HiveMQ apresentar problema de rede durante a semana.

---

## 8. Resultados

| Etapa | Resultado | Observações |
|-------|-----------|-------------|
| 0 — Pré-voo | ⬜ | IP: `____` |
| 1 — Verificação solda IRF520 (B/C) | ⬜ | Todos os testes elétricos e firmware aprovados? |
| 2 — HiveMQ Cloud (Teste 6 completo) | ⬜ | Latência: `____` ms · LWT remoto: `____` |
| 3 — Diagrama elétrico consolidado | ⬜ | Publicado em `docs/diagramas/`? |
| 4 — Spec Beckhoff (contrato) | ✅ | Contrato publicado em `arquitetura_mqtt.md`; simulador publica MQTT (retained, QoS 1) testado localmente. Validação com CX9240 real pendente (fora do escopo do simulador). |
| Plano B | — | Se usado |

---

## 9. Documentação

- [ ] `CHANGELOG.md` — entrada da semana 5 (soldagem verificada, HiveMQ Cloud, diagrama)
- [ ] `plano_de_testes.md` — registro de resultados 15–19/09; atualizar Teste 6 se concluído
- [ ] `board_github_projects.md` — mover #17 para Done (se HiveMQ completo); Beckhoff card em Backlog
- [ ] `arquitetura_mqtt.md` — contrato de tópico/payload Beckhoff
