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

Ainda está em evolução (as esteiras B e C estão em diagnóstico elétrico e ainda não acionam) e queremos feedback de quem
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
5. **O que ainda falta:** diagnóstico elétrico das esteiras B e C e validação completa do HiveMQ Cloud.
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

O tópico `hacktoberfest` entra na lista de tópicos do repositório **somente se a equipe a aprovar**; ele não está aplicado por padrão. Ao mantê-lo, a equipe assume:

- Ter issues abertas e rotuladas (seção 3) e revisar PRs de fora durante o mês.
- Rejeitar com cordialidade contribuições de baixa qualidade ou só para "marcar presença" (etiqueta `invalid`).
- **Conferir as regras oficiais do evento no ano corrente** em <https://hacktoberfest.com> antes de
  manter o tópico, pois elas mudam de ano para ano.

Se a equipe não puder cumprir esse compromisso, **remova o tópico** (Configurações do repositório → *About*).
