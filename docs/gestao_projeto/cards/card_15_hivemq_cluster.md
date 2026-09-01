## 🎯 Objetivo

Provisionar o cluster Serverless na plataforma **HiveMQ Cloud** e configurar as credenciais de aplicação de forma segura, sem expô-las no versionamento do repositório.

## ✅ Status

| Campo | Valor |
|---|---|
| **Coluna** | `Backlog` |
| **Área** | `Infra/Rede` |
| **Bloco de teste** | `T6-HiveMQ` |
| **Prioridade** | `P2-Médio` |
| **Depende de** | Nenhum (primeiro passo do Teste 6) |
| **Labels** | `area:infra`, `tipo:teste`, `stretch:hivemq-cloud` |

## 📄 Referências

- Plano de testes: `docs/testes/plano_de_testes.md` — **Teste 6**
- Arquitetura MQTT: `docs/arquitetura_mqtt.md` — seção "Opção 2: HiveMQ Cloud"
- Board governance: `docs/gestao_projeto/board_github_projects.md` — seção 4

## 📋 Tarefas

- [ ] Criar conta em [cloud.hivemq.com](https://cloud.hivemq.com) (se ainda não existir).
- [ ] Provisionar cluster Serverless na região mais próxima (ex.: `eu-west-1`).
- [ ] Anotar o endpoint: `<cluster>.s1.eu.hivemq.com` e porta **8883** (TLS).
- [ ] No console HiveMQ → *Access Management* → criar credencial de aplicação (usuário/senha).
- [ ] Preencher `esp32/gateway_mqtt/secrets.h`:
  ```c
  #define SECRET_MQTT_SERVER_CLOUD "<cluster>.s1.eu.hivemq.com"
  #define SECRET_MQTT_USER_CLOUD   "<usuario>"
  #define SECRET_MQTT_PASS_CLOUD   "<senha>"
  ```
- [ ] Preencher `server/.env`:
  ```env
  MQTT_BROKER_URL=mqtts://<cluster>.s1.eu.hivemq.com
  MQTT_PORT=8883
  MQTT_USER=<usuario>
  MQTT_PASS=<senha>
  ```
- [ ] Confirmar que `secrets.h` e `.env` **não aparecem em `git status`** (protegidos por `.gitignore`).
- [ ] Validar conectividade preliminar pelo **Web Client** do próprio console HiveMQ.
- [ ] Atualizar o Registro de Resultados do `plano_de_testes.md` com o status "Cluster provisionado".

## ✔️ Critérios de aceite

- [ ] Cluster criado, endpoint e porta 8883 documentados.
- [ ] Credenciais configuradas em `secrets.h` e `.env` sem vazamento para o repositório.
- [ ] Conexão preliminar validada via Web Client do HiveMQ.

## 🔗 Relacionamento

- **Bloqueia:** #16 (Teste 6.2 — Firmware TLS), #17 (Teste 6.3 — End-to-end remoto)
- **Épico:** #5 (renomear para "Teste 6 — Migração para broker remoto")
