# Simulador — Data Flow Inventory

Servidor Express + Socket.IO que **simula a máquina de estados** do Arduino para testes offline, sem hardware nem broker MQTT.

## Por que usar?

O simulador emite os **mesmos eventos Socket.IO** que o servidor real (`../server/`), permitindo usar o front-end unificado (`../frontend/`) sem nenhuma modificação. Ideal para:

- Desenvolvimento e teste do dashboard sem montar a bancada
- Validação de novas features antes de integrar com hardware
- Demonstração rápida do projeto

## Como rodar

```bash
npm install
npm start
```

Abra [http://localhost:3000](http://localhost:3000).

## O que é simulado

| Cenário | Status |
|---------|--------|
| Fluxo de sucesso (pedido → verificação → acionamento → entrega) | ✅ |
| Rejeição por falta de estoque (`peca_indisponivel`) | ✅ |
| Rejeição por FSM ocupada (`ocupado`) | ✅ |
| Rate limit por socket (`COMANDO_INTERVALO_MS`) | ✅ |
| Timeout de entrega | ❌ (apenas no firmware real) |

## Estrutura

```
simulator/
├── server.js       # Simulador offline (FSM em JS)
├── package.json    # Dependências Node.js
└── README.md       # Este arquivo
```

> 📖 Para o modo completo com hardware, veja `../server/`.
