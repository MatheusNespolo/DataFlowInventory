# Firmware Arduino Uno v3.0 — Supervisão por marcos e robustez — Design

Data: 03/10/2026 · Branch: `feat/firmware-uno-v3` · Base: `fddde08` (PR #42) · Idioma: português do Brasil.

## 1. Objetivo

Tornar o firmware do Arduino Uno (`arduino/data_flow_inventory/`) robusto como produto e resolver os problemas observados em bancada em 02–03/10/2026, **sem mudar a conexão com o ESP32 nem com o servidor**.

Problemas de bancada que este design precisa resolver ou tornar diagnosticáveis:

| # | Observado | Causa provável |
|---|---|---|
| P1 | Esteira B entregou a peça, mas o estoque não foi debitado | o sensor de junção J2 não registrou a passagem (sempre em LOW/HIGH, mal calibrado) ou o pulso foi perdido; o firmware terminou em `timeout` sem débito |
| P2 | Esteira C mal move a peça e dá timeout | PWM baixo, atrito estático, motor travando; o motor ficava 12,5 s puxando corrente de rotor bloqueado |
| P3 | Uno travou / reiniciou junto com a Serial Monitor | queda ou ruído de alimentação com o motor travado (hardware) e/ou auto-reset ao abrir a Serial Monitor (DTR) |
| P4 | Estoque voltou a 15 sem aviso | reset do Uno; o estoque não é persistido |
| P5 | LCD apagado | hardware (alimentação/fiação/módulo); o firmware não pode travar por causa dele |

## 2. Decisões tomadas com a equipe

| # | Decisão |
|---|---|
| D1 | Escopo de **robustez de produto** (reestruturar o firmware), não só remendos. |
| D2 | **Não mexer na conexão com o ESP32 nem com o servidor.** As mensagens JSON atuais continuam idênticas; só entram **campos opcionais novos** e **novos valores de `tipo`** em eventos de erro. Os comandos aceitos continuam `CMD:PECA:X` e `CMD:RESET`. |
| D3 | **Estoque não é persistido**: volta a `ESTOQUE_INICIAL` (15) no boot, mas o evento `inicio` informa a causa do reset. |
| D4 | **Uma peça por vez** sobre o sensor de topo: o topo serve de indicador de avanço. |
| D5 | Falha de entrega supervisionada **por marcos** (partida → trânsito → saída), com prazos por esteira. |
| D6 | **Arquitetura modular (abordagem A)**: lógica pura testável no PC + camada de hardware fina. |
| D7 | **Débito na confirmação da junção** (momento mostrado no fluxograma oficial), seguido de 3 s de saída. |
| D8 | Sem nova tentativa automática após falha: o operador confere e envia RESET. |

Fora do escopo: ESP32, servidor, dashboard, persistência em EEPROM, mudança de pinos, separador (motor de passo).

## 3. Arquitetura

### 3.1 Arquivos

```
arduino/data_flow_inventory/
├── data_flow_inventory.ino     # fino: setup() e loop() chamam os módulos
├── config.h                    # pinos, parâmetros por esteira, constantes
└── src/
    ├── logica/                 # C++ puro, SEM Arduino.h → testável no PC
    │   ├── filtro_entrada.h/.cpp     # debounce por tempo + bordas
    │   ├── supervisor_entrega.h/.cpp # marcos M1/M2/M3
    │   └── fsm.h/.cpp                # 5 estados, comandos, estoque, saídas
    └── hw/                     # depende do Arduino
        ├── motores.h/.cpp      # kick-start, PWM de regime, parada segura
        ├── sensores.h/.cpp     # amostragem dos 6 TCRT5000 + captura de bordas da junção por PCINT
        ├── comunicacao.h/.cpp  # parser de comando (char[]) + publicação JSON
        ├── lcd.h/.cpp          # detecção 0x27/0x3F, redesenho só quando muda
        └── diagnostico.h/.cpp  # causa do reset, RAM livre, watchdog
```

A Arduino IDE e o `arduino-cli` compilam recursivamente a pasta `src/` do sketch. Os arquivos de `src/logica/` não incluem `Arduino.h` nem usam tipos do Arduino (só `<stdint.h>`), para compilar também no PC.

### 3.2 Ciclo do `loop()` (não bloqueante)

1. A cada 5 ms: amostrar os sensores e atualizar os filtros.
2. Ler os bytes disponíveis da serial e montar comandos (sem bloquear).
3. Entregar à FSM o tempo atual (`agora_ms`), os sensores filtrados e o comando recebido; a FSM devolve as **saídas** (motor a ligar/parar, eventos a publicar, mudança de LCD).
4. Aplicar as saídas nos motores; em ERRO, a "saída segura" força todos os motores em 0 a cada ciclo.
5. Publicar uma mensagem periódica escalonada (status, estoque, sensores, esteiras: uma a cada 250 ms, cada uma 1x por segundo — comportamento atual).
6. Atualizar o LCD se o conteúdo mudou.
7. `wdt_reset()`.

### 3.3 Memória (2 KB de RAM)

- Nenhuma `String` no caminho normal; buffers fixos (`char` de 32 B para comando; documentos JSON pequenos).
- Textos fixos em flash quando possível (`F()`/`PROGMEM`).
- Orçamento: variáveis globais ≤ **65%** da RAM (hoje 55%), verificado na compilação.
- O código precisa compilar com **ArduinoJson 6** (versão fixada no CI: 6.21.5) **e 7** (instalada na máquina da equipe).

## 4. Supervisão da entrega e regras da FSM

### 4.1 Estados

1. **AGUARDANDO_PEDIDO**: aceita `CMD:PECA:X`. `CMD:RESET` é ignorado.
2. **VERIFICANDO_ESTOQUE** (instantâneo). Em ordem; qualquer falha vai para **ERRO sem ligar o motor** (fase `verificacao`):
   1. contador da peça > 0, senão `sem_estoque`;
   2. sensor de topo ocupado, senão `sem_peca_topo`;
   3. sensor de junção livre, senão `juncao_obstruida`.
3. **ACIONANDO_ESTEIRA**: liga o motor com kick-start; inicia o supervisor.
4. **ENTREGANDO_PECA**: marcos (prazos contados a partir da partida do motor):
   - **M1 Partida** — topo livre (filtrado) em até `prazo_partida_ms` (3000). Falha → `motor_sem_avanco` (fase `partida`), motor parado, **sem débito**.
   - **M2 Trânsito** — borda válida na junção (pulso ≥ `pulso_min_juncao_ms`, 20 ms) em até `timeout_ms` (12500). Falha → `timeout` (fase `transito`), motor parado, **sem débito**; LCD pede para retirar a peça.
   - **Confirmação** — **debita na hora** e publica o evento `entrega` e o estoque.
   - **M3 Saída** — motor ligado por `saida_ms` (3000); no fim, junção livre. Falha → `peca_presa_saida` (fase `saida`), motor parado; o débito **já foi feito** (a peça saiu do estoque).
   - Sucesso: motor parado, pausa de 1500 ms (LCD "Entregue"), volta a AGUARDANDO.
5. **ERRO**: motores sempre em 0; só sai com `CMD:RESET` (volta a AGUARDANDO, limpa o supervisor, republica estado e estoque).

Rejeições que **não** mudam o estado: `ocupado` (pedido fora de AGUARDANDO; `peca` = peça pedida), `peca_invalida`, `comando_desconhecido`. Formato exato dos comandos: `CMD:PECA:` + 1 letra (A/B/C) e `CMD:RESET`.

**Invariante:** o estoque só é decrementado na confirmação válida da junção da esteira da peça pedida.

### 4.2 Captura da junção

- As bordas dos três sensores de junção (J1 = A3/PCINT11, J2 = D2/PCINT18, J3 = D4/PCINT20) são registradas por **interrupção de mudança de pino**: a ISR só anota o instante da mudança, sem lógica. Um pulso curto não se perde mesmo com o loop ocupado (serial, LCD).
- A lógica valida a largura do pulso (≥ 20 ms) e conta as bordas observadas durante a entrega (`bordas_juncao`), usado no diagnóstico.
- Sensores de topo continuam amostrados a cada 5 ms com o mesmo filtro por tempo.

### 4.3 Motores

- Partida com **kick-start**: PWM 255 por `kick_ms` (150 ms) e depois `pwm_regime` da esteira (200).
- Parada imediata em qualquer erro e no fim da saída.
- No `setup()`, os pinos dos motores são os primeiros configurados (saída em 0), antes de qualquer outra inicialização.

### 4.4 Parâmetros por esteira (`config.h`)

| Parâmetro | Padrão (A, B e C) |
|---|---|
| `pwm_regime` | 200 |
| `kick_ms` | 150 |
| `prazo_partida_ms` | 3000 |
| `timeout_ms` | 12500 |
| `saida_ms` | 3000 |
| `pulso_min_juncao_ms` | 20 |

## 5. Diagnóstico e recuperação

### 5.1 Watchdog

- Watchdog de **2 s**, alimentado no fim de cada `loop()`; nenhuma operação do laço bloqueia mais que algumas dezenas de ms (a tela de abertura deixa de usar `delay(2000)`).
- Modo interrupção-e-reset: a ISR do watchdog grava a marca `watchdog` em uma variável `.noinit` antes do reset.
- O watchdog é **desligado logo no início do boot** (seção `.init3`), porque após um reset por watchdog ele continua ativo com o prazo mínimo e reiniciaria o Uno em laço.

### 5.2 Causa do reset

O bootloader do Uno (Optiboot) costuma zerar o `MCUSR` antes do sketch. Combinação usada:

1. `MCUSR` lido no `.init3`, quando ainda vier preenchido (pode indicar `brownout`);
2. assinatura em `.noinit`: ausente → `energia` (RAM apagada); presente → `reinicio` (botão, queda breve, auto-reset ao abrir a porta serial);
3. marca gravada pela ISR do watchdog → `watchdog`.

Publicado no `inicio` como `reset: energia | reinicio | watchdog | brownout`.

### 5.3 Periféricos

- **LCD:** no boot, procura o módulo em 0x27 e 0x3F; se nenhum responder, segue sem LCD (`lcd: false` no `inicio`) e não tenta escrever de novo. `Wire.setWireTimeout` continua ativo.
- **RAM livre:** medida e publicada no `inicio` e no `status`.

### 5.4 Campos novos (todos opcionais)

| Mensagem | Campos novos |
|---|---|
| `evento: inicio` | `versao: "3.0"`, `reset`, `lcd`, `ram_livre` (os atuais `msg`, `driver` continuam) |
| `type: status` | `ram_livre` |
| `evento: erro` | `fase`, `t_ms`, `bordas_juncao` |

Novos valores de `tipo` em `evento: erro`: `sem_peca_topo`, `juncao_obstruida`, `motor_sem_avanco`, `peca_presa_saida`. Valores atuais mantidos: `sem_estoque`, `timeout`, `ocupado`, `peca_invalida`, `comando_desconhecido`.

Compatibilidade conferida no código: o ESP32 repassa a linha JSON inteira (parse em 512 B, MQTT em 1024 B); o servidor só usa `evento` e `peca` (valor desconhecido nas métricas vira `outro`); o dashboard exibe `tipo` como texto e ignora campos desconhecidos. Cada mensagem do Uno deve continuar abaixo de 200 B.

### 5.5 LCD por situação (16 colunas)

| Situação | Linha 1 | Linha 2 |
|---|---|---|
| Repouso | `Estoque:` | `A:15 B:15 C:15` |
| Entregando | `Entregando B` | `Aguarda juncao` |
| `motor_sem_avanco` | `ERRO: Motor C` | `Sem avanco` |
| `timeout` | `ERRO: Timeout B` | `Retire a peca` |
| `juncao_obstruida` | `ERRO: Juncao J2` | `Obstruida` |
| `sem_peca_topo` | `ERRO: Topo B` | `Sem peca` |
| `sem_estoque` | `ERRO: Estoque B` | `Zerado` |
| `peca_presa_saida` | `ERRO: Saida B` | `Peca presa` |

### 5.6 Recuperação após reset

O sistema volta em AGUARDANDO, motores em 0, estoque em 15. Uma peça esquecida no meio da esteira é pega pela checagem prévia (`juncao_obstruida`) ou pelo M1; nada é debitado às cegas.

## 6. Testes e validação

1. **Lógica no PC** (`test/firmware_uno/`): mini-framework de asserts próprio (sem dependência externa), tempo simulado (inclui estouro de `millis()`), compilado com g++ — localmente via Docker (`gcc:14`), no CI em um job novo `firmware-logica` (os jobs atuais não mudam). Cenários obrigatórios, escritos antes do código:
   - entrega normal A/B/C (débito na confirmação, saída de 3 s, volta a AGUARDANDO);
   - `sem_estoque`, `sem_peca_topo`, `juncao_obstruida` sem ligar o motor;
   - M1 → `motor_sem_avanco` sem débito (caso P2);
   - M2 com `bordas_juncao: 0` → `timeout` sem débito (caso P1);
   - pulso < 20 ms ignorado; ≥ 20 ms confirma;
   - M3 → `peca_presa_saida` com débito feito;
   - comandos: `ocupado` com a peça pedida, `peca_invalida`, `comando_desconhecido`, RESET em e fora de ERRO, formato exato;
   - saída segura em ERRO;
   - propriedade: nenhum débito sem confirmação em todos os cenários.
2. **Compilação real**: Uno com `arduino-cli` (local e CI), orçamento de RAM ≤ 65%, ArduinoJson 6 e 7. Suítes atuais do servidor e do frontend como rede de segurança.
3. **Bancada**: roteiro novo em `docs/testes/roteiros/` (boot e causa do reset; leitura de J1–J3 vazias e com peça, calibrando a J2 antes de tudo; uma entrega por esteira; C travada à mão → `motor_sem_avanco` em ~3 s sem reset; timeout; peça presa na saída; junção obstruída; 10 entregas seguidas com `ram_livre` estável).
4. **Documentação**: `docs/ARCHITECTURE.md` (erros, marcos, campos), tabela da FSM no `README.md`, `docs/CHANGELOG.md` e um diagrama Mermaid dos marcos.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| RAM insuficiente com módulos e JSON | sem `String`, textos em flash, orçamento de 65% checado na compilação |
| Diferenças entre ArduinoJson 6 e 7 | usar só a API comum às duas (`StaticJsonDocument`, `serializeJson`); compilar com as duas |
| Prazo do M1 curto demais para a esteira real | parâmetro por esteira; calibrar na bancada (passo do roteiro) |
| Causa de reset imprecisa no Optiboot | documentado; o campo distingue ao menos energia, reinício e watchdog |
| Watchdog em laço após reset | desligado no `.init3` |
| Hardware (fiação, IRF520, fonte) segue com defeito | o firmware para o motor rápido e diz onde falhou; a correção física é da equipe |
