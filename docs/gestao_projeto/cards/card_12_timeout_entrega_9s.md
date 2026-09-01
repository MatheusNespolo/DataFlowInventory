## 🎯 Objetivo

Calibrar o tempo-limite de entrega da peça com base na dinâmica real da esteira A física, eliminando timeouts falsos sem mascarar travamentos mecânicos legítimos, e garantir recuperação da FSM sem reinicialização da placa.

## ✅ Status

| Campo | Valor |
|---|---|
| **Coluna** | `Done` |
| **Data de validação** | **28/08/2026** |
| **Área** | `Firmware-Uno` |
| **Bloco de teste** | `B1`, `T4` |
| **Prioridade** | `P0-Crítico` |

## 🐛 Problema original

O valor inicial de `TIMEOUT_ENTREGA` era **8 s** e disparava erro antes de a peça completar o percurso. Em 25/08 foi elevado provisoriamente para **12 s**, o que resolveu o falso positivo mas tornou a detecção de travamento real lenta demais e sem lastro em medição.

## 🛠 Solução aplicada

1. `TIMEOUT_ENTREGA` recalibrado para **9000 ms**.
2. Introdução de `TEMPO_SAIDA_ESTEIRA_MS = 3000` — fase explícita de escoamento após o acionamento do sensor de junção, garantindo que a peça saia efetivamente da esteira secundária.
3. Valores replicados no sketch de teste `test/esteira_peca_b/arduino_esteiras_ab/arduino_esteiras_ab.ino`, mantendo paridade entre bancada de teste e firmware de produção.

## 📐 Medições de bancada — esteira A física

| Fase | Tempo medido |
|---|---|
| Partida → sensor de junção J1 | ~5 s |
| Escoamento para a esteira principal (`TEMPO_SAIDA_ESTEIRA_MS`) | 3 s |
| **Total do ciclo** | **~8 s** |
| **Timeout configurado** | **9 s** — margem de segurança de 1 s |

## ✔️ Critérios de aceite — todos validados em 28/08/2026

- [x] Ciclo normal de entrega da peça A conclui sem disparar timeout falso.
- [x] Peça retida artificialmente → FSM transiciona para `ERRO` aos 9000 ms e desliga os motores.
- [x] Estado de erro sinalizado no LCD e propagado ao Dashboard.
- [x] `CMD:RESET` restaura a FSM para `IDLE` sem reinicialização física da placa.
- [x] Casamento por prefixo de `CMD:RESET` funciona mesmo com resíduo no buffer serial.
- [x] Resultado transferido para o Registro de Resultados do `plano_de_testes.md`.

## 📄 Evidências

- Commits `b5727ad`, `ac02d13`
- `arduino/data_flow_inventory/data_flow_inventory.ino`
- `test/esteira_peca_b/arduino_esteiras_ab/arduino_esteiras_ab.ino`
- `docs/testes/roteiros/roteiro_teste_2026-09-01.md` — seção 1 (firmware vigente)
- `docs/testes/plano_de_testes.md` — Observações 27–28/08
- `docs/gestao_projeto/board_github_projects.md` — seção 3
