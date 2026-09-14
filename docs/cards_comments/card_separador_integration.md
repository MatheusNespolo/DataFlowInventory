# Card: Integração Separador (Roda de Separação — 3 Compartimentos)

**Template:** A (Definition of Done)

---

## 🎯 Objetivo

Integrar motor de passo 28BYJ-48 + driver ULN2003 à FSM do Arduino, permitindo separação automática de peças A, B, C em 3 compartimentos ao final da esteira principal — completando o protótipo físico conforme especificação inicial.

## 📄 Referências

- **Hardware:** Motor 28BYJ-48 (STEPS_PER_REV=2048), Driver ULN2003, Pinos Arduino 5-8
- **Código comentado:** `arduino/data_flow_inventory/data_flow_inventory.ino` (linhas 62–79, 205–234)
- **Status atual:** Teste 5 (3 esteiras A+B+C) ✅ concluído; separador ainda não testado
- **Documentação:** `docs/INTEGRATION_GUIDE.md` §2 — passo a passo de integração
- **FSM:** adicionar nova etapa **SEPARANDO** (ou sub-etapa de `ENTREGANDO_PECA`)
- **Testes:** `docs/testes/plano_de_testes.md` — novo Teste T7 (Separador)
- **Roteiro:** `docs/testes/roteiros/semana_05_15-19_setembro.md` §3 (Bloco 3)

## ✅ Critério de Aceite

### Hardware
- [ ] Motor 28BYJ-48 + ULN2003 montados fisicamente
- [ ] Soldagem validada (multímetro: sem curtos, continuidade OK)
- [ ] Alimentação 5V estável (medida com multímetro)
- [ ] Roda com 3 compartimentos montada mecanicamente
- [ ] Posições 0° (A), 120° (B), 240° (C) marcadas fisicamente

### Firmware
- [ ] Código descomentado e compilado sem erros:
  - `#include <Stepper.h>` (linha ~67)
  - Pinos e constantes (linhas ~68–79)
  - Funções `moverSeparador()` e `resetarSeparador()` (linhas ~215–234)
  - Inicialização `motorSeparador.setSpeed(SEPARADOR_RPM)` no `setup()` (linha ~440)
- [ ] Integração na FSM: chamada a `moverSeparador(peca)` após decrementar estoque
- [ ] Upload no Arduino Uno sem erros
- [ ] Monitor Serial (9600) confirma estado "SEPARANDO" publicado via JSON

### Testes em Bancada (Plano de Testes — Teste T7)
- [ ] **T7.1 — Verificação elétrica:** ULN2003 sem curtos, tensão 5V estável
- [ ] **T7.2 — Comando A:** `CMD:PECA:A` → motor gira ~0° (compartimento A)
- [ ] **T7.3 — Comando B:** `CMD:PECA:B` → motor gira ~120° (compartimento B)
- [ ] **T7.4 — Comando C:** `CMD:PECA:C` → motor gira ~240° (compartimento C)
- [ ] **T7.5 — Stress test:** 10 ciclos consecutivos (A → B → C) sem travamento
- [ ] **T7.6 — Dashboard E2E:** Solicitar A, B, C alternadamente → separador acompanha

### Documentação
- [ ] `docs/testes/plano_de_testes.md` atualizado com Teste T7 completo
- [ ] `docs/CHANGELOG.md` registra integração do separador (Sprint 5)
- [ ] `README.md` §5 (Próximos Passos) atualizado — separador **concluído** ✅
- [ ] `docs/ARCHITECTURE.md` §9.2 atualizado (status: ✅ Implementado)
- [ ] Roteiro `semana_05_15-19_setembro.md` Bloco 3 preenchido com resultados

## 🔗 Dependências

- **Bloqueado por:** Montagem mecânica + soldagem do ULN2003 (hardware chegou na semana 4)
- **Bloqueia:** Validação final do protótipo (Teste 5+7 integrados)
- **Relacionado:** Card #CI/CD (ambos parte da Sprint 5)

## 📋 Checklist de Execução

### Fase 1 — Montagem Hardware (Semana 5, Dia 1)
- [ ] Soldar pinos no ULN2003 (se necessário)
- [ ] Conectar motor 28BYJ-48 ao ULN2003 (4 fios, ordem correta)
- [ ] Ligar pinos ULN2003 ao Arduino: IN1→5, IN2→6, IN3→7, IN4→8
- [ ] Alimentar ULN2003: 5V (lógica) + 5-12V (motor)
- [ ] Verificar com multímetro: sem curtos, tensão OK
- [ ] Montar roda com compartimentos A/B/C (marcação física 0°/120°/240°)

### Fase 2 — Firmware (Semana 5, Dia 2)
- [ ] Descomentarincludes em `data_flow_inventory.ino`:
  - `#include <Stepper.h>`
  - Pinos 5-8
  - Constantes `STEPS_PER_REV`, `SEPARADOR_RPM`
  - Objeto `motorSeparador`
  - Funções `moverSeparador()`, `resetarSeparador()`
- [ ] Adicionar inicialização no `setup()`: `motorSeparador.setSpeed(...)`
- [ ] Integrar na FSM (estado ENTREGANDO_PECA): chamada a `moverSeparador(peca)`
- [ ] Compilar (Arduino IDE → Verify)
- [ ] Upload (Arduino IDE → Upload — **ESP32 desconectado de 0/1**)

### Fase 3 — Testes (Semana 5, Dia 3)
- [ ] **Pré-voo:** `start_services.bat` + broker local ativo
- [ ] Executar T7.1 (validação elétrica)
- [ ] Executar T7.2–T7.4 (comandos individuais via Serial)
- [ ] Executar T7.5 (stress test — 10 ciclos)
- [ ] Executar T7.6 (E2E via Dashboard)
- [ ] Anotar latências, posições reais, ajustes necessários
- [ ] Preencher tabela de resultados em `semana_05_15-19_setembro.md` Bloco 3

### Fase 4 — Documentação (Semana 5, Dia 4)
- [ ] Atualizar `plano_de_testes.md` (novo Teste T7 + resultados)
- [ ] Atualizar `CHANGELOG.md` (entrada Sprint 5 — Separador)
- [ ] Atualizar `README.md` (Próximos Passos — marcar separador como ✅)
- [ ] Atualizar `ARCHITECTURE.md` (status: Implementado)
- [ ] Mover card para `Done` no GitHub Projects

## 🗓️ Estimativa

- **Tempo:** 6–8h (montagem 2h + firmware 1h + testes 3h + docs 2h)
- **Prioridade:** **P1** (bloqueante para conclusão do protótipo)
- **Data validação:** 15–19/09/2026 (Semana 5, Bloco 3)
- **Evidência:** SHA do commit + vídeo/fotos do separador em ação + tabela de resultados

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Motor não gira (soldagem ruim) | Alto | Validação prévia com multímetro (T7.1) |
| Posições imprecisas (mecânica) | Médio | Calibração física das marcações 0°/120°/240° |
| Travamento em ciclos longos | Médio | Stress test T7.5 (10 ciclos) detecta problema cedo |
| Conflito de pinos (ESP32 usa 5-8?) | Alto | **Verificado:** ESP32 usa 16/17 (RX/TX) — pinos 5-8 estão livres ✅ |

---

**Criado em:** 14/09/2026  
**Área:** Hardware + Firmware-Uno  
**Bloco de Teste:** T7 (novo — Separador)  
**Labels:** `area:hardware`, `area:firmware-uno`, `tipo:feature`, `p1-alto`
