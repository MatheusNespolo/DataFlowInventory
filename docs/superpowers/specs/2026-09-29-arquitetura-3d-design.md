# Arquitetura 3D navegável + polimento do painel — Design

- **Data:** 29/09/2026
- **Branch:** `feat/arquitetura-3d` (worktree isolado; a `main` tem trabalho de documentação em andamento de outro agente)
- **Status:** aprovado em brainstorming, aguardando revisão do spec escrito
- **Guias de design:** skill `ui-ux-pro-max` (regras de acessibilidade, toque, navegação, contraste em tema escuro e stack `threejs`); referência de navegação 3D: exemplo three.js `misc_exporter_stl`

---

## 1. Objetivo

1. Criar uma terceira vista do dashboard, `#/arquitetura`, com um **diagrama 3D navegável** da arquitetura do Data Flow Inventory (Arduino → ESP32 → Broker → Servidor → Dashboard, historiador Beckhoff e simulador) mostrando **o status ao vivo de cada conexão**.
2. **Destacar a navegação** entre as três vistas (hoje é um link discreto no rodapé).
3. **Polir o painel principal** mantendo o tema (painel anunciador IEC 60073, IBM Plex, paleta atual).
4. **Não quebrar nenhum botão**: os controles Solicitar A/B/C e Reiniciar devem continuar funcionando, verificados por teste automatizado no CI.

### Fora de escopo

- Telemetria oficial de conectividade no servidor (evento Socket.IO dedicado, status do Beckhoff, heartbeat serial). Fica como melhoria futura; esta entrega usa apenas sinais já existentes.
- Reorganizar os cards/bays do painel, trocar paleta ou fontes.
- Qualquer alteração em `docs/*.md`, `README.md`, `docs/CHANGELOG.md` e `frontend/README.md` (território do agente de documentação). Ao final, um texto de changelog/README é entregue para incorporação manual.
- Alterações em `server/` e `simulator/`.

---

## 2. Estado atual (base: `main` @ `2393dc1`)

- SPA estática em `frontend/` servida por `server/server.js` (Express + helmet) ou `simulator/server.js` (Express, sem helmet).
- Roteamento por hash binário em `frontend/js/app.js` (`#/status` ou painel principal).
- Mímico 3D em `frontend/js/diagrama3d.js` com three.js **r169** vendorizado em `frontend/vendor/three.module.min.js`; pausa quando `location.hash === '#/status'`.
- CSP do servidor: `scriptSrc 'self' https://cdn.socket.io`. Qualquer script inline (inclusive `importmap`) é bloqueado.
- Botões ligados no topo de `app.js` sem guarda (`els.btnSolicitarA.addEventListener(...)`, linhas 644–647): um `id` ausente ou uma exceção anterior derruba o script inteiro. Os botões ficam `disabled` fora de `AGUARDANDO_PEDIDO` sem explicação visível.
- Sinais de conectividade disponíveis no navegador:

| Enlace | Sinal |
|---|---|
| Dashboard ↔ Servidor | eventos `connect`/`disconnect` do Socket.IO |
| Servidor ↔ Broker | `GET /api/status` → `mqtt: bool`, `brokerUrl` (200 / 503). **Inexistente no simulador (404).** |
| Broker ↔ ESP32 | evento `gateway` (`status: online/offline`, via LWT) |
| ESP32 ↔ Arduino | nenhum direto; inferível pela chegada de `status`/`sensores`/`esteiras` |
| Broker ↔ Beckhoff CX9240 | nenhum |

---

## 3. Arquitetura da solução

### 3.1 Unidades

| Arquivo | Responsabilidade | Depende de |
|---|---|---|
| `frontend/js/arquitetura-dados.js` | Modelo estático: nós, enlaces, câmeras-preset, conteúdo dos detalhes (snapshot da documentação com citação da fonte) | — |
| `frontend/js/arquitetura-status.js` | Função pura `derivarStatus(sinais, agora)` → `{ modo, nos, enlaces, resumo }` | — |
| `frontend/js/arquitetura-sinais.js` | Coleta de sinais: listeners no socket compartilhado + polling de `/api/status`; expõe `iniciar()`, `parar()`, `obter()` e `aoMudar(cb)` | `window.dfiSocket` |
| `frontend/js/arquitetura3d.js` | Cena three.js, navegação, rótulos CSS2D, painel de detalhes, fallback SVG, integração com a rota | os três acima + vendor |
| `frontend/js/arquitetura-fallback.js` | Diagrama SVG 2D gerado a partir de `arquitetura-dados.js` quando não há WebGL | `arquitetura-dados.js` |
| `frontend/vendor/OrbitControls.js` | Addon three.js **0.169.0**, import reescrito para `/vendor/three.module.min.js` | vendor three |
| `frontend/vendor/CSS2DRenderer.js` | Idem | vendor three |

Todos os módulos novos são ES modules, carregados por `<script type="module">`, independentes de `app.js`. Uma falha em qualquer um deles não afeta o painel principal nem os botões.

### 3.2 Mudanças em arquivos existentes (cirúrgicas)

- `frontend/js/app.js`
  - `window.dfiSocket = socket;` logo após `const socket = io();` (aditivo).
  - Roteador passa de binário a mapa de rotas: `{ '#/': principal, '#/status': status, '#/arquitetura': arquitetura }`; hash vazio ou desconhecido → principal. Mantém a lógica atual de foco, título, `aria-live` e scroll. Atualiza `aria-current` no seletor de vistas.
  - Contador de eventos não vistos para a tecla LOG: incrementado em `adicionarHistorico`, zerado ao entrar em `#/status`.
  - Ligação dos botões protegida: cada `addEventListener` passa por um helper `ligar(el, fn)` que registra `console.error` se o elemento não existir, em vez de lançar exceção. Os `id` não mudam.
- `frontend/js/diagrama3d.js`: a pausa passa a testar "rota principal ativa" (`hash` vazio, `#` ou `#/`) em vez de `!== '#/status'`.
- `frontend/index.html`: nova `<main id="view-arquitetura">`, seletor de vistas, ícones SVG nos botões, linha de ajuda de botões desabilitados, atalhos nas células Enlace/Gateway e no card do mímico, scripts de módulo novos. Remove o link `#footer-nav` e o `.voltar` da vista de status (substituídos pelo seletor).
- `frontend/css/style.css`: estilos do seletor, da vista de arquitetura e do polimento (Seção 6). Nenhum token existente é renomeado.

### 3.3 Contrato congelado (não pode mudar)

Todos os `id` referenciados em `app.js` (objeto `els`) e em `diagrama3d.js` (`mimic-3d`, classe `.mimic`) continuam presentes, com o mesmo tipo de elemento para os botões (`<button>`), e as células da faixa mantêm `.annun-v`, `.annun-led` e `data-state`. O teste E2E (Seção 7) verifica esse contrato.

---

## 4. Dados e lógica de status

### 4.1 Nós

| id | Código | Nome | Camada | Detalhes (fonte) |
|---|---|---|---|---|
| `arduino` | FLD | Arduino Uno — FSM | Campo | 5 estados da FSM, rejeições explícitas, tabela de hardware/pinagem (ARCHITECTURE.md §3–4) |
| `hardware` | — | Cluster de hardware (3 motores DC/IRF520, 6 IR TCRT5000, LCD I2C, passo 28BYJ-48) | Campo | ARCHITECTURE.md §4 — sub-elementos visuais do nó `arduino`, sem status próprio |
| `esp32` | EDG | ESP32 — Gateway MQTT | Borda | LWT em `dataflow/status`, ponte Serial↔MQTT (arquitetura_mqtt.md) |
| `broker` | MSG | Broker MQTT (Mosquitto local / HiveMQ Cloud TLS 8883) | Mensageria | tabela de tópicos (ARCHITECTURE.md §2.2), modos (§5) |
| `servidor` | APP | Servidor Node.js | Aplicação | `/api/status`, métricas, LWT `dataflow/status/server` |
| `simulador` | SIM | Simulador (Modo 3) | Aplicação | ARCHITECTURE.md §5 |
| `dashboard` | HMI | Dashboard web | Apresentação | vistas, Socket.IO |
| `beckhoff` | HST | Beckhoff CX9240 — Historiador SQLite | Historiador | TF6701/TF6420, tabelas (ARCHITECTURE.md §6.1) |

O cabeçalho de `arquitetura-dados.js` registra: *"Snapshot de docs/ARCHITECTURE.md e docs/arquitetura_mqtt.md em 29/09/2026. Se a documentação mudar, atualizar este arquivo."*

### 4.2 Enlaces

| id | De → Para | Protocolo | Tópicos exibidos | Fonte de status |
|---|---|---|---|---|
| `uart` | arduino ↔ esp32 | UART Serial | — | inferido |
| `mqtt-esp32` | esp32 ↔ broker | MQTT (TLS no Modo 2) | `dataflow/status`, `dataflow/estoque`, `dataflow/eventos`, `dataflow/sensores`, `dataflow/esteiras`, `dataflow/comandos/*` | evento `gateway` |
| `mqtt-servidor` | broker ↔ servidor | MQTT | mesmos + `dataflow/status/server` | polling `/api/status` |
| `socket-servidor` | servidor ↔ dashboard | Socket.IO | — | conexão do socket |
| `mqtt-beckhoff` | broker → beckhoff | MQTT (TF6701) | `dataflow/estoque`, `dataflow/eventos` | nenhuma |
| `socket-simulador` | simulador ↔ dashboard | Socket.IO | — | conexão do socket (Modo 3) |
| `mqtt-simulador` | simulador → broker | MQTT opcional (`MQTT_PUBLISH=true`) | `dataflow/estoque` | nenhuma |

### 4.3 Sinais (entrada de `derivarStatus`)

```js
{
  socketConectado: boolean,
  api: { tipo: 'ok', mqtt: boolean, brokerUrl: string }   // HTTP 200 ou 503 com corpo JSON
     | { tipo: 'ausente' }                                 // HTTP 404 → simulador
     | { tipo: 'erro' }                                    // rede/timeout/outro
     | { tipo: 'pendente' },                               // ainda sem resposta
  gateway: 'online' | 'offline' | null,
  ultimoDadoCampoEm: number | null,   // epoch ms da última msg status/sensores/esteiras
  apiEm: number | null,               // epoch ms da última resposta do polling
}
```

### 4.4 Estados

`ok` · `atencao` · `falha` · `desconhecido` · `sem-telemetria` · `sem-dados` · `fora-do-modo`

Cada enlace também traz `inferido: boolean` e `fonte: string` (texto exibido no painel de detalhes).

### 4.5 Regras

**Modo:**
- `api.tipo === 'ausente'` → `simulador` (Modo 3).
- `api.tipo === 'ok'` e `brokerUrl` contém `hivemq`, `mqtts://` ou `:8883` → `nuvem` (Modo 2).
- `api.tipo === 'ok'` em qualquer outro caso → `local` (Modo 1).
- `pendente`/`erro` → `desconhecido`. A cena mostra os dois ramos (servidor e simulador) sem esmaecer nenhum.

**Socket caído** (`socketConectado === false`): o enlace do dashboard (`socket-servidor` ou `socket-simulador`, conforme o modo; ambos se o modo for desconhecido) fica em `falha`, e todos os demais enlaces com fonte monitorada ou inferida ficam em `sem-dados`. `sem-telemetria` permanece.

**Com socket conectado:**

| Enlace | Regra |
|---|---|
| `socket-servidor` | Modo ≠ simulador → `ok`; Modo simulador → `fora-do-modo` |
| `socket-simulador` | Modo simulador → `ok`; senão → `fora-do-modo` |
| `mqtt-servidor` | `api.ok && mqtt` → `ok`; `api.ok && !mqtt` → `falha`; `erro`/`pendente` → `desconhecido`; simulador → `fora-do-modo` |
| `mqtt-esp32` | `gateway === 'online'` → `ok`; `'offline'` → `falha`; `null` → `desconhecido`; simulador → `fora-do-modo` |
| `uart` (inferido) | simulador → `fora-do-modo`; `gateway !== 'online'` → `desconhecido`; último dado de campo < 60 s → `ok`; caso contrário → `atencao` ("sem dados recentes"). **Nunca `falha`.** |
| `mqtt-beckhoff` | sempre `sem-telemetria`; no simulador também `sem-telemetria` (o historiador foi validado com `MQTT_PUBLISH=true`) |
| `mqtt-simulador` | Modo simulador → `sem-telemetria`; senão → `fora-do-modo` |

**Status do nó:** pior estado entre seus enlaces monitorados, na ordem `falha > atencao > desconhecido > sem-dados > ok`. Enlaces `sem-telemetria` e `fora-do-modo` não entram na conta. Um nó cujos enlaces estão todos fora do modo fica `fora-do-modo`. O nó `beckhoff` fica `sem-telemetria`. O nó `dashboard` reflete o enlace de socket ativo.

**Resumo:** `{ pior, monitorados, ok }` para o LED da tecla ARC e para o anúncio `aria-live`.

### 4.6 Coleta

- Polling de `GET /api/status` a cada 5 s, timeout de 3 s (`AbortController`), **somente** com a rota `#/arquitetura` ativa e `document.visibilityState === 'visible'`. Uma consulta única de fundo a cada 30 s alimenta o LED da tecla ARC enquanto o usuário está em outras vistas.
- A resposta 503 do servidor contém JSON; é tratada como `ok` com `mqtt: false`.
- Listeners próprios no `window.dfiSocket`: `connect`, `disconnect`, `gateway`, `estado_inicial` (lê `gateway`), `status`, `sensores`, `esteiras` (atualizam `ultimoDadoCampoEm`).
- Se `window.dfiSocket` não existir, os sinais ficam em `socketConectado: false` e a página mostra o aviso "Sem conexão com o servidor".
- Um temporizador de 1 s reavalia `derivarStatus` enquanto a rota está ativa, para a regra de 60 s do UART e o texto "atualizado há X s".

---

## 5. Página `#/arquitetura`

### 5.1 Layout

- A faixa anunciadora e o seletor de vistas ficam no topo; abaixo vem uma barra da vista com o título `ARC Arquitetura do sistema`, o selo do modo (`Modo 1 · Mosquitto local`, `Modo 2 · HiveMQ Cloud`, `Modo 3 · Simulador`, `Modo desconhecido`) e "atualizado há X s".
- A cena ocupa a altura restante (`min-height: 420px`).
- **Controles** (sobrepostos, canto superior direito, no mesmo formato dos bays): *Visão geral*, *Campo*, *Nuvem*, *Aplicação*, *Enquadrar seleção*, alternadores *Partículas* e *Rótulos*. Em ≤720 px ficam recolhidos num botão "Controles".
- **Legenda** (canto inferior esquerdo): OK, Atenção, Falha, Desconhecido, Inferido (tracejado), Não monitorado (cinza tracejado), Fora do modo (esmaecido).
- **Painel de detalhes:** gaveta de 360 px à direita em desktop; *bottom sheet* em ≤720 px. Botão Fechar e tecla Esc.

### 5.2 Cena (padrão do exemplo `misc_exporter_stl`, no tema escuro)

- `PerspectiveCamera` com FOV 45, sobre um plano de chão amplo com `GridHelper` na cor `--etch` e `Fog` na cor do fundo (`--panel`), para que a grade se dissolva no horizonte.
- Iluminação reaproveitada do mímico: ambiente PMREM em gradiente, luz hemisférica, luz principal com sombra suave e luz de preenchimento. `ACESFilmicToneMapping` e `SRGBColorSpace`.
- Layout fixo em X (fluxo da esquerda para a direita): Arduino + cluster de hardware (x≈−8) → ESP32 (x≈−4) → Broker (x≈0, plataforma elevada) → Servidor (x≈4, z≈−1,5) / Simulador (x≈4, z≈+2,5) → Dashboard (x≈8). Beckhoff atrás do broker (z≈−5). Os valores exatos ficam em `arquitetura-dados.js`.
- **Nós:** geometria simples por tipo (placa para Arduino/ESP32, torre para broker/servidor, monitor para o dashboard, rack para o Beckhoff) em material metálico fosco; um anel emissivo na base assume a cor do status.
- **Enlaces:** `TubeGeometry` sobre curvas suaves, na cor do status. Tracejado via textura para `inferido`/`sem-telemetria`. Opacidade de 0,15 para `fora-do-modo`.
- **Partículas:** esferas pequenas percorrendo a curva na direção do fluxo, só em enlaces `ok`. Desligadas com `prefers-reduced-motion` e pelo alternador.
- **Rótulos:** `CSS2DRenderer`; cada nó tem um `<button class="arq-rotulo">` com código, nome, LED e estado em texto no `aria-label`.

### 5.3 Navegação

- `OrbitControls` com `enableDamping`, `maxPolarAngle` ≈ 85° (nunca abaixo do chão), `minDistance`/`maxDistance` e `target` inicial no broker. Arrastar gira, a roda aproxima, o botão direito/dois dedos faz pan.
- Presets e seleção fazem uma interpolação de câmera (posição e `target`) de 600 ms com easing; com `prefers-reduced-motion`, corte seco.
- Clicar no nó (raycaster na malha ou clique no rótulo) seleciona, enquadra e abre os detalhes. Clicar num enlace (raycaster no tubo, com tolerância) mostra os detalhes do enlace.
- Teclado: Tab percorre os rótulos; Enter/Espaço seleciona; Esc fecha os detalhes e volta à visão geral.
- Canvas com `role="img"` e `aria-label` descrevendo os controles (regra `threejs` da skill).

### 5.4 Painel de detalhes

- **Nó:** código, nome, LED + estado em texto (+ selo "inferido"), Função, Conexões (lista de enlaces com status, cada um clicável), Tópicos MQTT (tabela: tópico, direção, QoS, retained), Hardware/pinagem (Arduino), Estados da FSM (Arduino), Fonte na documentação.
- **Enlace:** protocolo, de → para, tópicos, estado, **de onde vem o status** (`fonte`) e "último sinal há X s".
- Uma região `aria-live="polite"` anuncia apenas mudanças de estado dos enlaces (por exemplo, "Broker ↔ ESP32: falha").

### 5.5 Ciclo de vida

- O módulo é carregado junto com a página, mas a cena só é construída na **primeira** entrada em `#/arquitetura`.
- Ao sair da rota: `renderer.setAnimationLoop(null)` e parada do polling de 5 s. Ao voltar: retoma.
- Renderização "por sujeira", como no mímico: redesenha só quando há interação, animação ou mudança de status (as partículas contam como animação).
- Sem WebGL, ou se a criação do renderer falhar, `arquitetura-fallback.js` desenha o SVG 2D com as mesmas classes de status e o mesmo painel de detalhes.

---

## 6. Navegação e polimento do painel (ui-ux-pro-max)

### 6.1 Seletor de vistas

- `<nav class="seletor" aria-label="Vistas">` fixo logo abaixo da faixa anunciadora, com três `<a>`:
  - `PNL · Painel` → `#/`
  - `LOG · Equipamentos & histórico` → `#/status`, com contador de eventos não vistos (oculto quando 0; `aria-label` inclui a contagem)
  - `ARC · Arquitetura` → `#/arquitetura`, com LED do pior status entre os enlaces monitorados (texto equivalente no `aria-label`)
- Visual de tecla de painel: face `--bay-raised`, borda `--etch`, legenda em mono; a tecla ativa fica "afundada" (sombra interna) com borda `--led-idle`, e `aria-current="page"`.
- Alvo mínimo de 44 px de altura, 8 px entre teclas, foco visível de 2 px `--led-idle` com offset, `scroll-padding-top` igual à altura do cabeçalho fixo.
- Em ≤720 px: barra inferior fixa, com os 3 itens em ícone + rótulo curto (Painel / Eventos / Arquitetura), `padding-bottom: env(safe-area-inset-bottom)` e `padding-bottom` extra no `body`.
- Ícones em SVG inline (paths Lucide, licença ISC): `layout-dashboard`, `list`, `network`; `aria-hidden="true"`.
- Atalhos contextuais: um botão "Ver arquitetura →" no título do card do mímico e, nas células Enlace e Gateway da faixa, um link visualmente discreto (`<a class="annun-atalho" href="#/arquitetura" aria-label="Ver conexão na arquitetura">`) adicionado **dentro** da célula, sem alterar `.annun-v`, `.annun-led` e `data-state`.
- São removidos o `#footer-nav` e o `.voltar` da vista de status.

### 6.2 Botões de controle

- Emojis trocados por SVG inline: quadrado arredondado preenchido com `--peca-a/b/c` e ícone `rotate-ccw` no Reiniciar. `aria-hidden="true"`, e o texto visível continua sendo o nome acessível.
- Linha de ajuda `#ajuda-controle`, visível só quando algum botão está desabilitado, via `.bay-controle:has(button:disabled) .ajuda-controle { display: block }`: "Comandos liberados quando o sistema voltar a AGUARDANDO_PEDIDO." Os botões recebem `aria-describedby="ajuda-controle"`.
- Estados: hover (clareia a face, 150 ms), active (afunda 1 px), `:focus-visible` (anel 2 px), disabled (`opacity .45`, `cursor: not-allowed`, sem hover).
- Altura mínima de 44 px e 8 px entre botões.

### 6.3 Tema

- `--muted` passa de `#6b7189` (~3,4:1 sobre `--bay-raised`) para `#858ca3` (~5,0:1 sobre `--bay-raised`, ~4,6:1 sobre `--bg-card-hover`), com o mesmo matiz. Os valores ficam registrados em comentário no CSS.
- Revisão de `prefers-reduced-motion`: parallax, "first-out" da faixa, voos de câmera e partículas.
- Sem rolagem horizontal em 375 px.

---

## 7. Testes

### 7.1 Unitários (`node --test`, sem dependências)

`test/frontend/arquitetura-status.test.mjs` importa `frontend/js/arquitetura-status.js` e cobre:

- detecção dos modos (`local`, `nuvem` por `hivemq`/`mqtts://`/`:8883`, `simulador`, `desconhecido`);
- cada linha da tabela 4.5, incluindo o 503 → `mqtt-servidor: falha`;
- UART: < 60 s → `ok`, ≥ 60 s → `atencao`, gateway offline → `desconhecido`, **nunca `falha`**;
- socket caído → enlace do dashboard `falha`, demais `sem-dados`, Beckhoff `sem-telemetria`;
- status do nó = pior enlace monitorado; `resumo` correto.

Os testes são escritos antes da implementação (TDD).

### 7.2 E2E (Playwright, `test/frontend_smoke/`)

Pacote próprio (`package.json` + `package-lock.json`, `@playwright/test`, Chromium). `webServer` sobe o simulador na porta 3000. Um segundo projeto sobe `server/` **sem broker** (URL inalcançável via env) na porta 3001, para exercitar a CSP do helmet.

| # | Cenário | Projeto |
|---|---|---|
| 1 | **Botões:** abre `/`; para A, B e C: espera `#estado-atual` = `AGUARDANDO_PEDIDO`, clica, espera evento novo em `#historico-lista`/estado diferente, espera voltar; depois clica Reiniciar. Falha em qualquer `console.error` ou `pageerror`. **Rodado primeiro contra o código atual (linha de base).** | simulador |
| 2 | **Contrato de IDs:** todos os `id` de `els` existem; botões são `<button>` | simulador |
| 3 | **Seletor:** navega pelas 3 teclas, confere `aria-current` e a vista visível; `page.goBack()` volta à vista anterior; deep link `/#/arquitetura` abre direto | simulador |
| 4 | **Resiliência:** com `arquitetura3d.js` bloqueado (`page.route` → 404), o cenário 1 continua passando. Com `three.module.min.js` bloqueado, `#/arquitetura` mostra o fallback SVG e o cenário 1 passa | simulador |
| 5 | **Arquitetura:** selo "Modo 3 · Simulador"; 7 rótulos de nó visíveis (todos os nós de 4.1 exceto `hardware`, que não tem rótulo próprio); Tab até um rótulo + Enter abre detalhes; Esc fecha | simulador |
| 6 | **Celular 375×812:** `scrollWidth <= clientWidth` nas 3 vistas; barra inferior visível; botões de controle e teclas ≥ 44 px de altura | simulador |
| 7 | **CSP + broker fora:** sem violações de CSP no console; `#/arquitetura` mostra o enlace Servidor↔Broker como Falha | servidor sem broker |

### 7.3 CI

Novo job `frontend-tests` em `.github/workflows/lint-and-security.yaml`: Node 22, `npm ci` em `simulator/`, `server/` e `test/frontend_smoke/`; `node --test test/frontend/`; `npx playwright install --with-deps chromium`; `npx playwright test`. O relatório do Playwright é publicado como artefato quando há falha.

### 7.4 Verificação visual

Capturas no navegador embutido das 3 vistas em 1920×1080, 1366×768 e 375×812, antes e depois, para comparação do tema.

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Polimento quebrar os botões | Contrato de IDs (3.3), helper `ligar()`, cenários E2E 1, 2 e 4 no CI, linha de base antes de qualquer mudança |
| Addons incompatíveis com three r169 | Vendorizar exatamente `three@0.169.0/examples/jsm`, com import reescrito; cenário 7 valida sob a CSP real |
| Snapshot de documentação divergir | Cabeçalho com data e fonte em `arquitetura-dados.js`; citação da seção em cada bloco de detalhe |
| Conflito com o agente de documentação | Worktree `feat/arquitetura-3d`; nenhuma alteração em `docs/*.md`, `README.md` ou `CHANGELOG.md`; texto de changelog entregue à parte |
| Desempenho em máquinas da bancada | Construção preguiçosa, render por sujeira, pausa fora da rota e da tela, `pixelRatio ≤ 2`, geometria simples |
| Status inferido lido como fato | Selo "inferido", tracejado, texto da fonte no painel de detalhes; UART nunca vermelho |

---

## 9. Entregáveis

1. Código em `frontend/`, testes em `test/frontend/` e `test/frontend_smoke/`, job de CI.
2. Capturas antes/depois.
3. Texto pronto para `docs/CHANGELOG.md` e `frontend/README.md` (na descrição do PR), para incorporação pelo responsável pela documentação.
