#!/usr/bin/env bash
# ============================================================
# DATA FLOW INVENTORY — Setup Automatizado
# ============================================================
# Descrição:
# Script de onboarding rápido — instala dependências, verifica
# ferramentas e cria arquivos de configuração (.env, secrets.h)
# a partir dos modelos .example.
#
# Uso:
#   bash scripts/setup.sh
#
# Requer: Node.js 22+, npm 9+, Git
# ============================================================

set -e  # exit on error

echo "============================================================"
echo "  DATA FLOW INVENTORY — Setup Automatizado"
echo "============================================================"
echo ""

# ==================== Verificação de Ferramentas ====================
echo "[1/5] Verificando ferramentas instaladas..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js não encontrado. Instale em: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//;s/\..*//')
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "⚠️  Node.js v$NODE_VERSION detectado. Recomenda-se v22+ (suportamos v18+ com fallback)."
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm não encontrado."
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌ Git não encontrado."
  exit 1
fi

echo "✅ Node.js $(node -v) | npm $(npm -v) | Git $(git --version | awk '{print $3}')"

# ==================== Instalação de Dependências ====================
echo ""
echo "[2/5] Instalando dependências Node.js..."

for dir in server simulator test/mqtt_probe; do
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    echo "  → $dir"
    (cd "$dir" && npm install --quiet)
  fi
done

echo "✅ Dependências instaladas"

# ==================== Criação de Arquivos .env ====================
echo ""
echo "[3/5] Criando arquivos de configuração..."

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "  ✅ server/.env criado (configure MQTT_BROKER_URL conforme necessário)"
else
  echo "  ⚠️  server/.env já existe — pulando"
fi

if [ ! -f simulator/.env ]; then
  cp simulator/.env.example simulator/.env
  echo "  ✅ simulator/.env criado"
else
  echo "  ⚠️  simulator/.env já existe — pulando"
fi

if [ ! -f esp32/gateway_mqtt/secrets.h ]; then
  if [ -f esp32/gateway_mqtt/secrets.h.example ]; then
    cp esp32/gateway_mqtt/secrets.h.example esp32/gateway_mqtt/secrets.h
    echo "  ✅ esp32/gateway_mqtt/secrets.h criado (preencha credenciais Wi-Fi/MQTT)"
  fi
else
  echo "  ⚠️  esp32/gateway_mqtt/secrets.h já existe — pulando"
fi

# ==================== Verificação de Segredos ====================
echo ""
echo "[4/5] Verificando que segredos não estão rastreados no Git..."

git check-ignore -v server/.env esp32/gateway_mqtt/secrets.h > /dev/null 2>&1 || {
  echo "❌ ERRO: server/.env ou secrets.h NÃO estão ignorados pelo .gitignore!"
  echo "   Verifique o arquivo .gitignore na raiz do repositório."
  exit 1
}

echo "✅ Segredos corretamente ignorados pelo Git"

# ==================== Instruções Finais ====================
echo ""
echo "[5/5] Finalizando setup..."
echo ""
echo "============================================================"
echo "  ✅ SETUP CONCLUÍDO!"
echo "============================================================"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Editar configurações:"
echo "     - server/.env  → MQTT_BROKER_URL + credenciais"
echo "     - esp32/gateway_mqtt/secrets.h → Wi-Fi + MQTT (IP do PC)"
echo ""
echo "2. Iniciar serviços (Windows):"
echo "     start_services.bat"
echo ""
echo "3. Ou rodar apenas o simulador (sem hardware):"
echo "     cd simulator && npm start"
echo ""
echo "4. Acessar dashboard:"
echo "     http://localhost:3000"
echo ""
echo "Consulte docs/ARCHITECTURE.md para referência completa."
echo "============================================================"
