# Diretório de Validações — Infraestrutura e Testes

Este diretório contém artefatos de suporte à **preparação e validação** da infraestrutura (rede, broker, portas, firewall) antes de cada sessão de bancada. São ferramentas complementares ao [`plano_de_testes.md`](../plano_de_testes.md) e aos [roteiros semanais](../roteiros/).

---

## Conteúdo

| Artefato | Tipo | Objetivo |
|----------|------|----------|
| [`checklist_pre_teste_rede_infra.md`](checklist_pre_teste_rede_infra.md) | Checklist manual | Validação passo a passo das camadas física, Wi-Fi, broker, ESP32, server e automação — inclui seção 7 opcional para broker remoto (HiveMQ Cloud). |
| [`validar_infra.ps1`](validar_infra.ps1) | Script PowerShell | Verificação automatizada de broker, firewall/porta 1883 e smoke test MQTT. Executar como Admin; gera saída PASS/FAIL por item. |

---

## Fluxo de trabalho típico (pré-voo)

1. **Checklist manual** — Abrir `checklist_pre_teste_rede_infra.md` e marcar ✅ nas seções 1–5 (broker local) antes de ligar qualquer hardware.
2. **Automação** *(opcional, mas recomendado)* — Abrir PowerShell como Administrador e rodar:
   ```powershell
   .\docs\testes\validações\validar_infra.ps1
   ```
   Todos os itens devem retornar **PASS** antes de prosseguir.
3. **Subir serviços** — `start_services.bat` na raiz do repositório (Mosquitto + `mqtt_probe` + server Node).
4. **Executar bancada** — Seguir o roteiro do dia (ex.: `semana_01_18-20_agosto.md`) somente após validação completa da infraestrutura.

---

## Notas

- **Broker remoto (HiveMQ Cloud)** — A seção 7 do checklist cobre a preparação para testes via nuvem (TLS/8883). Essa seção só deve ser executada quando o Teste 6 (`plano_de_testes.md`) ou o Bloco 4 (stretch goal dos roteiros diários) estiverem sendo executados. Não é pré-requisito para bancadas locais.
- **Atualização dos artefatos** — Ao adicionar uma nova verificação ao script PowerShell, manter o checklist (`checklist_pre_teste_rede_infra.md`) sincronizado e vice-versa.
- **Evolução técnica no artigo** — Todas as decisões técnicas e correções de arquitetura encontram-se formalmente consolidadas e versionadas na seção de desenvolvimento e na Tabela 1 do documento `docs/artigo/Projeto de pesquisa - Final.docx`.

---

> ⚠️ Para qualquer dúvida, consultar também o guia completo do broker local em [`docs/broker_local_mosquitto.md`](../../broker_local_mosquitto.md) e a arquitetura MQTT em [`docs/arquitetura_mqtt.md`](../../arquitetura_mqtt.md).
