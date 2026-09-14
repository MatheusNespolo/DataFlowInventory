#!/usr/bin/env bash
# ============================================================
# DATA FLOW INVENTORY — Validação de Segredos (.env, secrets.h)
# ============================================================
# Descrição:
# Verifica que arquivos sensíveis (.env, secrets.h) NÃO estão
# sendo rastreados pelo Git (staged ou tracked). Bloqueia commit
# se encontrado.
#
# Uso:
#   bash scripts/validate-env.sh
#   (recomendado em pre-commit hook)
# ============================================================

set -e

ERRORS=0

echo "Validando arquivos sensíveis..."

# Lista de padrões proibidos de serem comitados
FORBIDDEN_FILES=(
  "server/.env"
  "simulator/.env"
  "esp32/gateway_mqtt/secrets.h"
  ".env"
  "*_secrets.h"
)

# Verifica se algum arquivo está em staging (prestes a ser comitado)
for pattern in "${FORBIDDEN_FILES[@]}"; do
  if git ls-files --cached --error-unmatch "$pattern" 2>/dev/null; then
    echo "❌ ERRO: Arquivo sensível detectado em staging: $pattern"
    echo "   Remova-o do Git com: git rm --cached $pattern"
    ERRORS=$((ERRORS + 1))
  fi
done

# Verifica se .gitignore está corretamente configurado
if ! grep -q "^\.env$" .gitignore || ! grep -q "^secrets\.h$" .gitignore; then
  echo "❌ ERRO: .gitignore não cobre .env e/ou secrets.h"
  echo "   Adicione as seguintes linhas ao .gitignore:"
  echo "     .env"
  echo "     secrets.h"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "🔴 VALIDAÇÃO FALHOU: $ERRORS erro(s) encontrado(s)"
  exit 1
else
  echo "✅ Nenhum arquivo sensível em staging — tudo certo!"
fi
