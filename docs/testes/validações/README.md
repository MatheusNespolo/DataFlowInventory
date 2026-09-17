# Diretório de Validações — Infraestrutura e Testes

Este diretório contém artefatos de suporte à **preparação e validação** da infraestrutura (rede, broker, portas, firewall) antes de cada sessão de bancada. São ferramentas complementares ao [`plano_de_testes.md`](../plano_de_testes.md) e aos [roteiros semanais](../roteiros/).

---

## Fast-Track: Inicialização Rápida em 3 Passos

Para qualquer membro da equipe inicializar o ambiente do zero:

```powershell
# 1. Preparar dependências e arquivos de configuração (.env, secrets.h, mosquitto.conf)
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1

# 2. Executar pré-voo de validação de configuração
powershell -ExecutionPolicy Bypass -File .\docs\testes\validações\validar_infra.ps1

# 3. Subir todos os serviços (Mosquitto + MQTT Probe + Server Dashboard)
.\start_services.bat

# 4. Confirmar saúde pós-subida (comunicação E2E)
powershell -ExecutionPolicy Bypass -File .\docs\testes\validações\validar_infra.ps1 -PosSubida
```

---

## Conteúdo

| Artefato | Tipo | Objetivo |
|----------|------|----------|
| [`checklist_pre_teste_rede_infra.md`](checklist_pre_teste_rede_infra.md) | Checklist manual | Validação passo a passo das camadas física, Wi-Fi, broker, ESP32, server e automação — inclui seção 7 opcional para broker remoto (HiveMQ Cloud). |
| [`validar_infra.ps1`](validar_infra.ps1) | Script PowerShell | Verificação automatizada em 2 fases: pré-voo (config/firewall) e pós-subida (porta 1883, porta 3000, smoke test pub/sub em 127.0.0.1). |

---

## Matriz de Resolução de Problemas (Troubleshooting)

| Sintoma | Causa Raiz | Correção Rápida (PowerShell Admin) |
|---|---|---|
| **`[ERRO] A porta 1883 JA esta em uso`** ao rodar `start_services.bat` | Serviço Mosquitto do Windows rodando em segundo plano escutando apenas em loopback | `net stop mosquitto; sc.exe config mosquitto start= demand` |
| **ESP32 não conecta no broker / Dashboard preso em "ESP32 Offline"** | Firewall do Windows bloqueando porta TCP 1883 na interface Wi-Fi | `New-NetFirewallRule -DisplayName "Mosquitto MQTT" -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow` |
| **`server` não conecta ao broker local** | `server/.env` apontando para `localhost` resolvido em `::1` IPv6 | Editar `server/.env` para `MQTT_BROKER_URL=mqtt://127.0.0.1` |
| **`mosquitto.conf` ausente** | Arquivo de binding `0.0.0.0` não criado em `C:\mosquitto\` | Rodar `.\scripts\setup.ps1` ou criar `C:\mosquitto\mosquitto.conf` com `listener 1883 0.0.0.0` e `allow_anonymous true` |
| **`node_modules` faltando no server ou probe** | Dependências npm não instaladas após clonar | Rodar `.\scripts\setup.ps1` |

---

## Fluxo de trabalho típico (bancada)

1. **Checklist manual** — Abrir `checklist_pre_teste_rede_infra.md` e marcar ✅ nas seções 1–5 (broker local) antes de ligar qualquer hardware.
2. **Automação** *(opcional, mas recomendado)* — Abrir PowerShell como Administrador e rodar:
   ```powershell
   .\docs\testes\validações\validar_infra.ps1
   ```
   Todos os itens devem retornar **PASS** antes de prosseguir.
3. **Subir serviços** — `start_services.bat` na raiz do repositório (Mosquitto + `mqtt_probe` + server Node).
4. **Validar subida** — Rodar `.\docs\testes\validações\validar_infra.ps1 -PosSubida`.
5. **Executar bancada** — Seguir o roteiro do dia (ex.: `semana_01_18-20_agosto.md`) somente após validação completa da infraestrutura.

---

## Notas

- **Broker remoto (HiveMQ Cloud)** — A seção 7 do checklist cobre a preparação para testes via nuvem (TLS/8883). Essa seção só deve ser executada quando o Teste 6 (`plano_de_testes.md`) ou o Bloco 4 (stretch goal dos roteiros diários) estiverem sendo executados. Não é pré-requisito para bancadas locais.
- **Atualização dos artefatos** — Ao adicionar uma nova verificação ao script PowerShell, manter o checklist (`checklist_pre_teste_rede_infra.md`) sincronizado e vice-versa.
- **Evolução técnica no artigo** — Todas as decisões técnicas e correções de arquitetura encontram-se formalmente consolidadas e versionadas na seção de desenvolvimento e na Tabela 1 do documento `docs/artigo/Projeto de pesquisa - Final.docx`.

---

> ⚠️ Para qualquer dúvida, consultar também o guia completo do broker local em [`docs/broker_local_mosquitto.md`](../../broker_local_mosquitto.md) e a arquitetura MQTT em [`docs/arquitetura_mqtt.md`](../../arquitetura_mqtt.md).
