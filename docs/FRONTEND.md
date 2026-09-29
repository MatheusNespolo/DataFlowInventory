# Frontend — Data Flow Inventory

Dashboard web em tempo real para monitoramento e controle do protótipo IoT. Interface industrial com comunicação bidirecional via Socket.IO, visualização de estado e histórico de eventos.

## Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Como Visualizar](#como-visualizar)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Credenciais de Teste](#credenciais-de-teste)
- [Arquitetura da Interface](#arquitetura-da-interface)

---

## Visão Geral

O frontend é um **dashboard web responsivo** que conecta ao servidor Node.js via Socket.IO, recebendo eventos do Arduino (via MQTT) e permitindo controle remoto do sistema. Ele:

- Mostra o **estado da FSM** (máquina de estados) em tempo real
- Exibe **estoque de peças** com alertas graduados
- Apresenta **diagrama interativo** das esteiras e sensores (SVG + WebGL opcional)
- Permite **solicitar peças** e **resetar** o sistema remotamente
- Mantém **histórico de eventos** e status dos equipamentos
- Exibe **arquitetura 3D navegável** das conexões do sistema

> **Nota:** O mesmo frontend funciona tanto com o **servidor real** (Arduino + ESP32 + MQTT) quanto com o **simulador** (FSM em JavaScript, sem hardware).

---

## Funcionalidades

### Painel Principal (`#/`)

| Componente | Descrição |
|------------|-----------|
| **Faixa Anunciadora (IEC 60073)** | LEDs de status: verde (ok), amarelo (atenção), vermelho (fault) — seguem a norma de cores para sinais industriais |
| **Diagrama do Sistema** | SVG interativo das esteiras e sensores; aprimoramento progressivo com three.js (WebGL) |
| **Controle de Estoque** | Badges coloridos: aviso (=3), alerta (=2), crítico (≤1) |
| **Botões de Comando** | Solicitar peça A/B/C, Reset do sistema |
| **Relógio do Servidor** | Horário sincronizado com o servidor Node.js |

### Histórico e Equipamentos (`#/status`)

- **Tabela de eventos** com timestamp, tipo, peça (se aplicável) e descrição
- **Status do hardware**: gateway ESP32 (via LWT), broker MQTT, servidor
- **Uptime** do sistema

### Arquitetura (`#/arquitetura`)

- **Diagrama 3D navegável** (three.js r169 + OrbitControls) mostrando:
  - Arduino → ESP32 → Broker → Servidor/Simulador → Dashboard
  - Historiador Beckhoff (CX9240)
- **Status ao vivo** de cada conexão a partir dos sinais existentes
- **Enlaces sem telemetria** aparecem como "inferido" ou "não monitorado"

### Recursos Técnicos

| Recurso | Detalhe |
|---------|---------|
| **Socket.IO** | Comunicação bidirecional em tempo real |
| **Hash Routing** | Vistas `#/`, `#/status`, `#/arquitetura` |
| **Responsividade** | Layout adaptável (1920×1080, 1366×768, ≤720px) |
| **Tipografia** | IBM Plex Sans (UI), IBM Plex Mono (readouts) |
| **Acessibilidade** | ARIA labels, role="status", aria-live="polite" |
| **Segurança** | Helmet + CSP, CORS restrito, rate limit por socket |
| **Aprimoramento Progressivo** | 3D (WebGL) → SVG 2D fallback → texto |

### Rápido (Simulador — recomendado para teste)

```bash
cd simulator
npm install && npm start
```

Acesse [http://localhost:3000](http://localhost:3000) — pronto! O simulador emite os mesmos eventos Socket.IO que o servidor real.

### Completo (com hardware)

```bash
# Terminal 1: broker MQTT (Mosquitto)
mosquitto -v

# Terminal 2: servidor Node.js
cd server
npm install
npm start

# Terminal 3: opcional — upload do firmware (Arduino + ESP32)
#参见 docs/arquitetura_mqtt.md para instruções detalhadas
```

Acesse [http://localhost:3000](http://localhost:3000).

### Navegação entre Vistas

| Vista | Hash | Atalho de Teclado | Descrição |
|-------|------|-------------------|-----------|
| Painel | `#/` | — | Dashboard principal com diagrama e comandos |
| Equipamentos & Histórico | `#/status` | — | Tabela de eventos e status do hardware |
| Arquitetura | `#/arquitetura` | — | Diagrama 3D navegável |

Os atalhos estão disponíveis na barra inferior (celular) ou no canto do diagrama.

---

## Estrutura do Repositório

```
frontend/
├── index.html                    # HTML principal (SPA com hash routing)
├── README.md                     # Documentação do frontend
├── css/
│   └── style.css                 # Estilos (dark theme industrial)
├── js/
│   ├── app.js                    # Socket.IO, handlers, roteamento
│   ├── diagrama3d.js             # Three.js WebGL (mimic 3D)
│   ├── ambiente3d.js             # Ambiente/câmera three.js
│   ├── arquitetura-sinais.js     # Coletor de sinais Socket.IO/MQTT
│   ├── arquitetura-status.js     # Função pura de status
│   ├── arquitetura-dados.js      # Modelo estático (placas, enlaces)
│   ├── arquitetura-vista.js      # Renderização da vista arquitetura
│   ├── arquitetura3d.js          # Cena three.js da arquitetura
│   ├── arquitetura-fallback.js   # SVG 2D sem WebGL
│   └── seletor.js                # LEDs das teclas do seletor
└── vendor/
    ├── three.module.min.js       # Three.js r169 (local)
    ├── OrbitControls.js          # Controles de órbita
    └── CSS2DRenderer.js          # Labels HTML sobre WebGL
```

---

O frontend **não requer autenticação** — ele se conecta diretamente ao servidor via Socket.IO em `http://localhost:3000`.

Para o **broker MQTT** (se usando o servidor real):

| Variável | Arquivo | Descrição |
|----------|---------|-----------|
| `SECRET_WIFI_SSID` | `esp32/gateway_mqtt/secrets.h` | SSID da rede 2.4 GHz |
| `SECRET_WIFI_PASSWORD` | `esp32/gateway_mqtt/secrets.h` | Senha do Wi-Fi |
| `SECRET_MQTT_HOST_LOCAL` | `esp32/gateway_mqtt/secrets.h` | IP do broker local (padrão: `127.0.0.1`) |
| `SECRET_MQTT_PORT_LOCAL` | `esp32/gateway_mqtt/secrets.h` | Porta (padrão: `1883`) |
| `MQTT_BROKER_URL` | `server/.env` | URL do broker (ex: `mqtt://127.0.0.1`) |
| `MQTT_PORT` | `server/.env` | Porta do broker (padrão: `1883`) |

> **Nota:** As credenciais **nunca** devem ser commitadas. Use `secrets.h` e `.env` localmente.

---

## Arquitetura da Interface

### Fluxo de Dados

```
Arduino (FSM) → ESP32 (Serial→MQTT) → Broker MQTT
                                            ↓
Dashboard (Frontend) ← Socket.IO ← Server Node.js
```

### Eventos Socket.IO

| Evento | Direção | Descrição |
|--------|---------|-----------|
| `status` | → Dashboard | Estado atual da FSM |
| `estoque` | → Dashboard | Quantidade de peças |
| `sensores` | → Dashboard | Leituras dos TCRT5000 |
| `esteiras` | → Dashboard | Status dos motores |
| `eventos` | → Dashboard | Histórico (pedidos, entregas, erros) |
| `comando` | Dashboard → | Solicitar peça / Reset |

### Estado dos LEDs (IEC 60073)

| Cor | Significado | Exemplos |
|-----|-------------|----------|
| 🟢 Verde | Operação normal | Broker conectado, FSM em repouso |
| 🟡 Amarelo | Atenção | Estoque baixo (≤3), operação em andamento |
| 🔴 Vermelho | Fault / Alerta crítico | Broker offline, estoque zerado |

---

## Verificação de Integridade

Para validar que o frontend carrega corretamente:

```bash
# Com simulador rodando
cd simulator && npm start

# Abra http://localhost:3000 e verifique:
# 1. LEDs da faixa announcer acendem (verde)
# 2. Diagrama SVG rendered
# 3. Botões responsivos ao clique
# 4. Eventos aparecem em #/status
```

Logs do navegador (F12) devem mostrar:
```
Socket.IO connected
[dataflow/status] → AGUARDANDO_PEDIDO
[dataflow/estoque] → {pecaA: 5, pecaB: 5, pecaC: 5}
```

---

## Relacionado

- [`README.md`](../README.md) — Visão geral do projeto
- [`docs/arquitetura_mqtt.md`](arquitetura_mqtt.md) — Arquitetura de comunicação MQTT
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — Arquitetura completa do sistema
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — Regras de segurança e convenções