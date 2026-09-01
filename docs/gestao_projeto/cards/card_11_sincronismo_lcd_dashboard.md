## 🎯 Objetivo

Eliminar a divergência entre a contagem de estoque exibida no display **LCD 16x2 I2C (0x27)** e a exibida no **Dashboard web** após reinicializações do Arduino, `F5` no navegador ou reconexões do gateway ESP32.

## ✅ Status

| Campo | Valor |
|---|---|
| **Coluna** | `Done` |
| **Data de validação** | **28/08/2026** |
| **Área** | `Firmware-Uno` / `Firmware-ESP32` / `Frontend` |
| **Bloco de teste** | `B3`, `T4` |
| **Prioridade** | `P0-Crítico` |

## 🐛 Sintoma original

O Dashboard iniciava com o estoque zerado ou desatualizado enquanto o LCD exibia a contagem correta. A UI só convergia após o próximo evento de pedido — ou seja, o estado só era conhecido de forma *incremental*, nunca *absoluta*.

## 🔍 Causa-raiz

O estoque era publicado apenas como efeito colateral de um pedido. Não existia publicação de estado no boot nem mensagem **retained** no broker, então qualquer cliente que se conectasse depois não tinha como reconstruir o estado atual.

## 🛠 Solução aplicada

1. Invocação de `publicarEstoque()` no `setup()` do Arduino Uno — o estado inicial é emitido logo após a energização.
2. Invocação de `publicarEstoque()` também no tratamento de `CMD:RESET`, republicando o estoque após limpar o estado de erro da FSM.
3. Publicação com flag **retained** no tópico `dataflow/estoque` pelo gateway ESP32.
4. Servidor Node.js e Dashboard consomem o retained no `connect`, sincronizando a UI no carregamento inicial.

## ✔️ Critérios de aceite — todos validados em 28/08/2026

- [x] Ao energizar o Uno, LCD e Dashboard exibem a mesma contagem inicial.
- [x] Após `F5` no navegador, o Dashboard reconstrói o estoque a partir do retained, sem esperar novo evento.
- [x] Após `CMD:RESET`, LCD e Dashboard voltam sincronizados ao estado inicial.
- [x] Reconexão do gateway ESP32 não gera divergência de contagem.
- [x] Resultado transferido para o Registro de Resultados do `plano_de_testes.md`.

## 📄 Evidências

- Commits `b2ec47d`, `b5727ad`
- `arduino/data_flow_inventory/data_flow_inventory.ino`
- `docs/testes/plano_de_testes.md` — Observações 27–28/08
- `docs/CHANGELOG.md`
- `docs/gestao_projeto/board_github_projects.md` — seção 3
