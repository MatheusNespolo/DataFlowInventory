#!/usr/bin/env bash
# ============================================================
# DATA FLOW INVENTORY - Smoke test do stack de observabilidade
# ============================================================
# Descricao:
# Valida, COM Docker, o que os testes automaticos nao conseguem:
# que o compose sobe, que o Prometheus enxerga o servidor Node e
# que o Grafana carrega o datasource e os 3 dashboards.
#
# PRE-REQUISITOS
#   1. Docker instalado e em execucao.
#   2. observability/.env criado a partir do .env.example (com a senha).
#   3. Servidor Node rodando (cd server && npm start), padrao http://localhost:3000.
#
# Uso:
#   bash scripts/observability-smoke.sh
#   SERVIDOR_URL=http://localhost:3000 bash scripts/observability-smoke.sh
#
# Sai com codigo 0 se tudo passar e 1 se alguma etapa falhar.
# No Windows sem Git Bash, use scripts/observability-smoke.ps1.
# ============================================================
set -u

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ARQ_ENV="$RAIZ/observability/.env"
ARQ_COMPOSE="$RAIZ/docker-compose.yml"
SERVIDOR="${SERVIDOR_URL:-http://localhost:3000}"
COMPOSE=(docker compose --env-file "$ARQ_ENV" -f "$ARQ_COMPOSE")
falhas=0

etapa()   { printf '%-66s' "$1"; }
passou()  { echo "PASS"; }
falhou()  { echo "FAIL"; [ -n "${1:-}" ] && echo "     -> $1"; falhas=$((falhas + 1)); }
ler_env() { grep -E "^$1=" "$ARQ_ENV" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d ''; }

# esperar <segundos> <comando...>: repete o comando ate passar ou estourar o tempo
esperar() {
  local limite=$1; shift
  local fim=$((SECONDS + limite))
  while [ "$SECONDS" -lt "$fim" ]; do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

# ---- 1. Servidor Node -----------------------------------------------------
etapa "Servidor Node expoe /metrics ($SERVIDOR)"
if curl -fsS --max-time 5 "$SERVIDOR/metrics" 2>/dev/null | grep -q '^dfi_mqtt_connected'; then
  passou
else
  falhou "Suba o servidor: cd server && npm start (o Prometheus precisa dele para o alvo ficar 'up')"
fi

# ---- 2. Pre-requisitos (fatais) ---------------------------------------------
etapa "Docker esta em execucao"
if docker info >/dev/null 2>&1; then passou; else falhou "Inicie o Docker Desktop / servico docker"; exit 1; fi

etapa "observability/.env existe e tem GRAFANA_ADMIN_PASSWORD"
SENHA="$(ler_env GRAFANA_ADMIN_PASSWORD)"
# o Compose le "$$" do .env como "$" literal; usa a senha efetiva
SENHA="${SENHA//\$\$/\$}"
if [ -n "$SENHA" ]; then passou; else falhou "Copie observability/.env.example para observability/.env e defina a senha"; exit 1; fi
PORTA_PROM="$(ler_env PROMETHEUS_PORT)"; PORTA_PROM="${PORTA_PROM:-9090}"
PORTA_GRAF="$(ler_env GRAFANA_PORT)";    PORTA_GRAF="${PORTA_GRAF:-3030}"

# ---- 3. Configuracao --------------------------------------------------------
etapa "docker compose config (YAML e variaveis validos)"
if "${COMPOSE[@]}" config -q >/dev/null 2>&1; then passou; else falhou "Rode: ${COMPOSE[*]} config"; fi

etapa "promtool check config (prometheus.yml)"
IMAGEM_PROM="$(grep -E '^[[:space:]]+image:[[:space:]]+prom/prometheus:' "$ARQ_COMPOSE" | awk '{print $2}' | tr -d '' | head -n1)"
if MSYS_NO_PATHCONV=1 docker run --rm --entrypoint promtool \
     -v "$RAIZ/observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
     "$IMAGEM_PROM" check config /etc/prometheus/prometheus.yml >/dev/null 2>&1; then
  passou
else
  falhou "Rode o promtool manualmente para ver o erro (imagem: $IMAGEM_PROM)"
fi

# ---- 4. Subir o stack -------------------------------------------------------
etapa "docker compose up -d"
if "${COMPOSE[@]}" up -d >/dev/null 2>&1; then passou; else falhou "Rode: ${COMPOSE[*]} up -d (e leia a saida)"; exit 1; fi

# ---- 5. Prometheus enxerga o servidor --------------------------------------
alvo_up() {
  curl -fsS --max-time 5 --get --data-urlencode 'query=up{job="dfi-server"}' \
    "http://127.0.0.1:${PORTA_PROM}/api/v1/query" | grep -Eq '"value":\[[0-9.]+,"1"\]'
}
etapa "Prometheus: alvo dfi-server em 'up' (ate 60 s)"
if esperar 60 alvo_up; then
  passou
else
  falhou "Alvo fora do ar: servidor parado? Firewall do Windows bloqueando a 3000? Veja http://127.0.0.1:${PORTA_PROM}/targets"
fi

# ---- 6. Grafana --------------------------------------------------------------
grafana_saudavel() { curl -fsS --max-time 5 "http://127.0.0.1:${PORTA_GRAF}/api/health" | grep -Eq '"database": *"ok"'; }
etapa "Grafana: /api/health (ate 90 s)"
if esperar 90 grafana_saudavel; then passou; else falhou "Veja: docker logs dfi-grafana"; fi

datasource_ok() {
  curl -fsS --max-time 10 -u "admin:${SENHA}" \
    "http://127.0.0.1:${PORTA_GRAF}/api/datasources/uid/dfi-prometheus/health" | grep -Eq '"status": *"OK"'
}
etapa "Grafana: datasource dfi-prometheus saudavel"
if esperar 30 datasource_ok; then
  passou
else
  falhou "Senha diferente da usada na 1a criacao do volume? Veja observability/README.md (Problemas comuns)"
fi

for uid in dfi-visao-geral dfi-performance dfi-confiabilidade; do
  etapa "Grafana: dashboard $uid carregado (api/dashboards/uid/$uid)"
  if curl -fsS --max-time 10 -u "admin:${SENHA}" "http://127.0.0.1:${PORTA_GRAF}/api/dashboards/uid/${uid}" >/dev/null 2>&1; then
    passou
  else
    falhou "Dashboard ausente: confira docs/grafana/ e os logs do Grafana"
  fi
done

# ---- Resultado --------------------------------------------------------------
echo
if [ "$falhas" -eq 0 ]; then
  echo "TUDO OK. Grafana: http://127.0.0.1:${PORTA_GRAF}  (usuario: admin)"
  exit 0
fi
echo "$falhas etapa(s) falharam."
exit 1
