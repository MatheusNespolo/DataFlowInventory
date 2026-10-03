// Executor dos testes do firmware: roda todos os TESTE(...) registrados.
#include "teste.h"

int main() {
  int nTestes = 0;
  for (teste::Registro* r = teste::lista(); r; r = r->prox) {
    int antes = teste::falhas();
    r->f();
    nTestes++;
    printf("%s %s\n", teste::falhas() == antes ? "ok  " : "FALHOU", r->nome);
  }
  printf("\n%d testes, %d verificacoes, %d falhas\n", nTestes, teste::total(), teste::falhas());
  return teste::falhas() == 0 ? 0 : 1;
}
