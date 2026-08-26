// ============================================================
// DATA FLOW INVENTORY — Sistema de Intralogística Automatizada
// SENAI São Caetano do Sul — Engenharia de Controle e Automação
// Autores: Henrique Moni, Matheus Nespolo, Murilo Tolardo, Vitor Marcolongo
// Ano: 2026
// ============================================================
// Descrição:
// Máquina de estados com 5 etapas:
//   AGUARDANDO_PEDIDO → VERIFICANDO_ESTOQUE → ACIONANDO_ESTEIRA
//   → ENTREGANDO_PECA → ERRO
// 3 esteiras secundárias (A, B, C) alimentam a esteira principal.
// Roda de estoque com 3 compartimentos ao final da principal.
//
// Comunicação bidirecional com ESP32 via Serial (JSON):
//   - Publica eventos, estado, sensores e estoque
//   - Recebe comandos do front-end via ESP32 (CMD:PECA:A, CMD:RESET)
//
// Driver: IRF520 (MOSFET) — 1 pino PWM por motor
// Botões físicos: DESABILITADOS (controle via dashboard web)
// Separador (roda giratória): CÓDIGO COMENTADO (verificar implementação futura)
// ============================================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAÇÃO DO LCD
// ============================================================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ============================================================
// PINOS — MOTORES DC (via driver IRF520)
// Cada motor usa 1 pino PWM (SIG do módulo IRF520)
// ============================================================
#define MOTOR_A          9    // PWM — Esteira A (secundária)
#define MOTOR_B          10    // PWM — Esteira B (secundária)
#define MOTOR_C          11    // PWM — Esteira C (secundária)

// ============================================================
// PINOS — SENSORES IR (TCRT5000)
// ============================================================
#define SENSOR_TOPO_A     A0
#define SENSOR_TOPO_B     A1
#define SENSOR_TOPO_C     A2
#define SENSOR_JUNCAO_J1  A3
#define SENSOR_JUNCAO_J2  2
#define SENSOR_JUNCAO_J3  4

// ============================================================
// BOTÕES FÍSICOS — DESABILITADOS
// Controle exclusivo via dashboard web (Serial/ESP32)
// Para reativar, descomente as linhas marcadas com "// [HABILITAR]"
// ============================================================
// #define BTN_PECA_A  22    // [HABILITAR]
// #define BTN_PECA_B  23    // [HABILITAR]
// #define BTN_PECA_C  24    // [HABILITAR]
// #define BTN_RESET   25    // [HABILITAR]

// ============================================================
// PINO — SEPARADOR (RODA GIRATÓRIA)
// MANTIDO COMO COMENTÁRIO — verificar implementação futura
// ============================================================
// #define MOTOR_SEPARADOR  10  // [HABILITAR] PWM para servo/motor do separador
// #define SEPARADOR_POSICAO_INICIAL 0
// #define SEPARADOR_POSICAO_A       90
// #define SEPARADOR_POSICAO_B       135
// #define SEPARADOR_POSICAO_C       180

// ============================================================
// PARÂMETROS DO SISTEMA
// ============================================================
#define VELOCIDADE_PRINCIPAL   180   // PWM 0-255
#define VELOCIDADE_SECUNDARIA  200   // PWM 0-255
#define TIMEOUT_ENTREGA        12000 // ms (medição 25/08: peça leva ~5s até o sensor,
                                      // mas precisa de folga extra para sair da esteira secundária)
#define DEBOUNCE_BTN           200   // ms
#define INTERVALO_PUBLICACAO   1000  // ms — intervalo para publicar status periódico

// ============================================================
// ESTADOS DA MÁQUINA DE ESTADOS
// ============================================================
enum Estado {
  AGUARDANDO_PEDIDO,
  VERIFICANDO_ESTOQUE,
  ACIONANDO_ESTEIRA,
  ENTREGANDO_PECA,
  ERRO
};

const char* nomesEstados[] = {
  "AGUARDANDO_PEDIDO",
  "VERIFICANDO_ESTOQUE",
  "ACIONANDO_ESTEIRA",
  "ENTREGANDO_PECA",
  "ERRO"
};

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
Estado estadoAtual = AGUARDANDO_PEDIDO;
int    pecaSolicitada = 0;       // 1 = A, 2 = B, 3 = C
int    estoque[4] = {0, 5, 5, 5}; // índice 1=A, 2=B, 3=C
unsigned long tempoInicio = 0;
unsigned long ultimoDebounce = 0;
unsigned long ultimaPublicacao = 0;
bool   erroTimeout = false;
bool   erroSemEstoque = false;

// ============================================================
// FUNÇÕES AUXILIARES — MOTORES (IRF520)
// Com IRF520, basta controlar o PWM em 1 pino por motor.
// analogWrite(pin, velocidade) → liga motor
// analogWrite(pin, 0)          → para motor
// ============================================================

void ligarMotor(int pin, int velocidade) {
  analogWrite(pin, velocidade);
}

void pararMotor(int pin) {
  analogWrite(pin, 0);
}

void ligarEsteiraA() {
  ligarMotor(MOTOR_A, VELOCIDADE_SECUNDARIA);
}

void ligarEsteiraB() {
  ligarMotor(MOTOR_B, VELOCIDADE_SECUNDARIA);
}

void ligarEsteiraC() {
  ligarMotor(MOTOR_C, VELOCIDADE_SECUNDARIA);
}

void pararEsteiraA() { pararMotor(MOTOR_A); }
void pararEsteiraB() { pararMotor(MOTOR_B); }
void pararEsteiraC() { pararMotor(MOTOR_C); }

void pararTodasSecundarias() {
  pararEsteiraA();
  pararEsteiraB();
  pararEsteiraC();
}

// ============================================================
// FUNÇÕES AUXILIARES — SENSORES
// ============================================================
bool sensorTopoA()     { return digitalRead(SENSOR_TOPO_A)   == LOW; }
bool sensorTopoB()     { return digitalRead(SENSOR_TOPO_B)   == LOW; }
bool sensorTopoC()     { return digitalRead(SENSOR_TOPO_C)   == LOW; }
bool sensorJuncaoJ1()  { return digitalRead(SENSOR_JUNCAO_J1) == LOW; }
bool sensorJuncaoJ2()  { return digitalRead(SENSOR_JUNCAO_J2) == LOW; }
bool sensorJuncaoJ3()  { return digitalRead(SENSOR_JUNCAO_J3) == LOW; }

// ============================================================
// FUNÇÕES AUXILIARES — LCD
// ============================================================
void atualizarLCD(String linha1, String linha2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(linha1);
  lcd.setCursor(0, 1);
  lcd.print(linha2);
}

void exibirEstoque() {
  String linha1 = "A:" + String(estoque[1]) + " B:" + String(estoque[2]) + " C:" + String(estoque[3]);
  atualizarLCD("Estoque:", linha1);
}

// ============================================================
// FUNÇÕES AUXILIARES — SEPARADOR (COMENTADO)
// Implementação futura: controlar servo/motor do separador
// para direcionar a peça para o compartimento correto.
// ============================================================
/*
void moverSeparador(char peca) {
  int posicao = SEPARADOR_POSICAO_INICIAL;
  if (peca == 'A') posicao = SEPARADOR_POSICAO_A;
  if (peca == 'B') posicao = SEPARADOR_POSICAO_B;
  if (peca == 'C') posicao = SEPARADOR_POSICAO_C;

  analogWrite(MOTOR_SEPARADOR, map(posicao, 0, 180, 0, 255));
  delay(500); // Aguarda movimento do servo
  pararMotor(MOTOR_SEPARADOR);
}

void resetarSeparador() {
  analogWrite(MOTOR_SEPARADOR, map(SEPARADOR_POSICAO_INICIAL, 0, 180, 0, 255));
  delay(500);
  pararMotor(MOTOR_SEPARADOR);
}
*/

// ============================================================
// LEITURA DE BOTÕES — DESABILITADA
// Controle exclusivo via dashboard web (Serial/ESP32)
// Para reativar botões físicos, descomente abaixo:
// ============================================================
/*
int lerBotao() {
  if (millis() - ultimoDebounce < DEBOUNCE_BTN) return 0;
  if (digitalRead(BTN_PECA_A) == LOW) { ultimoDebounce = millis(); return 1; }
  if (digitalRead(BTN_PECA_B) == LOW) { ultimoDebounce = millis(); return 2; }
  if (digitalRead(BTN_PECA_C) == LOW) { ultimoDebounce = millis(); return 3; }
  if (digitalRead(BTN_RESET)  == LOW) { ultimoDebounce = millis(); return -1; }
  return 0;
}
*/

// ============================================================
// PUBLICAÇÃO DE DADOS VIA SERIAL (para ESP32 → MQTT)
// IMPORTANTE: Baud rate deve ser IDÊNTICO ao do ESP32 (9600).
//   O ESP32 usa Serial2.begin(9600) para receber estes dados.
// ============================================================

void publicarEstado() {
  StaticJsonDocument<200> doc;
  doc["type"] = "status";
  doc["estado"] = nomesEstados[estadoAtual];
  doc["pecaSolicitada"] = pecaSolicitada;
  doc["uptime"] = millis() / 1000;
  serializeJson(doc, Serial);
  Serial.println();
  Serial.flush();
}

void publicarEstoque() {
  StaticJsonDocument<200> doc;
  doc["type"] = "estoque";
  doc["pecaA"] = estoque[1];
  doc["pecaB"] = estoque[2];
  doc["pecaC"] = estoque[3];
  serializeJson(doc, Serial);
  Serial.println();
  Serial.flush();
}

void publicarSensores() {
  StaticJsonDocument<300> doc;
  doc["type"] = "sensores";
  JsonObject topo = doc.createNestedObject("topo");
  topo["A"] = sensorTopoA() ? 1 : 0;
  topo["B"] = sensorTopoB() ? 1 : 0;
  topo["C"] = sensorTopoC() ? 1 : 0;
  JsonObject juncao = doc.createNestedObject("juncao");
  juncao["J1"] = sensorJuncaoJ1() ? 1 : 0;
  juncao["J2"] = sensorJuncaoJ2() ? 1 : 0;
  juncao["J3"] = sensorJuncaoJ3() ? 1 : 0;
  serializeJson(doc, Serial);
  Serial.println();
}

void publicarEntrega(char peca) {
  StaticJsonDocument<250> doc;
  doc["type"] = "evento";
  doc["evento"] = "entrega";
  doc["peca"] = String(peca);
  doc["estoqueA"] = estoque[1];
  doc["estoqueB"] = estoque[2];
  doc["estoqueC"] = estoque[3];
  serializeJson(doc, Serial);
  Serial.println();
}

void publicarErro(const char* tipo) {
  StaticJsonDocument<200> doc;
  doc["type"] = "evento";
  doc["evento"] = "erro";
  doc["tipo"] = tipo;
  if (pecaSolicitada > 0) {
    doc["peca"] = String((char)('A' + pecaSolicitada - 1));
  }
  serializeJson(doc, Serial);
  Serial.println();
}

void publicarPedido(char peca) {
  StaticJsonDocument<150> doc;
  doc["type"] = "evento";
  doc["evento"] = "pedido";
  doc["peca"] = String(peca);
  serializeJson(doc, Serial);
  Serial.println();
}

void publicarStatusEsteiras() {
  StaticJsonDocument<200> doc;
  doc["type"] = "esteiras";
  doc["principal"] = 1; // sempre ligada
  doc["secA"] = (estadoAtual == ACIONANDO_ESTEIRA && pecaSolicitada == 1) ||
                (estadoAtual == ENTREGANDO_PECA && pecaSolicitada == 1) ? 1 : 0;
  doc["secB"] = (estadoAtual == ACIONANDO_ESTEIRA && pecaSolicitada == 2) ||
                (estadoAtual == ENTREGANDO_PECA && pecaSolicitada == 2) ? 1 : 0;
  doc["secC"] = (estadoAtual == ACIONANDO_ESTEIRA && pecaSolicitada == 3) ||
                (estadoAtual == ENTREGANDO_PECA && pecaSolicitada == 3) ? 1 : 0;
  serializeJson(doc, Serial);
  Serial.println();
}

// ============================================================
// RECEBIMENTO DE COMANDOS VIA SERIAL (do ESP32)
// Formato esperado: CMD:PECA:A  ou  CMD:RESET
// ============================================================
void processarComando() {
  if (!Serial.available()) return;

  String linha = Serial.readStringUntil('\n');
  linha.trim();

  if (linha.startsWith("CMD:PECA:")) {
    char pecaChar = linha.charAt(9); // A, B ou C
    int peca = 0;
    if (pecaChar == 'A') peca = 1;
    else if (pecaChar == 'B') peca = 2;
    else if (pecaChar == 'C') peca = 3;

    if (peca > 0 && estadoAtual == AGUARDANDO_PEDIDO) {
      pecaSolicitada = peca;
      publicarPedido(pecaChar);
      estadoAtual = VERIFICANDO_ESTOQUE;
    }
  } else if (linha.startsWith("CMD:RESET")) {
    if (estadoAtual == ERRO) {
      erroTimeout = false;
      erroSemEstoque = false;
      pecaSolicitada = 0;
      pararTodasSecundarias();
      exibirEstoque();
      publicarEstado();
      publicarEstoque(); // sincroniza dashboard com o LCD após reset
      estadoAtual = AGUARDANDO_PEDIDO;
    }
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(9600);

  // Inicializa LCD
  lcd.init();
  lcd.backlight();
  atualizarLCD("Data Flow", "Inventory v2.1");
  delay(2000);

  // Publica estoque inicial para sincronizar com o dashboard
  publicarEstoque();

  // Configura pinos dos motores (IRF520 — apenas 1 PWM por motor)
  int motores[] = { MOTOR_A, MOTOR_B, MOTOR_C };
  for (int i = 0; i < 3; i++) {
    pinMode(motores[i], OUTPUT);
    analogWrite(motores[i], 0); // Inicia desligado
  }

  // Configura pinos dos sensores
  int sensores[] = {
    SENSOR_TOPO_A, SENSOR_TOPO_B, SENSOR_TOPO_C,
    SENSOR_JUNCAO_J1, SENSOR_JUNCAO_J2, SENSOR_JUNCAO_J3
  };
  for (int i = 0; i < 6; i++) pinMode(sensores[i], INPUT_PULLUP);

  // Botões físicos: DESABILITADOS (controle via dashboard)
  // Para reativar, descomente:
  // int botoes[] = { BTN_PECA_A, BTN_PECA_B, BTN_PECA_C, BTN_RESET };
  // for (int i = 0; i < 4; i++) pinMode(botoes[i], INPUT_PULLUP);

  exibirEstoque();

  // Publica mensagem de inicialização
  StaticJsonDocument<150> doc;
  doc["type"] = "evento";
  doc["evento"] = "inicio";
  doc["msg"] = "Sistema iniciado";
  doc["versao"] = "2.1";
  doc["driver"] = "IRF520";
  serializeJson(doc, Serial);
  Serial.println();
}

// ============================================================
// LOOP PRINCIPAL — MÁQUINA DE ESTADOS
// ============================================================
void loop() {

  // Processa comandos recebidos do ESP32
  processarComando();

  // Publicação periódica de status
  if (millis() - ultimaPublicacao >= INTERVALO_PUBLICACAO) {
    ultimaPublicacao = millis();
    publicarEstado();
    publicarSensores();
    publicarStatusEsteiras();
  }

  switch (estadoAtual) {

    // ----------------------------------------------------------
    // ESTADO 1: AGUARDANDO PEDIDO
    // Comandos recebidos via Serial (ESP32/dashboard web)
    // Botões físicos desabilitados (verificar reativação futura)
    // ----------------------------------------------------------
    case AGUARDANDO_PEDIDO: {
      // Botões físicos: DESABILITADOS
      // Para reativar, descomente o bloco abaixo:
      // int btn = lerBotao();
      // if (btn > 0) {
      //   pecaSolicitada = btn;
      //   publicarPedido((char)('A' + btn - 1));
      //   estadoAtual = VERIFICANDO_ESTOQUE;
      // } else if (btn == -1) {
      //   // Reset via botão físico — já processado em processarComando()
      // }
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 2: VERIFICANDO ESTOQUE
    // ----------------------------------------------------------
    case VERIFICANDO_ESTOQUE: {
      bool temPeca = false;
      String nomePeca = "";

      if (pecaSolicitada == 1) { temPeca = sensorTopoA(); nomePeca = "Peca A"; }
      if (pecaSolicitada == 2) { temPeca = sensorTopoB(); nomePeca = "Peca B"; }
      if (pecaSolicitada == 3) { temPeca = sensorTopoC(); nomePeca = "Peca C"; }

      if (temPeca && estoque[pecaSolicitada] > 0) {
        atualizarLCD("Separando:", nomePeca);
        publicarEstado();
        estadoAtual = ACIONANDO_ESTEIRA;
      } else {
        atualizarLCD("ERRO: Sem estoque", nomePeca);
        erroSemEstoque = true;
        publicarErro("sem_estoque");
        estadoAtual = ERRO;
      }
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 3: ACIONANDO ESTEIRA
    // ----------------------------------------------------------
    case ACIONANDO_ESTEIRA: {
      if (pecaSolicitada == 1) ligarEsteiraA();
      if (pecaSolicitada == 2) ligarEsteiraB();
      if (pecaSolicitada == 3) ligarEsteiraC();

      tempoInicio = millis();
      publicarStatusEsteiras();
      estadoAtual = ENTREGANDO_PECA;
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 4: ENTREGANDO PEÇA
    // ----------------------------------------------------------
    case ENTREGANDO_PECA: {
      bool pecaChegou = false;

      if (pecaSolicitada == 1) pecaChegou = sensorJuncaoJ1();
      if (pecaSolicitada == 2) pecaChegou = sensorJuncaoJ2();
      if (pecaSolicitada == 3) pecaChegou = sensorJuncaoJ3();

      if (pecaChegou) {
        // Para esteira secundária
        if (pecaSolicitada == 1) pararEsteiraA();
        if (pecaSolicitada == 2) pararEsteiraB();
        if (pecaSolicitada == 3) pararEsteiraC();

        // Separador: CÓDIGO COMENTADO — verificar implementação futura
        // moverSeparador((char)('A' + pecaSolicitada - 1));

        // Atualiza estoque
        estoque[pecaSolicitada]--;

        // Feedback
        String msg = "Entregue! ";
        msg += (char)('A' + pecaSolicitada - 1);
        msg += ":" + String(estoque[pecaSolicitada]);
        atualizarLCD("Entrega OK!", msg);

        // Publica eventos
        publicarEntrega((char)('A' + pecaSolicitada - 1));
        publicarEstoque();

        delay(1500);
        pecaSolicitada = 0;
        exibirEstoque();
        publicarEstado();
        publicarStatusEsteiras();
        estadoAtual = AGUARDANDO_PEDIDO;

      } else if (millis() - tempoInicio > TIMEOUT_ENTREGA) {
        // Timeout
        pararTodasSecundarias();
        erroTimeout = true;
        publicarErro("timeout");
        estadoAtual = ERRO;
      }
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 5: ERRO
    // ----------------------------------------------------------
    case ERRO: {
      if (erroTimeout) {
        atualizarLCD("ERRO: Timeout", "Aguarde comando");
      } else if (erroSemEstoque) {
        // Mantém mensagem de sem estoque
      }

      // Reset via botão físico: DESABILITADO
      // Para reativar, descomente:
      // int btn = lerBotao();
      // if (btn == -1) {
      //   erroTimeout = false;
      //   erroSemEstoque = false;
      //   pecaSolicitada = 0;
      //   pararTodasSecundarias();
      //   exibirEstoque();
      //   publicarEstado();
      //   publicarStatusEsteiras();
      //   estadoAtual = AGUARDANDO_PEDIDO;
      // }
      break;
    }
  }
}