// Mini-framework de testes do firmware (sem dependências externas).
#pragma once
#include <stdio.h>
#include <string.h>

namespace teste {
inline int& falhas() { static int n = 0; return n; }
inline int& total() { static int n = 0; return n; }
typedef void (*FuncaoTeste)();
struct Registro { const char* nome; FuncaoTeste f; Registro* prox; };
inline Registro*& lista() { static Registro* r = nullptr; return r; }
struct Registrar {
  Registro r;
  Registrar(const char* nome, FuncaoTeste f) {
    r.nome = nome; r.f = f; r.prox = nullptr;
    Registro** p = &lista();
    while (*p) p = &(*p)->prox;  // mantém a ordem de declaração
    *p = &r;
  }
};
}  // namespace teste

#define TESTE(nome)                                              \
  static void nome();                                            \
  static teste::Registrar registro_##nome(#nome, nome);          \
  static void nome()

#define VERIFICA(cond)                                                       \
  do {                                                                       \
    teste::total()++;                                                        \
    if (!(cond)) {                                                           \
      teste::falhas()++;                                                     \
      printf("  FALHA %s:%d: %s\n", __FILE__, __LINE__, #cond);              \
    }                                                                        \
  } while (0)

#define VERIFICA_TEXTO(a, b)                                                 \
  do {                                                                       \
    teste::total()++;                                                        \
    if (strcmp((a), (b)) != 0) {                                             \
      teste::falhas()++;                                                     \
      printf("  FALHA %s:%d:\n    obtido:   %s\n    esperado: %s\n",         \
             __FILE__, __LINE__, (a), (b));                                  \
    }                                                                        \
  } while (0)
