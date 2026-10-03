#include "telas.h"

#include <string.h>

#include "texto_flash.h"

namespace {
// Acrescenta texto fixo (TXT) respeitando o limite de 16 colunas.
void anexaTxt(char* dst, const char* txt) {
  uint8_t n = (uint8_t)strlen(dst);
  for (char c = lerTxt(txt); c != 0 && n < LCD_COLUNAS; c = lerTxt(++txt)) dst[n++] = c;
  dst[n] = 0;
}

// Acrescenta texto em RAM respeitando o limite de 16 colunas.
void anexaRam(char* dst, const char* s) {
  uint8_t n = (uint8_t)strlen(dst);
  while (*s && n < LCD_COLUNAS) dst[n++] = *s++;
  dst[n] = 0;
}

void anexaNum(char* dst, int v) {
  char tmp[7];
  uint8_t i = 0;
  bool neg = v < 0;
  unsigned u = neg ? (unsigned)(-v) : (unsigned)v;
  do { tmp[i++] = (char)('0' + (u % 10)); u /= 10; } while (u > 0 && i < 6);
  char s[8];
  uint8_t k = 0;
  if (neg) s[k++] = '-';
  while (i > 0) s[k++] = tmp[--i];
  s[k] = 0;
  anexaRam(dst, s);
}

void anexaLetra(char* dst, char c) {
  char s[2] = {c, 0};
  anexaRam(dst, s);
}

void telaErro(const Fsm& f, char* l1, char* l2) {
  const char p = letraPeca(f.peca);
  switch (f.erroAtual) {
    case ERR_MOTOR_SEM_AVANCO:
      anexaTxt(l1, TXT("ERRO: Motor ")); anexaLetra(l1, p); anexaTxt(l2, TXT("Sem avanco"));
      break;
    case ERR_TIMEOUT:
      anexaTxt(l1, TXT("ERRO: Timeout ")); anexaLetra(l1, p); anexaTxt(l2, TXT("Retire a peca"));
      break;
    case ERR_JUNCAO_OBSTRUIDA:
      anexaTxt(l1, TXT("ERRO: Juncao J")); anexaNum(l1, f.peca); anexaTxt(l2, TXT("Obstruida"));
      break;
    case ERR_SEM_PECA_TOPO:
      anexaTxt(l1, TXT("ERRO: Topo ")); anexaLetra(l1, p); anexaTxt(l2, TXT("Sem peca"));
      break;
    case ERR_SEM_ESTOQUE:
      anexaTxt(l1, TXT("ERRO: Estoque ")); anexaLetra(l1, p); anexaTxt(l2, TXT("Zerado"));
      break;
    case ERR_PECA_PRESA_SAIDA:
      anexaTxt(l1, TXT("ERRO: Saida ")); anexaLetra(l1, p); anexaTxt(l2, TXT("Peca presa"));
      break;
    default:
      anexaTxt(l1, TXT("ERRO"));
      anexaTxt(l2, nomeErro(f.erroAtual));
      break;
  }
}
}  // namespace

void textoTela(const Fsm& f, char* l1, char* l2) {
  l1[0] = 0;
  l2[0] = 0;
  const char p = letraPeca(f.peca);
  switch (f.tela) {
    case TELA_ENTREGANDO:
      anexaTxt(l1, TXT("Entregando ")); anexaLetra(l1, p);
      anexaTxt(l2, TXT("Aguarda juncao"));
      break;
    case TELA_SAINDO:
      anexaTxt(l1, TXT("Saindo da"));
      anexaTxt(l2, TXT("esteira..."));
      break;
    case TELA_ENTREGUE:
      anexaTxt(l1, TXT("Entrega OK!"));
      anexaTxt(l2, TXT("Entregue! ")); anexaLetra(l2, p); anexaTxt(l2, TXT(":"));
      anexaNum(l2, (f.peca >= 1 && f.peca <= 3) ? f.estoque[f.peca - 1] : 0);
      break;
    case TELA_ERRO:
      telaErro(f, l1, l2);
      break;
    default:  // TELA_ESTOQUE
      anexaTxt(l1, TXT("Estoque:"));
      anexaTxt(l2, TXT("A:")); anexaNum(l2, f.estoque[0]);
      anexaTxt(l2, TXT(" B:")); anexaNum(l2, f.estoque[1]);
      anexaTxt(l2, TXT(" C:")); anexaNum(l2, f.estoque[2]);
      break;
  }
}
