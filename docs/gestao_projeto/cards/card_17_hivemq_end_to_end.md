## 🎯 Objetivo

Executar o ciclo completo **Dashboard → Server → HiveMQ Cloud → ESP32 → Arduino Uno → esteira física**, e o retorno de telemetria, integralmente sobre a internet com criptografia TLS, validando a independência da camada de transporte em relação à lógica da FSM.

## ✅ Status

| Campo | Valor |
|---|---|
| **Coluna** | `Backlog` |
| **Área** | `Infra/Rede` / `Backend` / `Frontend` |
| **Bloco de teste** | `T6-HiveMQ` |
| **Prioridade** | `P2-Médio` |
| **Depende de** | #15, #16 |
| **Labels** | `area:infra`, `area:backend`, `tipo:teste`, `stretch:hivemq-cloud` |

## 📄 Referências

- Plano de testes: `docs/testes/plano_de_testes.md` — **Teste 6.3**
- Arquitetura MQTT: `docs/arquitetura_mqtt.md` — seção "Opção 2: HiveMQ Cloud"
- Board governance: `docs/gestao_projeto/board_github_projects.md` — seção 4

## 📋 Tarefas

- [ ] Confirmar que #15 (cluster) e #16 (ESP32 TLS) foram aprovados.
- [ ] Configurar o servidor Node.js para usar `mqtts://` na porta 8883 (já previsto no `.env` do #15).
- [ ] Subir o servidor: `node server/server.js` — verificar log de conexão:
  ```
  [MQTT] Conectado ao broker <cluster>.s1.eu.hivemq.com:8883 (TLS)
  ```
- [ ] Abrir o Dashboard no navegador (localhost ou IP da máquina).
- [ ] Disparar um pedido de peça A pelo Dashboard.
- [ ] Verificar na bancada: a esteira A deve acionar fisicamente.
- [ ] Confirmar na UI: ciclo completo (status → entregando → concluído) refletido sem perda de mensagens.
- [ ] Verificar sincronismo de estoque: LCD e Dashboard devem exibir o mesmo valor após a entrega (regressão do #11).
- [ ] Testar LWT: derrubar o ESP32 e verificar se o Dashboard exibe "gateway offline"; religar e confirmar "gateway online".
- [ ] Medir latência adicional (comparativo local × nuvem) e registrar no `plano_de_testes.md`.
- [ ] Confirmar que **nenhuma linha de lógica da FSM do Arduino foi alterada** — apenas configuração de transporte.
- [ ] Reverter para `USE_TLS=false` no ESP32 e `mqtts://` → `mqtt://` no servidor para retomar operação local.
- [ ] Atualizar o Registro de Resultados do `plano_de_testes.md` com "Teste 6 end-to-end remoto OK".

## ✔️ Critérios de aceite

- [ ] Servidor conecta ao HiveMQ Cloud via TLS.
- [ ] Pedido no Dashboard aciona a esteira física pela internet.
- [ ] Ciclo completo refletido na UI, equivalente ao Teste 4 local.
- [ ] Estoque sincronizado entre LCD e Dashboard (regressão do #11 OK).
- [ ] LWT funcionando no broker remoto.
- [ ] Sem perda de mensagens sob QoS 1.
- [ ] Latência adicional medida e documentada.
- [ ] Nenhuma alteração de lógica da FSM foi necessária.
- [ ] Reversão para broker local testada e sem regressão.
- [ ] Resultado registrado no `plano_de_testes.md`.

## 🔗 Relacionamento

- **Depende de:** #15 (Cluster), #16 (ESP32 TLS)
- **Épico:** #5
