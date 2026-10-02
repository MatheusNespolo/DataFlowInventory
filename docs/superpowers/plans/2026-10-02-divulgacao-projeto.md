# Divulgação do Data Flow Inventory — Plano de Implementação

> **Para agentes de execução:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`).

**Objetivo:** Deixar o projeto mais fácil de entender nos primeiros segundos (README reorganizado), reconhecível como MIT, acolhedor para contribuidores (templates e políticas) e com um plano de divulgação orgânica em português, mais a vitrine do GitHub (descrição e tópicos) aplicada após aprovação.

**Arquitetura:** Só documentação e arquivos de comunidade. O README ganha uma abertura enxuta, uma tabela "Escolha seu caminho" e uma seção "Por que este projeto é interessante" **sem reescrever as seções existentes**. Um verificador de links/âncoras (ferramenta descartável, fora do repositório) valida todos os documentos tocados. As configurações do GitHub são a última tarefa e exigem aprovação explícita da equipe.

**Stack:** Markdown, YAML (formulários de issue do GitHub), Node.js (verificador descartável), `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-10-02-divulgacao-projeto-design.md` (autoridade; em conflito, o spec vence).

## Restrições Globais

Valem para todas as tarefas (copiadas do spec):

- **Idioma:** tudo que entra no repositório é **português do Brasil** (D1).
- **Sem imagens novas:** só as que já existem em `img/` e `docs/fluxogramas/` (D2).
- **Preservar o conteúdo das seções existentes:** mudam ordem, títulos, sumário, agrupamento e a abertura; correções limitadas a links/erros evidentes (D3).
- **Nada de código de produto muda:** firmware, servidor, simulador e frontend ficam intocados (fora do escopo).
- **Não publicar em canais externos e não criar issues** sem aprovação da equipe (D6). O plano de divulgação só **prepara** textos.
- **Configurações do GitHub** (descrição, tópicos, relatório privado de vulnerabilidade) só são aplicadas após a equipe aprovar a lista exata (D4) — Tarefa 7.
- **Não afirmar o que o repositório não cumpre:** toda afirmação nova do README aponta para onde está documentada; itens não validados em bancada são marcados como tal.
- Nunca matar processos que não foram iniciados por você (o usuário pode ter o servidor rodando na porta 3000).
- Trailer de todo commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Nunca colar cercas de markdown (três crases) dentro de arquivos-fonte que não sejam `.md`.
- O repositório usa `core.autocrlf=true` no Windows: o aviso "LF will be replaced by CRLF" é esperado e ignorado; confira `git diff --stat` para garantir que só as linhas pretendidas mudaram.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `$SCRATCH/verificar-links.mjs` | criar (fora do repo) | Verificador de links relativos e âncoras de Markdown |
| `$SCRATCH/aplicar-readme.py` | criar (fora do repo) | Aplica as edições do README de forma determinística |
| `README.md` | modificar | Abertura, "Escolha seu caminho", "Por que...", sumário, imagem de arquitetura, pedido de estrela |
| `LICENSE` | modificar | Normalizar para o GitHub reconhecer MIT |
| `.github/ISSUE_TEMPLATE/bug.yml`, `ideia.yml`, `config.yml` | criar | Formulários de issue |
| `.github/pull_request_template.md` | criar | Checklist de PR |
| `CODE_OF_CONDUCT.md`, `SECURITY.md` | criar | Políticas da comunidade |
| `CONTRIBUTING.md` | modificar | Links para os novos arquivos (sem reescrita) |
| `docs/DIVULGACAO.md` | criar | Plano de divulgação orgânica |
| `docs/CHANGELOG.md` | modificar | Entrada em "Alterado" |

`$SCRATCH` = `C:\Users\matheusn\AppData\Local\Temp\claude\C--Users-matheusn-Documents-GitHub-DataFlowInventory\00130fa5-568f-4341-8c86-c760bebfbc1e\scratchpad` (no Git Bash: `/c/Users/matheusn/AppData/Local/Temp/claude/C--Users-matheusn-Documents-GitHub-DataFlowInventory/00130fa5-568f-4341-8c86-c760bebfbc1e/scratchpad`). Os scripts descartáveis **nunca** entram no repositório.

---

### Tarefa 1: Verificador de links e âncoras (ferramenta descartável) e linha de base

**Arquivos:**
- Criar: `$SCRATCH/verificar-links.mjs` (fora do repositório)

**Interfaces:**
- Produz: `node $SCRATCH/verificar-links.mjs <arquivo.md> [...]` — imprime uma linha `FALHA: arquivo → alvo (motivo)` por problema e sai com código 1 se houver alguma; sai com 0 e imprime `todos os links e âncoras existem` caso contrário. As tarefas 2, 4, 5 e 6 o usam.

- [ ] **Passo 1: Escrever o verificador**

Crie `$SCRATCH/verificar-links.mjs` com exatamente este conteúdo:

```js
// verificar-links.mjs — ferramenta DESCARTÁVEL (não versionar).
// Confere, nos arquivos Markdown informados, links relativos, src de <img> e âncoras.
import fs from 'node:fs';
import path from 'node:path';

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) {
  console.error('Uso: node verificar-links.mjs <arquivo.md> [...]');
  process.exit(2);
}

// Slug no estilo do GitHub: minúsculas, remove pontuação (menos "-" e "_"), espaço vira "-".
function slug(texto) {
  return texto.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

function semCodigo(texto) {
  let cerca = false;
  const linhas = [];
  for (const linha of texto.split('\n')) {
    if (/^\s*```/.test(linha)) { cerca = !cerca; linhas.push(''); continue; }
    linhas.push(cerca ? '' : linha.replace(/`[^`]*`/g, ''));
  }
  return linhas.join('\n');
}

const cacheAncoras = new Map();
function ancorasDe(arquivo) {
  if (cacheAncoras.has(arquivo)) return cacheAncoras.get(arquivo);
  const texto = semCodigo(fs.readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n'));
  const contagem = new Map();
  const conjunto = new Set();
  for (const linha of texto.split('\n')) {
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(linha);
    if (!m) continue;
    const titulo = m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    const base = slug(titulo);
    const n = contagem.get(base) || 0;
    contagem.set(base, n + 1);
    conjunto.add(n === 0 ? base : `${base}-${n}`);
  }
  cacheAncoras.set(arquivo, conjunto);
  return conjunto;
}

let falhas = 0;
function falhar(origem, alvo, motivo) {
  falhas++;
  console.log(`FALHA: ${origem} → ${alvo} (${motivo})`);
}

for (const arquivo of arquivos) {
  const bruto = fs.readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n');
  const texto = semCodigo(bruto);
  const alvos = [];
  for (const m of texto.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) alvos.push(m[1]);
  for (const m of texto.matchAll(/<(?:img|a)\b[^>]*\b(?:src|href)="([^"]+)"/g)) alvos.push(m[1]);

  for (const alvo of alvos) {
    if (/^(https?:|mailto:|data:)/i.test(alvo)) continue;
    const [caminhoBruto, ancora] = alvo.split('#');
    const caminho = decodeURI(caminhoBruto);
    const destino = caminho === '' ? arquivo : path.resolve(path.dirname(arquivo), caminho);
    if (!fs.existsSync(destino)) { falhar(arquivo, alvo, 'arquivo não existe'); continue; }
    if (ancora && /\.md$/i.test(destino)) {
      if (!ancorasDe(destino).has(decodeURI(ancora).toLowerCase())) falhar(arquivo, alvo, 'âncora não existe');
    }
  }
}

if (falhas > 0) { console.log(`${falhas} problema(s)`); process.exit(1); }
console.log('todos os links e âncoras existem');
```

- [ ] **Passo 2: Testar o verificador com casos positivo e negativo**

```bash
SCRATCH=/c/Users/matheusn/AppData/Local/Temp/claude/C--Users-matheusn-Documents-GitHub-DataFlowInventory/00130fa5-568f-4341-8c86-c760bebfbc1e/scratchpad
mkdir -p "$SCRATCH/vl-teste" && cd "$SCRATCH/vl-teste"
printf '# Título Um\n\n## ⚡ Seção Dois\n\n[ok](#título-um) [ok2](#-seção-dois) [ok3](b.md#alvo)\n' > a.md
printf '# Alvo\n' > b.md
printf '# T\n\n[quebrado](nao-existe.md) [ancora](b.md#nada) [inline](#fantasma)\n' > c.md
node ../verificar-links.mjs a.md b.md; echo "saída positiva: $?"
node ../verificar-links.mjs c.md; echo "saída negativa: $?"
```

Esperado: `todos os links e âncoras existem` com `saída positiva: 0`; e três linhas `FALHA` (arquivo inexistente, âncora de `b.md`, âncora `#fantasma`) com `3 problema(s)` e `saída negativa: 1`. Se algo diferir, corrija o verificador antes de seguir.

- [ ] **Passo 3: Linha de base nos documentos que serão tocados**

```bash
cd /c/Users/matheusn/Documents/GitHub/DataFlowInventory
node "$SCRATCH/verificar-links.mjs" README.md CONTRIBUTING.md docs/DEPLOYMENT.md docs/CI-CD.md docs/ARCHITECTURE.md observability/README.md
```

Registre a saída (falhas **anteriores** a este trabalho) no relatório da tarefa. Falhas em `README.md` ou `CONTRIBUTING.md` serão tratadas nas tarefas 2 e 4 (corrigir só links evidentemente errados); falhas nos demais arquivos **não** são deste plano — apenas relate.

- [ ] **Passo 4: Sem commit** (a ferramenta fica fora do repositório). Confirme que `git status --short` não lista nada novo.

---

### Tarefa 2: README — abertura, caminhos, posicionamento e organização

**Arquivos:**
- Criar: `$SCRATCH/aplicar-readme.py` (fora do repositório)
- Modificar: `README.md`

**Interfaces:**
- Consome: `$SCRATCH/verificar-links.mjs` (Tarefa 1).
- Produz: âncoras novas `#escolha-seu-caminho` e `#por-que-este-projeto-é-interessante` (usadas por `docs/DIVULGACAO.md`).

**Contexto para o implementador:** o README atual abre com um `<div align="center">` contendo logo, frase em negrito, 17 badges, dois screenshots grandes (dashboard e arquitetura), a escola e o pedido de estrela; fecha com `</div>` e segue para `## Sumário`. O README usa CRLF na cópia de trabalho; o script abaixo normaliza, edita e restaura o final de linha original.

- [ ] **Passo 1: Escrever o script de edição**

Crie `$SCRATCH/aplicar-readme.py` com exatamente este conteúdo (use a ferramenta Write, não heredoc):

```python
# aplicar-readme.py — ferramenta DESCARTÁVEL (não versionar).
import sys

caminho = sys.argv[1]
bruto = open(caminho, 'rb').read().decode('utf-8')
crlf = '\r\n' in bruto
s = bruto.replace('\r\n', '\n')


def um(texto, antigo, novo):
    assert texto.count(antigo) == 1, f'esperava 1 ocorrência de: {antigo[:60]!r}, achei {texto.count(antigo)}'
    return texto.replace(antigo, novo)


NOVO_TOPO = '''<div align="center">

<img src="img/dataflow-inventory-logo.svg" width="1865" height="500" alt="Logo">

**Centro de Distribuição Automatizado — Protótipo IoT em Escala Reduzida**

Do clique no navegador à esteira em movimento: pedido pelo dashboard, MQTT, ESP32 e Arduino, com estoque, sensores e métricas em tempo real.

**Firmware C++ (Arduino Uno e ESP32) · MQTT/IoT · Dashboard em tempo real com vista 3D · Testável sem hardware**

![Arduino](https://img.shields.io/badge/Arduino-Uno-00979D?logo=arduino&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-DevModule-000000?logo=espressif&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?logo=node.js&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-Mosquitto%20%7C%20HiveMQ-660066?logo=mosquitto&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
[![CI](https://github.com/MatheusNespolo/DataFlowInventory/actions/workflows/lint-and-security.yaml/badge.svg)](https://github.com/MatheusNespolo/DataFlowInventory/actions/workflows/lint-and-security.yaml)
[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-green)](LICENSE)
![SENAI](https://img.shields.io/badge/SENAI-S%C3%A3o%20Caetano%20do%20Sul-blue)

---
<img src="img/DataFlowInventory.png" width="1865" height="884" alt="DataFlowInventory">
<br>

SENAI São Caetano do Sul — Boa Vista<br>
Engenharia de Controle e Automação

</div>

## Escolha seu caminho

| Quero... | Vá para | Precisa de hardware? |
|----------|---------|----------------------|
| ⚡ Ver funcionando em 30 segundos | [Quick Start — Simulador](#-quick-start--simulador) | Não |
| 🔧 Montar a bancada completa | [Materiais](#materiais), [Como Rodar](#como-rodar) e o [Guia de implantação](docs/DEPLOYMENT.md) | Sim |
| 📈 Ver métricas e dashboards de performance | [Observabilidade](observability/README.md) | Não exige a bancada (precisa de Docker) |
| 🤝 Contribuir | [Contribuindo](#contribuindo) e o [Guia de Contribuição](CONTRIBUTING.md) | Não |

## Por que este projeto é interessante

| Tema | O que você encontra | Onde está detalhado |
|------|---------------------|---------------------|
| 🧠 **C++ embarcado** | Máquina de estados de 5 etapas no Arduino Uno, protocolo serial em JSON e gateway ESP32 com LWT e reconexão Wi-Fi não bloqueante | [Funcionamento](#funcionamento) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| 🏭 **Automação e intralogística** | 4 esteiras, 6 sensores infravermelhos, controle de estoque e timeout de entrega | [Visão Geral](#visão-geral) · [Funcionamento](#funcionamento) |
| 📡 **IoT e MQTT** | Mosquitto local ou HiveMQ Cloud, tópicos `dataflow/*`, mensagens retained e LWT | [Tópicos MQTT](#tópicos-mqtt) |
| ⏱️ **Tempo real** | Servidor Node.js com Socket.IO, dashboard responsivo e vista 3D da bancada | [Destaques Técnicos](#destaques-técnicos) |
| 📈 **Observabilidade** | Prometheus + Grafana com 17 métricas `dfi_*` e três dashboards | [`observability/README.md`](observability/README.md) |
| ✅ **Qualidade** | Testes unitários, testes E2E com Playwright e CI que compila os sketches | [Estrutura do Repositório](#estrutura-do-repositório) |

> **Status de validação:** o broker Mosquitto local foi validado em bancada; o HiveMQ Cloud está parcialmente validado; as esteiras B e C estão em diagnóstico elétrico. Veja [Próximos Passos](#próximos-passos) para o estado atual de cada item.
'''

# 1) Topo: do início até o "</div>" que antecede o sumário.
marcador = '</div>\n\n## Sumário'
assert s.count(marcador) == 1
fim = s.index(marcador) + len('</div>\n')
s = NOVO_TOPO + s[fim:]

# 2) Sumário: novas entradas, na ordem em que as seções aparecem.
s = um(
    s,
    '## Sumário\n\n- [Sobre](#sobre)\n',
    '## Sumário\n\n- [Escolha seu caminho](#escolha-seu-caminho)\n'
    '- [Por que este projeto é interessante](#por-que-este-projeto-é-interessante)\n'
    '- [Sobre](#sobre)\n',
)

# 3) Diagrama de arquitetura: sai da abertura e entra na seção "Arquitetura".
s = um(
    s,
    '## Arquitetura\n\n### Modo Simulador',
    '## Arquitetura\n\n'
    '<img src="img/ArquiteturaDataFlowInventory.png" width="1865" height="884" alt="ArquiteturaDataFlowInventory">\n'
    '<br>\n\n### Modo Simulador',
)

# 4) Pedido de estrela: do topo para o fim da seção "Contribuindo".
s = um(
    s,
    '## Licença\n\nMIT License',
    '⭐ **Se este projeto te ajudou, deixe uma estrela no GitHub!** Sua avaliação nos motiva bastante! 🙏\n\n'
    '## Licença\n\nMIT License',
)

open(caminho, 'wb').write((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))
print('README atualizado; CRLF preservado:', crlf)
```

- [ ] **Passo 2: Confirmar o estado de partida**

```bash
cd /c/Users/matheusn/Documents/GitHub/DataFlowInventory
git switch docs/divulgacao-projeto && git status --short
grep -c '^!\[\|^\[!\[' README.md
```

Esperado: árvore limpa; a contagem de linhas de badge no topo deve ser 17 (as linhas que começam com `![` ou `[![`, contadas só no bloco de badges). Se o README tiver mudado desde o levantamento do spec (outro trabalho de documentação pode ter tocado nele), **pare e relate** em vez de forçar o script.

- [ ] **Passo 3: Aplicar**

```bash
python "$SCRATCH/aplicar-readme.py" README.md
```

Esperado: `README atualizado; CRLF preservado: True` (ou `False`). Um `AssertionError` significa que o texto de partida difere do esperado: pare e relate.

- [ ] **Passo 4: Verificar o resultado**

```bash
git diff --stat README.md
node "$SCRATCH/verificar-links.mjs" README.md
awk '/^\!\[|^\[\!\[/{n++} /^## Escolha/{exit} END{print "badges no topo:", n}' README.md
grep -n '^## ' README.md | head -8
```

Esperado:
- `git diff --stat`: somente `README.md`, com poucas dezenas de linhas (não um arquivo inteiro reescrito).
- `verificar-links`: `todos os links e âncoras existem` (se houver falha **anterior** registrada na linha de base, ela pode aparecer; falhas **novas** são defeitos desta tarefa).
- `badges no topo: 8`.
- Ordem dos `##`: Escolha seu caminho, Por que este projeto é interessante, Sumário, Sobre, ⚡ Quick Start — Simulador, Visão Geral, Destaques Técnicos, Arquitetura.
- A frase "Se este projeto te ajudou, deixe uma estrela" aparece **uma vez**, antes de `## Licença`, e não no topo: `grep -n 'deixe uma estrela' README.md`.
- O corpo das seções existentes (Sobre em diante) não foi alterado: `git diff README.md | grep '^[-+]' | grep -vE '^(---|\+\+\+)' | wc -l` deve ser da ordem de 60 a 80 linhas (topo novo + 3 pequenas inserções), nunca centenas.

- [ ] **Passo 5: Conferir as afirmações da tabela "Por que este projeto é interessante"**

Cada linha da tabela precisa ser verdadeira hoje. Confirme com estes comandos (todos devem retornar algo; relate qualquer um vazio):

```bash
grep -c 'AGUARDANDO_PEDIDO\|ERRO' arduino/data_flow_inventory/data_flow_inventory.ino        # FSM de 5 estados
grep -c 'serializeJson' arduino/data_flow_inventory/data_flow_inventory.ino                    # serial em JSON
grep -ci 'lwt\|willtopic\|connect(.*offline' esp32/gateway_mqtt/gateway_mqtt.ino               # LWT no gateway
grep -c 'dfi_' server/metrics.js                                                               # métricas dfi_*
ls test/frontend_smoke/playwright.config.mjs test/server_metrics/package.json                  # testes E2E e de métricas
grep -n 'arduino-compile' .github/workflows/lint-and-security.yaml | head -1                   # CI compila sketches
```

Se alguma afirmação não se sustentar, **ajuste o texto da célula** (não o código) para o que o repositório realmente faz, e relate.

- [ ] **Passo 6: Commit**

```bash
git add README.md
git commit -m "docs(readme): abertura enxuta, escolha seu caminho e posicionamento do projeto

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 3: Normalizar o LICENSE para o GitHub reconhecer MIT

**Arquivos:**
- Modificar: `LICENSE`

**Contexto:** a API do GitHub retorna `NOASSERTION` para a licença. As causas prováveis são o aviso de copyright quebrado em duas linhas e os finais de linha CRLF gravados no arquivo. A correção abaixo troca ambos mantendo o texto da licença e os nomes dos autores.

- [ ] **Passo 1: Ver o estado atual do arquivo no Git**

```bash
cd /c/Users/matheusn/Documents/GitHub/DataFlowInventory
git show HEAD:LICENSE | file -
git show HEAD:LICENSE | head -5 | cat -A | head -5
```

Anote se o blob já está em CRLF (`CRLF line terminators`).

- [ ] **Passo 2: Reescrever o arquivo**

Use a ferramenta Write para criar `LICENSE` com **exatamente** este conteúdo (copyright em uma única linha; texto MIT padrão), e depois grave-o com finais de linha LF:

```
MIT License

Copyright (c) 2026 Henrique Moni de Souza, Matheus Nespolo Silva, Murilo Tolardo da Silva, Vitor Marcolongo Silva

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Depois remova qualquer CR que a ferramenta tenha gravado:

```bash
python - <<'PYEOF'
p = 'LICENSE'
b = open(p, 'rb').read().replace(b'\r\n', b'\n')
open(p, 'wb').write(b)
PYEOF
file LICENSE
```

Esperado: `ASCII text` (sem `CRLF line terminators`).

- [ ] **Passo 3: Conferir que só o aviso de copyright e os finais de linha mudaram**

```bash
git diff --ignore-all-space --stat LICENSE
git diff --ignore-all-space LICENSE | grep '^[-+]' | grep -vE '^(---|\+\+\+)'
```

Esperado: apenas as duas linhas de copyright antigas saindo e a linha única entrando.

- [ ] **Passo 4: Registrar a limitação e commitar**

O reconhecimento pelo GitHub só se confirma **depois do merge** (Tarefa 7, Passo 4). Não afirme em nenhum documento que a licença "passou a ser detectada".

```bash
git add LICENSE
git commit -m "docs: normaliza o LICENSE (MIT) para reconhecimento pelo GitHub

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 4: Porta de entrada para contribuidores

**Arquivos:**
- Criar: `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/ideia.yml`, `.github/ISSUE_TEMPLATE/config.yml`
- Criar: `.github/pull_request_template.md`
- Criar: `CODE_OF_CONDUCT.md`, `SECURITY.md`
- Modificar: `CONTRIBUTING.md` (apenas acrescentar links no final)

**Interfaces:**
- Consome: `$SCRATCH/verificar-links.mjs`; o pacote `yaml` de `test/server_metrics` para validar os formulários.
- Produz: arquivos referenciados por `docs/DIVULGACAO.md`.

- [ ] **Passo 1: Formulário de bug**

Crie `.github/ISSUE_TEMPLATE/bug.yml`:

```yaml
name: Relatar um problema
description: Algo não funciona como o esperado (firmware, servidor, simulador, dashboard ou documentação).
title: "[Problema] "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Obrigado por ajudar! Antes de abrir, procure nas issues existentes e confira o
        [Guia de implantação](../blob/main/docs/DEPLOYMENT.md) e o
        [histórico de mudanças](../blob/main/docs/CHANGELOG.md).
        **Nunca cole senhas, tokens ou o conteúdo de `secrets.h` / `.env`.**
  - type: dropdown
    id: onde
    attributes:
      label: Onde o problema acontece?
      options:
        - Simulador (sem hardware)
        - Servidor Node.js
        - Dashboard / frontend
        - Firmware Arduino Uno
        - Firmware ESP32 (gateway MQTT)
        - Observabilidade (Prometheus / Grafana)
        - Documentação
        - Não sei
    validations:
      required: true
  - type: textarea
    id: descricao
    attributes:
      label: O que aconteceu?
      description: Descreva o comportamento observado e o que você esperava.
    validations:
      required: true
  - type: textarea
    id: passos
    attributes:
      label: Como reproduzir
      description: Passo a passo, comandos executados e, se houver, a mensagem de erro.
      placeholder: |
        1. Rodei `cd simulator && npm start`
        2. Cliquei em "Solicitar A"
        3. ...
    validations:
      required: true
  - type: input
    id: ambiente
    attributes:
      label: Ambiente
      description: Sistema operacional, versão do Node.js e, se for firmware, a placa e a versão da Arduino IDE.
      placeholder: "Windows 11, Node 22, Arduino IDE 2.3"
```

- [ ] **Passo 2: Formulário de ideia**

Crie `.github/ISSUE_TEMPLATE/ideia.yml`:

```yaml
name: Sugerir uma melhoria
description: Ideia de funcionalidade, melhoria de documentação ou de testes.
title: "[Ideia] "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Boas ideias são bem-vindas! Veja o
        [Guia de Contribuição](../blob/main/CONTRIBUTING.md) e os itens de
        "Próximos Passos" do [README](../blob/main/README.md) para não duplicar algo já planejado.
  - type: textarea
    id: problema
    attributes:
      label: Qual problema ou necessidade isso resolve?
    validations:
      required: true
  - type: textarea
    id: proposta
    attributes:
      label: O que você propõe?
      description: Descreva a ideia. Se tiver uma sugestão de implementação, inclua.
    validations:
      required: true
  - type: dropdown
    id: ajuda
    attributes:
      label: Você pretende implementar?
      options:
        - Sim, quero abrir o PR
        - Talvez, com orientação
        - Não, é só uma sugestão
```

- [ ] **Passo 3: Configuração das issues**

Crie `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Como implantar o sistema
    url: https://github.com/MatheusNespolo/DataFlowInventory/blob/main/docs/DEPLOYMENT.md
    about: Passo a passo para subir o sistema do zero (bancada, simulador e observabilidade).
  - name: Arquitetura e tópicos MQTT
    url: https://github.com/MatheusNespolo/DataFlowInventory/blob/main/docs/ARCHITECTURE.md
    about: Referência técnica do fluxo Arduino, ESP32, broker, servidor e dashboard.
```

- [ ] **Passo 4: Template de pull request**

Crie `.github/pull_request_template.md`:

```markdown
## O que muda

<!-- Resumo curto da mudança e do motivo. Referencie o card do GitHub Projects, se houver. -->

## Como validar

<!-- Comandos e passos usados para testar. Compilar o firmware não exige hardware; teste em bancada só se aplicável. -->

## Checklist

- [ ] Rodei as validações do [Guia de Contribuição](../blob/main/CONTRIBUTING.md#5-validações-antes-do-pr) (`scripts/precommit-checks`)
- [ ] **Não** há senhas, tokens, `.env` ou `secrets.h` na mudança
- [ ] Atualizei a documentação afetada e o `docs/CHANGELOG.md` (seção `[Não publicado]`)
- [ ] Mensagens de commit seguem o padrão `tipo: descrição` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`)
- [ ] Informei o que **não** consegui validar (por exemplo, comportamento na bancada)
```

- [ ] **Passo 5: Código de Conduta**

Crie `CODE_OF_CONDUCT.md`:

```markdown
# Código de Conduta

Este documento é uma adaptação, em português, do
[Contributor Covenant, versão 2.1](https://www.contributor-covenant.org/pt-br/version/2/1/code_of_conduct/),
licenciado sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Nosso compromisso

Queremos que participar do **Data Flow Inventory** seja uma experiência respeitosa e livre de
assédio para todas as pessoas, independentemente de idade, aparência, deficiência, etnia,
identidade e expressão de gênero, nível de experiência, nacionalidade, orientação sexual,
religião ou formação. Este é um projeto acadêmico e aberto: dúvidas de iniciantes são
bem-vindas.

## Comportamentos esperados

- Ser gentil e paciente com quem está aprendendo.
- Respeitar opiniões e experiências diferentes e aceitar críticas construtivas.
- Dar e receber feedback técnico com foco no código e nas ideias, não nas pessoas.
- Assumir responsabilidade pelos próprios erros e aprender com eles.

## Comportamentos inaceitáveis

- Linguagem ou imagens de cunho sexual, ofensivo, discriminatório ou depreciativo.
- Ataques pessoais, provocações, assédio público ou privado.
- Divulgar informações privadas de outras pessoas sem permissão.
- Publicar credenciais, tokens ou dados sensíveis do projeto ou de terceiros.
- Qualquer conduta que seria considerada inapropriada em um ambiente profissional.

## Responsabilidades da equipe mantenedora

A equipe mantenedora esclarece os padrões e pode remover, editar ou rejeitar comentários,
commits, issues e contribuições que não sigam este código, explicando o motivo quando
apropriado.

## Escopo

Este código vale em todos os espaços do projeto (repositório, issues, pull requests e
discussões) e também quando alguém representa o projeto em público.

## Como relatar um problema de conduta

Se você presenciar ou sofrer uma conduta inaceitável, procure a equipe mantenedora pelo perfil
[@MatheusNespolo](https://github.com/MatheusNespolo) no GitHub, de preferência sem expor o caso
em uma issue pública. Toda denúncia será analisada com discrição e respeito à pessoa que a fez.

## Aplicação

A equipe mantenedora decidirá as medidas cabíveis, que podem ir de um aviso reservado à
remoção de conteúdo e ao bloqueio de participação, conforme a gravidade e a reincidência.
```

- [ ] **Passo 6: Política de segurança**

Crie `SECURITY.md`:

```markdown
# Política de Segurança

## Versões cobertas

O projeto é um protótipo acadêmico em evolução. Correções de segurança são aplicadas na
branch `main`; não há versões antigas mantidas.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública** com detalhes de uma falha de segurança.

1. Se estiver disponível, use **Security → Report a vulnerability** neste repositório do GitHub
   (relato privado).
2. Se essa opção não aparecer, procure a equipe mantenedora pelo perfil
   [@MatheusNespolo](https://github.com/MatheusNespolo) no GitHub e peça um canal privado, sem
   descrever a falha em público.

Inclua, se possível: o componente afetado (servidor, simulador, dashboard, firmware ou
observabilidade), os passos para reproduzir e o impacto que você enxerga.

## O que esperar

Este é um projeto mantido por estudantes: respondemos assim que possível, sem prazo garantido,
e agradecemos o relato responsável.

## Cuidados do projeto

- Credenciais ficam em `server/.env` e em `esp32/gateway_mqtt/secrets.h`, ambos ignorados pelo
  Git. **Nunca** faça commit de senhas ou tokens (veja o
  [Guia de Contribuição](CONTRIBUTING.md#2-regras-de-segurança-não-negociáveis)).
- O servidor aplica Helmet com CSP, CORS restrito por `ALLOWED_ORIGIN`, limite de taxa de
  comandos e validação de entrada. O endpoint `/metrics` é aberto como o `/api/status`: exponha-o
  apenas em redes confiáveis.
```

- [ ] **Passo 7: Acrescentar links ao CONTRIBUTING (sem reescrever)**

Acrescente **ao final** do `CONTRIBUTING.md` (depois da última linha, "Dúvidas? Abra uma issue…"), preservando todo o texto anterior:

```markdown

## 7. Comunidade e políticas

- Convivência: [Código de Conduta](CODE_OF_CONDUCT.md).
- Falhas de segurança: [Política de Segurança](SECURITY.md) (não abra issue pública).
- Issues: use os formulários de **bug** e de **ideia**. Procure as etiquetas `good first issue` e
  `help wanted` para começar.
- Pull requests: o modelo de PR traz o checklist da seção 5.
```

- [ ] **Passo 8: Validar**

```bash
cd /c/Users/matheusn/Documents/GitHub/DataFlowInventory
ls test/server_metrics/node_modules/yaml >/dev/null 2>&1 || (cd test/server_metrics && npm ci >/dev/null 2>&1)
node -e "
const fs=require('fs');const Y=require('./test/server_metrics/node_modules/yaml');
for (const f of ['bug','ideia','config']) {
  const d=Y.parse(fs.readFileSync('.github/ISSUE_TEMPLATE/'+f+'.yml','utf8'));
  if (f==='config') { if (d.blank_issues_enabled!==false||!Array.isArray(d.contact_links)) throw new Error('config inválido'); }
  else { if(!d.name||!d.description||!Array.isArray(d.body)||!d.body.length) throw new Error(f+' inválido');
         for (const b of d.body){ if(!b.type) throw new Error(f+': item sem type'); if(b.type!=='markdown'&&!b.id) throw new Error(f+': item sem id'); } }
  console.log(f,'ok');
}"
node "$SCRATCH/verificar-links.mjs" CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md .github/pull_request_template.md
git diff --stat CONTRIBUTING.md
```

Esperado: `bug ok`, `ideia ok`, `config ok`; o verificador sem falhas **novas** (os links `../blob/main/...` dentro dos formulários e do PR template são relativos ao GitHub e não são conferidos pelo verificador; as âncoras `#5-validações-antes-do-pr` e `#2-regras-de-segurança-não-negociáveis` precisam existir no `CONTRIBUTING.md` — o verificador confere as de `SECURITY.md`); `git diff --stat CONTRIBUTING.md` mostrando só linhas acrescentadas no fim. Confira também manualmente que a âncora `#5-validações-antes-do-pr` bate com o título `## 5. Validações antes do PR` (slug do GitHub: `5-validações-antes-do-pr`).

- [ ] **Passo 9: Commit**

```bash
git add .github CODE_OF_CONDUCT.md SECURITY.md CONTRIBUTING.md
git commit -m "docs: formularios de issue, template de PR, codigo de conduta e politica de seguranca

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 5: Plano de divulgação (`docs/DIVULGACAO.md`)

**Arquivos:**
- Criar: `docs/DIVULGACAO.md`

**Interfaces:**
- Consome: âncoras do README da Tarefa 2 (`#escolha-seu-caminho`, `#por-que-este-projeto-é-interessante`).

**Regras de conteúdo (do spec, seção 6):** o documento **não afirma** que um grupo ou canal específico exista ou aceite divulgação; todo canal vem com a instrução "confira as regras antes de postar". Os textos não prometem o que o repositório não cumpre (esteiras B e C em diagnóstico; HiveMQ parcialmente validado). Nada é publicado nem criado por este plano: issues são **rascunhos**.

- [ ] **Passo 1: Escrever o documento**

Crie `docs/DIVULGACAO.md` com exatamente este conteúdo:

````markdown
# Plano de Divulgação — Data Flow Inventory

Documento da equipe para apresentar o projeto a quem trabalha com **Arduino/C++, ESP32, IoT,
automação e software livre**, de forma honesta e sem inflar números. Tudo aqui é **rascunho para a
equipe revisar e publicar**: nenhum texto foi postado e nenhuma issue foi criada.

> **Antes de qualquer post:** confira o status atual no [README](../README.md) (esteiras B e C, validação do
> HiveMQ Cloud) e **não prometa o que ainda não foi validado em bancada**.

## 1. Texto-base (reaproveite e adapte)

**Uma linha:**
Centro de distribuição em miniatura controlado por Arduino e ESP32, com dashboard web em tempo real,
vista 3D e métricas em Prometheus/Grafana — dá para testar sem hardware.

**Parágrafo curto:**
O **Data Flow Inventory** é um protótipo IoT acadêmico (SENAI São Caetano do Sul) que simula um
centro de distribuição automatizado: o pedido sai do dashboard no navegador, passa por MQTT e por um
gateway ESP32 e chega a um Arduino Uno que aciona esteiras e lê sensores. Tem firmware em C++, servidor
Node.js, vista 3D, observabilidade com Prometheus/Grafana e um simulador para experimentar em 30
segundos, sem nenhum componente físico.

**Destaques (lista):**
- Firmware C++ no Arduino Uno (máquina de estados) e no ESP32 (gateway MQTT).
- MQTT com Mosquitto local ou HiveMQ Cloud, usando retained e LWT.
- Dashboard em tempo real (Socket.IO) com vista 3D da bancada.
- Observabilidade: 17 métricas e três dashboards no Grafana.
- Testes unitários, E2E e CI que compila os sketches.
- Simulador: `cd simulator && npm install && npm start`.

**Link principal:** <https://github.com/MatheusNespolo/DataFlowInventory> — quem chega pela primeira vez
deve cair na seção [Escolha seu caminho](../README.md#escolha-seu-caminho).

## 2. Posts por canal (rascunhos)

> **Confira as regras de cada canal e se ele aceita divulgação de projeto próprio.** Os nomes abaixo
> são sugestões de tipo de canal; a equipe valida que existem e estão ativos antes de usar.
> **Um canal por vez**, com pelo menos alguns dias entre posts (veja a seção 4).

### 2.1 LinkedIn (perfil de cada integrante)

```text
Nosso projeto de Engenharia de Controle e Automação no SENAI São Caetano do Sul: o Data Flow
Inventory, um centro de distribuição em miniatura controlado por Arduino Uno + ESP32.

O pedido sai de um dashboard web em tempo real, viaja por MQTT, passa pelo gateway ESP32 e o Arduino
aciona as esteiras e lê os sensores. O código é aberto: firmware em C++, servidor Node.js, vista 3D e
métricas com Prometheus/Grafana. Dá para testar tudo sem hardware, pelo simulador.

Ainda está em evolução (estamos ajustando as esteiras B e C na bancada) e queremos feedback de quem
trabalha com automação, embarcados e IoT.

Repositório: https://github.com/MatheusNespolo/DataFlowInventory
#automacao #iot #arduino #esp32 #cpp #mqtt #industria40
```

### 2.2 Artigo ou post longo (por exemplo, Embarcados ou TabNews)

Estrutura sugerida (cerca de 600 a 900 palavras), a adaptar às regras de submissão do canal:

1. **O problema:** como acompanhar e comandar um centro de distribuição de bancada em tempo real.
2. **A arquitetura:** Arduino (máquina de estados) → ESP32 (gateway) → broker MQTT → servidor Node.js → dashboard. Use o diagrama `img/ArquiteturaDataFlowInventory.png`.
3. **Uma decisão técnica interessante:** a confirmação de entrega só debita o estoque depois que o sensor de junção detecta a peça, com timeout de segurança; ou o uso do LWT para saber se o gateway caiu.
4. **Como experimentar em 30 segundos:** o simulador.
5. **O que ainda falta:** esteiras B e C, validação completa do HiveMQ Cloud.
6. **Convite:** issues `good first issue` e o [Guia de Contribuição](../CONTRIBUTING.md).

### 2.3 Fórum ou comunidade de programação (por exemplo, r/brdev)

```text
Título: Projeto aberto: centro de distribuição em miniatura com Arduino + ESP32 + MQTT + dashboard 3D

Somos estudantes de Engenharia de Controle e Automação (SENAI) e publicamos o Data Flow Inventory:
firmware em C++ (Arduino Uno e ESP32), servidor Node.js, dashboard em tempo real com vista 3D e
observabilidade com Prometheus/Grafana. Tem um simulador para rodar sem hardware.
Gostaríamos de feedback de arquitetura e de contribuições (há issues para iniciantes).
Repositório: https://github.com/MatheusNespolo/DataFlowInventory
```

### 2.4 Grupos de Arduino, IoT e automação (WhatsApp, Telegram, Discord, Facebook)

Mensagem curta, só se as regras do grupo permitirem:

```text
Pessoal, publicamos um projeto aberto de centro de distribuição em miniatura (Arduino Uno + ESP32 +
MQTT + dashboard web em tempo real). Tem simulador pra testar sem hardware. Feedback é bem-vindo:
https://github.com/MatheusNespolo/DataFlowInventory
```

## 3. Issues iniciais (rascunhos — não criadas)

Cada rascunho serve para a equipe criar uma issue **depois de aprovar**. Etiquetas já existem no repositório.

### 3.1 Simulador: cenário de timeout de entrega

- **Etiquetas:** `enhancement`, `help wanted`
- **Texto:** o simulador (`simulator/server.js`) cobre o fluxo de sucesso, a falta de estoque e a FSM ocupada, mas **não simula o timeout de entrega** do firmware real (`TIMEOUT_ENTREGA`). Adicionar uma forma de provocar esse cenário (por exemplo, um comando ou variável de ambiente) para que o dashboard mostre o estado `ERRO` com o tipo `timeout`.
- **Critério de aceite:** o dashboard exibe o erro de timeout no simulador e o botão **Reiniciar** volta ao estado inicial; teste de fumaça cobrindo o cenário.

### 3.2 Documentação: glossário de termos

- **Etiquetas:** `documentation`, `good first issue`
- **Texto:** criar um glossário curto (FSM, LWT, retained, QoS, broker, gateway, IRF520, PWM, TCRT5000) em `docs/`, em português claro, com link a partir do README.
- **Critério de aceite:** cada termo explicado em até três linhas e relacionado ao projeto; links verificados.

### 3.3 Firmware: persistir o estoque na EEPROM do Uno

- **Etiquetas:** `enhancement`, `help wanted`
- **Texto:** hoje o estoque do Arduino volta ao valor inicial a cada reinício. Avaliar gravar o estoque na EEPROM (com cuidado com o número de escritas) e restaurá-lo no `setup()`.
- **Critério de aceite:** proposta ou PR com a decisão (quando gravar, como evitar desgaste), compilando com `arduino-cli`; validação em bancada é responsabilidade de quem tiver o hardware.

### 3.4 CI: verificação de links dos documentos

- **Etiquetas:** `enhancement`, `good first issue`
- **Texto:** adicionar um job que valide os links relativos e as âncoras dos arquivos Markdown (README, CONTRIBUTING, `docs/`), para evitar documentação quebrada.
- **Critério de aceite:** o job falha com um link quebrado de propósito e passa no estado atual do repositório.

## 4. Crescimento orgânico — checklist

- [ ] Um canal por vez, com **pelo menos três dias** entre posts, adaptando o texto ao formato do canal.
- [ ] Antes de postar, conferir se o README e o status das esteiras estão atualizados.
- [ ] Responder **todo** comentário e issue em até dois dias, com cordialidade.
- [ ] Acolher a primeira contribuição de uma pessoa nova: agradecer, orientar com o [Guia de Contribuição](../CONTRIBUTING.md) e revisar rápido.
- [ ] Manter pelo menos duas issues abertas com `good first issue` ou `help wanted`.
- [ ] Mostrar o que o projeto **faz** (simulador, vista 3D, métricas), não pedir estrela. O pedido de estrela fica só no fim do README.
- [ ] **Não fazer:** pedir estrelas em massa, trocar estrelas entre perfis, comprar engajamento, postar o mesmo texto em muitos grupos ao mesmo tempo ou ignorar as regras de um canal.

## 5. Como acompanhar (sem obsessão por número)

No GitHub, em **Insights → Traffic**, observe visitas, visitantes únicos e origem das visitas (guarda 14 dias).
Registre a cada semana: estrelas, forks, issues abertas por pessoas de fora e PRs de fora.
Interprete assim: **visitas altas sem estrelas** pedem melhorar a abertura do README; **estrelas sem forks** são normais;
**issues de fora** são o melhor sinal de interesse real.

## 6. Hacktoberfest

O tópico `hacktoberfest` foi proposto para outubro. Ao mantê-lo, a equipe assume:

- Ter issues abertas e rotuladas (seção 3) e revisar PRs de fora durante o mês.
- Rejeitar com cordialidade contribuições de baixa qualidade ou só para "marcar presença" (etiqueta `invalid`).
- **Conferir as regras oficiais do evento no ano corrente** em <https://hacktoberfest.com> antes de
  manter o tópico, pois elas mudam de ano para ano.

Se a equipe não puder cumprir esse compromisso, **remova o tópico** (Configurações do repositório → *About*).
````

- [ ] **Passo 2: Validar**

```bash
cd /c/Users/matheusn/Documents/GitHub/DataFlowInventory
node "$SCRATCH/verificar-links.mjs" docs/DIVULGACAO.md
grep -n 'estrela' docs/DIVULGACAO.md | head
git diff --stat
```

Esperado: `todos os links e âncoras existem` (as âncoras `../README.md#escolha-seu-caminho` e o `../CONTRIBUTING.md` precisam resolver — dependem da Tarefa 2 já commitada); o documento não pede estrelas como tática; `git status` só com `docs/DIVULGACAO.md` novo.

Confira também que **nenhuma afirmação** do documento contradiz o repositório: `TIMEOUT_ENTREGA` existe no `.ino`; o simulador realmente não simula timeout (`grep -n 'timeout' simulator/server.js` não mostra um cenário de timeout; o README diz isso na seção "Modo Simulador"); as etiquetas `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`, `invalid` existem (`gh label list`).

- [ ] **Passo 3: Commit**

```bash
git add docs/DIVULGACAO.md
git commit -m "docs: plano de divulgacao organica do projeto

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 6: CHANGELOG e verificação final do repositório

**Arquivos:**
- Modificar: `docs/CHANGELOG.md`

- [ ] **Passo 1: Entrada no CHANGELOG**

Em `docs/CHANGELOG.md`, dentro de `## [Não publicado]`, acrescente esta subseção `### Alterado` **antes** de `### Problemas Conhecidos` (se já existir um `### Alterado` em `[Não publicado]`, acrescente o item dentro dele, sem criar outro). Use a ferramenta Edit com âncora em `### Problemas Conhecidos` (ocorrência única; confirme com `grep -c '^### Problemas Conhecidos' docs/CHANGELOG.md`):

```markdown
### Alterado

- **Divulgação e organização do README (02/10/2026)**
  - `README.md` reorganizado sem reescrever as seções: abertura enxuta (frase de posicionamento, badges de 17 para 8), tabela **Escolha seu caminho**, seção **Por que este projeto é interessante**, diagrama de arquitetura movido para a seção Arquitetura e pedido de estrela no fim
  - `LICENSE` normalizado (copyright em uma linha, finais de linha LF) para o GitHub reconhecer a licença MIT; **o reconhecimento só se confirma depois do merge**
  - Novos arquivos de comunidade: formulários de issue (bug e ideia), modelo de pull request, `CODE_OF_CONDUCT.md` e `SECURITY.md`; `CONTRIBUTING.md` ganhou a seção 7 com os links
  - Novo `docs/DIVULGACAO.md`: plano de divulgação orgânica com textos-base, rascunhos por canal, rascunhos de issues iniciais, checklist e métricas. **Nada foi publicado e nenhuma issue foi criada**; a publicação e a checagem dos canais são da equipe

```

- [ ] **Passo 2: Verificação final dos documentos**

```bash
cd /c/Users/matheusn/Documents/GitHub/DataFlowInventory
node "$SCRATCH/verificar-links.mjs" README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md docs/DIVULGACAO.md .github/pull_request_template.md
git status --short
git diff origin/main --stat | tail -15
git diff origin/main --name-only | grep -E '^(arduino|esp32|server|simulator|frontend|test|observability|scripts|docker-compose.yml)' || echo "nenhum arquivo de produto alterado"
grep -rn '```' --include=*.yml .github/ISSUE_TEMPLATE || echo "sem cercas de markdown em YAML"
```

Esperado: verificador limpo (sem falhas **novas**), árvore limpa, os arquivos listados no mapa e **nenhum** arquivo de produto alterado.

- [ ] **Passo 3: Rede de segurança dos testes (nada de código mudou; confirma que nada quebrou)**

```bash
node --test test/frontend/*.test.mjs 2>&1 | grep -E '^# (pass|fail)'
(cd test/server_metrics && npm ci >/dev/null 2>&1; npm test 2>&1 | grep -E '^# (tests|pass|fail)')
```

Esperado: 0 falhas nas duas execuções. Não rode a suíte Playwright completa (lenta e instável neste ambiente; nenhum código de frontend mudou).

- [ ] **Passo 4: Commit**

```bash
git add docs/CHANGELOG.md
git commit -m "docs(changelog): divulgacao, README reorganizado e arquivos de comunidade

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 7: Vitrine do GitHub (executada pelo controlador, com aprovação da equipe)

**Esta tarefa NÃO é delegada a um subagente de implementação.** Ela altera configurações do repositório público e exige que a equipe aprove a lista **antes** (D4). Só o controlador a executa.

**Interfaces:**
- Consome: o merge das tarefas 1–6 na `main` (para o Passo 4, a licença).

- [ ] **Passo 1: Mostrar a lista à equipe e esperar o "sim"**

Apresente exatamente isto e **pare**:

- **Descrição:** `Protótipo IoT de centro de distribuição automatizado: Arduino Uno + ESP32 (C++), MQTT, dashboard web em tempo real com vista 3D e observabilidade com Prometheus/Grafana. Testável sem hardware.`
- **Site (homepage):** deixar em branco (não há site).
- **Tópicos:** `arduino`, `esp32`, `cpp`, `mqtt`, `iot`, `nodejs`, `socket-io`, `three-js`, `industria-4-0`, `automacao-industrial`, `intralogistica`, `prometheus`, `grafana`, `hacktoberfest`.
- **Relato privado de vulnerabilidades** (Security → Report a vulnerability): habilitar, para o `SECURITY.md` apontar para algo que existe. Pergunte se a equipe quer isso.

Sem aprovação explícita, **não execute o Passo 2**.

- [ ] **Passo 2: Aplicar o que foi aprovado**

```bash
gh repo edit MatheusNespolo/DataFlowInventory \
  --description "Protótipo IoT de centro de distribuição automatizado: Arduino Uno + ESP32 (C++), MQTT, dashboard web em tempo real com vista 3D e observabilidade com Prometheus/Grafana. Testável sem hardware." \
  --add-topic arduino --add-topic esp32 --add-topic cpp --add-topic mqtt --add-topic iot \
  --add-topic nodejs --add-topic socket-io --add-topic three-js --add-topic industria-4-0 \
  --add-topic automacao-industrial --add-topic intralogistica --add-topic prometheus \
  --add-topic grafana --add-topic hacktoberfest
```

Se a equipe aprovou o relato privado de vulnerabilidades:

```bash
gh api -X PUT repos/MatheusNespolo/DataFlowInventory/private-vulnerability-reporting
```

Remova da linha de comando qualquer item que a equipe tenha cortado (por exemplo, `hacktoberfest`).

- [ ] **Passo 3: Conferir**

```bash
gh repo view MatheusNespolo/DataFlowInventory --json description,repositoryTopics --jq '{descricao:.description, topicos:[.repositoryTopics[].name]}'
```

Esperado: a descrição e os tópicos aprovados.

- [ ] **Passo 4 (depois do merge das tarefas 1–6 na `main`): conferir a licença**

```bash
gh api repos/MatheusNespolo/DataFlowInventory/license --jq '.license.spdx_id'
gh api repos/MatheusNespolo/DataFlowInventory/community/profile --jq '{health:.health_percentage, arquivos:(.files|to_entries|map(select(.value!=null).key))}'
```

Esperado: `MIT` (pode levar alguns minutos) e saúde da comunidade acima de 57%. Se continuar `NOASSERTION`, **relate** à equipe e registre; não bloqueia o resto.

---

### Relatório final (controlador)

Informe: o que foi feito; o que **não** foi validado (aparência no GitHub, reconhecimento da licença, formulários de issue renderizados); o que fica para a equipe (revisar e publicar os posts, conferir os canais, criar as issues rascunhadas, abrir o PR); e lembre de **apagar `docs/superpowers/` da branch antes do merge**, como no PR anterior.
