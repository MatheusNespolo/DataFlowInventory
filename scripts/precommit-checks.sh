#!/usr/bin/env bash
# ============================================================
# DATA FLOW INVENTORY — Pre-commit Hook (Validações Locais)
# ============================================================
# Descrição:
# Hook Git executado automaticamente antes de cada commit.
# Valida que segredos não estão em staging e sintaxe básica.
#
# Instalação:
#   cp scripts/precommit-checks.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
# ============================================================

set -e

echo "🔍 Executando validações pré-commit..."

# ==================== Validação de Segredos ====================
echo "[1/2] Validando arquivos sensíveis..."

bash scripts/validate-env.sh || {
  echo "❌ Commit bloqueado: segredos detectados em staging."
  exit 1
}

# ==================== Lint Básico (Syntax Check) ====================
echo "[2/2] Verificando sintaxe JavaScript..."

if command -v node &> /dev/null; then
  for file in server/*.js simulator/*.js; do
    if [ -f "$file" ]; then
      node --check "$file" || {
        echo "❌ Erro de sintaxe em $file"
        exit 1
      }
    fi
  done
  echo "✅ Sintaxe JavaScript válida"
else
  echo "⚠️  Node.js não encontrado — pulando verificação de sintaxe"
fi

echo ""
echo "✅ Todas as validações passaram — commit permitido!"
