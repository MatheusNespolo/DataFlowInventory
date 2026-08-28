# Guia de Contribuição — Data Flow Inventory

Obrigado por contribuir! Este projeto é um protótipo IoT acadêmico (SENAI São Caetano
do Sul) que integra **Arduino Uno + ESP32 + broker MQTT + servidor Node.js + dashboard web**.
Este guia padroniza como propor mudanças de forma segura e rastreável.

---

## 1. Antes de começar

- Leia a [`docs/arquitetura_mqtt.md`](docs/arquitetura_mqtt.md) para entender o fluxo
  Arduino → ESP32 → Broker → Server → Dashboard.
- Consulte o [`docs/CHANGELOG.md`](docs/CHANGELOG.md) para o histórico de decisões e regressões.
- Para rodar sem hardware, use o **simulador** (`simulator/`) — mesmo frontend, sem MQTT.

## 2. Regras de segurança (NÃO negociáveis)

- **Nunca** faça commit de credenciais reais.
  - ESP32: preencha `esp32/gateway_mqtt/secrets.h` (ignorado pelo `.gitignore`).
    O modelo é `esp32/gateway_mqtt/secrets.h.example`.
  - Servidor: use `server/.env` (ignorado). O modelo é `server/.env.example`.
- Antes de cada commit, confira que segredos não estão sendo rastreados:
  ```
  git status
  git check-ignore esp32/gateway_mqtt/secrets.h server/.env
  ```
  Ambos os caminhos devem aparecer em `check-ignore` e **nunca** em `git status`.
- Se um segredo vazar para o histórico, avise o time: é preciso **rotacionar a credencial**
  e, se acordado, expurgar o histórico (`git filter-repo` / BFG).

## 3. Fluxo de trabalho

1. Crie um branch descritivo: `fix/status-retido-gateway`, `feat/esteira-b`, `docs/changelog`.
2. Faça mudanças pequenas e coesas.
3. Rode as validações da seção 5.
4. Atualize a documentação impactada e o `docs/CHANGELOG.md` (seção `[Não publicado]`).
5. Abra o PR referenciando o card do [GitHub Projects](https://github.com/users/MatheusNespolo/projects/3).

## 4. Convenções de commit

Use mensagens curtas no imperativo, com prefixo de tipo:

```
fix: separa status do server em dataflow/status/server (corrige ESP32 Offline)
feat: adiciona esteira B ao sketch principal
docs: reescreve roteiro de teste 27/08 e cria CHANGELOG
chore: ajusta .gitignore
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

> ⚠️ **Não cole prompts de ferramentas / instruções de IA na mensagem de commit.**
> O commit `9a7ce25` traz um exemplo do que evitar (a mensagem ficou poluída com o
> texto de um comando). O corpo do commit deve descrever a **mudança**, não como ela
> foi gerada.

## 5. Validações antes do PR

**Servidor Node:**
```
cd server
node --check server.js          # sintaxe
npm install                     # dependências
npm start                       # sobe o server (precisa de broker + .env)
```

**Firmware (ESP32 / Arduino):** compile na Arduino IDE (ou `arduino-cli compile`).
Lembre de **desconectar o ESP32 dos pinos 0/1** durante o upload no Uno.

**Bancada / integração:** siga o roteiro do dia em
[`docs/testes/roteiros/`](docs/testes/roteiros/) e o
[checklist de infra](docs/testes/validações/checklist_pre_teste_rede_infra.md).

**Regra de ouro dos tópicos MQTT:** `dataflow/status` é **exclusivo do gateway ESP32**.
O servidor publica seu status em `dataflow/status/server`. Nunca faça o server publicar
retained em `dataflow/status` — isso reintroduz a regressão do "ESP32 Offline"
(ver `docs/CHANGELOG.md`).

## 6. Documentação

Toda mudança de comportamento observável deve atualizar:
- `docs/CHANGELOG.md` (obrigatório)
- O documento afetado (`README.md`, `docs/arquitetura_mqtt.md`, checklists, roteiros)

---

Dúvidas? Abra uma issue ou comente no card correspondente do board.
