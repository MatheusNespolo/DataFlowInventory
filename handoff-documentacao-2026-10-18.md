# Resumo do dia 18/10/2026 — para o agente da documentação

> Arquivo de repasse (não versionar). Separa **fato verificado** (commit, PR, teste, compilação) de **relato da equipe** (bancada, sem medições entregues) e de **pendência**. Não converter relato em aprovação formal além do que está escrito aqui.

## 1. Resultado de bancada de hoje (RELATO DA EQUIPE)

- **Esteiras A, B e C calibradas e testadas em operação simultânea; todos os módulos e motores funcionando corretamente.** Não foram entregues tempos medidos, dispersão nem número de ciclos: a tabela do Bloco 3 da Semana 10 (PWM antes/validado, tempos topo → junção, ciclos) **continua sem dados** e não deve ser preenchida por inferência.
- **Separador:** o giro isolado pelos comandos `CMD:SEP:A`, `B` e `C` funcionou. Sem medição de desvio, repetibilidade, aquecimento ou comportamento após reinício.
- **LCD:** o firmware novo informou `"lcd_end":0,"i2c_n":0` no `status`, ou seja, **nada responde no barramento I²C**: o defeito é **elétrico** (fiação SDA/SCL em A4/A5, solda dos 4 pinos, pull-up ou o próprio módulo), não de firmware. A equipe vai **trocar o LCD**. Sintoma visto antes disso: quadrados pretos só na 1ª linha (display com energia e contraste ok, controlador nunca inicializado) e `inicio` com `lcd:false`.

## 2. Parâmetros calibrados (commit `e3c8833`, 18/10 18:04, da equipe)

`PARAM_ESTEIRA_x { pwmRegime, kickMs, prazoPartidaMs(M1), timeoutMs(M2), saidaMs(M3), pulsoMinJuncaoMs }`:

| Esteira | PWM de regime | Kick (PWM 255) | M1 | M2 | M3 | Pulso mín. |
|---|---|---|---|---|---|---|
| A | 225 (era 200) | 180 ms (era 150) | 3000 ms | 12500 ms | 3000 ms | 20 ms |
| B | 200 (igual) | 130 ms (era 150) | 3000 ms | 12500 ms | 3000 ms | 20 ms |
| C | 230 (era 200) | 180 ms (era 150) | 3000 ms | 12500 ms | 3000 ms | 20 ms |

Marcos M1/M2/M3 e pulso mínimo **não mudaram**. O commit não traz as medições que motivaram os valores.

## 3. PRs mesclados hoje (todos com 7/7 checks do CI verdes)

| PR | Commit | O quê |
|---|---|---|
| #54 | `2711844` | LCD: busca de endereço, recuperação e diagnóstico |
| #55 | `499bed4` | Separador ativo, sem bloqueio, pinos D5–D8 |
| #56 | `01790af` | Separador automático: roda se prepara conforme a peça pedida |

(Anteriores, para contexto: #53 em 13/10, registro comentado do separador.)

## 4. Alterações de firmware (Uno v3.0)

### 4.1 LCD (PR #54)
- **Causa achada na revisão:** a sondagem era uma tentativa só e só em 0x27/0x3F, e **um único timeout de I²C desligava o LCD para sempre** (só voltava reiniciando o Uno; o `inicio` seguia dizendo `lcd:true`).
- **Busca de endereço:** varre 0x08–0x77 e usa o módulo em 0x20–0x27 ou 0x38–0x3F (0x27 e 0x3F primeiro). Barramento preso: desiste no 1º timeout (25 ms), para não estourar o watchdog.
- **Recuperação:** com o LCD fora e o sistema parado (`AGUARDANDO_PEDIDO` ou `ERRO`, nenhum motor ligado), tenta religar a cada 5 s, dobrando até 60 s (`LCD_RECUPERACAO_BASE_MS`/`MAX_MS`). Religar leva ~1 s (a biblioteca espera 1 s no `init`); watchdog alimentado antes e depois.
- **Diagnóstico — campos opcionais novos no `status`:** `lcd_end` (endereço em uso; `0` = LCD fora), `i2c_n` (dispositivos vistos na última varredura), `lcd_quedas` (quedas em operação). Mensagens existentes seguem idênticas quando os campos não são informados. Pior caso do `status` ≤ 150 B (buffer do Uno 160 B; **mensagem que estoura é descartada inteira**); ESP32 lê em `StaticJsonDocument<512>`. O CX9240 não consome o `status`.
- **Tabela de diagnóstico** (já no roteiro `firmware_uno_v3_validacao.md`): `i2c_n 0/lcd_end 0` = nada responde (fiação, solda, pull-up); `i2c_n ≥1/lcd_end 0` = barramento vivo mas módulo em outro endereço/tipo; `lcd_end 39` (0x27) ou `63` (0x3F) = achado.
- **Não incluído de propósito:** reinicialização periódica do LCD parado (só hipótese para dessincronização de 4 bits; custaria ~1 s com o display apagado a cada minuto).

### 4.2 Separador (PRs #55 e #56)
- **Pinagem:** ULN2003 IN1..IN4 em **D5, D6, D7, D8** (livres; fora da serial 0/1, sensores A0–A3/D2/D4, I²C A4/A5, motores DC D9–D11; constam no diagrama elétrico). Alimentação de 5 V **própria**, GND comum; **nunca** pelo 5 V do Uno via USB (~240 mA; ruído derruba o LCD). Biblioteca **Stepper 1.1.3** (o CI passou a instalá-la; na IDE pode não vir junto).
- **Sem bloqueio:** `Stepper::step()` é espera ativa (120° ≈ 2 s a 10 RPM, o mesmo tempo do watchdog de 2 s). `src/logica/plano_separador.*` dá no máximo 1 passo por volta do `loop()`, nunca em rajada, solta as bobinas parado (0,5 s) e no ISR do watchdog. Substitui o trecho legado da v2.x (**não aplicar** a §2.3 do `INTEGRATION_GUIDE`).
- **Passos por volta 2038 (não 2048):** engrenagem 63,68:1 do 28BYJ-48; com 2048 o erro acumularia ~1,8° por volta. Valor a calibrar em bancada.
- **Ângulos (`SEPARADOR_GRAUS_*`):** padrão A 120°, B 240°, C e neutro 0° (herdados do código v2.x). **A tabela antiga do `INTEGRATION_GUIDE` (A=0°, B=120°, C=240°) não era a usada pelo código** e foi corrigida. Sentido: `SEPARADOR_INVERTER_SENTIDO` (0). `SEPARADOR_RPM` 10.
- **Comando de bancada:** `CMD:SEP:A|B|C|0`, **só pela USB** (o ESP32 nunca o gera; dashboard/MQTT não o alcançam). Formato exato; inválido = `comando_desconhecido`.
- **Modo automático (padrão, `SEPARADOR_AUTOMATICO 1`)** — substitui o `SEPARADOR_NA_ENTREGA` do PR #55, que girava na confirmação da entrega e vinha desligado: a roda parte **assim que a checagem prévia aprova o pedido** (estado `ACIONANDO_ESTEIRA`), antes de o motor da esteira ligar, e **fica** no compartimento depois da entrega até o pedido seguinte. Pedido recusado (sem estoque/peça/junção obstruída) não gira a roda. Lógica "por nível" em `src/logica/separador_auto.*`. `SEPARADOR_ESPERA_APOS_ENTREGA_MS` (0) atrasa a troca se pedidos seguidos puderem tirar a roda do lugar antes de a peça anterior cair.
- **Sem sensor de referência:** a roda é suposta no neutro ao ligar; qualquer reinício do Uno (inclusive abrir o Serial Monitor) a desalinha.

### 4.3 Números verificados
- **Testes de lógica no PC** (`make -C test/firmware_uno test`, `gcc:14`): 43 (03/10) → 53 (13/10) → **73** (#54) → **78** (#55) → **84** (#56), todos sem falhas; a suíte agora também compila o `src/hw/lcd.cpp` real contra I²C/LCD simulados (`test/firmware_uno/mocks/`). Testes novos foram validados reintroduzindo os defeitos de propósito.
- **Uno (`arduino:avr:uno`):** 14510 B/951 B (13/10, 44%/46%) → #54 15182 B/957 B → #55 17060 B/1012 B → **#56 17350 B (53%) / 1021 B (49%) de RAM**; limite do CI 65% de RAM; sem avisos no código do projeto.
- **Não validado em hardware** (pelo firmware novo): busca de endereço/recuperação do LCD; **modo automático do separador**; calibração dos passos por volta.

## 5. O que a documentação já recebeu nos PRs de hoje

`ARCHITECTURE.md` (§3 campos do `status`, LCD, comando `CMD:SEP`, §6.2 separador), `CI-CD.md`, `DEPLOYMENT.md`, `INTEGRATION_GUIDE.md` (status, §2.2 posições, T7.x), `README.md`, `CHANGELOG.md` (3 entradas), board (card #19), `semana_10` (nota do separador), `firmware_uno_v3_validacao.md` (tabela de diagnóstico do LCD), e o **novo** `docs/testes/roteiros/separador_bancada.md` (ligação, ensaio, calibração, critérios de parada, modo automático; registro com A/B/C "relatado OK").
Correção de passagem: o Uno **não usa `ArduinoJson`** desde a v3.0 (`ARCHITECTURE.md` e `DEPLOYMENT.md` ainda o listavam).

## 6. O que AINDA precisa sincronizar (ações para o agente)

1. **Calibração das esteiras (maior lacuna):** o `CHANGELOG.md` não registra a calibração do `e3c8833`. Registrar os valores da seção 2 como configuração; pedir à equipe a tabela de medições (tempos topo → junção, dispersão, ciclos) antes de preencher o Bloco 3 da Semana 10.
2. **Semana 10 (`semana_10_19-23_outubro.md`) e `plano_de_testes.md`:** registrar o relato de A+B+C simultâneas funcionando e o relato do separador isolado, **como relato**, sem marcar portões/aprovações sem as evidências. Itens do separador ainda `⬜`: repetibilidade, aquecimento, reinício, com peça, modo automático, tempo da peça na esteira principal.
3. **Valores desatualizados:** `ARCHITECTURE.md:111` e `README.md:262` ("kick-start em PWM 255 por 150 ms", PWM de regime 200) valem para o firmware de 03/10; agora o kick e o PWM são **por esteira** (seção 2). `semana_08` cita PWM 200/kick 150 como histórico (ok manter).
4. **LCD:** registrar que a causa é elétrica (`i2c_n 0`) e que o LCD será trocado; após a troca, registrar `lcd_end`/`i2c_n`/`lcd_quedas` do `status`.
5. **Projeto de pesquisa (`docs/artigo/Projeto de pesquisa - Final.docx`, atualizado em 08/10):** está defasado em: item **t) Roda de separação (em integração)** e a linha da Tabela 1 "Separação Final" (agora implementada, giro isolado relatado OK, automático não validado); item **n) Robustez** (LCD procurado só em 0x27/0x3F; agora varredura + recuperação); item **o)** (PWM 200/mínimo ~150; agora por esteira, valores da seção 2); **"43 testes"** em vários trechos e na Tabela 1 (agora **84**); Conclusões ("restam ... a integração da roda de separação"). Manter estrutura/formatação; usar o script de edição de XML já usado em 08/10.
6. **Site de apresentação (repositório `dataflow-inventory-site`, separado):** `src/lib/content.ts:112` diz "43 testes da lógica do firmware"; agora 84.
7. **Board/cards:** #19 já atualizado; considerar movimentação conforme os relatos acima (sem presumir conclusão do separador).

## 7. Decisões e conclusões do dia

- O LCD **não é defeito de firmware**: o `status` provou barramento sem nenhum dispositivo; o firmware agora só **diagnostica e se recupera** de quedas.
- Separador: **ativar sem bloqueio**, validar isolado por comando antes de integrar (como pedem as Semanas 9 e 10) e, após o giro isolado funcionar, **automatizar o posicionamento no pedido** (mais cedo que na confirmação, o que também reduz a janela de erro de tempo).
- Mantidas sem medição (pendências reais): tempo da peça entre a junção e o fim da esteira principal; sentido/ângulos definitivos da roda; passos por volta reais; efeito do separador no ruído elétrico das esteiras.
