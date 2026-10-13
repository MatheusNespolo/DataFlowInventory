# Roteiro de Testes — Semana 10 (19–23/10/2026)

> Replanejamento das atividades adiadas da Semana 8. Firmware Uno v3.0 validado; itens 1.1–1.11 e Bloco 2 aprovados. B e C foram testadas com o firmware novo e estão funcionando. **Não presumir aprovação de A+B+C, calibração ou separador:** registrar evidências nesta semana.

## Objetivos

1. Completar o Bloco 3: integração A+B+C e calibração com valores medidos.
2. Resolver a validação do separador, condicionada à segurança elétrica e à aprovação mecânica isolada conforme o [roteiro da Semana 9](semana_09_14-18_outubro.md).
3. Consolidar resultados opcionais de Data Flow System e CX9240 feitos no fim de semana anterior.

## Cronograma proposto

| Data | Atividade | Saída esperada |
|---|---|---|
| **19/10 (seg.)** | Revisar evidências da Semana 9, montagem e pré-voo; inspecionar reinstalação do IRF520 definitivo da C. | Checklist de segurança e configuração; adiar energização se pinagem/alimentação não estiverem confirmadas. |
| **20/10 (ter.)** | Testes integrados A+B+C, gradualmente e com uma esteira por vez; verificar sensores, pedidos e erros. | Resultado por esteira e de integração; falhas com mensagens/logs preservados. |
| **21/10 (qua.)** | Calibração de A/B/C: medir repetidamente tempo topo → junção e ajustar PWM de forma controlada. | Tabela de medições e configuração antes/depois; não substituir limites sem justificativa. |
| **22/10 (qui.)** | Repetição de cenários instáveis; separador: teste/integracão somente se os critérios da Semana 9 foram aprovados. | Evidência de estabilidade ou bloqueio explícito. |
| **23/10 (sex.)** | Fechamento, atualizar plano de testes, arquitetura/guia de integração e changelog conforme fatos; encaminhar pendências. | Registros consistentes e referências cruzadas atualizadas. |

## Bloco 3 — integração e calibração A+B+C

Pré-requisitos: firmware v3.0 já validado; verificar alimentação, GND comum, proteções, sensores e configuração dos módulos. A C usou provisoriamente o módulo IRF520 da A; confirmar a configuração presente antes de cada ensaio.

- [ ] Verificar sensores de topo e junção de A/B/C individualmente.
- [ ] Executar pedidos de A, B e C individualmente; verificar motor, entrega, estoque e retorno ao estado de espera.
- [ ] Executar sequência alternada A/B/C, sem acionamento simultâneo nem reset inesperado.
- [ ] Validar `motor_sem_avanco`, `timeout`, `juncao_obstruida` e recuperação, quando viável e seguro.
- [ ] Medir pelo menos três ciclos por esteira: tempo topo → junção e tempo total de entrega; informar dispersão/condições da medição.
- [ ] Calibrar PWM gradualmente e registrar valor anterior/novo; manter tempo de trânsito compatível com os marcos configurados e margem para o timeout M2 de 12,5 s.
- [ ] Conferir se entrega/estoque/eventos permanecem consistentes após sequências repetidas.

| Esteira | PWM antes | PWM validado | Tempos medidos (ms) | Ciclos | Status/observações |
|---|---:|---:|---|---:|---|
| A |  |  |  |  |  |
| B |  |  |  |  |  |
| C |  |  |  |  |  |

**Portão do Bloco 3:** [ ] três esteiras individualmente aprovadas · [ ] integração A+B+C aprovada · [ ] medições/calibração registradas · [ ] falhas e resets documentados. Aprovado por/data: __________.

## Separador

Executar apenas se a frente isolada do roteiro da Semana 9 foi aprovada. Não ativar diretamente o exemplo legado de `docs/INTEGRATION_GUIDE.md`; validar a solução atual, incremental e compatível com watchdog. Se integração de firmware não tiver sido implementada/revisada e testada em PC, limitar a sessão a ensaios isolados já aprovados.

- [ ] Referência inicial e limitações de posição após reinício documentadas.
- [ ] Posições A/B/C repetíveis sem e com peça.
- [ ] Nenhuma perda de passo, aquecimento anormal, travamento ou reset.
- [ ] Se integrado: ciclo pedido → esteira → separador validado para A/B/C, com testes de lógica e compilação correspondentes.

## Fechamento e evidências

Anexar logs Serial/MQTT relevantes, configuração de hardware, firmware/commit, dados de calibração e evidência do CX9240/Data Flow System conforme executados. Marcar cada item como aprovado, falhou, bloqueado ou não executado. Atualizar [`plano_de_testes.md`](../plano_de_testes.md), [`ARCHITECTURE.md`](../../ARCHITECTURE.md), [`INTEGRATION_GUIDE.md`](../../INTEGRATION_GUIDE.md) e [`CHANGELOG.md`](../../CHANGELOG.md) sem converter planos em resultados.
