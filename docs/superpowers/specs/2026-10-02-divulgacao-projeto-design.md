# Divulgação do Data Flow Inventory — Design

Data: 02/10/2026 · Branch: `docs/divulgacao-projeto` · Idioma de tudo que entra no repositório: **português do Brasil**.

## 1. Objetivo e escopo

Tornar o projeto mais fácil de entender em poucos segundos, destacar o que ele tem de interessante (C++ embarcado, automação, microcontroladores, IoT e dashboard em tempo real) e abrir caminho para divulgação e contribuições **orgânicas** (estrelas, forks, visitas e contribuidores reais).

Decisões tomadas com a equipe:

| # | Decisão |
|---|---|
| D1 | **Público: Brasil primeiro.** Canais e textos em português; o repositório continua somente em pt-BR. |
| D2 | **Sem imagens novas.** O README usa só as imagens que já existem (`img/` e `docs/fluxogramas/`). Foto/vídeo da bancada fica para depois. |
| D3 | **Foco na organização dos documentos**, não na reescrita: o conteúdo das seções existentes é preservado; mudam ordem, títulos, sumário, agrupamento e a abertura do README. |
| D4 | **Configurações do GitHub** (descrição, site, tópicos) são aplicadas pelo agente via `gh`, **somente depois** de a equipe aprovar a lista exata (seção 4). |
| D5 | **Hacktoberfest:** o tópico `hacktoberfest` entra na lista; só funciona se houver issues abertas e rotuladas. |
| D6 | O agente **não publica** em nenhum canal externo e **não cria issues** sem aprovação. Publicar é ação da equipe. |

Fora do escopo: imagens/GIFs/vídeos, site ou GitHub Pages, qualquer mudança em firmware, servidor, simulador ou frontend.

## 2. Estado atual (levantado em 02/10/2026)

- `README.md`: 449 linhas, 17 badges, dois diagramas grandes logo na abertura, pedido de estrela no topo, Quick Start com o simulador só depois do sumário e da seção "Sobre". Não há GIF nem foto da bancada.
- GitHub: sem tópicos, sem site, descrição longa (um parágrafo), licença retornada pela API como `NOASSERTION` embora o arquivo seja MIT; 1 estrela, 0 forks; 177 visualizações / 6 visitantes únicos em 14 dias.
- Perfil da comunidade: 57%. Existem `README`, `LICENSE` e `CONTRIBUTING.md`; faltam código de conduta, templates de issue e de PR. Labels `good first issue` e `help wanted` já existem.

## 3. README — reorganização (sem reescrever o conteúdo)

### 3.1 Abertura (primeiros segundos)

Ordem nova do topo, mantendo logo e título:

1. **Frase de posicionamento** (uma linha) logo abaixo do logo.
2. **Três linhas de valor**, em lista curta: firmware C++ (Arduino Uno e ESP32), MQTT/IoT e dashboard em tempo real, e "testável sem hardware" (simulador, testes e CI).
3. **Badges reduzidos de 17 para cerca de 8**, em três grupos numa mesma linha lógica: *Hardware* (Arduino, ESP32), *Stack* (Node.js, MQTT, Docker/Observabilidade), *Qualidade* (CI, Licença). Os badges removidos continuam descritos na seção "Destaques Técnicos".
4. **Screenshot do dashboard** (`img/DataFlowInventory.png`) em destaque; o diagrama de arquitetura passa para a seção "Arquitetura" (onde já há o diagrama ASCII), sem ser apagado.
5. **"Escolha seu caminho"**: tabela de quatro linhas com link para cada seção existente:
   - *Ver funcionando em 30 s* → Quick Start — Simulador;
   - *Montar a bancada completa* → Como Rodar / Materiais;
   - *Ver métricas e dashboards de performance* → `observability/README.md`;
   - *Contribuir* → `CONTRIBUTING.md`.
6. O **pedido de estrela** sai do topo e vai para o fim (antes de "Licença"), depois de o visitante ter visto o valor.

### 3.2 Nova seção "Por que este projeto é interessante"

Colocada logo após a abertura. Tabela curta (uma linha por tema, cada uma apontando para a seção ou documento que já detalha o assunto):

| Tema | O que mostrar | Onde está detalhado |
|---|---|---|
| C++ embarcado | FSM de 5 estados no Arduino Uno, protocolo serial em JSON, gateway ESP32 com LWT e reconexão não bloqueante | Funcionamento · `docs/ARCHITECTURE.md` |
| Automação / intralogística | 4 esteiras, 6 sensores IR, estoque e timeout de entrega | Visão Geral · Funcionamento |
| IoT / MQTT | Mosquitto local ou HiveMQ Cloud, tópicos `dataflow/*`, retained e LWT | Tópicos MQTT |
| Tempo real | Servidor Node.js, Socket.IO, dashboard responsivo e vista 3D | Destaques Técnicos |
| Observabilidade | Prometheus + Grafana, 17 métricas `dfi_*` | `observability/README.md` |
| Qualidade | Testes unitários, E2E (Playwright), CI com compilação dos sketches | Estrutura do Repositório |

Cada afirmação precisa existir no código/documentação atual (nada de promessa que o repositório não cumpre); onde algo não foi validado em bancada, a tabela diz isso, no mesmo tom já usado no README.

### 3.3 Organização do restante

- Sumário atualizado e na mesma ordem das seções; âncoras conferidas.
- Seções existentes **mantêm o texto**; ajustes limitados a títulos, ordem e correção de links/erros evidentes. A seção "Roda giratória" e as alternativas de hardware não mudam de conteúdo.
- O texto "Para o projeto completo, consulte `Projeto de pesquisa - Final.docx`" permanece.

## 4. Vitrine do repositório no GitHub (aplicada após aprovação da lista)

Lista proposta, a ser **aprovada pela equipe antes de aplicar** (D4):

- **Descrição curta:** "Protótipo IoT de centro de distribuição automatizado: Arduino Uno + ESP32 (C++), MQTT, dashboard web em tempo real com vista 3D e observabilidade com Prometheus/Grafana. Testável sem hardware."
- **Site (homepage):** não há site; deixar em branco ou apontar para o `README` (decisão na hora da aprovação).
- **Tópicos:** `arduino`, `esp32`, `cpp`, `mqtt`, `iot`, `nodejs`, `socket-io`, `three-js`, `industria-4-0`, `automacao-industrial`, `intralogistica`, `prometheus`, `grafana`, `hacktoberfest`.
- **Licença:** normalizar o arquivo `LICENSE` (fins de linha LF e cabeçalho MIT padrão, preservando os nomes dos autores) para o GitHub reconhecer a licença. Tentativa: só se confirma depois do merge, consultando a API de licença; se continuar `NOASSERTION`, registrar e propor outro ajuste.

## 5. Porta de entrada para contribuidores (arquivos novos, pt-BR)

- `.github/ISSUE_TEMPLATE/bug.yml` e `ideia.yml` (formulários simples) e `config.yml` (desabilita issue em branco, link para a documentação).
- `.github/pull_request_template.md` (checklist alinhado ao `CONTRIBUTING.md`: testes, sem credenciais, documentação).
- `CODE_OF_CONDUCT.md` (baseado no Contributor Covenant 2.1, adaptado ao pt-BR).
- `SECURITY.md` (como reportar vulnerabilidade de forma privada; sem detalhar incidentes passados).
- `CONTRIBUTING.md` existente recebe apenas links para os novos arquivos, sem reescrita.

## 6. Plano de divulgação (`docs/DIVULGACAO.md`, pt-BR)

Documento da equipe, no repositório, com:

1. **Texto-base** reutilizável: frase de uma linha, parágrafo curto e lista de destaques.
2. **Posts prontos por canal**, adaptados ao formato de cada um: LinkedIn, Embarcados, TabNews, r/brdev e grupos de Arduino/IoT/automação. **Os nomes e as regras dos canais devem ser checados pela equipe antes de postar**; o documento não afirma que um grupo específico exista ou aceite divulgação.
3. **Rascunhos de 3 a 5 issues** `good first issue` / `help wanted` (por exemplo, melhorias de documentação, testes e pequenos ajustes de interface). **Não são criadas** sem aprovação (D6).
4. **Crescimento orgânico:** checklist de cadência (um canal por vez, intervalo entre posts), como responder a comentários, como acolher o primeiro contribuidor, e o que **não** fazer (pedir estrela em massa, trocar estrelas, comprar engajamento).
5. **Métricas simples** para acompanhar (visitas, estrelas, forks, issues de fora) e onde olhar no GitHub (*Insights → Traffic*).
6. **Hacktoberfest:** o que a equipe assume ao manter o tópico (revisar PRs de fora em outubro, ter issues abertas e rotuladas).

## 7. Validação

- Todos os links relativos e âncoras do `README.md`, `CONTRIBUTING.md` e `docs/DIVULGACAO.md` conferidos por script (arquivos existem, âncoras existem).
- As afirmações da seção 3.2 conferidas contra o código e a documentação (contagem de badges/imagens, nomes de arquivos, quantidade de métricas).
- Formulários de issue validados como YAML.
- Suíte `test/server_metrics` e testes unitários do frontend rodam sem regressão (nenhum código muda; serve de rede de segurança).
- A única validação **não** executável por mim: a aparência no GitHub (renderização do README, formulários de issue) e o reconhecimento da licença, que dependem do merge. A equipe confere depois.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Reorganizar o README quebrar âncoras/links internos | Script de verificação de links e âncoras antes do commit |
| Posicionamento prometer mais do que o projeto cumpre | Cada linha da seção 3.2 aponta para o local onde a capacidade está documentada; itens não validados em bancada são marcados como tal |
| Hacktoberfest gerar PRs de baixa qualidade | Issues curtas e bem delimitadas; template de PR com checklist; a equipe pode remover o tópico a qualquer momento |
| Licença continuar `NOASSERTION` | Registrar e tratar à parte; não bloqueia o restante |
| Texto de divulgação soar como spam | Um canal por vez, adaptado ao formato, com regras de cada comunidade conferidas pela equipe |

## 9. Entregáveis

1. `README.md` reorganizado (abertura, "Escolha seu caminho", "Por que é interessante", sumário e fim com pedido de estrela).
2. `LICENSE` normalizado.
3. `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`; links em `CONTRIBUTING.md`.
4. `docs/DIVULGACAO.md`.
5. `docs/CHANGELOG.md`: entrada resumindo a mudança.
6. Configurações do GitHub (descrição, tópicos, site) aplicadas via `gh` **após** aprovação da lista pela equipe.
7. Relatório final com o que ficou para a equipe (publicações nos canais, criação de issues, checagem da licença e da renderização).
