# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adota versionamento por marcos de bancada (ainda sem releases semânticas
publicadas — o protótipo está em desenvolvimento ativo).

Convenção de seções: `Adicionado`, `Alterado`, `Corrigido`, `Segurança`, `Removido`.

---

## [Não publicado]

### Alterado

- **Display OLED: faixa de ícones dos estados da FSM (28/10/2026)**
  - **O que mudou:** os 16 px de baixo do OLED, que estavam vazios, ganharam uma faixa com um ícone por estado da FSM (ampulheta = aguardando, lupa = verificando, raio = acionando, caixa sobre a esteira = entregando, triângulo = erro), com o do estado atual **invertido** (bloco aceso com o desenho recortado). A linha 2 do texto subiu 8 px (páginas 3–4); as duas linhas continuam com 16 colunas e os mesmos textos
  - **Como:** os ícones são uma "fonte" de 5 glifos de 20 × 16 px na flash (`src/hw/icones_fsm.h`, 206 bytes), desenhados pela própria SSD1306Ascii com `setInvertMode`. `lcdIcones()` só redesenha quando o estado muda, e só os dois ícones que trocam (~10 ms de I²C, no máximo 4 vezes por pedido); a faixa inteira só depois de iniciar ou religar o display. Sem animação, de propósito: escrever no I²C continuamente com o motor ligado é o pior momento por causa do ruído. Um timeout no meio de um ícone cai na mesma recuperação do texto
  - **Custo:** flash de 59% para 60% (+482 bytes); RAM igual (1021 de 2048 bytes). Sem mudança no protocolo, no ESP32, no servidor nem no dashboard
  - **Testes:** 97 em `test/firmware_uno` (9 novos: ícone por estado, layout da faixa, formato e margem dos glifos, faixa inteira na primeira vez, nada de I²C com o mesmo estado, só 2 glifos na troca, texto normal depois dos ícones, timeout e religamento). Mutações (esquecer de desfazer a inversão, redesenhar sempre) são detectadas
  - **Não validado na bancada:** o display ainda não chegou; conferir no reteste B3

- **Display do Uno: LCD 16x2 → OLED 0,96" I2C (SSD1306), em 27/10/2026 (PR #68, `0d8566a`)**
  - **Motivo:** o LCD 16x2 não respondia no I²C; com o firmware v3.0, o `status` mostrava `i2c_n 0` (nenhum dispositivo no barramento): falha elétrica do módulo
  - **Firmware:** biblioteca `LiquidCrystal_I2C` → **SSD1306Ascii 1.3.5** (Bill Greiman), que escreve direto no display sem imagem da tela na RAM (a Adafruit_SSD1306 pediria 1024 bytes; o firmware usa 1021 de 2048). RAM igual à de antes; flash de 53% para 59% (fonte)
  - **Tela ("layout A"):** as mesmas 2 linhas × 16 colunas e os mesmos textos, em fonte X11fixed7x14 com 2 px entre letras (16 colunas = 128 px); linha 1 no topo (faixa amarela dos módulos bicolores) e linha 2 no meio da tela
  - **Endereço:** varredura em 0x3C ou 0x3D (antes 0x20–0x27 e 0x38–0x3F, do expansor PCF8574 do LCD, faixa que incluía o 0x3C e confundiria o OLED com um LCD)
  - **Mantidos:** recuperação automática com o sistema parado (agora ~0,1 s em vez de ~1 s), timeout de I²C, campos do `status` (`lcd_end` passa a ser 60 ou 61 com o display presente, `i2c_n`, `lcd_quedas`) e nomes `lcd*`/`LCD_*`. **Sem mudança** no ESP32, no servidor nem no dashboard (só os rótulos da vista de arquitetura)
  - **Nova opção:** `OLED_CONTROLADOR_SH1106` em `config.h` para módulos com o controlador SH1106
  - **Pinos:** os mesmos (SDA em A4, SCL em A5); alimentação de 3,3–5 V conforme a placa; a ordem dos pinos `GND/VCC` varia entre lotes
  - **Testes e CI:** 88 testes em `test/firmware_uno`, com dublês da SSD1306Ascii; o CI instala `SSD1306Ascii@1.3.5` (a `LiquidCrystal I2C` fica só para os sketches históricos de `test/`)
  - **Pendente:** validação na bancada (reteste do item B3 na Semana 11)
  - **Documentação:** README, ARCHITECTURE, CI-CD, DEPLOYMENT, plano de testes (B3), roteiro da Semana 11, guia do separador, card do BOM e projeto de pesquisa atualizados. O diagrama elétrico não desenha o display (nem o LCD antigo), então não mudou

- **Status de validação/documentação (13/10/2026):** registrado o sucesso da validação em bancada do firmware Uno v3.0 (itens 1.1–1.11 e Bloco 2; B/C funcionando), sem presumir medições não fornecidas nem concluir o teste integrado A+B+C/calibração. README, arquitetura, guia de integração e plano de testes atualizados para separar resultados concluídos de pendências.
- **Planejamento:** criados os roteiros da Semana 9 (14–18/10; separador prioritário e tarefas opcionais de fim de semana para Data Flow System/CX9240) e Semana 10 (19–23/10; A+B+C, calibração e fechamento condicional do separador).
- **Separador:** guia deixa explícito que a ativação documentada é legado v2.x, não aplicável diretamente à v3.0; validação física e integração seguem pendentes.
- **Diagrama 3D do mímico:** objeto do separador no fim da esteira principal reorientado de cilindro horizontal (roda-gigante) para vertical (tipo balde), com a base assentada na bancada; comentário do `diagrama3d.js` e rótulo do SVG de fallback no `index.html` atualizados de "Roda de Estoque" para "Separador", alinhando a terminologia do dashboard à usada no firmware e na documentação.
- **Bancada final — avanço de fase (23/10/2026):** todas as esteiras foram rodadas na quarta-feira, e o ajuste do PWM/kick foi registrado nos últimos commits (`ddf526a`, `1e8fbf1`, `d4ecc2f`). O restante do roteiro agora é a montagem final na base e na estrutura do projeto, com testes um a um para confirmar que a montagem não altera o comportamento padrão. As impressões 3D do separador e da peça que percorre as esteiras ficaram prontas e serão validadas na Semana 11, com integração total ao fim da semana.
- **Calibração de esteiras (bancada) — commit `e3c8833` (18/10/2026):** registro dos parâmetros por esteira no firmware Uno v3.0:
  - **A:** `pwmRegime=225` e `kickMs=180 ms`
  - **B:** `pwmRegime=200` e `kickMs=130 ms`
  - **C:** `pwmRegime=230` e `kickMs=180 ms`
  - Marcos M1/M2/M3 e pulso mínimo não foram alterados por este commit (apenas ajuste de `pwmRegime`/`kickMs`).


### Adicionado

- **Dashboard: o cilindro do separador no diagrama reage à ativação (21/10/2026)**
  - **O que mudou:** o cilindro (disco liso) ganhou 3 compartimentos (A, B, C, nas cores das peças), um anel que acende enquanto a roda gira e um marcador fixo no ponto de recebimento. Ele gira até a peça pedida na velocidade da roda real (10 RPM = 60°/s) pelo caminho mais curto (mesmo critério e mesmo desempate do firmware), e o compartimento chega sob o marcador com destaque. O SVG de reserva (sem WebGL) ganhou a mesma roda
  - **Como:** novo `frontend/js/separador.js` (sem three.js nem DOM, socket/relógio injetáveis) aplica ao `status` que o dashboard já recebe a **mesma regra do firmware** (`separador_auto`): a roda parte quando a checagem prévia aprova o pedido (`ACIONANDO_ESTEIRA`), segue durante a entrega e **fica** no compartimento até o pedido seguinte. Pedido recusado não a move; o evento `inicio` (Uno reiniciado) a devolve ao neutro. Funciona igual com o simulador. **Sem mudança** em firmware, servidor, ESP32 nem simulador
  - **Limite importante:** é uma **posição estimada, em malha aberta**. O firmware não publica a posição da roda; o comando de bancada `CMD:SEP` a move sem aparecer no `status`, e qualquer reinício do Uno a desalinha da estimativa. Publicar a posição real exigiria um campo novo no `status` (o pior caso já usa ~150 dos 160 B do buffer do Uno)
  - **Testes:** 13 unitários novos (`test/frontend/separador.test.mjs`, rodam em Node com relógio e socket falsos: regra de destino, caminho mais curto, sequência B→A→C, pedido recusado, reinício do Uno, página aberta no meio de um pedido, `prefers-reduced-motion`) e 2 de ponta a ponta no navegador (`test/frontend_smoke/separador.spec.mjs`, contra o simulador). Todos passaram localmente (39 unitários do frontend no total); o E2E completo roda no CI
  - **Não validado na bancada:** só com o simulador. Com o hardware, vale conferir se o giro do diagrama acompanha o da roda (sentido e tempo)

- **Separador automático: a roda se prepara de acordo com a peça pedida (padrão)**
  - **Relato da equipe:** o giro isolado pelos comandos `CMD:SEP:A`, `B` e `C` funcionou. Repetibilidade, aquecimento e os demais critérios do roteiro não foram registrados
  - **Quando a roda se move:** assim que a checagem prévia aprova o pedido (estado `ACIONANDO_ESTEIRA`), antes de o motor da esteira ligar e bem antes da confirmação da entrega: a roda tem de ~3 s a 12,5 s (o giro leva ~2 s por 120°) para chegar ao compartimento. Pedido recusado (sem estoque, sem peça, junção obstruída) não gira a roda. Depois da entrega ela **fica** no compartimento (a peça ainda percorre a esteira principal) e só muda no pedido seguinte
  - **Como:** nova lógica pura `src/logica/separador_auto.*`, "por nível": a cada volta do `loop()` o firmware pergunta o destino e repete o pedido à roda, o que é inofensivo (o plano de giro só recalcula o caminho); não há fila nem estado intermediário
  - **Configuração (`config.h`):** `SEPARADOR_AUTOMATICO` (1 por padrão; 0 deixa só o comando de bancada) **substitui** `SEPARADOR_NA_ENTREGA`, que girava na confirmação da entrega e vinha desligada. `SEPARADOR_ESPERA_APOS_ENTREGA_MS` (0 por padrão) atrasa a troca de compartimento se pedidos seguidos puderem tirar a roda do lugar antes de a peça anterior cair nela
  - **Testes (PC):** a suíte do firmware passa de 78 para **84 testes**, inclusive dois com a FSM real (a roda parte antes da entrega e permanece depois; pedido recusado não gira) e o estouro do `millis()`
  - **Uno:** 17350 B de flash (53%, +290) e 1021 B de RAM (49%, +9); sem avisos no código do projeto; abaixo do limite de 65% de RAM do CI
  - **Não validado em hardware:** o modo automático nunca rodou com as esteiras. Em aberto: o tempo da peça na esteira principal (para calibrar a espera), a perda de posição em qualquer reinício do Uno (sem sensor de referência) e o sentido e os ângulos definitivos da roda real. Procedimento em `docs/testes/roteiros/separador_bancada.md` (seção 6)

- **Separador (roda giratória) ativado, sem bloqueio (18/10/2026)**
  - **Pinagem:** ULN2003 IN1..IN4 nos pinos **D5, D6, D7 e D8** do Uno (livres, fora da serial, dos sensores, do I²C e dos motores DC; constam no diagrama elétrico). Alimentação de 5 V **própria**, com GND comum; não pelo 5 V do Uno via USB
  - **Código ativo:** `src/hw/separador.*` (biblioteca `Stepper` 1.1.3, que agora o CI instala) usa o plano de giro sem bloqueio de `src/logica/plano_separador.*`: no máximo 1 passo por volta do `loop()`, solta as bobinas parado e no ISR do watchdog. Substitui o rascunho legado da v2.x, cujo `step()` bloqueante estouraria o watchdog de 2 s
  - **Dois modos:** por padrão só gira pelo comando de bancada `CMD:SEP:A|B|C|0` no Serial Monitor (novo; só pela USB, o ESP32 nunca o gera, então dashboard e MQTT não o alcançam). A rotação automática na confirmação da entrega vem **desligada** (`SEPARADOR_NA_ENTREGA 0` em `config.h`), para validar a roda isolada antes de integrá-la, como pedem os roteiros das Semanas 9 e 10
  - **Passos por volta 2038, e não 2048:** o 28BYJ-48 tem engrenagem 63,68:1; com 2048 o erro acumularia ~1,8° a cada volta. Os ângulos dos compartimentos (`SEPARADOR_GRAUS_*`, padrão A 120°, B 240°, C e neutro 0°, herdados do código da v2.x) e o sentido (`SEPARADOR_INVERTER_SENTIDO`) são constantes para ajustar à roda real. A tabela antiga do `INTEGRATION_GUIDE` (A=0°, B=120°, C=240°) não era a usada pelo código e foi corrigida
  - **Testes (PC):** a suíte do firmware passa de 73 para **78 testes** (graus→passos, ciclo A→B→C fechando exatamente uma volta, `CMD:SEP` válido e inválido, FSM ignorando o comando)
  - **Uno:** 17060 B de flash (52%, +1878) e 1012 B de RAM (49%, +55) com o padrão; 17122 B com a entrega ligada. Sem avisos no código do projeto; abaixo do limite de 65% de RAM do CI
  - **Não validado em hardware:** o motor nunca girou com este código. Procedimento, ligação, calibração e critérios de parada em `docs/testes/roteiros/separador_bancada.md`. Em aberto: sem sensor de referência (a posição se perde em reinício), sentido e ângulos a medir, e o tempo da peça até o fim da esteira principal
  - **Documentação corrigida de passagem:** o Uno não usa `ArduinoJson` desde a v3.0 (a v3.0 monta o JSON à mão); `ARCHITECTURE.md` e `DEPLOYMENT.md` ainda o listavam. Substitui as entradas de 13/10 que descrevem o separador como "registro comentado"

- **Página de apresentação:** visão geral visual do projeto em https://matheusnespolo.github.io/dataflow-inventory-site/ (repositório separado [`dataflow-inventory-site`](https://github.com/MatheusNespolo/dataflow-inventory-site): Next.js, React Three Fiber, GSAP e Framer Motion, publicado no GitHub Pages). O README passa a apontar para ela no topo e em "Escolha seu caminho".
- **Cobertura E2E do dashboard (card #27):** Playwright agora valida feedback de comandos ocupados/inválidos/limitados, estoque esgotado e recuperação por reset, reconexão WebSocket sincronizando estado, e `/api/status` nos modos servidor sem broker e simulador. O simulador aceita `ESTOQUE_INICIAL` (padrão 15) para testes isolados; execução documentada em `docs/CI-CD.md` e `CONTRIBUTING.md`.
  - 8 testes novos: 3 em `comandos-recusados` (sistema ocupado, peça inválida, rate limit), 1 em `sem-estoque`, 1 de reconexão em `resiliencia` e 3 em `api-status` (503 do servidor sem broker, recusa com broker offline, 404 do simulador). Suíte serial (`workers: 1`), portas 3100–3102; em CI, 1 retentativa e `maxFailures: 3`
  - **Validação parcial:** uma execução registrou 31 testes passando e 2 falhas; os testes novos e o cenário de rate limit passaram isoladamente. A suíte completa **ainda não foi reexecutada** após a última correção, portanto não há confirmação de execução totalmente verde

### Adicionado

- **LCD: busca de endereço, recuperação em operação e diagnóstico (18/10/2026)**
  - **Motivo:** na bancada o display mostra só quadrados pretos na primeira linha e o `inicio` traz `lcd: false`, ou seja, o controlador do display tem energia, mas o Uno não recebeu resposta do módulo I²C em 0x27 nem em 0x3F. Revisão do código: a sondagem era uma tentativa só e só em dois endereços, e **um único timeout de I²C desligava o LCD para sempre** (ele só voltava reiniciando o Uno, e o `inicio` continuava dizendo `lcd: true`)
  - **Busca de endereço:** o firmware varre o barramento (0x08–0x77) e usa o módulo que responder em qualquer endereço de expansor (0x20–0x27 ou 0x38–0x3F; 0x27 e 0x3F primeiro). Com o barramento preso, a varredura desiste no primeiro timeout (25 ms)
  - **Recuperação:** se o LCD sumir (ruído de motor, mau contato) ou não responder no boot, o firmware tenta religá-lo **só com o sistema parado** (`AGUARDANDO_PEDIDO` ou `ERRO`, nenhum motor ligado), a cada 5 s, dobrando até 60 s se não adiantar (`LCD_RECUPERACAO_BASE_MS`/`MAX_MS` em `config.h`). Religar leva ~1 s por causa do `delay(1000)` da biblioteca; o watchdog é alimentado antes e depois
  - **Diagnóstico:** o `status` ganha os campos opcionais `lcd_end` (endereço em uso, `0` = LCD fora), `i2c_n` (dispositivos vistos no barramento) e `lcd_quedas`. As mensagens existentes seguem idênticas quando os campos não são informados (testes de contrato). O pior caso do `status` fica em ≤ 150 B (buffer de 160 B; uma mensagem que estoura é descartada inteira) e bem abaixo do `StaticJsonDocument<512>` do ESP32
  - **Testes (PC):** a suíte do firmware passa de 53 para **73 testes**, e agora compila o `src/hw/lcd.cpp` real contra um I²C e uma biblioteca de LCD de mentira (`test/firmware_uno/mocks/`): endereços, barramento preso, timeout na inicialização, queda em operação, religamento e redesenho. Reintroduzi de propósito os dois defeitos originais e os testes falharam
  - **Uno:** 15182 bytes de flash (47%, +672) e 957 de RAM (46%, +6); abaixo do limite de 65% do CI
  - **Não validado em hardware:** a recuperação e a busca de endereço só foram testadas no PC. Se o módulo da bancada não falar com o Uno (`i2c_n: 0`), o defeito é elétrico e nenhum software resolve; ver o passo 1 de `docs/testes/roteiros/firmware_uno_v3_validacao.md`

- **Separador (roda giratória): código do firmware v2.x devolvido como registro, todo comentado**
  - Novos `src/hw/separador.h` e `src/hw/separador.cpp` (declarações e implementação comentadas), bloco comentado de pinos e posições em `config.h` (28BYJ-48 + ULN2003 nos pinos 5 a 8, 2048 passos por volta, posições 0°/120°/240°) e chamadas comentadas no `data_flow_inventory.ino`
  - **Sem efeito no firmware:** compilado antes e depois, o Uno usa os mesmos 14510 bytes de flash (44%) e 951 de RAM (46%). **Sem testes em bancada nesta semana:** o giro nunca foi validado em hardware
  - **Giro sem bloqueio, para o watchdog não reiniciar o Uno:** `Stepper::step()` é uma espera ativa (confirmado no código da biblioteca): a 10 RPM, 120° levam ~2 s, o mesmo do watchdog. A camada de hardware registrada foi refeita para dar no máximo 1 passo por volta do `loop()`, nunca em rajada, e soltar as bobinas depois de 0,5 s parada (e no ISR do watchdog)
  - **Lógica testada no PC:** novo `src/logica/plano_separador.*` com 10 testes em `test/firmware_uno/teste_separador.cpp` (caminho mais curto, 1 passo por chamada, intervalo mínimo entre passos, mudança de alvo no meio do giro, estouro do `micros()`, atraso do loop e bobinas): a suíte do firmware passa de 43 para 53 testes. O módulo ainda não é usado pelo firmware, então o Uno segue com os mesmos 14510 bytes de flash e 951 de RAM; com tudo descomentado (verificado só como compilação), compila sem avisos em 16348 bytes (50%) e 1002 de RAM (48%)
  - **Ainda em aberto, registrado em `src/hw/separador.h`:** sem sensor de referência (a posição se perde em reinício), motor de passo com 5 V próprios (~240 mA) e o momento do giro em relação à chegada da peça; o giro **nunca foi testado em hardware**
  - Corrige a documentação que dizia que o rascunho existia só no histórico do git (`ARCHITECTURE.md`, `INTEGRATION_GUIDE.md`, board e roteiro da Semana 8)

### Alterado

- **Diagrama elétrico: rótulo do driver da esteira C corrigido (08/10/2026)**
  - A terceira placa aparecia como `IRF520_B`; agora é `IRF520_C` (sinal no pino 11), em `docs/fluxogramas/Diagrama elétrico.png` e na fonte `.pptx`
  - A Figura 2 do `docs/artigo/Projeto de pesquisa - Final.docx` foi trocada pela versão corrigida (mesmo tamanho; nada mais mudou no documento)

- **Projeto de pesquisa (`docs/artigo/Projeto de pesquisa - Final.docx`) atualizado com o histórico até 08/10/2026**, sem mudar a estrutura de tópicos nem a formatação
  - Capa: orientadores preenchidos
  - Seção 7 (desenhos): Figura 2 trocada pelo diagrama elétrico consolidado (23/09) e Figura 3 pela máquina de estados do Uno; texto do código atualizado (firmware v3.0, supervisão por marcos, pinagem atual, JSON, ESP32, servidor, CX9240)
  - Seção "Desenvolvimento e evolução": itens a), d), e), g), i), j), l) e m) atualizados; novos itens n) a u) (robustez do firmware v3.0, estoque e PWM por esteira, historiador CX9240, Prometheus/Grafana, CI/CD, montagem e diagrama elétrico, roda de separação pendente, documentação); Tabela 1 passa de 13 para 20 decisões
  - Conclusões atualizadas com o estado atual e os próximos passos. As seções 1 a 6 e 8 seguem como concepção inicial, como o próprio documento declara

- **Bancada — esteiras B e C funcionando e roteiro da Semana 8 (03/10/2026)**
  - B e C movem normalmente; entrega ótima e timeout até o `ERRO` funcionam, com o firmware **anterior à v3.0**, que estava correto
  - **Causa da falha de 29/09:** elétrica. O módulo IRF520 e o motor da esteira C estavam defeituosos e, ao partir o motor, todo o sistema travava (o Arduino deixava de comandar os periféricos e de falar com o ESP32). Isso levou à crença errônea de um defeito no código. Módulo e motor da C foram trocados; **provisoriamente a C usa o módulo IRF520 da esteira A**
  - **Não registrado:** o tempo topo → junção da C com o motor novo (entra na calibração da Semana 8)
  - **Esclarecimento sobre a v3.0:** não corrige um defeito do firmware anterior; traz os marcos do processo (mais próximo do padrão de automação produtiva) e facilita o diagnóstico. A validação em bancada é a da Semana 8, começando pela esteira A e adicionando as outras gradualmente
  - Novo roteiro `docs/testes/roteiros/semana_08_05-09_outubro.md`, com aprovação a cada bloco; Semana 7, `plano_de_testes.md`, `README.md`, `DEPLOYMENT.md` e o board atualizados
  - A nota da seção "Revertido" abaixo ("causa ainda em investigação") fica superada por este registro

- **Documentação pós-revisão do firmware v3.0 (03/10/2026)**
  - `docs/ARCHITECTURE.md`: novas subseções "Decisões de projeto da v3.0" (código antigo só no git, regra de nenhum débito sem passagem, LCD opcional, saída segura, causa do reset, limitador de rajada) e "Limitações conhecidas da v3.0" (quatro pendências aceitas, todas raras)
  - `docs/CI-CD.md`: consumo do Uno v3.0 atualizado (44% da flash, 46% da RAM; limite de 65%; a v2.x usava 55%)
  - `docs/testes/plano_de_testes.md`: nota sobre a v3.0 e sobre quais itens de timeout são do sketch de teste e quais do firmware principal
  - **Pendência do repositório:** tornar o job `firmware-logica` obrigatório na proteção da `main` é uma configuração do GitHub (passo a passo em `docs/CI-CD.md`)

- **Firmware do Uno v3.0 — supervisão por marcos e robustez (03/10/2026)**
  - Firmware reestruturado em módulos: `src/logica/` (C++ puro: protocolo, filtro, supervisor, FSM, telas, causa do reset) testado no PC (`test/firmware_uno`, 43 testes, job `firmware-logica` no CI) e `src/hw/` (motores, sensores, serial, LCD, diagnóstico)
  - **Compatibilidade:** mensagens JSON idênticas às da v2.x (testes de contrato byte a byte); ESP32 e servidor não mudaram. Novos campos opcionais (`reset`, `lcd`, `ram_livre`, `fase`, `t_ms`, `bordas_juncao`) e novos erros (`sem_peca_topo`, `juncao_obstruida`, `motor_sem_avanco`, `peca_presa_saida`)
  - **Entrega por marcos:** checagem prévia sem ligar o motor; M1 topo livre em 3 s (motor travado para na hora); M2 junção em 12,5 s; débito na confirmação; M3 junção livre após 3 s de saída. Junções capturadas por interrupção, com pulso mínimo de 20 ms; a confirmação ignora uma ocupação que começou antes da partida do motor (junção ocupada no próprio ciclo da partida vai para `juncao_obstruida` sem ligar o motor, e a largura de um pulso que já estava em curso na partida é descartada)
  - **Robustez:** kick-start dos motores, watchdog de 2 s (quando avisa que o loop travou, desliga os motores na hora, antes do reset), causa do reset no `inicio`, LCD procurado em 0x27/0x3F e opcional (se o I²C travar durante a operação, o LCD é desligado e o sistema segue sem ele), rajada de interrupções de um sensor de junção oscilando no limiar é limitada (a interrupção dele é suspensa por até 5 ms e o nível é ressincronizado), energização com PORF e BORF juntos sai como `energia`, textos na flash (RAM global de 55% para 46%), sem ArduinoJson no Uno
  - **Rollback:** firmware v2.x no commit `fddde08`. **Validação em bancada pendente:** `docs/testes/roteiros/firmware_uno_v3_validacao.md`
- **Firmware Uno — revisão do código e reaplicação das atualizações de 02/10/2026**
  - **Reaplicado:** `TIMEOUT_ENTREGA` de 9 s para **12,5 s** (vigia só o trajeto topo → junção; estourou, as três esteiras são desligadas e o sistema vai para `ERRO` sem debitar estoque), confirmação por **passagem** no sensor de junção (o sensor precisa ser visto livre depois que a esteira liga) e estoque inicial de **15** peças por tipo. O PWM por esteira (`VELOCIDADE_ESTEIRA_A/B/C`) foi mantido, mas o valor da C passou de 140 para **200** (igual a A e B): o plano de testes registra ~150 como o PWM mínimo que move a esteira com peça, então 140 não movia a peça; calibre a C em bancada se o motor novo for mais rápido
  - **Corrigido:** o LCD era redesenhado (`lcd.clear()` e criação de `String`) a cada volta do loop enquanto o sistema estava em `ERRO` por timeout, o que fazia o display piscar e fragmentava o heap do Uno (2 KB de RAM); a mensagem agora é desenhada uma única vez, na transição para `ERRO`
  - **Corrigido:** a publicação periódica enviava as 4 mensagens (status, estoque, sensores e esteiras) de uma vez, com `Serial.flush()`, o que bloqueava o loop por centenas de milissegundos a cada segundo (9600 baud) e podia fazer um pulso curto do sensor de junção passar despercebido (falso timeout). Agora as mensagens saem escalonadas, uma a cada 250 ms (cada uma continua saindo 1x por segundo) e sem `flush`
  - **Corrigido:** durante a pausa de 1,5 s depois da entrega o dashboard ainda mostrava a esteira como ligada, mesmo com o motor já parado
  - **Corrigido (revisão):** confirmação da junção com filtro de 30 ms (`FILTRO_JUNCAO_MS`), para um pico de ruído não confirmar uma passagem falsa; o estado da FSM é atribuído **antes** de ser publicado (o RESET, o fim da entrega e a verificação publicavam o estado antigo); `peca` do erro `ocupado` agora é a peça pedida (antes era a do pedido em curso); comandos exigem formato exato (`CMD:PECA:` + 1 letra e `CMD:RESET`); mensagem "ERRO:Sem estoque" cabe nas 16 colunas do LCD; motores desligados no início do `setup()` (antes do LCD e do `delay(2000)`); `Wire.setWireTimeout` evita travar o Uno com o I²C preso
  - **Corrigido no gateway ESP32:** `Serial2.setRxBufferSize(2048)`, porque durante a reconexão MQTT/TLS o buffer padrão (256 B) transbordava e linhas do Uno chegavam truncadas ou se perdiam
  - **Documentação:** `docs/ARCHITECTURE.md` (estados, erros que levam a ERRO e rejeições), tabela de estados do `README.md` e o roteiro de timeout do `docs/testes/plano_de_testes.md`
  - **Validado:** o sketch compila para o Arduino Uno (`arduino-cli`, 54% da flash e 55% da RAM); o gateway ESP32 também compila (76% da flash). **Não validado em bancada**: o LCD apagado e a esteira C fraca (possível causa elétrica: fiação, diodo antiparalelo, driver IRF520 ou fonte) seguem em investigação e este firmware não os corrige por si só

### Revertido

- **Firmware Uno — volta ao comportamento anterior às atualizações de 02/10/2026**
  - `data_flow_inventory.ino` restaurado ao estado de 28/08 (commit `b5727ad`): `TIMEOUT_ENTREGA` volta a **9000 ms**, o estoque inicial volta a **5 peças** por tipo e a exigência de "passagem" no sensor de junção é removida
  - **Mantido** apenas o PWM por esteira (`VELOCIDADE_ESTEIRA_A/B/C`; A e B em 200 e C em 140): ajustar o valor da C em bancada
  - Motivo: a esteira C com o motor novo não move a peça até a junção e o LCD apagou depois da troca; a causa ainda está sendo investigada (fiação, diodo, driver ou fonte) e o firmware volta ao último estado validado até lá
  - **Atualização (03/10/2026):** a causa era elétrica (módulo IRF520 e motor da C com defeito, já trocados) e o firmware anterior estava correto; ver a primeira entrada desta seção "Não publicado"
  - Simulador, dashboard e painel do Grafana continuam com a escala de 15 peças; o estoque exibido no dashboard vem do que o Arduino publica

### Removido

- **Consolidação da documentação em `docs/ARCHITECTURE.md` (02/10/2026)**
  - `docs/arquitetura_mqtt.md` e `docs/fluxogramas/fluxograma_funcionamento.md` foram removidos depois de migrar seu conteúdo exclusivo para o `ARCHITECTURE.md`: tópicos completos, fluxos de dados e comando, formatos de mensagem (Serial, MQTT e Socket.IO), ligação serial Uno ↔ ESP32, configuração de broker e segurança, bibliotecas, contrato do simulador com o CX9240 e diagramas da FSM. O histórico continua no git
  - `docs/CI-CD-FIXES-2026-09-17.md` removido: duplicava a entrada "Hardening CI/CD" deste changelog e as seções 2.2 e 2.3 do `docs/CI-CD.md`
  - `docs/testes/validações/test_write.txt` removido (arquivo de teste sem uso)
  - Links em `README.md`, `CONTRIBUTING.md`, `simulator/`, `docs/FRONTEND.md`, `docs/testes/plano_de_testes.md` e `docs/fluxogramas/board_github_projects.md` apontam para o `ARCHITECTURE.md`; árvore de diretórios do `README.md` atualizada (observabilidade, scripts, CI, testes). Menções antigas nas entradas abaixo e nos roteiros semanais são históricas e foram mantidas

### Alterado

- **Divulgação e organização do README (02/10/2026)**
  - `README.md` reorganizado sem reescrever as seções: abertura enxuta (frase de posicionamento, badges de 17 para 8), tabela **Escolha seu caminho**, seção **Por que este projeto é interessante**, diagrama de arquitetura movido para a seção Arquitetura e pedido de estrela no fim
  - `LICENSE` normalizado (aviso de copyright em uma única linha) para o GitHub reconhecer a licença MIT; **o reconhecimento só se confirma depois do merge**
  - Novos arquivos de comunidade: formulários de issue (bug e ideia), modelo de pull request, `CODE_OF_CONDUCT.md` e `SECURITY.md`; `CONTRIBUTING.md` ganhou a seção 7 com os links
  - Novo `docs/DIVULGACAO.md`: plano de divulgação orgânica com textos-base, rascunhos por canal, rascunhos de issues iniciais, checklist e métricas. **Nada foi publicado e nenhuma issue foi criada**; a publicação e a checagem dos canais são da equipe
- **Dashboard Grafana "Visão Geral" (02/10/2026):** o painel "Estoque atual" passa a ter escala máxima 15 (antes 5), alinhada ao estoque inicial de 15 peças por tipo. Limiares de cor inalterados (iguais aos do frontend)

### Adicionado

- **Deployment Guide e atualização de documentação (30/09/2026)**
  - Novo `docs/DEPLOYMENT.md` (versão inicial): cenários A–D, pré-requisitos, hardware, firmware, broker, servidor, dashboard, observabilidade, validação pós-deploy e rollback. **Não foi executado em máquina limpa ainda** (Fase 3 do card #22)
  - `README.md`, `docs/INTEGRATION_GUIDE.md` (nova seção 3, Observabilidade; checklist passou a seção 4), `docs/testes/plano_de_testes.md`, `docs/fluxogramas/board_github_projects.md` e os cards #22 e #25 atualizados; `observability/README.md` passa a referenciar o `DEPLOYMENT.md`
  - Card #25 renomeado para Prometheus/Grafana (InfluxDB descartado) e movido para `In Progress`; Card #22 movido para `In Progress`

- **Desbaste mecânico das esteiras e falha de acionamento B/C (29/09/2026; atualização 03/10)**
  - Desbaste da costura das esteiras A, B e C concluído, com ciclo manual suave
  - B e C voltaram a acionar; entrega ótima e timeout até `ERRO` funcionam com o firmware anterior à v3.0, que estava correto
  - A falha era elétrica: o módulo IRF520 e o motor da C estavam defeituosos; a partida travava o sistema. Módulo e motor foram trocados; **provisoriamente, C usa o módulo da A**
  - O rascunho de diagnóstico em 6 fases foi superado pelo diagnóstico conclusivo; ver Semana 7, seção 4.2.1

- **Telemetria Histórica de Performance — Prometheus + Grafana (30/09/2026)**
  - `GET /metrics` no `server/server.js` (mesma porta 3000 e mesmo padrão aberto do `/api/status`) com 17 métricas `dfi_*` mais as métricas padrão do processo: publish → ack do broker, tempo de confirmação do gateway por comando, tempo de resposta da API por rota, throughput de mensagens e eventos, reconexões MQTT, erros, quedas do gateway (LWT), comandos por resultado, sem resposta e órfãos, estoque e esteiras
  - Lógica isolada em `server/metrics.js` (+ `server/metrics-correlacao.js`, fila FIFO comando → confirmação); todo método é à prova de falha para nunca derrubar o servidor; rótulos só aceitam valores de listas permitidas
  - Variável nova `METRICS_CONFIRMACAO_TIMEOUT_MS` (padrão 10000) em `server/.env.example`; dependência nova `prom-client`
  - Stack Docker de desenvolvimento em `docker-compose.yml` (Prometheus `v3.15.0` + Grafana `12.4.3`, portas presas ao localhost, senha obrigatória) com provisionamento em `observability/`
  - Três dashboards versionados em `docs/grafana/`: Visão Geral, Performance (p50/p95/p99) e Confiabilidade
  - Passo a passo, smoke test e problemas comuns em `observability/README.md`; nova seção "Observabilidade" em `docs/ARCHITECTURE.md`
  - Testes sem Docker em `test/server_metrics/` (unitários, integração com broker MQTT em processo e verificações estáticas do stack) e job `server-metrics-tests` no CI
  - **Validação concluída em 01/10/2026:** a execução do stack e a conferência dos painéis (cobertas por `scripts/observability-smoke.sh` / `.ps1`) foram feitas, e as capturas dos dashboards foram anexadas ao card #25. Esta linha substitui o aviso de "não validado" de 30/09/2026
  - Complementa (não substitui) o historiador SQLite do CX9240, que guarda os dados de negócio

- **Roteiro de Testes — Semana 7 (28/09–02/10/2026)**
  - Documento completo em `docs/testes/roteiros/semana_07_28_setembro-3_outubro.md` com 5 blocos de trabalho:
    - **Bloco 1:** Validação HiveMQ Cloud via Beckhoff_Guest e hotspot 4G (28/09) — ambas as redes funcionaram; a falha inicial do hotspot foi causada por SSID incorreto e “Maximizar compatibilidade” desativada
    - **Bloco 2:** Diagnóstico de potência IRF520 B/C (29/09) — roteiro de 4 fases com multímetro (jumper curto, tensão sob carga, resistência de soldas, teste de MOSFET)
    - **Bloco 3:** Burn-in test completo (30/09–01/10) — 7 cenários de stress (S1–S7) cobrindo sequência simples, concorrência, estoque vazio, reset, reconexão, alta frequência e telemetria remota HiveMQ+CX9240
    - **Bloco 4:** Acabamento mecânico (01/10) — finalização da base MDF (lixamento, fixação, organização de fiação) e desbaste da costura das esteiras para eliminar ponto de atrito
    - **Bloco 5:** Documentação e Cards (02/10) — atualização do CHANGELOG, preenchimento de comentários dos Cards #21–#25 e movimentação no GitHub Projects
  - Cronograma ajustado: Semana 7 inicia **segunda-feira 28/09** (não 29/09), 5 dias úteis até 02/10
  - Herda contexto da Semana 6: soldagem IRF520 concluída, diagrama elétrico publicado, base MDF montada, sketch `test_mqtt_cloud.ino` criado
  - Foco em **resolução dos dois problemas abertos** (rc=-2 HiveMQ e queda de potência B/C) antes do burn-in test integrado
  - **Resultado do Bloco 1:** conexão HiveMQ Cloud validada com sucesso via Beckhoff_Guest e hotspot 4G; o hotspot só funcionou após corrigir o SSID e ativar “Maximizar compatibilidade”. Não há base para atribuir a falha inicial exclusivamente ao firewall do SENAI
  - Templates de comentário preparados para os 5 cards de documentação/processo (#21 BOM, #22 Deployment Guide, #23 E2E Tests, #24 Firmware Versioning, #25 Telemetria)

- **Diagrama Elétrico Consolidado — Publicação Formal (23/09/2026)**
  - Diagrama elétrico do protótipo finalizado e publicado em:
    - `docs/fluxogramas/Diagrama elétrico.png` — renderização PNG (visualização direta no GitHub)
    - `docs/fluxogramas/Diagrama elétrico.pptx` — fonte editável (PowerPoint) para revisões futuras
  - Cobre esquema completo com todos os subsistemas:
    - **Arduino Uno** (pinos PWM 9/10/11 → IRF520, A0–A3/2/4 → sensores TCRT5000, A4/A5 → LCD I²C, pinos 5–8 → ULN2003)
    - **ESP32** (TX1/RX0 → divisor 1 kΩ/2 kΩ → Arduino UART; pinos 16/17 = bridge serial)
    - **3× drivers IRF520** — alimentação 12 V + sinal PWM 5 V por esteira (A, B, C)
    - **6× sensores TCRT5000** — entrada e junção de cada esteira
    - **LCD 16×2 I²C**, motor de passo **28BYJ-48 + ULN2003**, fonte 12 V/5 A
  - Referências cruzadas adicionadas em: `README.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATION_GUIDE.md`, `docs/cards_comments/card_bom_bill_of_materials.md`, `docs/cards_comments/card_deployment_guide.md`
  - **Gap resolvido:** "Diagrama elétrico não publicado" (identificado em `semana_06_22-26_setembro.md` §7.2)
  - Commits: `0f0782c`, `8d191fa`

- **Avanços de Bancada — Semana 6, Dia 22/09/2026**
  - **Soldagem das placas de passagem (IRF520 B/C) concluída** com sucesso
  - **Teste de continuidade elétrica** (multímetro) aprovado para ambos os módulos:
    - Continuidade VCC/GND verificada ✅
    - Continuidade GND driver ↔ GND fonte ✅
    - Resistência de ponte > 100 kΩ (motor desconectado) ✅
  - **Montagem da base de MDF** (≈60×40 cm) quase concluída — estrutura, fixação de esteiras e motores realizados; resta o acabamento visual
  - **Ajuste mecânico de esteira identificado:** costura da fita das esteiras apresenta ponto de atrito com a estrutura MDF, gerando eventual erro de processo → solução identificada (desbaste local) **reagendada para 25–27/09**, aguardando janela de desmontagem
  - **Teste de funcionamento completo** do sistema com os novos elementos (IRF520 B/C soldados) agendado para **23/09**

- **Roteiro de Testes — Semana 6 (22–26/09/2026)**
  - Documento completo em `docs/testes/roteiros/semana_06_22-26_setembro.md` com 5 blocos de trabalho:
    - **Bloco 1:** Verificação de soldagem dos módulos IRF520 (B/C) — testes elétricos com multímetro, validação de sinal PWM e testes funcionais
    - **Bloco 2:** Diagrama elétrico consolidado — levantamento de esquema, documentação CAD (unifilar + blocos), especificação de proteção (fusíveis/diodos)
    - **Bloco 3:** Montagem mecânica — base MDF 60×40 cm, fixação de esteiras/motores/sensores, organização de fiação, acabamento visual
    - **Bloco 4:** Validação integrada (burn-in test) — 7 cenários de stress test (sequência simples, carga concorrente, estoque vazio, reset durante operação, reconexão de rede, stress alta frequência, telemetria remota HiveMQ+CX9240)
    - **Bloco 5:** Documentação e gaps — mapeamento de pendências (BOM, deployment guide, testes E2E automatizados, firmware versioning)
  - Cronograma estruturado 22–26/09 com distribuição de tarefas por dia (manhã/tarde)
  - Identificados **7 gaps prioritários** com classificação de impacto (Alta/Média/Baixa): BOM ausente, diagrama elétrico não publicado, deployment guide ausente, firmware sem versioning, testes E2E manuais, documentação inline mínima, performance telemetria ausente
  - Sugestão de 5 cards para próxima sprint: BOM, Deployment Guide, Testes E2E Automatizados, Firmware Versioning, Telemetria Histórica (Grafana/InfluxDB)

### Alterado

- **Firmware Uno v3.0 — supervisão por marcos e diagnóstico mais claro (03/10/2026)**
  - Melhoria de processo, não correção de defeito no firmware anterior: marcos separados para partida (M1), trânsito (M2) e saída (M3), com fase e tempo nos erros
  - A v3.0 ainda aguarda validação em bancada na Semana 8; os resultados de 03/10 foram obtidos com o firmware anterior, que estava correto
- **Firmware Uno — confirmação de entrega pelo sensor de junção (02/10/2026)**
  - `TIMEOUT_ENTREGA` de **9000 ms → 12500 ms**: vigia só o trajeto topo → junção; sem confirmação da junção em 12,5 s a esteira (qualquer uma das três) é desligada e o sistema vai para `ERRO` (`timeout`) sem debitar o estoque
  - A confirmação passou a exigir uma **passagem** (o sensor precisa ser visto livre após ligar a esteira): sensor já em LOW na partida não debita estoque sozinho
  - Mantidos e documentados: o estoque só é debitado após a confirmação, e o motor segue ligado `TEMPO_SAIDA_ESTEIRA_MS` (3 s) depois dela, fora do timeout
  - **Não validado em bancada** (sem hardware nesta sessão): validar com o cenário de timeout do `docs/testes/plano_de_testes.md`

### Alterado

- **Firmware Uno — velocidade por esteira secundária (02/10/2026)**
  - Novas constantes `VELOCIDADE_ESTEIRA_A/B/C`; A e B seguem em `VELOCIDADE_SECUNDARIA` (200) e a esteira C usa PWM menor (`VELOCIDADE_ESTEIRA_C`, inicial 140) porque o novo motor é mais forte e entregava rápido demais
  - **Compilação local (02/10/2026):** os 4 sketches do job `arduino-compile` compilaram com `arduino-cli` 1.5.1 (Uno principal com a esteira C em PWM 140: 17432 bytes de flash, 54%). Só compilação, sem hardware; procedimento em `docs/CI-CD.md`
  - **Valor da C não calibrado:** ajustar em bancada após a troca do motor (tempo topo → junção parecido com A e B, partida com peça, folga em relação ao `TIMEOUT_ENTREGA`; avaliar `TEMPO_SAIDA_ESTEIRA_MS` por esteira se a saída da C divergir)

### Alterado

- **Estoque inicial de 15 peças por tipo (02/10/2026)**
  - Firmware Uno (`ESTOQUE_INICIAL`) e simulador agora começam com **15** peças de A, B e C (antes 5), para permitir mais rodadas de teste; o valor "5" do `index.html` era só o texto exibido antes da primeira mensagem e foi alinhado
  - O servidor real não guarda estoque inicial (espelha o que o Arduino publica); o estoque do Arduino continua voltando ao inicial a cada reinício
  - O painel de estoque do Grafana (`max: 5`) **não foi alterado**: com mais de 5 peças a barra fica cheia, mas o valor numérico continua correto
  - Estoque de software acima do número de peças físicas não protege nada: se faltar peça no topo, o sensor gera `sem_estoque`

### Problemas Conhecidos

- **Falha de conexão MQTT Cloud com `rc=-2` — investigação por rede (22–28/09/2026)**
  - **Sintoma:** ESP32 conecta ao WiFi, mas em determinada tentativa falha no broker HiveMQ Cloud com `rc=-2` (falha TCP/TLS)
  - **Resultado da validação em 28/09:** conexão HiveMQ Cloud bem-sucedida via `Beckhoff_Guest` e via hotspot 4G
  - **Causa da falha inicial do hotspot:** SSID incorreto e opção “Maximizar compatibilidade” desativada
  - **Conclusão:** ESP32, sketch e HiveMQ Cloud estão operacionais; não atribuir a falha inicial exclusivamente ao firewall do SENAI. Se o `rc=-2` voltar a ocorrer, investigar a rede específica e suas regras para a porta 8883
  - **Referência técnica:** `docs/testes/validações/troubleshooting_bancada_22-23_09.md` §Problema 1

- **Perda de Potência em Esteiras B/C Após Soldagem de Placas de Passagem (22–23/09/2026)**
  - **Sintoma:** Motores B/C apresentam velocidade/força reduzidas após montagem das novas placas IRF520 soldadas
  - **Hipótese principal:** Queda de tensão nos novos cabos (comprimento/bitola diferentes dos jumpers originais)
  - **Hipóteses secundárias:** Solda fria nos pontos de solda das placas IRF520 · Dano térmico nos MOSFETs durante soldagem · Fonte 12V/5A compartilhada no limite de corrente
  - **Diagnóstico:** Roteiro de 4 fases com multímetro documentado (teste com jumper curto + medição de tensão sob carga + teste de resistência de solda + teste de MOSFET)
  - **Mitigação em curso:** Aquisição de 2 expansores 110/220V→5V para alimentação dedicada de cada placa de passagem — **configuração já prevista no diagrama elétrico** (sem alteração de documentação necessária)
  - **Cronograma diagnóstico:** 25–27/09/2026 (paralelo ao burn-in test)
  - **Referência técnica:** `docs/testes/validações/troubleshooting_bancada_22-23_09.md` §Problema 2

### Adicionado

- **Hardening CI/CD — Upgrade Node.js v22 + Otimizações (17/09/2026)**
  - **NPM Audit:** Threshold alterado de `moderate` para `critical` (foco em vulnerabilidades reais CVSS ≥ 7.0)
  - **Node.js LTS:** Upgrade de v18 para v22 (v20 EOL em 04/2026; v22 suportado até 04/2028)
  - **Otimizações:**
    - npm caching em workflows (~80% mais rápido em downloads)
    - Arduino cache para cores/bibliotecas (~60% redução de tempo)
    - TruffleHog simplificado com `--only-verified`
  - **Documentação:** Nova seção "Estratégia: Gerenciamento de Vulnerabilidades npm" em `docs/CI-CD.md`
  - **Compatibilidade:** Express 4.22+, Socket.IO 4+, mqtt 5.0+ validados em Node.js v22.23.2

- **Historiador Beckhoff CX9240 — TwinCAT 3 + SQLite Local (15/09/2026)**
  - Projeto TwinCAT 3 (`CX9240_DataFlowInventory`) comissionado e testado com sucesso no CLP Beckhoff CX9240 rodando RT Linux ARM64.
  - Implementada assinatura dos tópicos `dataflow/estoque` e `dataflow/eventos` via **TF6701 IoT Communication**.
  - Persistência transacional em banco **SQLite local (`/var/lib/dfi/historian.db`)** com suporte a WAL mode via **TF6420 Database Server** em SQL Expert Mode, gravando nas tabelas `estoque_hist` e `eventos_hist`.
  - Integração validada de ponta a ponta contra o simulador `DataFlowInventory` (`MQTT_PUBLISH=true`), confirmando armazenamento fiel de `pecaA`, `pecaB`, `pecaC` e timestamps sincronizados.

- **Bancada de Hardware — Avanços Mecânicos e Replanejamento de Solda (15/09/2026)**
  - Realizados avanços estruturais na fixação, suporte e alinhamento mecânico das esteiras B e C na bancada de testes.
  - Testes elétricos e soldagem final dos módulos IRF520 (B/C) reprogramados para a rodada seguinte devido à restrição de tempo no dia 15/09.

- **CI/CD + Automação Multiplataforma — Sprint 5 (14–15/09/2026)**
  - **GitHub Actions** `.github/workflows/lint-and-security.yaml` criado com 4 jobs:
    - `lint-javascript`: ESLint em `server/` e `simulator/`
    - `secret-detection`: truffleHog detecta credenciais versionadas (`.env`, `secrets.h`)
    - `npm-audit`: npm audit em `server/`, `simulator/` e `test/mqtt_probe/`
    - `arduino-compile`: arduino-cli compila 4 sketches (Uno principal, ESP32 gateway, teste AB)
  - **Scripts de setup e validação multiplataforma** em `scripts/`:
    - `setup.sh` / `setup.ps1` — onboarding automatizado (instala deps, cria `.env`/`secrets.h`, valida segredos)
    - `validate-env.sh` / `validate-env.ps1` — detecta arquivos sensíveis em staging (segredos, `.env`)
    - `precommit-checks.sh` / `precommit-checks.ps1` — hook Git pré-commit (segredos + sintaxe JS)
  - **Limpeza do repositório:**
    - Remoção de `node_modules` rastreados acidentalmente no índice git (`test/mqtt_probe/node_modules/` e `simulator/node_modules/`) e reforço no `.gitignore`.
  - **Documentação consolidada:**
    - `docs/ARCHITECTURE.md` — **novo arquivo unificado** (substitui `arquitetura_mqtt.md` como referência técnica central; arquivo original mantido para histórico)
    - `docs/CI-CD.md` — **novo arquivo** com pipelines, workflows, troubleshooting e roadmap de testes automatizados
    - `docs/INTEGRATION_GUIDE.md` — **novo arquivo** com passo a passo para integração Beckhoff CX9240 (incluindo DDL SQL e especificação TwinCAT 3) + Separador (roda de separação)
    - `simulator/.env.example` — **novo arquivo** (similar ao `server/.env.example`; documenta variáveis MQTT para modo Beckhoff)
    - `docs/cards_comments/` — **nova pasta** com comentários prontos para aplicar nos cards do GitHub Projects (CI/CD, Separador, Beckhoff)
  - **Validação dos scripts concluída (15/09/2026):** todos os itens S1 a S6 do Bloco 5 validados com sucesso em ambientes Linux e Windows.

- **Simulador — Publicação MQTT opcional para integração Beckhoff CX9240 (15/09/2026)**
  - `simulator/server.js`: novo modo opcional (`MQTT_PUBLISH=true`, desativado por padrão) que
    publica o estoque no broker MQTT via cliente `mqtt` (nova dependência `^5.10.0`).
  - Tópico `dataflow/estoque`, payload `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}`,
    QoS 1 e **retained** — publica a cada mudança de estoque e imediatamente ao conectar,
    reproduzindo o mesmo contrato usado pelo gateway ESP32 real.
  - Validado localmente contra broker Mosquitto: mensagem confirmada como retained via
    `mosquitto_sub`. Publicação é não-bloqueante (falhas de conexão MQTT não afetam o
    funcionamento offline padrão via Socket.IO).
  - Variáveis de ambiente: `MQTT_PUBLISH`, `MQTT_BROKER_URL`, `MQTT_PORT`, `MQTT_USER`,
    `MQTT_PASS`, `MQTT_TOPIC_ESTOQUE`. Script `npm run start:mqtt` adicionado.
  - Documentação: nova seção "Integração Beckhoff CX9240" em `docs/arquitetura_mqtt.md`;
    `simulator/README.md` atualizado; critério de aceite do card de melhoria (lado simulador)
    marcado como concluído em `docs/testes/plano_de_testes.md`.
  - Persistência em banco (MySQL/MariaDB/PostgreSQL) e o programa do lado Beckhoff CX9240
    continuam fora do escopo — a cargo de outro agente, a validar em bancada própria.

- **Documentação — Reorganização dos roteiros de teste (03/09/2026)**
  - Consolidação de 8 arquivos diários em 4 arquivos semanais (`semana_01` a `semana_04`).
  - Atualização de todas as referências internas em `README.md`, `arquitetura_mqtt.md`,
    `board_github_projects.md`, `checklist_pre_teste_rede_infra.md` e `validações/README.md`.
  - READMEs adicionados em `simulator/`, `server/` e `frontend/` para melhor navegação.

- **Documentação — Reorganização do roteiro da Semana 4 (08/09/2026)**
  - Roteiro `semana_04_01-03_setembro.md` renomeado para `semana_04_08-12_setembro.md`,
    com início em 08/09 (hardware das esteiras B/C chegou no fim de semana).
  - Prioridade da semana realinhada: integração das esteiras **B e C** (Teste 5 completo
    A+B+C), desbloqueando o card #9.
  - **HiveMQ Cloud (Teste 6)** rebaixado a **subtarefa** da semana — execução condicionada
    a folga de tempo; cards #15/#16 concluídos e #17 (E2E remoto) pendente.
  - Referências ao nome antigo atualizadas em `board_github_projects.md` e
    `semana_03_27-28_agosto.md`.

- **Melhoria planejada — Integração do Simulador com o PC industrial Beckhoff CX9240 (08/09/2026)**
  - Proposta de melhoria futura para **persistência dos dados de estoque em banco
    MySQL/PostgreSQL** via comunicação MQTT entre o simulador e o PC Beckhoff CX9240.
  - Contrato proposto (tópicos/payload) documentado no roteiro
    `semana_04_08-12_setembro.md` (seção 7), a ser validado de forma cruzada com o agente
    responsável pelo programa do CX9240, que será desenvolvido por outro agente.
  - Validação prevista para **bancada de testes própria** (desacoplada da esteira A);
    a implementação completa fica para sprints/agentes futuros.
  - Sugerida a criação de card de melhoria (Template A / backlog) para rastreabilidade no
    GitHub Projects.

- **Frontend — Redesign do Painel Anunciador Industrial (02/09/2026)**
  - Painel anunciador com indicadores visuais IEC-60073 (LED status: verde/amarelo/vermelho).
  - Tipografia IBM Plex Sans (UI) e IBM Plex Mono (readouts de estado).
  - Roteamento hash de vistas: `#/` (painel principal) e `#/status` (histórico/equipamentos).
  - Depth panorâmico CSS-only (sem three.js) com parallax controller.
  - Single-row layout para o painel principal: Estado | Diagrama | Controle em uma banda horizontal.
  - Deduplicação de eventos em reconexão Socket.IO.
  - Alertas de estoque graduados: aviso (=3), alerta (=2), crítico (≤1).
  - Responsividade testada: 1920x1080, 1366x768, ≤720px.
  - **PR #19 mergeada**: `feat/dashboard-split-status-page` (commits e2669d7, 346f5b7, 55c82cb, 886cd04, 741e211).

### Corrigido

- **Comando inválido (ex.: `CMD:PECA:Z`) aparecia como "Comando enviado" no
  histórico do Dashboard, mesmo sendo rejeitado pelo gateway ESP32** *(03/09/2026)*.

  **Sintoma:** ao enviar um comando com peça inválida diretamente via MQTT Box
  (`{"acao":"solicitar_peca","peca":"Z"}` em `dataflow/comandos/sub`), o gateway
  ESP32 corretamente rejeitava o comando (`status: "rejeitado"`, `motivo:
  "peca_invalida"`) e publicava a rejeição em `dataflow/comandos/pub`. No
  entanto, o servidor Node.js emitia *todos* os payloads de `cmdPub` como evento
  `comando` para o frontend, que os adicionava ao histórico como
  `"comando_enviado"` — sem distinguir entre `status: "encaminhado"` e `status:
  "rejeitado"`. Adicionalmente, a função `solicitarPeca()` no frontend adicionava
  o registro ao histórico *antes* de o servidor confirmar ou rejeitar.

  **Causa-raiz (2 camadas):**
  1. `server/server.js` — handler `TOPICS.cmdPub`: emitia `io.emit('comando', msgJson)`
     sem checar `msgJson.status`, tratando rejeições do ESP32 idênticas a confirmações.
  2. `frontend/js/app.js` — `solicitarPeca()` e `resetSistema()`: chamavam
     `adicionarHistorico('comando_enviado', ...)` imediatamente ao clicar o botão,
     *antes* de qualquer validação. Além disso, o handler `socket.on('comando')`
     não inspecionava `data.status` para distinguir `encaminhado` de `rejeitado`.

  **Correção:**
  - `server/server.js`: o handler de `cmdPub` agora verifica `msgJson.status`.
    Se `"rejeitado"`, emite `comando_erro` (não `comando`) com `motivo` e `peca`.
  - `frontend/js/app.js`: `solicitarPeca()` e `resetSistema()` não adicionam mais
    registro ao histórico prematuramente — o registro é criado somente quando o
    servidor emite `comando` (confirmação) ou `comando_erro` (rejeição/erro).
  - `frontend/js/app.js`: o handler `comando` agora verifica `data.status`:
    se `"rejeitado"`, exibe como erro (borda vermelha) em vez de "comando enviado".
  - `frontend/js/app.js`: o handler `comando_erro` agora inclui `data.peca` (se
    disponível) na mensagem, melhorando a rastreabilidade do erro.

  **Comportamento esperado agora:**
  - Dashboard: peças A/B/C clicadas → "Comando enviado" aparece SOMENTE após
    confirmação do servidor/ESP32.
  - MQTT Box `peca: "Z"` → Histórico mostra "Erro: peca_invalida — Peça Z" com
    borda vermelha, NÃO "Comando enviado".
  - Servidor rejeita peça inválida no Socket.IO → `comando_erro` sem chegar ao MQTT.
  - `simulator/server.js`: o evento `pedido` passou a ser registrado somente apos a validacao de estoque (antes era emitido antes, seguido de `erro` quando a peca estava sem estoque) - alinhando o simulador ao fix aplicado no servidor real.



- **Dashboard travado em "ESP32 Offline" mesmo com o gateway online** — *regressão
  introduzida em `9a7ce25`*.

  **Sintoma:** ao abrir o Dashboard, o badge do gateway ficava permanentemente
  vermelho ("ESP32 Offline"), mesmo com o ESP32 conectado, publicando telemetria
  normalmente e com o `mqtt_probe` recebendo os JSONs. Um `F5` não resolvia.

  **Causa-raiz:** colisão de **mensagens retidas (retained)** no tópico
  `dataflow/status`. Tanto o ESP32 (via LWT + publish `online`) quanto o servidor
  Node publicavam status **retained no mesmo tópico**. Como o broker guarda apenas
  **uma** mensagem retida por tópico, quem publicasse por último "vencia". No
  `start_services.bat` o servidor sobe **depois** do ESP32, então o retained do
  servidor (`{"type":"server","status":"online"}`) sobrescrevia o do gateway
  (`{"type":"gateway","status":"online"}`). Ao conectar, o Dashboard recebia apenas
  o retained do *server*, que cai no ramo `else` do roteamento — o evento
  `io.emit('gateway', ...)` nunca era disparado no carregamento inicial.

  **Correção:** separação de tópicos seguindo a convenção hierárquica MQTT:
  - `dataflow/status` → **exclusivo do gateway ESP32** (telemetria da FSM + presença via LWT)
  - `dataflow/status/server` → **exclusivo do servidor Node** (presença + LWT), configurável
    por `MQTT_TOPIC_STATUS_SERVER`

  O servidor continua **inscrito** em `dataflow/status` (apenas consome, não publica).
  Os três pontos que publicavam o status do server (LWT `will`, publish no `connect`
  e o `shutdown` gracioso) passaram a usar o novo tópico.

  **Validação em bancada:** com o broker real, confirmado que os dois retained passam
  a coexistir sem sobrescrita, que o log do servidor exibe `[WS →] Gateway ESP32: online`
  ao receber o retained do gateway, e que `GET /api/status` retorna `"gateway":"online"`.

  > **Limpeza necessária uma única vez:** brokers que já rodaram a versão com o bug
  > guardam um retained "envenenado" em `dataflow/status`. Limpe com:
  > ```
  > mosquitto_pub -h localhost -t dataflow/status -r -q 1 -n
  > ```
  > (publicar payload vazio com `-r` apaga a mensagem retida do tópico).

- **Dashboard AINDA em "ESP32 Offline" após a correção acima — segunda causa: broker
  MQTT duplicado / rede particionada.**

  Mesmo com a separação de tópicos, o badge continuava vermelho. O diagnóstico ao vivo
  (`Get-NetTCPConnection` na porta 1883) revelou **dois processos `mosquitto.exe`**
  escutando simultaneamente:
  - O **serviço automático do Windows** (`StartType: Automatic`), iniciado **sem** o
    `mosquitto.conf`, tomava a 1883 **apenas em loopback** (`127.0.0.1` + `::1`).
  - O broker do `start_services.bat` (com `-c mosquitto.conf`) subia em `0.0.0.0`
    (toda a rede) — sem conflito, porque o primeiro só ocupava o loopback.

  Com isso a rede MQTT ficava **particionada**:
  - O **servidor Node** conectava em `mqtt://localhost` → resolvido para `::1` (IPv6) →
    caía no broker **loopback-only**.
  - O **ESP32** conectava no IP `192.168.x.x` → caía no broker **`0.0.0.0`**.

  Os dois publicavam/assinavam em brokers **diferentes**: o retained
  `{"type":"gateway","status":"online"}` do ESP32 nunca chegava ao servidor,
  `estadoAtual.gateway` ficava `{}` e o `estado_inicial` enviado ao dashboard não
  trazia o gateway — o badge permanecia no estado padrão do HTML ("ESP32 Offline").

  **Correção:** desabilitar o serviço automático do Windows para que exista **um único
  broker** (o do `start_services.bat`):
  ```
  net stop mosquitto
  sc config mosquitto start= demand
  ```
  **Confirmação:** após a correção, `Get-NetTCPConnection` mostrou server, `mqtt_probe`
  e ESP32 todos conectados ao **mesmo** PID de broker, e `GET /api/status` passou a
  retornar `"gateway":"online"` com contadores crescentes em `dataflow/status`.

  **Endurecimentos aplicados para evitar recorrência:**
  - `server/.env` e `.env.example`: `MQTT_BROKER_URL` passou de `mqtt://localhost` para
    `mqtt://127.0.0.1` (IPv4 explícito) — remove a ambiguidade `localhost`→`::1` que
    ajudou a mascarar a partição.
  - `start_services.bat`: **checagem de pré-voo** — se a porta 1883 já estiver em uso
    por outro processo, o script aborta com instruções em vez de subir um segundo broker
    silenciosamente.
  - `checklist_pre_teste_rede_infra.md`: passo "garantir um único listener na 1883".

### Alterado

- `server/.env.example`: documentada a nova variável `MQTT_TOPIC_STATUS_SERVER`
  (padrão `dataflow/status/server`).
- **Documentação de credenciais atualizada** para o fluxo `secrets.h` introduzido em
  `35fe3d5`. Os textos ainda mandavam editar SSID/senha dentro do `.ino`:
  - `README.md` — passo "Configurar o ESP32"
  - `docs/arquitetura_mqtt.md` — "Como Rodar", seção HiveMQ Cloud e árvore de diretórios
  - `docs/testes/validações/checklist_pre_teste_rede_infra.md` — seções 2, 4 e 7
  - `docs/testes/roteiros/semana_03_27-28_agosto.md` — novo Bloco 0.a (setup do `secrets.h`)
- `docs/arquitetura_mqtt.md`: tabela de tópicos agora identifica quais são **retained**
  e qual componente é o **dono** de cada tópico de status.
- `docs/testes/roteiros/semana_03_27-28_agosto.md`: título corrigido (estava
  "26/08/2026" em um arquivo de 27/08) e roteiro reescrito para cobrir as mudanças
  de `35fe3d5` e `9a7ce25` — novos blocos **3.A** (rejeições explícitas de comando),
  **3.B** (estoque retained/reconciliação), **3.C** (reconexão Wi-Fi não-bloqueante)
  e **3.D** (validação, rate limit, health check 503, helmet/CSP, CORS e shutdown).

---

## [35fe3d5] — Firmware: segredos externos e loop não-bloqueante

### Segurança

- Credenciais de Wi-Fi e MQTT movidas de `gateway_mqtt.ino` para
  `esp32/gateway_mqtt/secrets.h`, ignorado pelo `.gitignore`, com modelo versionado
  em `secrets.h.example`.

  > ⚠️ **Atenção:** as credenciais antigas **permanecem no histórico do Git**. Trate a
  > senha de Wi-Fi anterior como comprometida e **troque-a**. Para expurgar o histórico,
  > use `git filter-repo` ou BFG — em acordo com o time, pois reescreve os hashes.

### Alterado

- **Reconexão Wi-Fi não-bloqueante:** `manterWiFi()` virou máquina de estados; o `loop()`
  não trava mais durante quedas de rede, mantendo `mqtt.loop()` e a leitura da Serial2 vivas.
- **Pausa pós-entrega não-bloqueante** (substitui `delay()`).
- `dataflow/estoque` passou a ser publicado como **retained**, permitindo que clientes
  que conectam depois recebam o último estoque conhecido sem esperar uma nova entrega.

### Adicionado

- Rejeições **explícitas** de comando encaminhadas ao Arduino: `peca_invalida`,
  `ocupado` e `comando_desconhecido` (antes, comandos inválidos eram descartados
  em silêncio, dificultando o diagnóstico em bancada).

---

## [9a7ce25] — Servidor: segurança, resiliência e telemetria

### Segurança

- `helmet` + **CSP** aplicados ao Express.
- **CORS restrito** por `ALLOWED_ORIGIN` (lista separada por vírgulas) no Express e no Socket.IO.
- **Rate limit por socket** para comandos (`COMANDO_INTERVALO_MS`, padrão 500 ms).
- **Validação de entrada** dos comandos vindos do front-end (apenas peças `A`, `B`, `C`).

### Adicionado

- **QoS 1** em publicações e assinaturas MQTT.
- **LWT do próprio servidor** + publicação de presença retida.
- **Health check** `/api/status` enriquecido (estado do broker, gateway, clientes WebSocket,
  métricas e uptime), respondendo **HTTP 503** quando o broker está indisponível.
- **Shutdown gracioso** em `SIGINT`/`SIGTERM`, publicando `offline` antes de encerrar.

> ⚠️ Esta entrega introduziu a regressão do status do gateway corrigida na seção
> **[Não publicado] → Corrigido** acima.
>
> 📝 Nota de processo: a mensagem deste commit ficou poluída com o texto de um prompt
> de ferramenta. Ver as convenções em [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## [b2ec47d] — Timeout de entrega e sincronismo de estoque

### Corrigido

- `TIMEOUT_ENTREGA` ajustado de **8000 ms → 12000 ms**: a peça chegava ao sensor de
  junção, mas não tinha tempo de sair fisicamente da esteira secundária, gerando
  falsos positivos de `ERRO`.
- **Dessincronismo de estoque LCD × Dashboard** (LCD mostrava 3, Dashboard mostrava 0):
  `publicarEstoque()` passou a ser chamado no `setup()` e no tratamento de `CMD:RESET`.
