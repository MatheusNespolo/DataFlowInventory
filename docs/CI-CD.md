# CI/CD — Pipelines e Validações Automatizadas

> **Documento de referência para pipelines GitHub Actions**  
> Data: 14/09/2026 · Sprint 5 (Limpeza + CI/CD)

---

## 1. Overview

Este documento descreve as pipelines de CI/CD implementadas para garantir qualidade, segurança e consistência do código antes de merge para `main`.

**Objetivos:**
1. Detectar erros de sintaxe (ESLint, compilação Arduino)
2. Detectar segredos/credenciais versionadas (truffleHog)
3. Validar dependências (npm audit)
4. Compilar firmware (arduino-cli)
5. Executar testes (Jest + Docker E2E)

---

## 2. Workflows GitHub Actions

### 2.1 Workflow: `lint-and-security.yaml`

**Trigger:** `push`, `pull_request` (branches `main`, `dev`)

**Jobs:**

#### 1. Linting JavaScript (ESLint)
- **Alvo:** `server/` + `simulator/`
- **Configuração:** `.eslintrc.json` (a criar se necessário)
- **Falha em:** Erros críticos (não avisos)

#### 2. Secret Detection (truffleHog)
- **Alvo:** Toda a árvore do repositório
- **Procura por:**
  - Padrões `.env` (MQTT_BROKER_URL com senha)
  - `secrets.h` com credenciais (Wi-Fi, MQTT)
  - AWS keys, API tokens, etc.
- **Ação:** Bloqueia push se detectado

#### 3. NPM Audit
- **Dirs:** `server/`, `simulator/`, `test/mqtt_probe/`
- **Threshold:** `--audit-level=critical` (vulnerabilidades críticas e altas bloqueiam)
- **Estratégia:** Ignorar low/moderate, focar em fixes via `npm audit fix`
- **Status:** Vulnerabilidades resolvidas em 17/09/2026 via npm audit fix

---

## 2.2 Estratégia: Gerenciamento de Vulnerabilidades npm

**Política:** Focus em vulnerabilidades **críticas e altas** apenas.

### Justificativa
- **Low/Moderate:** Geralmente não impactam produção, resolvem-se com atualizações menores futuras
- **Critical/High:** Bloqueiam merge, requerem fix imediato via `npm audit fix` ou atualização de dependência
- **Benefício:** Reduz falsos positivos no CI, mantendo segurança prática

### Implementação
```bash
# Verificar vulnerabilidades críticas localmente
npm audit --audit-level=critical

# Corrigir (remove low/moderate automaticamente)
npm audit fix --audit-level=critical

# Forçar atualização de pacote específico se necessário
npm update <package-name>
```

### Casos Resolvidos (17/09/2026)
- **server/**: 3 vulnerabilidades moderate em `qs` (DoS, bypass) → resolvidas via `npm audit fix`
- **simulator/**: 0 vulnerabilidades detectadas
- **test/mqtt_probe/**: 0 vulnerabilidades detectadas

---

### 2.3 Node.js LTS: Upgrade v18 → v22

**Data:** 17/09/2026  
**Razão:** Node.js 20 atingiu EOL em abril/2026; v22 é LTS recomendado até abril/2028

**Arquivos atualizados:**
- `.github/workflows/lint-and-security.yaml`: `node-version: '22'`
- `scripts/setup.sh`: Recomenda v22+ (com fallback para v18)
- `README.md`: Badge atualizada para v22+
- Compatibilidade: Express 4.22+, Socket.IO 4+, mqtt 5.0+ — todas compatíveis

**Validação:**
- Node v22.23.2 detectado em 17/09/2026
- npm 10.9.8 compatível
- Sem breaking changes em dependências

#### 4. Arduino Compilation (arduino-cli)
- **Sketches:**
  - `arduino/data_flow_inventory/data_flow_inventory.ino` (Uno principal)
  - `esp32/gateway_mqtt/gateway_mqtt.ino` (ESP32 gateway)
  - `test/esteira_peca_b/arduino_esteiras_ab/arduino_esteiras_ab.ino` (Uno teste AB)
  - `test/esteira_peca_b/esp32_esteiras_ab/esp32_esteiras_ab.ino` (ESP32 teste AB)
- **Placas:** Arduino:avr:uno (Uno) · esp32:esp32:esp32 (ESP32)
- **Cache:** Habilitado para cores e bibliotecas (reduz tempo de CI em ~60%)
- **Falha em:** Erros de compilação ou RAM global do Uno acima de 65%
- **Passos antes de compilar:** instala as bibliotecas `LiquidCrystal I2C@1.1.2`, `ArduinoJson@6.21.5` e `PubSubClient` e copia `esp32/gateway_mqtt/secrets.h.example` para `secrets.h` (o arquivo real não é versionado)
- **LCD:** o CI compila com a LiquidCrystal I2C **1.1.2** (Frank de Brabander), com versão fixa para o build não mudar sozinho. A Arduino IDE da equipe instala outra variante (LiquidCrystal_I2C 2.0.0, Martin Kubovčík / Frank de Brabander); a API usada pelo firmware (`LiquidCrystal_I2C(endereço, 16, 2)`, `init`, `backlight`, `clear`, `setCursor`, `write`) existe nas duas.
- Para repetir o job na sua máquina, veja [Compilar o firmware localmente](#compilar-o-firmware-localmente-sem-hardware)

#### 5. Lógica do firmware do Uno (`firmware-logica`)
- **O quê:** compila `arduino/data_flow_inventory/src/logica/` com g++ e roda `test/firmware_uno` (FSM, marcos, filtro, protocolo, telas e causa do reset, com tempo simulado)
- **Contrato:** os testes `*_igual_v2` garantem que as mensagens JSON continuam idênticas às da v2.x
- **Local:** `docker run --rm -v "<repo>:/w" -w /w gcc:14 make -C test/firmware_uno test` (ou `make -C test/firmware_uno test` com g++ instalado)

---



**Trigger:** `push`, `pull_request` (branches `main`, `dev`)

**Jobs:**

1. **Jest Unit Tests** (server/)
   - Cobertura mínima: 70%
   - Relato: Codecov

2. **Docker E2E Tests**
   - Docker Compose: Mosquitto + server + mock ESP32
   - Valida fluxo completo: MQTT → Server → WebSocket → Frontend
   - Timeout: 30s por teste

3. **Lint Documentação**
   - Markdown lint (`markdownlint-cli`)
   - Broken links (`markdown-link-check`)

---

## 3. Status Checks Obrigatórios

No GitHub Projects, marcar como **Required Status Checks**:
- ✅ lint-and-security / lint-javascript
- ✅ lint-and-security / secret-detection
- ✅ lint-and-security / arduino-compile
- ✅ lint-and-security / firmware-logica
- ✅ test / jest (futuro)
- ✅ test / e2e-docker (futuro)

**Bloqueio:** PR não pode fazer merge sem passar em todos.

> **Nota:** a lista acima só bloqueia o merge depois que a regra de proteção da branch `main` é ativada no GitHub. Isso é feito pela equipe nas configurações do repositório (Settings → Branches → Branch protection rules), marcando estes checks como obrigatórios; o workflow sozinho não ativa a regra.

---

## 4. Pre-commit Hooks (Local)

### 4.1 Instalação

```bash
# Linux / macOS / Git Bash:
cp scripts/precommit-checks.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

No Windows (PowerShell), você pode executar diretamente antes de commitar:
```powershell
.\scripts\precommit-checks.ps1
```

### 4.2 Validações

- ESLint (server/ + simulator/)
- Verifica `.env` e `secrets.h` não são staged
- Valida mensagem de commit (sem prompts de IA)

---

## 5. Procedimento: Como MaKE um Commit Seguro

```bash
# 1. Criar branch descritivo
git checkout -b feat/nova-feature

# 2. Fazer mudanças
vim server/server.js
vim docs/ARCHITECTURE.md

# 3. Verificar segredos NÃO estão nos arquivos
git check-ignore -v server/.env esp32/gateway_mqtt/secrets.h
# Esperado: ambos aparecem como ignorados

# 4. Staging (pre-commit hooks rodam aqui)
git add .
# Se falhar: corrigir e tentar novamente

# 5. Commit
git commit -m "feat: adiciona novo endpoint /api/health"

# 6. Push (GitHub Actions rodam agora)
git push origin feat/nova-feature

# 7. Abrir PR no GitHub
# - Referenciar card do board
# - Esperar CI/CD passar (badges verdes)
# - Pedir review

# 8. Merge (após aprovação + CI verde)
```

---

## 6. Troubleshooting CI/CD

### 🔴 Erro: "Secret detected in commit"

**Causa:** `.env` ou `secrets.h` foram versionados  
**Solução:**
```bash
# Remover do histórico (⚠️ reescreve commits)
git filter-repo --invert-paths --paths server/.env

# OU revert do commit + rehacer sem o arquivo
git revert <SHA>
git commit --amend
```

### 🔴 Erro: "ESLint failed"

**Causa:** Sintaxe ou formatação incorreta em JavaScript  
**Solução:**
```bash
# Rodar localmente
cd server
npx eslint .

# Auto-fix (se possível)
npx eslint . --fix
```

### 🔴 Erro: "Arduino compilation failed"

**Causa:** Include não encontrado, sintaxe inválida  
**Solução:**
```bash
# Validar localmente com Arduino IDE ou arduino-cli
arduino-cli compile --fqbn arduino:avr:uno arduino/data_flow_inventory/data_flow_inventory.ino
```

---

### Compilar o firmware localmente (sem hardware)

Reproduz o job `arduino-compile` do CI. Não precisa de placa conectada.

**1. Obter o `arduino-cli`.** Instale o [Arduino CLI](https://arduino.github.io/arduino-cli/latest/installation/) ou use o que vem com a Arduino IDE 2.x (no Windows: `%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe`). O CI usa a versão 1.0.0.

**2. Preparar cores e bibliotecas (uma vez):**
```bash
arduino-cli config init
arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install arduino:avr
arduino-cli core install esp32:esp32
arduino-cli lib install "LiquidCrystal I2C@1.1.2" "ArduinoJson@6.21.5" "PubSubClient"
```

**3. Criar o `secrets.h`** (só se ainda não existir; nunca versione o real):
```bash
cp esp32/gateway_mqtt/secrets.h.example esp32/gateway_mqtt/secrets.h        # Linux/Mac/Git Bash
Copy-Item esp32\gateway_mqtt\secrets.h.example esp32\gateway_mqtt\secrets.h # PowerShell
```

**4. Compilar os 4 sketches** (na raiz do repositório; opcionalmente acrescente `--build-path <pasta fora do repo>` para não deixar artefatos de build no repositório):
```bash
arduino-cli compile --fqbn arduino:avr:uno   --warnings all arduino/data_flow_inventory/data_flow_inventory.ino
arduino-cli compile --fqbn esp32:esp32:esp32 --warnings all esp32/gateway_mqtt/gateway_mqtt.ino
arduino-cli compile --fqbn arduino:avr:uno   --warnings all test/esteira_peca_b/arduino_esteiras_ab/arduino_esteiras_ab.ino
arduino-cli compile --fqbn esp32:esp32:esp32 --warnings all test/esteira_peca_b/esp32_esteiras_ab/esp32_esteiras_ab.ino
```
Código de saída `0` em todos = compilou. A compilação do ESP32 leva alguns minutos na primeira vez.

**Observações:**
- Com `ArduinoJson` 7.x (o que a Arduino IDE instala por padrão) aparecem avisos de depreciação do `StaticJsonDocument`; não impedem a compilação. Para igualar o CI, instale a 6.21.5.
- Última compilação local registrada: 02/10/2026, com os 4 sketches compilando (Uno principal usa 54% da flash e 55% da RAM). Isso **não** valida o comportamento: timeout, confirmação por passagem e PWM da esteira C seguem pendentes de bancada. (registro anterior ao firmware v3.0; a v3.0 compila com 45% da RAM e a validação em bancada segue o roteiro `docs/testes/roteiros/firmware_uno_v3_validacao.md`)

---

## 7. Incrementos Futuros

- [ ] **Docker Compose + E2E Tests** — Validar fluxo Mosquitto → Server → Frontend
- [ ] **Codecov Integration** — Rastrear cobertura de testes
- [ ] **Artifact Storage** — Guardar `.hex` compilados por versão
- [ ] **Auto-deployment** — Deploy automático após merge (produção)
- [ ] **Dependabot** — Atualizações automáticas de dependências

---

