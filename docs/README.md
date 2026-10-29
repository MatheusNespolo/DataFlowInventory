# Mapa da documentação

Cada informação tem **um** lugar. Os outros documentos apontam para ele com um link, em vez de copiar: cópias desatualizam (foi o que aconteceu com o status da bancada, os valores de PWM/kick e a contagem de testes, repetidos em até 7 arquivos).

## Onde registrar o quê

| Quero registrar... | Onde | Não copiar para |
|---|---|---|
| Resultado de bancada (o que foi testado e deu certo ou errado) | [`testes/resultados.md`](testes/resultados.md): estado atual, registro de resultados e diário | README, CHANGELOG, roteiros antigos |
| O plano da semana de bancada | um roteiro em [`testes/roteiros/`](testes/roteiros/) (status no topo; ao fechar a semana, não editar mais) | — |
| Como executar um teste | [`testes/plano_de_testes.md`](testes/plano_de_testes.md) | — |
| Uma mudança de código ou de documentação | entrada curta em `[Não publicado]` no [`CHANGELOG.md`](CHANGELOG.md), com data e PR | — |
| Parâmetros do firmware (pinos, PWM, kick, prazos) | `arduino/data_flow_inventory/config.h` | README, ARCHITECTURE (citar o nome do parâmetro, não o valor) |
| Andamento de uma frente de trabalho | o card no [GitHub Project](https://github.com/users/MatheusNespolo/projects/3): comentário na issue; PR com `Closes #N` | arquivos em `docs/cards_comments/` |
| Decisão técnica e funcionamento do sistema | [`ARCHITECTURE.md`](ARCHITECTURE.md) | — |
| Projeto acadêmico | `artigo/Projeto de pesquisa - Final.docx` | — |

## Documentos

| Documento | Para quê |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Referência técnica: arquitetura, tópicos MQTT, mensagens, FSM, hardware |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Subir o sistema do zero |
| [`INTEGRATION_GUIDE.md`](INTEGRATION_GUIDE.md) | Integração com o Beckhoff CX9240 e o separador |
| [`FRONTEND.md`](FRONTEND.md) | Dashboard e estrutura do frontend |
| [`CI-CD.md`](CI-CD.md) | Pipelines, validações e como compilar o firmware localmente |
| [`broker_local_mosquitto.md`](broker_local_mosquitto.md) | Broker MQTT local |
| [`DIVULGACAO.md`](DIVULGACAO.md) | Material de divulgação |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de mudanças, por marcos |
| [`testes/`](testes/plano_de_testes.md) | Plano de testes, resultados, roteiros semanais e [validações de infraestrutura](testes/validacoes/README.md) |
| [`fluxogramas/`](fluxogramas/board_github_projects.md) | Diagramas e as regras do board |
| [`cards_comments/`](cards_comments/README.md) | Arquivo histórico de textos de cards |

## Antes de um PR que mexe na documentação

- `python3 scripts/verificar-links.py` (o CI também roda): links e âncoras quebrados falham o PR.
- Ao apagar ou renomear um documento, procure quem aponta para ele (o verificador mostra).
