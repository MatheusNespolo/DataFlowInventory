// ============================================================
// Leitura do texto de exposição do Prometheus (text/plain 0.0.4)
// ============================================================

/**
 * Soma as amostras de `nome` cujos rótulos contêm TODOS os pares de `rotulos`.
 * Devolve null se nenhuma amostra casar. `nome` é exato: "dfi_x" não casa "dfi_x_total".
 */
export function valor(texto, nome, rotulos = {}) {
  const exigidos = Object.entries(rotulos).map(([k, v]) => `${k}="${v}"`);
  let soma = null;
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(nome)) continue;
    const m = linha.slice(nome.length).match(/^(?:\{(.*)\})?\s+(\S+)$/);
    if (!m) continue;
    const presentes = m[1] ? m[1].split(/,(?=[a-zA-Z_][a-zA-Z0-9_]*=")/) : [];
    if (exigidos.every((e) => presentes.includes(e))) soma = (soma ?? 0) + Number(m[2]);
  }
  return soma;
}

/** Mapa nome-da-família → tipo (counter, gauge, histogram...), lido das linhas "# TYPE". */
export function familias(texto) {
  const mapa = new Map();
  for (const m of texto.matchAll(/^# TYPE (\S+) (\S+)$/gm)) mapa.set(m[1], m[2]);
  return mapa;
}
