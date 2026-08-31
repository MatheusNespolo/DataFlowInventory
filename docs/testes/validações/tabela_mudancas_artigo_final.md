# Tabela de Mudanças Relevantes — Para o Artigo Final

| # | Mudança | Rodada / Data | Justificativa Técnica | Impacto no Sistema |
|---|---------|---------------|----------------------|-------------------|
| 1 | **Divisor de tensão 1k/2kΩ + GND comum** obrigatório na UART | 19→20→25/08 | Causa raiz de 3 bloqueios (silêncio total Serial). Nível 5V→3.3V | **Crítico** — integração 5V↔3.3V; lesson learned |
| 2 | **Mosquitto `listener 1883 0.0.0.0`** no conf | 20/08 | Mosquitto 2.x default bind `127.0.0.1` impedia ESP32 remoto | **Crítico** — config rede broker |
| 3 | **Firewall Windows porta 1883** (regra entrada) | 20/08 | Broker acessível local mas não pela rede Wi-Fi | **Crítico** — infraestrutura de rede |
| 4 | **Timeout de entrega = 12 s** (`TIMEOUT_ENTREGA=12000`) | 25/08 | Valor 8s causava timeout falso: peça chegava no sensor mas não limpa a esteira secundária | **Funcional** — calibração por medição real (5s medidos + margem) |
| 5 | **PWM esteira principal removido** (liga direto na fonte) | 18→25/08 | Simplificação: 3 drivers para 3 secundárias | **Arquitetural** — reduz pinos/custo |
| 6 | **Pinagem sensores**: J2=D2, J3=D4 (A4/A5 livres p/ I2C) | 19→25/08 | Conflito J2=A4 resolvido; I2C isolado | **Hardware** — evita colisão barramento |
| 7 | **LWT MQTT** (Last Will) no ESP32 | 20→25/08 | Broker publica `gateway/offline` retained se ESP32 cai | **Confiabilidade** — detecta HW offline |
| 8 | **`CMD:RESET` com `startsWith()`** (robustez parsing) | 25/08 | Match exato falhava com whitespace residual | **Robustez** — alinhado a `CMD:PECA:` |
| 9 | **Arquitetura dual-mode** (Simulador + Real) unificada | 18→25/08 | Mesmo dashboard serve ambos | **Metodológico** — valida frontend sem HW |
| 10 | **Reorganização `docs/`** (subpastas artigo/fluxogramas/testes) | 21/08 | Padronização snake_case + links relativos | **Documentação** — rastreabilidade |
| 11 | **Sincronismo Estoque LCD ↔ Dashboard** (`publicarEstoque` no setup/reset) | 25/08 | Dashboard não recebia estoque inicial nem após reset; LCD e Dashboard dessincronizados | **Funcional** — consistência de estado distribuído |
| 12 | **Estratégia local-first (Mosquitto → HiveMQ)** | 26/08 | Decisão metodológica de mitigação de risco: validar toda a lógica de FSM + comunicação Serial/MQTT no broker local (sem TLS, sem nuvem, sem dependência de internet) **antes** de migrar para broker remoto — isola variáveis "rede/TLS/certificados" da lógica de negócio | **Metodológico / Gerencial** — reduz tempo de debug em produção; permite testes de bancada offline |
| 13 | **Recalibração do Timeout para 9 s + Separação de tópicos de status** | 27→28/08 | Timeout recalibrado (`TIMEOUT_ENTREGA=9000` + `TEMPO_SAIDA_ESTEIRA_MS=3000`) após medição de travessia real (~5s até sensor + 3s saída); `dataflow/status` exclusivo do gateway e `dataflow/status/server` para Node | **Funcional / Arquitetural** — evita falsos erros de timeout e elimina sobrescrita de LWT retained |