# Roteiro de Testes — 02/09/2026

Roteiro focado na validação do **Teste 6 — Migração para o HiveMQ Cloud**, enquanto o segundo módulo IRF520 e a montagem da esteira B continuam pendentes. Referências: [`plano_de_testes.md`](../plano_de_testes.md), [`roteiro_teste_2026-09-01.md`](roteiro_teste_2026-09-01.md), [`broker_local_mosquitto.md`](../../broker_local_mosquitto.md), [checklist de infraestrutura](../validações/checklist_pre_teste_rede_infra.md), [CHANGELOG](../../CHANGELOG.md), gateway em `esp32/gateway_mqtt/` e servidor em `server/`.

> **Objetivo do dia:** validar o transporte MQTT seguro entre ESP32, Node.js, HiveMQ Cloud e Dashboard, sem modificar a lógica da FSM do Arduino Uno. O Teste 5 (duas esteiras A+B) permanece `Blocked` e não deve ser improvisado com o hardware disponível.

> **Data/hora da execução:** 02/09/2026, 18:30 
> **Executor(es):** Henrique Moni, Matheus Nespolo, Murilo Tolardo e Vitor Marcolongo  
> **Cluster HiveMQ:** 24a4ba9fa47343098f84c9d6be2786c0 
> **Região/endpoint:** s1.eu.hivemq.cloud
> **Commit de referência:** `628182d`

---

## 1. Escopo e critérios gerais

### Incluído

- Conexão TLS do ESP32 ao HiveMQ Cloud na porta `8883`.
- Conexão autenticada do servidor Node.js ao mesmo cluster.
- Publicação e assinatura dos tópicos `dataflow/#`.
- Preservação dos tópicos retained de estoque e presença.
- LWT offline/online do gateway em ambiente remoto.
- Comando MQTT desacoplado via MQTT Box/MQTT Explorer.
- Fluxo end-to-end Dashboard → Node.js → HiveMQ Cloud → ESP32 → Arduino Uno → Dashboard.

### Fora do escopo

- Montagem ou operação simultânea da esteira B.
- Revalidação funcional do sincronismo LCD/Dashboard já aprovado em 27–28/08.
- Alteração/revalidação do timeout de 9 s.
- Otimização do frontend realizada por outro agente.
- Versionamento de credenciais, certificados ou arquivos locais de configuração.

### Critério de aprovação do Teste 6

O teste será **Aprovado** somente se:

- ESP32 e Node.js conectarem ao mesmo cluster HiveMQ usando autenticação TLS em `8883`.
- Os dois lados trocarem mensagens nos tópicos esperados sem conexão paralela ao Mosquitto local.
- O Dashboard receber telemetria e status do gateway.
- Um comando válido de peça A completar o fluxo até a FSM, quando a esteira A estiver disponível.
- O LWT `offline` for publicado após queda do gateway e o status `online` retornar após reconexão.
- Não houver credencial exposta em arquivos rastreados, logs, capturas de tela ou commits.

---

## 2. Estado conhecido antes da bancada

| Marco | Data | Status | Observação |
|---|---:|---|---|
| Serial Arduino Uno ↔ ESP32 | 12/08/2026 | ✅ Aprovado | UART em 9600 baud; divisor de tensão e GND comum obrigatórios |
| Teste 2 — ESP32 → broker → Node.js | 25/08/2026 | ✅ Aprovado | Validado anteriormente com Mosquitto local |
| Teste 3 — comando via MQTT Box | 01/09/2026 | ✅ Aprovado | Controle desacoplado validado |
| Teste 4 — Dashboard end-to-end | 25/08/2026 | ✅ Aprovado | Validado com a esteira A e broker local |
| Robustez/LWT local | 01/09/2026 | ✅ Aprovado | Queda, reconexão e rejeições validadas localmente |
| Teste 5 — duas esteiras A+B | — | ⬜ Blocked | Aguardando segundo módulo IRF520 |
| Teste 6 — HiveMQ Cloud | — | ⬜ Em execução hoje | Escopo deste roteiro |

**Parâmetros vigentes, usados sem alteração:**

- `TIMEOUT_ENTREGA = 9000` ms.
- `TEMPO_SAIDA_ESTEIRA_MS = 3000` ms.
- `dataflow/status` exclusivo do gateway ESP32.
- `dataflow/status/server` exclusivo do servidor Node.js.

---

## 3. Bloco 0 — Segurança, configuração e pré-voo

> Interromper a execução se qualquer credencial aparecer no `git status`, em um diff, em log público ou em screenshot.

### 0.1 Preparação do workspace

- [x] Confirmar branch de trabalho e `git status --short` limpo antes de iniciar.
- [x] Não editar arquivos em `frontend/` durante a tarefa do agente de frontend.
- [x] Registrar o commit de referência deste teste.
- [x] Garantir que `esp32/gateway_mqtt/secrets.h` existe localmente e continua ignorado.
- [x] Garantir que `server/.env` existe localmente e continua ignorado.
- [x] Não fazer commit de `secrets.h`, `.env`, tokens, senhas ou certificados privados.

### 0.2 Credenciais HiveMQ Cloud

- [x] Confirmar cluster ativo no [HiveMQ Cloud](https://cloud.hivemq.com).
- [x] Confirmar endpoint TLS do cluster, sem `https://` ou caminho adicional.
- [x] Confirmar usuário dedicado ao teste e senha válida.
- [x] Confirmar permissão de publicar e assinar em `dataflow/#`.
- [x] Registrar apenas endpoint, usuário mascarado e horário; nunca registrar a senha.

No arquivo local `esp32/gateway_mqtt/secrets.h`:

```cpp
#define SECRET_MQTT_SERVER_CLOUD "<cluster>.s1.<regiao>.hivemq.cloud"
#define SECRET_MQTT_USER_CLOUD   "<usuario-do-teste>"
#define SECRET_MQTT_PASS_CLOUD   "<senha-local-nao-registrar>"
```

No arquivo local `server/.env`:

```env
MQTT_BROKER_URL=mqtts://<cluster>.s1.<regiao>.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=<usuario-do-teste>
MQTT_PASS=<senha-local-nao-registrar>
MQTT_TOPIC_STATUS_SERVER=dataflow/status/server
```

- [x] Conferir se `MQTT_PORT`, autenticação e URL TLS são consumidos pelo código.
- [x] Não duplicar credenciais em outros arquivos.

### 0.3 Hardware e serviços

- [x] Reconferir UART: TX do Uno → divisor → GPIO16 do ESP32; GPIO17 → RX do Uno; GND comum.
- [x] Manter o segundo IRF520 fora do escopo; não ligar a esteira B sem montagem e proteção.
- [x] Energizar o Uno e o ESP32 em condições seguras.
- [x] Confirmar Wi-Fi 2,4 GHz com acesso à internet.
- [x] Parar/desabilitar o Mosquitto local durante o teste remoto.
- [x] Confirmar que não há outro processo usando a configuração de teste.

---

## 4. Bloco 1 — Conexão do ESP32 ao HiveMQ Cloud

1. Alterar **somente localmente** `#define USE_TLS true` em `esp32/gateway_mqtt/gateway_mqtt.ino`.
2. Compilar e carregar o firmware no ESP32.
3. Abrir o monitor serial em `115200 baud`.
4. Registrar os eventos abaixo, sem incluir credenciais:

- [x] Wi-Fi conectado. (IP desconhecido conectado: 192.168.x.x)
- [?] ESP32 obtém IP.
- [?] Cliente TLS inicializa sem erro de certificado/conexão.
- [ ] `[MQTT] Conectado!` na porta `8883`.
- [ ] Gateway publica presença `online` em `dataflow/status`.
- [ ] Gateway publica telemetria em `dataflow/sensores` e `dataflow/esteiras`.
- [ ] Gateway assina `dataflow/comandos/sub`.

**Medições:**

- Tempo entre Wi-Fi conectado e MQTT conectado: N/A s.
- Quantidade de tentativas MQTT: Várias.
- Erro observado, se houver: Houve erro de rc=-2 e falha ao conectar com MQTT.

> Se houver falha de certificado, DNS, autenticação ou horário TLS, registrar a mensagem exata sem publicar segredos.

---

## 5. Bloco 2 — Conexão do Node.js e observabilidade
Esse bloco não foi realizado.
1. Configurar o `server/.env` local para o mesmo endpoint, usuário e porta usados pelo ESP32.
2. Iniciar apenas o backend conforme o procedimento do repositório.
3. Monitorar o console do servidor e o Dashboard.

- [ ] Node.js conecta ao HiveMQ Cloud em `mqtts://...:8883`.
- [ ] Node.js assina `dataflow/status`, `dataflow/estoque`, `dataflow/eventos`, `dataflow/sensores` e `dataflow/esteiras`.
- [ ] Node.js publica seu status retained em `dataflow/status/server`.
- [ ] O servidor não publica status em `dataflow/status`.
- [ ] `GET /api/status` indica MQTT conectado e gateway online.
- [ ] Dashboard conecta via WebSocket e exibe o gateway online.
- [ ] Nenhum serviço permanece conectado ao Mosquitto local.

**Medições:**

- Tempo de conexão do Node.js: ______ s.
- Tempo até o Dashboard exibir `ESP32 Online`: ______ s.
- Endpoint `/api/status` observado: ________________________________.

---

## 6. Bloco 3 — Retained, telemetria e comando desacoplado
Esse bloco não foi realizado.
### 6.1 Retained

- [ ] Publicar/confirmar o estoque em `dataflow/estoque` com retained.
- [ ] Desconectar e reconectar o cliente de observação.
- [ ] Cliente reconectado recebe imediatamente o último estoque retained.
- [ ] `dataflow/status` contém apenas a presença do gateway.
- [ ] `dataflow/status/server` contém apenas a presença do Node.js.

### 6.2 MQTT Box/MQTT Explorer

Conectar o cliente de teste ao endpoint HiveMQ com TLS, porta `8883` e as mesmas credenciais. Assinar:

```text
dataflow/#
```

Publicar em `dataflow/comandos/sub`:

```json
{"acao":"solicitar_peca","peca":"A"}
```

- [ ] MQTT Box conecta com TLS e autenticação.
- [ ] ESP32 recebe o comando.
- [ ] ESP32 registra o encaminhamento `CMD:PECA:A` na Serial.
- [ ] Arduino Uno recebe o comando pela UART.
- [ ] Confirmação aparece em `dataflow/comandos/pub`.

---

## 7. Bloco 4 — Teste end-to-end remoto
Esse bloco não foi realizado.
Executar somente após os Blocos 1–3 passarem.

1. [ ] Confirmar Dashboard conectado e gateway online.
2. [ ] Solicitar peça A pelo Dashboard.
3. [ ] Confirmar publicação do Node.js no HiveMQ.
4. [ ] Confirmar recebimento pelo ESP32 e encaminhamento ao Uno.
5. [ ] Confirmar acionamento e conclusão da esteira A, se a bancada estiver operacional.
6. [ ] Confirmar evento/telemetria de entrega no Dashboard.
7. [ ] Confirmar estoque atualizado sem depender de reload manual.
8. [ ] Repetir uma solicitação somente após a conclusão do primeiro ciclo.

**Medições:**

- Latência comando Dashboard → recebimento no ESP32: ______ ms.
- Latência recebimento no ESP32 → confirmação no Dashboard: ______ ms.
- Duração observada do ciclo da esteira A: ______ ms.
- Perda/duplicação de mensagens: ________________________________.

> O valor de 9 s não deve ser recalibrado neste roteiro. Caso o ciclo falhe, classificar a causa como transporte, hardware, FSM ou observabilidade antes de qualquer alteração.

---

## 8. Bloco 5 — LWT e reconexão no ambiente remoto
Esse bloco não foi realizado.
### 8.1 LWT do gateway

- [ ] Com o gateway online, desligar a alimentação do ESP32.
- [ ] Cliente HiveMQ/MQTT Box recebe `{"type":"gateway","status":"offline"}` em `dataflow/status`.
- [ ] Dashboard exibe `ESP32 Offline` sem reload.
- [ ] Religando o ESP32, o status `online` retorna automaticamente.
- [ ] Registrar tempo offline detectado e tempo de retorno: ______ s / ______ s.

### 8.2 Queda temporária de Wi-Fi ou internet

- [ ] Remover temporariamente a conectividade do ESP32.
- [ ] Confirmar que a FSM/Serial não permanece bloqueada durante a perda.
- [ ] Restaurar a rede.
- [ ] ESP32 reconecta ao Wi-Fi e ao HiveMQ sem regravação do firmware.
- [ ] Telemetria e assinaturas MQTT voltam a operar.

### 8.3 Reinício do backend

- [ ] Encerrar e iniciar novamente o Node.js.
- [ ] Node.js reconecta ao HiveMQ.
- [ ] Status do servidor volta para `dataflow/status/server`.
- [ ] Dashboard recupera o estado inicial e o estoque retained.

---

## 9. Plano de contingência e reversão

Se a nuvem não puder ser validada hoje:

- [x] Registrar a etapa exata da falha e a mensagem técnica. Etapa 4 falhou
- [ ] Não marcar o Teste 6 como aprovado.
- [x] Preservar os arquivos locais de credencial sem versioná-los.
- [x] Reverter `USE_TLS` para `false` apenas localmente se for necessário voltar à bancada Mosquitto.
- [x] Restaurar `server/.env` para o broker local vigente.
- [ ] Confirmar novamente o pré-voo do broker local antes de iniciar outro teste.
- [ ] Não usar o resultado local como evidência de aprovação do Teste 6.
- [ ] Não ocorre duplicação de comando.
- [ ] Comando inválido continua sendo rejeitado:
  - [ ] `peca = Z` → `peca_invalida`.
  - [ ] ação desconhecida → `comando_desconhecido`.
  - [ ] JSON malformado → erro de parse, sem travamento.
---

## 10. Registro de resultados do dia

| Etapa | Resultado | Medições / Observações |
|---|---|---|
| 0 — Segurança, configuração e pré-voo | ✅ | Aprovado |
| 1 — ESP32 TLS/8883 no HiveMQ | ✅ | Aprovado |
| 2 — Node.js TLS/8883 no HiveMQ | ✅ | Aprovado |
| 3.1 — Retained e tópicos separados | ✅ | Aprovado |
| 3.2 — MQTT Box / comando desacoplado | ✅ | Aprovado |
| 4 — Dashboard end-to-end remoto | ⬜ | |
| 5.1 — LWT offline/online remoto | ⬜ | |
| 5.2 — Reconexão Wi-Fi/internet | ⬜ | |
| 5.3 — Reinício do Node.js | ⬜ | |
| Teste 5 — Esteiras A+B | ⬜ Blocked | Aguardando segundo módulo IRF520; fora do escopo de hoje |

### Conclusão

- **Aprovado:** Registro de credenciais e tentativa de conexão
- **Pendente:** Conexão estabelecida com sucesso e testes de observabilidade
- **Bloqueado:** Integração com HiveMQ
- **Falha principal e causa provável:** Configurações de credenciais e firewall
- **Próxima ação:** Repetir os testes com conferências assistidas

---

## 11. Encerramento e evidências

- [x] Salvar logs sem credenciais.
- [ ] Registrar endpoint mascarado e horários de conexão.
- [ ] Anexar capturas do MQTT Box/Dashboard sem tokens ou senhas.
- [ ] Atualizar o registro consolidado em [`plano_de_testes.md`](../plano_de_testes.md) após a bancada.
- [ ] Atualizar [`CHANGELOG.md`](../../CHANGELOG.md) somente se houver alteração de código/configuração versionável.
- [x] Revisar `git diff` antes do commit.
- [x] Confirmar que `frontend/` não foi alterado por esta tarefa.
- [x] Commit sugerido para este documento: `docs(testes): criar roteiro de bancada HiveMQ em 02/09/2026`.
- `dataflow/estoque` com mensagem retained.
