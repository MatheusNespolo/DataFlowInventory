# Sugestões de Comentários para Cards — setembro de 2026 (arquivo histórico)

> **Arquivo histórico.** Rascunhos de comentários de cards escritos em setembro de 2026 e guardados até então no `plano_de_testes.md`. Os números citados são da numeração antiga do board e **não** correspondem às issues atuais. A fonte do andamento é o [GitHub Project](https://github.com/users/MatheusNespolo/projects/3); não acrescente novos rascunhos aqui.

> **Instrução:** copiar e colar nos respectivos cards do board. Ajustar datas e detalhes conforme feedback do time.

### Card #9 — Integração Esteiras B/C

> **Status: Done ✅** (08–12/09/2026)
>
> Esteiras B e C integradas com sucesso. Hardware adicional (2º/3º IRF520, motores, 4 sensores TCRT5000) instalado e alimentado. Comando MQTT Box validado para peças B e C. Todos os cenários de rejeição (timeout, `ocupado`, `sem_estoque`, `CMD:RESET`) replicados seguindo o padrão da esteira A. Calibração de sensores revalidada na montagem real. Ajuste mecânico das demais esteiras concluído.
>
> **Feito por:** [nome] · **Tempo total:** [X]h · **Referência:** `docs/testes/roteiros/semana_04_08-12_setembro.md` §3, §4, §5

### Card #15 — HiveMQ Cloud (Credenciais)

> **Status: Done ✅**
>
> Cluster HiveMQ (`s1.eu.hivemq.cloud`) configurado. Credenciais salvas em `esp32/gateway_mqtt/secrets.h` (USE_TLS=true). Conexão TLS/8883 validada no ESP32 e no Node.js. Tópicos retained sincronizando corretamente.

### Card #16 — HiveMQ Cloud (TLS/8883)

> **Status: Done ✅**
>
> TLS/8883 validado entre ESP32 → HiveMQ Cloud e HiveMQ Cloud → Node.js. Certificado CA embutido via `WiFiClientSecure`. Teste 3 puro (MQTT Box remoto) aprovado.

### Card #17 — HiveMQ Cloud (E2E Remoto)

> **Status: Done ✅** (19/09/2026)
>
> Validação End-to-End remota concluída com sucesso após resolução da divergência de variáveis de ambiente (`MQTT_USERNAME`/`MQTT_PASSWORD` no `.env`). Comunicação completa Arduino/ESP32 → HiveMQ Cloud (TLS/8883) → Node.js Server → SQLite → Dashboard Web e CLP Beckhoff CX9240 operando sincronizados em nuvem.

### Card #21 — Beckhoff CX9240: Historiador em Produção (Broker Remoto)

> **Status: Done ✅** (19/09/2026)
>
> Nó historiador TwinCAT 3 no PC industrial Beckhoff CX9240 validado operando contra o broker remoto HiveMQ Cloud e o sistema físico real. O CLP recebe eventos reais de acionamento e atualização de estoque das esteiras e grava de forma transacional no banco SQLite local (`/var/lib/dfi/historian.db`, tabelas `estoque_hist` e `eventos_hist`).

### Card #22 — Infraestrutura de Rede: Compartilhamento de Internet (ICS) para CX9240

> **Status: Documentado ℹ️** (19/09/2026)
>
> Identificado que a conexão do CX9240 ponto-a-ponto com o computador de bancada exige ativação do Internet Connection Sharing (ICS) no Windows para que o CLP obtenha rota de saída para a internet (DNS + Gateway) e estabeleça o handshake TLS com o broker remoto HiveMQ Cloud.

### Card novo — Melhoria: Integração Simulador ↔ Beckhoff CX9240

> **Status: Backlog 📋** · **Template: A** · **Prioridade: Baixa** · **Milestone: Futuro**
>
> **Como** responsável pelo PC industrial Beckhoff CX9240,
> **Quero** que o simulador publique o estoque de peças via MQTT (`dataflow/estoque`, retained, QoS 1),
> **Para que** eu possa inscrever o CX9240 e persistir o estoque em banco MySQL/MariaDB.
>
> **Critério de aceite:**
> - [x] Simulador publica em `dataflow/estoque` com payload `{"type":"estoque","pecaA":N,"pecaB":N,"pecaC":N}` — implementado em `simulator/server.js`, testado localmente (retained confirmado via `mosquitto_sub`)
> - [x] Modo `MQTT_PUBLISH=true` configurável em `simulator/package.json` (dependência `mqtt@^5.10.0` + script `start:mqtt`)
> - [ ] Teste em bancada própria (separada da esteira A): CX9240 recebe e grava no banco
> - [ ] Contrato de tópico/payload validado cruzadamente entre os dois agentes
>
> **Atualização 15/09:** lado do simulador **concluído e testado**. Detalhes em `docs/ARCHITECTURE.md` (seção 6.1, Beckhoff CX9240) e `docs/testes/roteiros/semana_05_15-19_setembro.md` (Bloco 4). Card pode avançar de `Backlog` para `Ready` assim que o agente do Beckhoff confirmar disponibilidade para a bancada própria.
>
> **Dependência:** alinhar tópicos com o agente do Beckhoff antes de implementar. Não interferir no fluxo do Teste 5.
>
> **Referência:** `docs/testes/roteiros/semana_04_08-12_setembro.md` §7
