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
| Falta de energia dos periféricos (`sem_energia`) | ✅ só para testes: com `SIMULAR_FALHAS=true`, os eventos Socket.IO `simular_falta_energia` e `simular_energia_volta` simulam a queda e a volta da fonte (os 6 sensores ocupados; ERRO depois de 500 ms, como no firmware) |

## Modo Beckhoff CX9240 (publicação MQTT opcional)

O simulador pode publicar o estoque em um broker MQTT — ainda sem depender de hardware nem do servidor real — para viabilizar a integração com o **PC industrial Beckhoff CX9240** (persistência em MySQL/MariaDB/PostgreSQL, implementada por outro agente).

```bash
# Requer um broker MQTT acessível (ex.: Mosquitto local em mqtt://127.0.0.1:1883)
MQTT_PUBLISH=true npm start
# ou
npm run start:mqtt
```

Publica em `dataflow/estoque` (retained, QoS 1) a cada mudança de estoque e imediatamente ao conectar. Desativado por padrão — sem impacto no funcionamento offline via Socket.IO.

> 📖 Contrato completo (tópico, payload, variáveis de ambiente) em [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md#61-beckhoff-cx9240-historiador-local-mqtt--sqlite).

## Estrutura

```
simulator/
├── server.js       # Simulador offline (FSM em JS) + publicação MQTT opcional
├── package.json    # Dependências Node.js (express, socket.io, mqtt)
└── README.md       # Este arquivo
```

> 📖 Para o modo completo com hardware, veja `../server/`.
