// ============================================================
// DATA FLOW INVENTORY — Modelo estático da arquitetura
// ------------------------------------------------------------
// Snapshot de docs/ARCHITECTURE.md e docs/arquitetura_mqtt.md em
// 29/09/2026 (+ server/server.js para a lista de tópicos).
// Se a documentação mudar, atualizar este arquivo.
// Posições em unidades de cena (x = fluxo esquerda→direita, z = profundidade).
// ============================================================

export const NOS_ARQ = {
  arduino: {
    codigo: 'FLD', nome: 'Arduino Uno — FSM', camada: 'Campo', forma: 'placa', posicao: [-8, 0, 0],
    funcao: 'Controla esteiras, sensores, LCD e separador; executa a máquina de estados e fala com o gateway pela serial.',
    secoes: [
      {
        titulo: 'Estados da FSM', fonte: 'ARCHITECTURE.md §3',
        itens: [
          'AGUARDANDO_PEDIDO — recebe comando',
          'VERIFICANDO_ESTOQUE — verifica se há peça',
          'ACIONANDO_ESTEIRA — liga motor, aguarda sensores',
          'ENTREGANDO_PECA — pausa, decrementa, publica',
          'ERRO — timeout ou rejeição (requer CMD:RESET)',
        ],
      },
      {
        titulo: 'Rejeições explícitas', fonte: 'ARCHITECTURE.md §3',
        itens: ['peca_indisponivel', 'ocupado', 'comando_desconhecido'],
      },
      {
        titulo: 'Hardware e pinagem', fonte: 'ARCHITECTURE.md §4',
        colunas: ['Componente', 'Qtd', 'Pinos', 'Alimentação'],
        linhas: [
          ['Motor DC (esteiras)', '3', 'PWM 9, 10, 11', '12V (via IRF520)'],
          ['Sensor IR TCRT5000', '6', 'A0, A1, A2, A3, 2, 4', '5V'],
          ['LCD 16x2 I2C', '1', 'SDA/SCL (A4/A5)', '5V'],
          ['Motor de passo 28BYJ-48', '1', '5, 6, 7, 8 (ULN2003)', '5V'],
        ],
      },
    ],
  },
  esp32: {
    codigo: 'EDG', nome: 'ESP32 — Gateway MQTT', camada: 'Borda', forma: 'placa', posicao: [-4, 0, 0],
    funcao: 'Ponte Serial ↔ MQTT: publica telemetria do Arduino e encaminha comandos do dashboard.',
    secoes: [
      {
        titulo: 'Presença', fonte: 'ARCHITECTURE.md §2.2',
        itens: ['LWT em dataflow/status (retained, QoS 1): o broker publica "offline" se o ESP32 cair'],
      },
    ],
  },
  broker: {
    codigo: 'MSG', nome: 'Broker MQTT', camada: 'Mensageria', forma: 'torre', posicao: [0, 0, 0],
    funcao: 'Barramento de mensagens entre campo, aplicação e historiador.',
    secoes: [
      {
        titulo: 'Tópicos principais', fonte: 'ARCHITECTURE.md §2.2',
        colunas: ['Tópico', 'Origem', 'Retained', 'QoS'],
        linhas: [
          ['dataflow/status', 'ESP32', 'sim', '1'],
          ['dataflow/status/server', 'Servidor', 'sim', '1'],
          ['dataflow/estoque', 'Arduino', 'sim', '1'],
          ['dataflow/eventos', 'Arduino', 'não', '1'],
          ['dataflow/comandos/sub', 'Servidor', 'não', '1'],
        ],
      },
      {
        titulo: 'Modos de operação', fonte: 'ARCHITECTURE.md §5',
        itens: [
          'Modo 1 — Hardware real + Mosquitto local',
          'Modo 2 — Hardware real + HiveMQ Cloud (TLS 8883)',
          'Modo 3 — Simulador offline (Node.js)',
        ],
      },
    ],
  },
  servidor: {
    codigo: 'APP', nome: 'Servidor Node.js', camada: 'Aplicação', forma: 'torre', posicao: [4, 0, -1.5],
    funcao: 'Assina os tópicos MQTT, repassa ao dashboard por Socket.IO e publica os comandos.',
    secoes: [
      {
        titulo: 'Tópicos assinados', fonte: 'server/server.js (TOPICS)',
        itens: ['dataflow/status', 'dataflow/estoque', 'dataflow/eventos', 'dataflow/sensores', 'dataflow/esteiras', 'dataflow/comandos/pub'],
      },
      {
        titulo: 'Observabilidade', fonte: 'server/server.js',
        itens: ['GET /api/status — 200 com broker conectado, 503 sem broker', 'LWT próprio em dataflow/status/server'],
      },
    ],
  },
  simulador: {
    codigo: 'SIM', nome: 'Simulador (Modo 3)', camada: 'Aplicação', forma: 'torre', posicao: [4, 0, 2.5],
    funcao: 'Simula a FSM do Arduino sem hardware nem broker, emitindo os mesmos eventos Socket.IO do servidor.',
    secoes: [
      {
        titulo: 'Integração opcional', fonte: 'ARCHITECTURE.md §5',
        itens: ['MQTT_PUBLISH=true publica dataflow/estoque (retained, QoS 1) para o Beckhoff'],
      },
    ],
  },
  dashboard: {
    codigo: 'HMI', nome: 'Dashboard web', camada: 'Apresentação', forma: 'monitor', posicao: [8, 0, 0.5],
    funcao: 'Painel de operação, equipamentos e histórico, e esta vista de arquitetura.',
    secoes: [
      {
        titulo: 'Vistas', fonte: 'frontend/index.html',
        itens: ['#/ — Painel', '#/status — Equipamentos & histórico', '#/arquitetura — Arquitetura do sistema'],
      },
    ],
  },
  beckhoff: {
    codigo: 'HST', nome: 'Beckhoff CX9240 — Historiador', camada: 'Historiador', forma: 'rack', posicao: [0, 0, -5],
    funcao: 'Grava estoque e eventos em SQLite local (TwinCAT 3, RT Linux ARM64).',
    secoes: [
      {
        titulo: 'Integração', fonte: 'ARCHITECTURE.md §6.1',
        itens: [
          'TF6701 IoT Communication assina dataflow/estoque e dataflow/eventos (QoS 1)',
          'TF6420 Database Server grava em /var/lib/dfi/historian.db (WAL)',
          'Tabelas estoque_hist e eventos_hist',
          'Validado de ponta a ponta em 15/09/2026',
        ],
      },
    ],
  },
};

export const ENLACES_ARQ = {
  'uart':             { de: 'arduino', para: 'esp32', protocolo: 'UART Serial', rotulo: 'Arduino ↔ ESP32', topicos: [] },
  'mqtt-esp32':       { de: 'esp32', para: 'broker', protocolo: 'MQTT (TLS no Modo 2)', rotulo: 'ESP32 ↔ Broker',
    topicos: ['dataflow/status', 'dataflow/estoque', 'dataflow/eventos', 'dataflow/sensores', 'dataflow/esteiras', 'dataflow/comandos/sub', 'dataflow/comandos/pub'] },
  'mqtt-servidor':    { de: 'broker', para: 'servidor', protocolo: 'MQTT', rotulo: 'Broker ↔ Servidor',
    topicos: ['dataflow/status', 'dataflow/estoque', 'dataflow/eventos', 'dataflow/sensores', 'dataflow/esteiras', 'dataflow/comandos/sub', 'dataflow/comandos/pub', 'dataflow/status/server'] },
  'socket-servidor':  { de: 'servidor', para: 'dashboard', protocolo: 'Socket.IO', rotulo: 'Servidor ↔ Dashboard', topicos: [] },
  'mqtt-beckhoff':    { de: 'broker', para: 'beckhoff', protocolo: 'MQTT (TF6701)', rotulo: 'Broker → Beckhoff',
    topicos: ['dataflow/estoque', 'dataflow/eventos'] },
  'socket-simulador': { de: 'simulador', para: 'dashboard', protocolo: 'Socket.IO', rotulo: 'Simulador ↔ Dashboard', topicos: [] },
  'mqtt-simulador':   { de: 'simulador', para: 'broker', protocolo: 'MQTT opcional (MQTT_PUBLISH=true)', rotulo: 'Simulador → Broker',
    topicos: ['dataflow/estoque'] },
};

// Cluster de hardware ao redor do Arduino (visual, sem status próprio).
export const HARDWARE = [
  { id: 'motores',  nome: 'Motores DC ×3', detalhe: 'PWM 9, 10, 11 · IRF520 · 12V', posicao: [-9.6, 0, 1.8] },
  { id: 'sensores', nome: 'Sensores IR ×6', detalhe: 'TCRT5000 · A0–A3, 2, 4', posicao: [-8, 0, 2.4] },
  { id: 'lcd',      nome: 'LCD 16x2 I2C', detalhe: 'SDA/SCL (A4/A5)', posicao: [-6.4, 0, 1.8] },
  { id: 'passo',    nome: 'Motor de passo', detalhe: '28BYJ-48 · ULN2003 · 5–8', posicao: [-9.6, 0, -1.6] },
];

export const CAMERAS = {
  geral:     { rotulo: 'Visão geral', posicao: [0, 11, 15], alvo: [0, 0, -0.5] },
  campo:     { rotulo: 'Campo',       posicao: [-6.5, 5, 7.5], alvo: [-6.5, 0, 0.5] },
  nuvem:     { rotulo: 'Nuvem',       posicao: [0, 6.5, 6.5],  alvo: [0, 0, -2] },
  aplicacao: { rotulo: 'Aplicação',   posicao: [6.5, 5, 8],    alvo: [6, 0, 0.5] },
};

export const ROTULO_MODO = {
  local:        'Modo 1 · Mosquitto local',
  nuvem:        'Modo 2 · HiveMQ Cloud',
  simulador:    'Modo 3 · Simulador',
  desconhecido: 'Modo desconhecido',
};

export const ROTULO_ESTADO = {
  'ok':             'OK',
  'atencao':        'Atenção',
  'falha':          'Falha',
  'desconhecido':   'Desconhecido',
  'sem-telemetria': 'Não monitorado',
  'sem-dados':      'Sem dados',
  'fora-do-modo':   'Fora deste modo',
};
