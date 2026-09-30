// Verificações ESTÁTICAS do stack de observabilidade (não executam Docker).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const ler = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');
const yaml = (rel) => parse(ler(rel));

const compose = yaml('docker-compose.yml');
const prometheus = compose.services.prometheus;
const grafana = compose.services.grafana;

function ignoradoPeloGit(caminho) {
  try {
    execFileSync('git', ['check-ignore', '-q', caminho], { cwd: RAIZ, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test('o compose tem exatamente os dois serviços de observabilidade (sem Mosquitto)', () => {
  assert.deepEqual(Object.keys(compose.services).sort(), ['grafana', 'prometheus']);
});

test('as imagens têm versão fixada, nunca "latest"', () => {
  assert.equal(prometheus.image, 'prom/prometheus:v3.15.0');
  assert.equal(grafana.image, 'grafana/grafana-oss:12.4.3');
  for (const s of [prometheus, grafana]) {
    assert.doesNotMatch(s.image, /latest/);
    assert.match(s.image, /:v?\d+\.\d+\.\d+$/);
  }
});

test('toda porta publicada fica presa ao localhost', () => {
  for (const s of [prometheus, grafana]) {
    assert.ok(s.ports.length >= 1);
    for (const p of s.ports) assert.ok(String(p).startsWith('127.0.0.1:'), `porta exposta fora do localhost: ${p}`);
  }
  assert.match(grafana.ports[0], /:3000$/, 'o Grafana escuta na 3000 dentro do container');
  assert.match(grafana.ports[0], /\$\{GRAFANA_PORT:-3030\}/, 'porta padrão 3030 (3000 é do servidor Node)');
});

test('o Grafana exige a senha de admin e não aceita acesso anônimo nem cadastro', () => {
  const env = grafana.environment;
  assert.match(env.GF_SECURITY_ADMIN_PASSWORD, /^\$\{GRAFANA_ADMIN_PASSWORD:\?.+\}$/, 'senha obrigatória (:?), sem valor padrão');
  assert.equal(String(env.GF_AUTH_ANONYMOUS_ENABLED), 'false');
  assert.equal(String(env.GF_USERS_ALLOW_SIGN_UP), 'false');
});

test('o Prometheus alcança o servidor do host, retém 30 dias e monta a configuração somente leitura', () => {
  assert.ok(prometheus.extra_hosts.includes('host.docker.internal:host-gateway'));
  assert.ok(prometheus.command.includes('--storage.tsdb.retention.time=30d'));
  assert.ok(prometheus.volumes.includes('./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro'));
});

test('o Grafana monta provisionamento e dashboards somente leitura, e espera o Prometheus ficar saudável', () => {
  assert.ok(grafana.volumes.includes('./observability/grafana/provisioning:/etc/grafana/provisioning:ro'));
  assert.ok(grafana.volumes.includes('./docs/grafana:/var/lib/grafana/dashboards:ro'));
  assert.equal(grafana.depends_on.prometheus.condition, 'service_healthy');
  assert.ok(prometheus.healthcheck && grafana.healthcheck, 'os dois serviços têm healthcheck');
});

test('os dados persistem em volumes nomeados', () => {
  assert.ok(Object.keys(compose.volumes).length === 2);
  assert.ok(prometheus.volumes.some((v) => v.startsWith('prometheus-data:')));
  assert.ok(grafana.volumes.some((v) => v.startsWith('grafana-data:')));
});

test('prometheus.yml: scrape do servidor a cada 5 s em host.docker.internal:3000/metrics', () => {
  const cfg = yaml('observability/prometheus/prometheus.yml');
  assert.equal(cfg.global.scrape_interval, '5s');
  assert.equal(cfg.global.scrape_timeout, '3s');
  const job = cfg.scrape_configs.find((j) => j.job_name === 'dfi-server');
  assert.ok(job, 'job dfi-server existe');
  assert.equal(job.metrics_path, '/metrics');
  assert.deepEqual(job.static_configs[0].targets, ['host.docker.internal:3000']);
});

test('datasource do Grafana: uid fixo e URL pelo nome do serviço do compose', () => {
  const ds = yaml('observability/grafana/provisioning/datasources/prometheus.yml').datasources[0];
  assert.equal(ds.uid, 'dfi-prometheus');
  assert.equal(ds.type, 'prometheus');
  assert.equal(ds.url, 'http://prometheus:9090');
  assert.ok(compose.services.prometheus, 'o nome "prometheus" da URL é um serviço do compose');
});

test('provider de dashboards lê o diretório montado e não permite edição pela interface', () => {
  const provider = yaml('observability/grafana/provisioning/dashboards/dfi.yml').providers[0];
  assert.equal(provider.type, 'file');
  assert.equal(provider.options.path, '/var/lib/grafana/dashboards');
  assert.equal(provider.allowUiUpdates, false);
});

test('.env.example traz a senha VAZIA (o usuário escolhe) e as portas padrão', () => {
  const exemplo = ler('observability/.env.example');
  assert.match(exemplo, /^GRAFANA_ADMIN_PASSWORD=$/m);
  assert.match(exemplo, /^GRAFANA_PORT=3030$/m);
  assert.match(exemplo, /^PROMETHEUS_PORT=9090$/m);
});

test('o .env real é ignorado pelo git e o .env.example continua versionado', () => {
  assert.equal(ignoradoPeloGit('observability/.env'), true);
  assert.equal(ignoradoPeloGit('observability/.env.example'), false);
});
