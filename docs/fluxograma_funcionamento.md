# Fluxograma de Funcionamento — Data Flow Inventory

> Item 3.8 do cronograma Gantt. Diagramas em [Mermaid](https://mermaid.js.org/), renderizados nativamente pelo GitHub.
>
> **Para exportar como imagem (artigo):** copie o código do diagrama e cole em [mermaid.live](https://mermaid.live) → *Actions* → *PNG/SVG*.

---

## 1. Máquina de Estados (FSM) — Arduino Uno

Os 5 estados do firmware e suas transições:

```mermaid
stateDiagram-v2
    [*] --> AGUARDANDO_PEDIDO : setup() concluído<br/>esteira principal ligada

    AGUARDANDO_PEDIDO --> VERIFICANDO_ESTOQUE : comando recebido<br/>(CMD PECA A/B/C via ESP32)

    VERIFICANDO_ESTOQUE --> ACIONANDO_ESTEIRA : sensor topo detecta peça<br/>E estoque > 0
    VERIFICANDO_ESTOQUE --> ERRO : sem peça no topo<br/>OU estoque = 0

    ACIONANDO_ESTEIRA --> ENTREGANDO_PECA : motor da esteira<br/>secundária ligado

    ENTREGANDO_PECA --> AGUARDANDO_PEDIDO : sensor da junção detecta peça<br/>(estoque--, evento de entrega publicado)
    ENTREGANDO_PECA --> ERRO : timeout 3s<br/>(peça não chegou na junção)

    ERRO --> AGUARDANDO_PEDIDO : comando RESET<br/>(via dashboard)

    note right of AGUARDANDO_PEDIDO
        Esteira principal sempre ligada.
        Esteiras secundárias paradas.
    end note

    note right of ERRO
        Motores secundários parados.
        Mensagem no LCD.
        Evento de erro publicado via MQTT.
    end note
```

---

## 2. Fluxograma Operacional — Ciclo de um Pedido

Visão de processo: da solicitação do usuário no dashboard até a entrega da peça.

```mermaid
flowchart TD
    A([Usuário clica 'Solicitar Peça X'<br/>no dashboard]) --> B[Frontend emite<br/>solicitar_peca via Socket.IO]
    B --> C[Server Node publica comando<br/>em dataflow/comandos/sub]
    C --> D[ESP32 recebe MQTT e envia<br/>CMD:PECA:X pela Serial2]
    D --> E[Arduino: estado<br/>VERIFICANDO_ESTOQUE]

    E --> F{Sensor do topo<br/>detecta peça E<br/>estoque > 0?}
    F -- Não --> G[Estado ERRO:<br/>'Sem estoque']
    G --> H[Publica evento de erro<br/>→ dashboard exibe alerta]
    H --> I([Aguarda RESET<br/>via dashboard])
    I --> Z

    F -- Sim --> J[Estado ACIONANDO_ESTEIRA:<br/>liga motor da esteira X]
    J --> K[Estado ENTREGANDO_PECA:<br/>monitora sensor da junção]

    K --> L{Peça chegou na<br/>junção em até 3s?}
    L -- Não --> M[Timeout: para esteira,<br/>estado ERRO]
    M --> H

    L -- Sim --> N[Para esteira secundária<br/>estoque X = estoque X - 1]
    N --> O[Peça segue pela esteira principal<br/>até a roda de estoque]
    O --> P[Publica evento de entrega +<br/>estoque atualizado via MQTT]
    P --> Q[Dashboard atualiza:<br/>estoque, histórico, diagrama]
    Q --> Z([Estado AGUARDANDO_PEDIDO])
```

---

## 3. Diagrama de Sequência — Comunicação Fim a Fim

Caminho completo de um pedido bem-sucedido através de todas as camadas:

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as Frontend<br/>(Dashboard)
    participant S as Server Node<br/>(Express+Socket.IO)
    participant B as Broker MQTT<br/>(Mosquitto/HiveMQ)
    participant E as ESP32<br/>(Gateway)
    participant A as Arduino Uno<br/>(FSM)

    U->>F: Clica "Solicitar Peça A"
    F->>S: socket.emit('solicitar_peca', {peca:'A'})
    S->>B: publish dataflow/comandos/sub<br/>{"acao":"solicitar_peca","peca":"A"}
    B->>E: message (comandos/sub)
    E->>A: Serial2: "CMD:PECA:A"
    E->>B: publish dataflow/comandos/pub<br/>(confirmação)
    B->>S: message (comandos/pub)
    S->>F: socket.emit('comando', ...)
    F->>U: Histórico: "Comando enviado"

    Note over A: FSM: VERIFICANDO_ESTOQUE →<br/>ACIONANDO_ESTEIRA → ENTREGANDO_PECA

    A->>E: Serial: {"type":"esteiras","secA":1,...}
    E->>B: publish dataflow/esteiras
    B->>S: message
    S->>F: socket.emit('esteiras', ...)
    F->>U: Diagrama: esteira A ligada

    Note over A: Sensor J1 detecta peça<br/>estoqueA--

    A->>E: Serial: {"type":"evento","evento":"entrega","peca":"A",...}
    E->>B: publish dataflow/eventos
    B->>S: message
    S->>F: socket.emit('evento', ...)
    F->>U: "Peça A entregue" + estoque atualizado
```

---

## Observações

- **Botões físicos desabilitados:** o controle é feito exclusivamente pelo dashboard (comandos via MQTT). Os botões permanecem no hardware para eventual fallback.
- **Modo simulador:** no simulador (`simulator/`), a FSM acima roda em JavaScript e as etapas de MQTT/ESP32/Arduino são substituídas por temporizadores — o frontend recebe exatamente os mesmos eventos Socket.IO.
- **Separador (roda giratória):** ainda não incluído no fluxo — será adicionado ao fluxograma quando o motor for definido e o código habilitado.