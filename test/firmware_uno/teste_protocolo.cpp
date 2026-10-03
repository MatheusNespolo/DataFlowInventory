// Contrato do protocolo serial. As strings "esperado" reproduzem byte a
// byte o que o firmware v2.x (ArduinoJson) publicava: se um destes testes
// quebrar, o ESP32/servidor/dashboard podem deixar de entender o Uno.
#include "protocolo.h"
#include "teste.h"

static char buf[160];  // mesmo tamanho do buffer do firmware (src/hw/comunicacao.cpp)

// ---- Mensagens existentes (formato v2.x, sem campos novos) ----------------

TESTE(status_igual_v2) {
  formatarStatus(buf, sizeof buf, "AGUARDANDO_PEDIDO", 0, 42, -1);
  VERIFICA_TEXTO(buf, "{\"type\":\"status\",\"estado\":\"AGUARDANDO_PEDIDO\",\"pecaSolicitada\":0,\"uptime\":42}");
}

TESTE(estoque_igual_v2) {
  const int est[3] = {15, 14, 0};
  formatarEstoque(buf, sizeof buf, est);
  VERIFICA_TEXTO(buf, "{\"type\":\"estoque\",\"pecaA\":15,\"pecaB\":14,\"pecaC\":0}");
}

TESTE(sensores_igual_v2) {
  const bool topo[3] = {true, false, true};
  const bool jun[3] = {false, true, false};
  formatarSensores(buf, sizeof buf, topo, jun);
  VERIFICA_TEXTO(buf, "{\"type\":\"sensores\",\"topo\":{\"A\":1,\"B\":0,\"C\":1},\"juncao\":{\"J1\":0,\"J2\":1,\"J3\":0}}");
}

TESTE(esteiras_igual_v2) {
  const bool sec[3] = {false, true, false};
  formatarEsteiras(buf, sizeof buf, sec);
  VERIFICA_TEXTO(buf, "{\"type\":\"esteiras\",\"principal\":1,\"secA\":0,\"secB\":1,\"secC\":0}");
}

TESTE(pedido_igual_v2) {
  formatarPedido(buf, sizeof buf, 'B');
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"pedido\",\"peca\":\"B\"}");
}

TESTE(entrega_igual_v2) {
  const int est[3] = {15, 14, 15};
  formatarEntrega(buf, sizeof buf, 'B', est);
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"entrega\",\"peca\":\"B\",\"estoqueA\":15,\"estoqueB\":14,\"estoqueC\":15}");
}

TESTE(erro_igual_v2_com_e_sem_peca) {
  formatarErro(buf, sizeof buf, "ocupado", 'C', nullptr, -1, -1);
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"erro\",\"tipo\":\"ocupado\",\"peca\":\"C\"}");
  formatarErro(buf, sizeof buf, "peca_invalida", 0, nullptr, -1, -1);
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"erro\",\"tipo\":\"peca_invalida\"}");
}

TESTE(inicio_igual_v2_sem_campos_novos) {
  formatarInicio(buf, sizeof buf, "2.1", nullptr, -1, -1);
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"inicio\",\"msg\":\"Sistema iniciado\",\"versao\":\"2.1\",\"driver\":\"IRF520\"}");
}

// ---- Campos novos: sempre DEPOIS dos atuais e só quando informados ---------

TESTE(status_com_ram_livre) {
  formatarStatus(buf, sizeof buf, "ERRO", 2, 4294967295UL, 812);
  VERIFICA_TEXTO(buf, "{\"type\":\"status\",\"estado\":\"ERRO\",\"pecaSolicitada\":2,\"uptime\":4294967295,\"ram_livre\":812}");
}

TESTE(erro_com_diagnostico) {
  formatarErro(buf, sizeof buf, "timeout", 'B', "transito", 12503, 0);
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"erro\",\"tipo\":\"timeout\",\"peca\":\"B\",\"fase\":\"transito\",\"t_ms\":12503,\"bordas_juncao\":0}");
}

TESTE(inicio_com_campos_novos) {
  formatarInicio(buf, sizeof buf, "3.0", "watchdog", 0, 640);
  VERIFICA_TEXTO(buf, "{\"type\":\"evento\",\"evento\":\"inicio\",\"msg\":\"Sistema iniciado\",\"versao\":\"3.0\",\"driver\":\"IRF520\",\"reset\":\"watchdog\",\"lcd\":false,\"ram_livre\":640}");
}

TESTE(maiores_mensagens_cabem_no_buffer_de_160_bytes) {
  const bool t[3] = {true, true, true};
  VERIFICA(formatarSensores(buf, sizeof buf, t, t) > 0);
  VERIFICA(formatarErro(buf, sizeof buf, "peca_presa_saida", 'C', "transito", 2147483647L, 255) > 0);
  VERIFICA(formatarInicio(buf, sizeof buf, "3.0", "reinicio", 1, 2048) > 0);
  VERIFICA(strlen(buf) < 160);
}

TESTE(buffer_pequeno_devolve_zero_e_string_vazia) {
  char pequeno[10];
  VERIFICA(formatarPedido(pequeno, sizeof pequeno, 'A') == 0);
  VERIFICA_TEXTO(pequeno, "");
}

// ---- Comandos -------------------------------------------------------------------

TESTE(comandos_validos) {
  char p;
  VERIFICA(interpretarComando("CMD:PECA:A", &p) == CMD_PECA && p == 'A');
  VERIFICA(interpretarComando("CMD:PECA:C", &p) == CMD_PECA && p == 'C');
  VERIFICA(interpretarComando("  CMD:PECA:B \r", &p) == CMD_PECA && p == 'B');
  VERIFICA(interpretarComando("CMD:RESET", &p) == CMD_RESET && p == 0);
}

TESTE(comandos_invalidos) {
  char p;
  VERIFICA(interpretarComando("", &p) == CMD_NENHUM);
  VERIFICA(interpretarComando("   ", &p) == CMD_NENHUM);
  VERIFICA(interpretarComando("CMD:PECA:", &p) == CMD_PECA_INVALIDA);
  VERIFICA(interpretarComando("CMD:PECA:Z", &p) == CMD_PECA_INVALIDA && p == 0);
  VERIFICA(interpretarComando("CMD:PECA:AB", &p) == CMD_PECA_INVALIDA);
  VERIFICA(interpretarComando("CMD:PECA:a", &p) == CMD_PECA_INVALIDA);
  VERIFICA(interpretarComando("CMD:RESETX", &p) == CMD_DESCONHECIDO);
  VERIFICA(interpretarComando("{\"type\":\"x\"}", &p) == CMD_DESCONHECIDO);
}

TESTE(leitor_monta_linhas_e_ignora_cr) {
  LeitorLinha l;
  leitorIniciar(l);
  const char* entrada = "CMD:PE";
  for (const char* c = entrada; *c; c++) VERIFICA(!leitorAlimentar(l, *c));
  const char* resto = "CA:A\r\n";
  bool pronto = false;
  for (const char* c = resto; *c; c++) pronto = leitorAlimentar(l, *c);
  VERIFICA(pronto);
  VERIFICA_TEXTO(l.buf, "CMD:PECA:A");
}

TESTE(leitor_descarta_linha_longa_inteira) {
  LeitorLinha l;
  leitorIniciar(l);
  for (int i = 0; i < 50; i++) VERIFICA(!leitorAlimentar(l, 'x'));
  VERIFICA(!leitorAlimentar(l, '\n'));  // a linha longa some inteira
  const char* prox = "CMD:RESET\n";
  bool pronto = false;
  for (const char* c = prox; *c; c++) pronto = leitorAlimentar(l, *c);
  VERIFICA(pronto);
  VERIFICA_TEXTO(l.buf, "CMD:RESET");
}
