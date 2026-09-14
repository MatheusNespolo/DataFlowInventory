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
- **Falha em:** vulnerabilidades críticas

#### 4. Arduino Compilation (arduino-cli)
- **Sketches:**
  - `arduino/data_flow_inventory/data_flow_inventory.ino` (Uno)
  - `esp32/gateway_mqtt/gateway_mqtt.ino` (ESP32)
  - `test/esteira_peca_b/arduino_esteiras_ab/arduino_esteiras_ab.ino` (Uno)
  - `test/esteira_peca_b/esp32_esteiras_ab/esp32_esteiras_ab.ino` (ESP32)
- **Placas:** Arduino:avr:uno (Uno) · esp32:esp32:esp32 (ESP32)
- **Falha em:** Erros de compilação

---

### 2.2 Workflow: `test.yaml` (Futuro)

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
- ✅ test / jest (futuro)
- ✅ test / e2e-docker (futuro)

**Bloqueio:** PR não pode fazer merge sem passar em todos.

---

## 4. Pre-commit Hooks (Local)

### 4.1 Instalação

```bash
# Criar arquivo .git/hooks/pre-commit (executável)
cp scripts/precommit-checks.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
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

## 7. Incrementos Futuros

- [ ] **Docker Compose + E2E Tests** — Validar fluxo Mosquitto → Server → Frontend
- [ ] **Codecov Integration** — Rastrear cobertura de testes
- [ ] **Artifact Storage** — Guardar `.hex` compilados por versão
- [ ] **Auto-deployment** — Deploy automático após merge (produção)
- [ ] **Dependabot** — Atualizações automáticas de dependências

---

