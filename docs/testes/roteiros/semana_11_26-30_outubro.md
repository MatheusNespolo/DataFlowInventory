# Roteiro de Testes — Semana 11 (26–30/10/2026)

> **Estado da bancada (23/10/2026):** a funcionalidade básica das esteiras foi validada na quarta-feira da Semana 10; o ajuste de PWM/kick foi registrado nos últimos commits e o que resta é a montagem na base e a validação final do sistema montado na estrutura do projeto. Esta semana será tratada como a última bancada de teste, com integração total ao final do período.

## Resumo e objetivo

1. Fixar as esteiras na base e testar uma a uma na estrutura final, garantindo que a montagem não altere o funcionamento padrão.
2. Validar o comportamento do sistema como um conjunto, com cargas/entregas repetidas e sem reset ou perda de sincronismo.
3. Testar as impressões 3D: roda separadora para motor de passo e peça que percorre as esteiras.
4. Encerrar a semana com a integração total do sistema e o registro documental do resultado final.

## Cronograma

| Data | Atividade | Saída esperada |
|---|---|---|
| **26/10 (seg.)** | Revisão da bancada e checklist final de montagem. | Base/estrutura, fixação das esteiras, alinhamento, GND e alimentação conferidos. |
| **27/10 (ter.)** | Inspeção mecânica e montagem final do conjunto. | Esteiras fixadas e sem obstruções, deslocamento e alinhamento registrados. |
| **28/10 (qua.)** | Teste individual por esteira na base. | Resultado por esteira com falhas/ajustes documentados. |
| **29/10 (qui.)** | Integração parcial e ciclo de pedido A/B/C. | Sequência operacional estável; registro de falhas e reset. |
| **30/10 (sex.)** | Validação das peças 3D + integração total final. | Evidência final de funcionamento e fechamento da bancada. |

---

## Bloco 1 — montagem final na estrutura do projeto

### Checklist obrigatório

- [ ] Base e estrutura conferidas e alinhadas.
- [ ] Esteiras fixadas na base sem tensão mecânica excessiva.
- [ ] Sentido de rotação e alinhamento dos motores revisados.
- [ ] Fiação reorganizada para evitar contato, atrito ou movimento de cabo.
- [ ] Sensores e entradas de detecção preservados na mesma geometria de teste anterior.
- [ ] GND comum e alimentação estáveis antes de qualquer energia.

### Critério de saída

- [ ] A montagem não altera a lógica da FSM nem a calibração já registrada.
- [ ] Nenhuma esteira apresenta travamento, folga excessiva ou intermitência após a fixação.
- [ ] Registro fotográfico e observações de alinhamento ficam no relatório da semana.

---

## Bloco 2 — teste individual de cada esteira na base

### Procedimento

1. Instalar uma esteira por vez na estrutura final e deixar a bancada estável.
2. Testar pedido individual da peça correspondente.
3. Registrar tempo de trânsito, partida, entrega, parada e retorno ao estado de espera.
4. Repetir ao menos 5 ciclos sem falhas para confirmar robustez.
5. Repetir a mesma sequência com cada uma das esteiras antes de avançar para a integração total.

### Tabela de registro

| Esteira | Resultado | Tempo de entrega | Ciclos | Falhas | Observações |
|---|---|---:|---:|---|---|
| A |  |  |  |  |  |
| B |  |  |  |  |  |
| C |  |  |  |  |  |

### Critério de saída

- [ ] Cada esteira funciona no mesmo ponto de montagem previsto para a estrutura.
- [ ] Nenhuma mudança de comportamento severa foi observada após a fixação.
- [ ] Falhas mecânicas, elétricas ou de detecção são registradas e tratadas antes da integração total.

---

## Bloco 3 — integração parcial e total

### Fase de integração parcial

- [ ] Conduzir sequência A/B/C individual e alternada sem reset inesperado.
- [ ] Verificar entregas, estoque, timeouts e recuperação.
- [ ] Testar a operação com peças em fila e eventos em sequência.

### Fase de integração total

- [ ] Executar sequência contínua de pedidos com as três esteiras ativas.
- [ ] Verificar ocorrência de ocupação, rejeição, overrun e sincronização de sensores.
- [ ] Garantir que a estrutura final não introduziu pontos de colisão, desalinhamento ou bloqueio.

### Critério de saída

- [ ] Integração total concluída com registro de logs e sequência de eventos.
- [ ] Sistema estável em operação em série ao fim da semana.
- [ ] Qualquer falha restante é explicitamente classificada como pendência ou ajuste de bancada.

---

## Bloco 4 — validação das impressões 3D

### Produto 1 — roda separadora para motor de passo

- [ ] Verificar encaixe e alinhamento do eixo do motor de passo.
- [ ] Confirmar giro sem atrito excessivo ou ressalto.
- [ ] Validar que a posição dos compartimentos permanece consistente na operação.
- [ ] Registrar desvio do centro, vibração e ruído.

### Produto 2 — peça que percorre as esteiras

- [ ] Confirmar encaixe e estabilidade ao longo da esteira.
- [ ] Validar que a peça não entala, não derruba sensores nem altera o fluxo normal.
- [ ] Testar em diferentes condições de deslocamento e em ciclos múltiplos.
- [ ] Medir e registrar qualquer aspecto que exija ajuste de tolerância.

### Critério de saída

- [ ] A peça e a roda separadora operam sem interferência na bancada.
- [ ] Ajustes de impressão, tolerância ou montagem são registrados para correção imediata.

---

## Fechamento e evidências

Ao final da semana, anexar:

- logs Serial/MQTT relevantes;
- fotos da montagem final;
- tabela de teste por esteira;
- resultados do separador e das peças 3D;
- relatório final de integração total;
- ajuste de firmware ou montagem que tenha sido necessário.

Marcar cada item como **aprovado**, **falhou**, **bloqueado** ou **não executado**.

Também registrar:

- **LCD:** `lcd_end`/`i2c_n`/`lcd_quedas` do status e eventual troca do módulo.
- **Separador automático:** o resultado deve ser explicitado como validado, pendente ou não executado.
- **Estrutura do projeto:** confirmar se as modificações mecânicas da base preservaram o comportamento original.

Atualizar [`../plano_de_testes.md`](../plano_de_testes.md), [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md), [`../../INTEGRATION_GUIDE.md`](../../INTEGRATION_GUIDE.md) e [`../../CHANGELOG.md`](../../CHANGELOG.md) com os resultados reais, sem transformar plano em aprovação sem evidência.
