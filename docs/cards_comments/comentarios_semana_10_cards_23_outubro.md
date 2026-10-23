# Comentários — Semana 10/11 (23/10/2026) — atualização de cards e trilha de evidência

> Este arquivo serve como texto-base para comentários de card no GitHub Projects quando a equipe precisar atualizar o dashboard manualmente. Mantém a referência a commits e às evidências da bancada para não deixar os cartões desatualizados.

---

## Card: Calibração e PWM das esteiras

```
## 🧪 Atualização de bancada — 23/10/2026

**Status:** `In Progress` → `Done` (parcial / revisão final caso a montagem na base exigir reteste)
**Evidência:** commits `ddf526a`, `1e8fbf1` e `d4ecc2f`

- Todas as esteiras foram executadas na quarta-feira em bancada.
- O ajuste de PWM/kick foi registrado e está documentado no firmware e no roteiro da Semana 10.
- O restante da validação não é mais de funcionalidade básica, mas da montagem final na estrutura do projeto.
- A montagem na base pode exigir uma rodada de reteste individual antes da integração total.
```

---

## Card: Montagem final na estrutura / base do projeto

```
## 🧪 Atualização de bancada — 23/10/2026

**Status:** `Todo` → `In Progress`
**Evidência:** roteiro da Semana 10 + etapa de fixação final da bancada

- A funcionalidade básica das esteiras já foi validada; agora o foco é a montagem física na base.
- Todo teste deve ser repetido uma esteira por vez após a fixação para confirmar que a estrutura não afeta o funcionamento padrão.
- O critério de sucesso é: cada esteira funcionando sem perda de comportamento após a montagem final.
```

---

## Card: Peças 3D e separador

```
## 🧪 Atualização de bancada — 23/10/2026

**Status:** `Backlog` → `Todo`
**Evidência:** impressões 3D prontas; validação prevista para a Semana 11

- A roda separadora para motor de passo e a peça que percorre as esteiras ficaram prontas.
- Testes focados em alinhamento, comando do motor de passo e travamento/movimento da peça.
- A validação mecânica acompanha a integração total da semana que vem.
```

---

## Card: Integração total / última bancada de teste

```
## 🧪 Atualização de bancada — 23/10/2026

**Status:** `Todo` → `Planned`
**Evidência:** roteiro da Semana 11

- Semana 11 será a última bancada de teste com integração completa ao final da semana.
- A etapa inclui montagem final, testes por esteira, validação do separador e peças 3D, e fechamento de integração.
- A conclusão desta fase deve ser registrada em roteiro e no CHANGELOG como evidência final.
```

---

## ✅ Publicado no GitHub Projects — 23/10/2026

> Os blocos acima foram a proposta inicial. A publicação final seguiu a revisão da equipe: a "montagem final na base" ficou no card existente #1 (que já inclui a roda giratória), e o trabalho concluído sem card ganhou cards novos, criados já em `Done` e fechados. O texto completo de cada card e de cada comentário está na própria issue.

### Cards novos — concluídos (`Done`)

| Card | Título | Data validação | Evidência |
|---|---|---|---|
| #58 | Firmware Uno v3.0 — Supervisão de Entrega por Marcos e Robustez | 04/10 | `a0d129c` (#43), `fddde08` (#42), `91f7e26` (#32), `2f91454` (#35) |
| #59 | Calibração de PWM e Kick por Esteira (A/B/C) | 21/10 | `e3c8833`, `ddf526a`, `d4ecc2f` |
| #60 | LCD — Varredura de Endereço I²C e Recuperação de Quedas | 18/10 | `428e1d9` (#54) — firmware concluído; módulo sem resposta no I²C (troca em #66) |
| #61 | Separador (Roda Giratória) — Firmware sem Bloqueio e Preparo Automático | 18/10 | `d655a50` (#53), `e448ce3` (#55), `3095506` (#56) — firmware concluído; validação física em #65 |
| #62 | Dashboard — Arquitetura 3D Navegável e Separador Animado no Diagrama | 21/10 | `fee5cdd` (#28), `9907c7c`, `af718e0` (#57) |
| #63 | CI/CD — Compilação do Arduino, Testes da Lógica do Firmware e Auditoria npm | 08/10 | #31, #34, #44, #47, #48, #50 |
| #64 | Divulgação — Página de Apresentação do Projeto | 08/10 | `54a9761` (#40), `0b5005b` (#51) |

### Cards novos — Semana 11 (`Todo`)

| Card | Título | Prioridade | Dependências |
|---|---|---|---|
| #65 | Validação das Peças 3D — Roda Separadora e Peça das Esteiras | P1-Alto | Bloqueado por #1; bloqueia #66 |
| #66 | Integração Total — Última Bancada de Teste (30/10) | P0-Crítico | Sub-issue de #9; bloqueado por #1 e #65 |

### Cards existentes — comentário e movimentação

| Card | Movimentação | Resumo do comentário |
|---|---|---|
| #1 Montagem mecânica das esteiras | In Progress (mantido) | Três esteiras rodando (21/10); falta fixar na base e testar uma a uma; roda impressa pronta |
| #9 Testes e validação do sistema completo | Todo → In Progress | Itens do card cruzados com evidências; última bancada em #66 |
| #8 Escrever documentação e artigo | Blocked → In Progress | Documentação técnica em dia; resultados/conclusões do artigo dependem de #66 |
| #24 Deployment Guide | Backlog → In Progress | `DEPLOYMENT.md` pronto (#30); falta validação em máquina limpa |
| #25 Firmware Versioning | Backlog → In Progress | v3.0 no firmware e no evento `inicio`; faltam tags Git e versão do ESP32 |
| #23 BOM | Todo (mantido) | `BILL_OF_MATERIALS.md` ainda não existe; levantar com a bancada montada |
| #27 Testes E2E | Done (mantido) | Acompanhamento: correções #44, #47, #50 e cenários do separador (#57) |
