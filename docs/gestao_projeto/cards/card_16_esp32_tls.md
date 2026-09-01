## 🎯 Objetivo

Validar o cliente MQTT do gateway ESP32 operando sobre **WiFiClientSecure** com conexão TLS na porta 8883, mantendo intacto o comportamento já aprovado com o broker local (Mosquitto).

## ✅ Status

| Campo | Valor |
|---|---|
| **Coluna** | `Backlog` |
| **Área** | `Firmware-ESP32` |
| **Bloco de teste** | `T6-HiveMQ` |
| **Prioridade** | `P2-Médio` |
| **Depende de** | #15 (Cluster provisionado) |
| **Labels** | `area:firmware-esp32`, `tipo:teste`, `stretch:hivemq-cloud` |

## 📄 Referências

- Plano de testes: `docs/testes/plano_de_testes.md` — **Teste 6.2**
- Arquitetura MQTT: `docs/arquitetura_mqtt.md` — seção "Opção 2: HiveMQ Cloud"
- Firmware: `esp32/gateway_mqtt/gateway_mqtt.ino`

## 📋 Tarefas

- [ ] No sketch do ESP32, confirmar existência da flag `USE_TLS` (ou criar) e do bloco condicional que instancia `WiFiClientSecure` + `setInsecure()` ou carrega CA.
- [ ] Alterar `USE_TLS` para `true`.
- [ ] Compilar e verificar se **heap** e **flash** estão dentro dos limites (ESP32 tem folga, mas é bom confirmar).
- [ ] Subir o firmware e abrir Monitor Serial (115200 baud).
- [ ] Confirmar log:
  ```
  [MQTT] Conectando ao broker <cluster>.s1.eu.hivemq.com:8883 (TLS)...
  [MQTT] Conectado!
  ```
- [ ] No **Web Client** do HiveMQ, verificar se os tópicos `dataflow/status`, `dataflow/sensores`, `dataflow/esteiras` e `dataflow/estoque` estão sendo publicados.
- [ ] Confirmar que a mensagem em `dataflow/estoque` chega com flag **retained**.
- [ ] Testar reconexão Wi-Fi (desligar o roteador por 10 s e religar) — o ESP32 deve reconectar automaticamente sem travar o loop da bridge serial.
- [ ] Verificar se as rejeições explícitas (`peca_invalida`, `ocupado`, `comando_desconhecido`) continuam funcionando (mandar comandos inválidos pelo Dashboard).
- [ ] Reverter `USE_TLS` para `false` e confirmar retorno ao broker local sem regressão.
- [ ] Atualizar o Registro de Resultados do `plano_de_testes.md` com "ESP32 TLS OK".

## ✔️ Critérios de aceite

- [ ] Firmware compila com `USE_TLS true` sem erros de memória.
- [ ] ESP32 conecta ao HiveMQ Cloud via TLS (porta 8883).
- [ ] Todos os tópicos são publicados corretamente.
- [ ] Reconexão Wi-Fi não-bloqueante preservada.
- [ ] Rejeições explícitas funcionando igual ao broker local.
- [ ] Reversão para broker local testada e sem regressão.

## 🔗 Relacionamento

- **Depende de:** #15 (Cluster provisionado)
- **Bloqueia:** #17 (Teste 6.3 — End-to-end remoto)
- **Épico:** #5
