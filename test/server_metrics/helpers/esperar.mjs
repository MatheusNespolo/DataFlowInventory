// Repete `fn` até devolver um valor verdadeiro ou estourar o tempo.
export async function esperar(fn, { timeoutMs = 10000, intervaloMs = 100, descricao = 'condição' } = {}) {
  const fim = Date.now() + timeoutMs;
  let ultimoErro = null;
  while (Date.now() < fim) {
    try {
      const resultado = await fn();
      if (resultado) return resultado;
    } catch (err) {
      ultimoErro = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
  throw new Error(`Tempo esgotado esperando: ${descricao}${ultimoErro ? ` (último erro: ${ultimoErro.message})` : ''}`);
}
