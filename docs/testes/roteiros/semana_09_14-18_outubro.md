# Roteiro de Testes — Semana 9 (14–18/10/2026)

> **Planejamento atualizado em 13/10/2026.** Datas e disponibilidade conforme confirmação da equipe: hardware completo disponível no sábado e domingo. Dias úteis priorizam preparação, verificação segura e documentação; testes opcionais de sistema e CX9240 ficam no fim de semana.

## Objetivos e prioridades

1. **Prioridade máxima: validar o código do separador**, atualmente registrado/comentado no firmware Uno v3.0. Distinguir teste elétrico/mecânico isolado de eventual integração ao ciclo do firmware; não considerar integrado antes do teste completo.
2. Preparar a conclusão do **Bloco 3 — A+B+C e calibração**, replanejado para 19–23/10. B e C já foram confirmadas funcionando com firmware v3.0, mas ainda falta teste conjunto e calibração com medições registradas.
3. Tarefas opcionais de fim de semana: Data Flow System e integração/historiador Beckhoff CX9240, em frentes independentes.

Referências: [fechamento da Semana 8](semana_08_05-09_outubro.md), [validação do firmware v3](firmware_uno_v3_validacao.md), [guia de integração](../../INTEGRATION_GUIDE.md) e [plano de testes](../plano_de_testes.md).

## Dias úteis — quarta a sexta (14–16/10)

| Data | Atividade | Critério / registro |
|---|---|---|
| **14/10 (qua.)** | Inventariar hardware e pinagem do separador; inspecionar motor 28BYJ-48, driver ULN2003, alimentação própria de 5 V e GND comum; confirmar módulo IRF520 definitivo da esteira C. Revisar riscos de carga/movimento. | Fotografar/registrar configuração e bloqueios. Não alimentar motor de passo pelo pino 5 V do Uno. Não habilitar o trecho legado v2.x diretamente na v3.0. |
| **15/10 (qui.)** | Preparar procedimento/sketch controlado para teste isolado do separador e critérios de parada; confirmar pinagem e limites elétricos contra a montagem real. Conferir plano de ensaio do IRF520 definitivo. | Só executar se circuito e alimentação forem identificados e seguros. Se não houver certeza sobre pinagem, driver ou sketch, parar e registrar pendência — não improvisar. |
| **16/10 (sex.)** | Executar, se preparado e seguro, verificação elétrica do driver e movimento isolado do motor sem carga; preparar sessões independentes de Data Flow System e CX9240 para o fim de semana. | Registrar sequência de passos, sentido, posição inicial/final, repetibilidade, ruído/aquecimento e falhas. Sem integração FSM nesta etapa. |

## Sábado e domingo (17–18/10) — hardware completo

As seguintes frentes são opcionais e independentes. Podem ocorrer em paralelo com responsáveis/equipamentos separados; registrar o ambiente, firmware e evidências de cada uma.

### Frente A — separador (prioridade)

- [ ] Confirmar alimentação própria regulada do motor e GND comum; inspecionar ULN2003 e cabeamento antes de energizar.
- [ ] Testar sentido e uma rotação controlada sem peça; observar corrente, aquecimento, ruído e resets do Uno.
- [ ] Confirmar referência/posição inicial e comportamento após desligar/religar. Como não há sensor de referência, documentar perda de posição — não alegar posicionamento absoluto após reinício.
- [ ] Testar posições A/B/C e retorno repetido sem carga; registrar passos/comandos e desvio observado.
- [ ] Testar com peça apenas depois de repetibilidade sem carga. Parar se houver perda de passo, travamento, aquecimento anormal ou reset.
- [ ] **Integração ao firmware é condicional:** só após aprovação do teste isolado, revisão da arquitetura não bloqueante/watchdog, testes de lógica, compilação e teste completo controlado. Se isso não couber, registrar código/mecânica como pendente; não ativar as instruções legadas da §2.3 do guia de integração.

**Aprovação da frente:** [ ] elétrico seguro · [ ] movimento repetível · [ ] comportamento de reinício documentado · [ ] integração (se realizada) testada para A/B/C. Responsável/data: __________.

### Frente B — Data Flow System (opcional)

- [ ] Fazer pré-voo de infraestrutura conforme [`validações/README.md`](../validações/README.md); registrar versão do firmware, broker e montagem.
- [ ] Exercitar o fluxo disponível de pedido/telemetria e verificar dashboard, estoque, eventos e recuperação sem interferir na frente do separador.
- [ ] Anotar falhas, logs e critérios aprovados. Não marcar A+B+C calibrado sem medir os tempos/PWM de cada esteira.

### Frente C — Beckhoff CX9240 (opcional, independente)

- [ ] Confirmar broker e contrato MQTT configurados; não alterar o publicador principal durante ensaio integrado.
- [ ] Verificar conexão/subscrição do CX9240 e persistência de estoque/eventos no SQLite; confirmar novos registros no historiador.
- [ ] Registrar desconexão/reconexão e evidência no banco, se houver tempo; separar falha de rede de falha de persistência.
- [ ] Usar simulador como fonte isolada se necessário; isso valida o lado CX9240, mas não substitui teste físico das esteiras.

## Saída da semana e passagem para 19–23/10

Ao final de cada sessão, preencher resultado, responsável, horário, configuração, medições e evidências; marcar **não executado** em vez de inferir sucesso. Na Semana 10:

1. completar A+B+C e calibração, incluindo tempo topo → junção da C e valores PWM medidos;
2. repetir cenários necessários de timeout/erro no firmware v3.0 se a validação conjunta exigir;
3. fechar separador apenas conforme critérios acima — ou manter explicitamente pendente com bloqueios;
4. consolidar resultados do Data Flow System e CX9240 no [plano de testes](../plano_de_testes.md) e no [CHANGELOG](../../CHANGELOG.md).
