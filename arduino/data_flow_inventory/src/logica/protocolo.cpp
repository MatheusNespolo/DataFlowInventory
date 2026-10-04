#include "protocolo.h"

#include <string.h>

#include "texto_flash.h"

// ---- Comandos -----------------------------------------------------------

static bool ehEspaco(char c) { return c == ' ' || c == '\t' || c == '\r' || c == '\n'; }

// ram[0..n) é igual ao texto TXT (inteiro)?
static bool igualTxt(const char* ram, size_t n, const char* txt) {
  size_t i = 0;
  for (; i < n; i++) {
    char c = lerTxt(txt + i);
    if (c == 0 || c != ram[i]) return false;
  }
  return lerTxt(txt + i) == 0;
}

ComandoTipo interpretarComando(const char* linha, char* peca) {
  *peca = 0;
  const char* ini = linha;
  while (*ini && ehEspaco(*ini)) ini++;
  size_t n = strlen(ini);
  while (n > 0 && ehEspaco(ini[n - 1])) n--;
  if (n == 0) return CMD_NENHUM;

  const size_t TAM_PREFIXO = 9;  // "CMD:PECA:"
  if (n >= TAM_PREFIXO && igualTxt(ini, TAM_PREFIXO, TXT("CMD:PECA:"))) {
    if (n == TAM_PREFIXO + 1) {
      char c = ini[TAM_PREFIXO];
      if (c == 'A' || c == 'B' || c == 'C') {
        *peca = c;
        return CMD_PECA;
      }
    }
    return CMD_PECA_INVALIDA;
  }
  if (igualTxt(ini, n, TXT("CMD:RESET"))) return CMD_RESET;
  return CMD_DESCONHECIDO;
}

void leitorIniciar(LeitorLinha& l) {
  l.n = 0;
  l.buf[0] = 0;
  l.descartando = false;
}

bool leitorAlimentar(LeitorLinha& l, char c) {
  if (c == '\r') return false;
  if (c == '\n') {
    if (l.descartando) {
      leitorIniciar(l);
      return false;
    }
    l.buf[l.n] = 0;
    l.n = 0;
    return true;
  }
  if (l.descartando) return false;
  if (l.n >= LeitorLinha::CAPACIDADE) {
    l.descartando = true;
    l.n = 0;
    l.buf[0] = 0;
    return false;
  }
  l.buf[l.n++] = c;
  return false;
}

// ---- Escritor de JSON (sem printf: menos flash no AVR) ---------------------

namespace {
struct Escritor {
  char* b;
  size_t cap;
  size_t n;
  bool ok;
};

void iniciar(Escritor& e, char* b, size_t cap) {
  e.b = b;
  e.cap = cap;
  e.n = 0;
  e.ok = cap > 0;
  if (e.ok) b[0] = 0;
}

void car(Escritor& e, char c) {
  if (!e.ok) return;
  if (e.n + 1 >= e.cap) { e.ok = false; return; }
  e.b[e.n++] = c;
  e.b[e.n] = 0;
}

// Texto fixo (TXT: flash no AVR).
void txt(Escritor& e, const char* s) {
  for (char c = lerTxt(s); c != 0; c = lerTxt(++s)) car(e, c);
}

void num(Escritor& e, long v) {
  char tmp[12];
  int i = 0;
  bool neg = v < 0;
  unsigned long u = neg ? (unsigned long)(-(v + 1)) + 1UL : (unsigned long)v;
  do { tmp[i++] = (char)('0' + (u % 10)); u /= 10; } while (u > 0);
  if (neg) car(e, '-');
  while (i > 0) car(e, tmp[--i]);
}

void numU(Escritor& e, uint32_t v) {
  char tmp[11];
  int i = 0;
  do { tmp[i++] = (char)('0' + (v % 10)); v /= 10; } while (v > 0);
  while (i > 0) car(e, tmp[--i]);
}

// ,"chave":   (k é TXT)
void chave(Escritor& e, const char* k, bool primeira = false) {
  if (!primeira) car(e, ',');
  car(e, '"');
  txt(e, k);
  car(e, '"');
  car(e, ':');
}

void campoTexto(Escritor& e, const char* k, const char* v, bool primeira = false) {
  chave(e, k, primeira);
  car(e, '"');
  txt(e, v);
  car(e, '"');
}

void campoLetra(Escritor& e, const char* k, char v) {
  chave(e, k);
  car(e, '"');
  car(e, v);
  car(e, '"');
}

void campoNum(Escritor& e, const char* k, long v) {
  chave(e, k);
  num(e, v);
}

size_t fim(Escritor& e) {
  car(e, '}');
  if (!e.ok) {
    if (e.cap > 0) e.b[0] = 0;
    return 0;
  }
  return e.n;
}

void inicioMsg(Escritor& e, char* buf, size_t cap, const char* type) {
  iniciar(e, buf, cap);
  car(e, '{');
  campoTexto(e, TXT("type"), type, true);
}
}  // namespace

// ---- Mensagens --------------------------------------------------------------

size_t formatarStatus(char* buf, size_t cap, const char* estado,
                      int pecaSolicitada, uint32_t uptimeS, long ramLivre) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("status"));
  campoTexto(e, TXT("estado"), estado);
  campoNum(e, TXT("pecaSolicitada"), pecaSolicitada);
  chave(e, TXT("uptime"));
  numU(e, uptimeS);
  if (ramLivre >= 0) campoNum(e, TXT("ram_livre"), ramLivre);
  return fim(e);
}

size_t formatarEstoque(char* buf, size_t cap, const int estoque[3]) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("estoque"));
  campoNum(e, TXT("pecaA"), estoque[0]);
  campoNum(e, TXT("pecaB"), estoque[1]);
  campoNum(e, TXT("pecaC"), estoque[2]);
  return fim(e);
}

size_t formatarSensores(char* buf, size_t cap, const bool topo[3],
                        const bool juncao[3]) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("sensores"));
  chave(e, TXT("topo"));
  car(e, '{');
  chave(e, TXT("A"), true); num(e, topo[0] ? 1 : 0);
  chave(e, TXT("B"));       num(e, topo[1] ? 1 : 0);
  chave(e, TXT("C"));       num(e, topo[2] ? 1 : 0);
  car(e, '}');
  chave(e, TXT("juncao"));
  car(e, '{');
  chave(e, TXT("J1"), true); num(e, juncao[0] ? 1 : 0);
  chave(e, TXT("J2"));       num(e, juncao[1] ? 1 : 0);
  chave(e, TXT("J3"));       num(e, juncao[2] ? 1 : 0);
  car(e, '}');
  return fim(e);
}

size_t formatarEsteiras(char* buf, size_t cap, const bool secundaria[3]) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("esteiras"));
  campoNum(e, TXT("principal"), 1);  // sempre ligada (direto na fonte)
  campoNum(e, TXT("secA"), secundaria[0] ? 1 : 0);
  campoNum(e, TXT("secB"), secundaria[1] ? 1 : 0);
  campoNum(e, TXT("secC"), secundaria[2] ? 1 : 0);
  return fim(e);
}

size_t formatarPedido(char* buf, size_t cap, char peca) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("evento"));
  campoTexto(e, TXT("evento"), TXT("pedido"));
  campoLetra(e, TXT("peca"), peca);
  return fim(e);
}

size_t formatarEntrega(char* buf, size_t cap, char peca, const int estoque[3]) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("evento"));
  campoTexto(e, TXT("evento"), TXT("entrega"));
  campoLetra(e, TXT("peca"), peca);
  campoNum(e, TXT("estoqueA"), estoque[0]);
  campoNum(e, TXT("estoqueB"), estoque[1]);
  campoNum(e, TXT("estoqueC"), estoque[2]);
  return fim(e);
}

size_t formatarErro(char* buf, size_t cap, const char* tipo, char peca,
                    const char* fase, long tMs, long bordas) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("evento"));
  campoTexto(e, TXT("evento"), TXT("erro"));
  campoTexto(e, TXT("tipo"), tipo);
  if (peca != 0) campoLetra(e, TXT("peca"), peca);
  if (fase != nullptr) campoTexto(e, TXT("fase"), fase);
  if (tMs >= 0) campoNum(e, TXT("t_ms"), tMs);
  if (bordas >= 0) campoNum(e, TXT("bordas_juncao"), bordas);
  return fim(e);
}

size_t formatarInicio(char* buf, size_t cap, const char* versao,
                      const char* reset, int lcd, long ramLivre) {
  Escritor e;
  inicioMsg(e, buf, cap, TXT("evento"));
  campoTexto(e, TXT("evento"), TXT("inicio"));
  campoTexto(e, TXT("msg"), TXT("Sistema iniciado"));
  campoTexto(e, TXT("versao"), versao);
  campoTexto(e, TXT("driver"), TXT("IRF520"));
  if (reset != nullptr) campoTexto(e, TXT("reset"), reset);
  if (lcd >= 0) {
    chave(e, TXT("lcd"));
    txt(e, lcd ? TXT("true") : TXT("false"));
  }
  if (ramLivre >= 0) campoNum(e, TXT("ram_livre"), ramLivre);
  return fim(e);
}
