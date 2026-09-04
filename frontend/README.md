# Frontend — Data Flow Inventory

Dashboard web em tempo real para monitoramento do centro de distribuição automatizado. Aplicação estática (HTML/CSS/JS + Socket.IO), servida pelo servidor (`../server/`) ou pelo simulador (`../simulator/`).

## Funcionalidades

- **Painel anunciador IEC-60073**: indicadores visuais de status (verde/amarelo/vermelho)
- **Diagrama 3D**: visualização panorâmica da bancada com three.js + CSS depth
- **Alertas de estoque graduados**: aviso (=3), alerta (=2), crítico (≤1)
- **Hash routing**: `#/` (painel principal) e `#/status` (histórico/equipamentos)
- **Responsivo**: testado em 1920×1080, 1366×768 e ≤720px
- **Deduplicação de eventos** em reconexão Socket.IO

## Como visualizar

O frontend não roda sozinho — ele é servido por um dos modos:

**Simulador (sem hardware):**
```bash
cd ../simulator
npm install && npm start
# → http://localhost:3000
```

**Servidor real (com hardware + MQTT):**
```bash
cd ../server
npm install && npm start
# → http://localhost:3000
```

## Estrutura

```
frontend/
├── index.html        # Página principal (painel + diagrama + controle)
├── status.html       # Página de histórico e equipamentos
├── css/
│   └── style.css     # Estilos (IBM Plex, IEC-60073, depth CSS)
├── js/
│   ├── app.js        # Lógica principal (Socket.IO, eventos, UI)
│   └── diagrama3d.js # Diagrama 3D com three.js
└── img/              # Ícones e imagens estáticas
```
