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
// ============================================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAÇÃO DO LCD
// ============================================================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ============================================================
// PINOS — MOTORES DC (via driver L298N)
// Cada motor tem: ENA (PWM velocidade), IN1, IN2 (direção)
// ============================================================
#define MOTOR_PRINCIPAL_ENA  2
#define MOTOR_PRINCIPAL_IN1  3
#define MOTOR_PRINCIPAL_IN2  4

#define MOTOR_A_ENA  5
#define MOTOR_A_IN1  6
#define MOTOR_A_IN2  7

#define MOTOR_B_ENA  8
#define MOTOR_B_IN1  9
#define MOTOR_B_IN2  10

#define MOTOR_C_ENA  11
#define MOTOR_C_IN1  12
#define MOTOR_C_IN2  13

// ============================================================
// PINOS — SENSORES IR (TCRT5000)
// ============================================================
#define SENSOR_TOPO_A     A0
#define SENSOR_TOPO_B     A1
#define SENSOR_TOPO_C     A2
#define SENSOR_JUNCAO_J1  A3
#define SENSOR_JUNCAO_J2  A4
#define SENSOR_JUNCAO_J3  A5

// ============================================================
// PINOS — BOTÕES FÍSICOS
// ============================================================
#define BTN_PECA_A  22
#define BTN_PECA_B  23
#define BTN_PECA_C  24
#define BTN_RESET   25

// ============================================================
// PARÂMETROS DO SISTEMA
// ============================================================
#define VELOCIDADE_PRINCIPAL   180   // PWM 0-255
#define VELOCIDADE_SECUNDARIA  200   // PWM 0-255
#define TIMEOUT_ENTREGA        3000  // ms
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
// FUNÇÕES AUXILIARES — MOTORES
// ============================================================

void ligarMotor(int ena, int in1, int in2, int velocidade) {
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  analogWrite(ena, velocidade);
}

void pararMotor(int ena, int in1, int in2) {
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
  analogWrite(ena, 0);
}

void ligarEsteiraPrincipal() {
  ligarMotor(MOTOR_PRINCIPAL_ENA, MOTOR_PRINCIPAL_IN1, MOTOR_PRINCIPAL_IN2, VELOCIDADE_PRINCIPAL);
}

void ligarEsteiraA() {
  ligarMotor(MOTOR_A_ENA, MOTOR_A_IN1, MOTOR_A_IN2, VELOCIDADE_SECUNDARIA);
}

void ligarEsteiraB() {
  ligarMotor(MOTOR_B_ENA, MOTOR_B_IN1, MOTOR_B_IN2, VELOCIDADE_SECUNDARIA);
}

void ligarEsteiraC() {
  ligarMotor(MOTOR_C_ENA, MOTOR_C_IN1, MOTOR_C_IN2, VELOCIDADE_SECUNDARIA);
}

void pararEsteiraA() { pararMotor(MOTOR_A_ENA, MOTOR_A_IN1, MOTOR_A_IN2); }
void pararEsteiraB() { pararMotor(MOTOR_B_ENA, MOTOR_B_IN1, MOTOR_B_IN2); }
void pararEsteiraC() { pararMotor(MOTOR_C_ENA, MOTOR_C_IN1, MOTOR_C_IN2); }

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
// LEITURA DE BOTÕES COM DEBOUNCE
// ============================================================
int lerBotao() {
  if (millis() - ultimoDebounce < DEBOUNCE_BTN) return 0;

  if (digitalRead(BTN_PECA_A) == LOW) { ultimoDebounce = millis(); return 1; }
  if (digitalRead(BTN_PECA_B) == LOW) { ultimoDebounce = millis(); return 2; }
  if (digitalRead(BTN_PECA_C) == LOW) { ultimoDebounce = millis(); return 3; }
  if (digitalRead(BTN_RESET)  == LOW) { ultimoDebounce = millis(); return -1; }
  return 0;
}

// ============================================================
// PUBLICAÇÃO DE DADOS VIA SERIAL (para ESP32 → MQTT)
// IMPORTANTE: Baud rate deve ser IDÊNTICO ao do ESP32 (9600).
//   O ESP32 usa Serial2.begin(9600) para receber estes dados.
// ============================================================

// Publica o estado atual do sistema
void publicarEstado() {
  StaticJsonDocument<200> doc;
  doc["type"] = "status";
  doc["estado"] = nomesEstados[estadoAtual];
  doc["pecaSolicitada"] = pecaSolicitada;
  doc["uptime"] = millis() / 1000;
  serializeJson(doc, Serial);
  Serial.println();
  Serial.flush(); // Aguarda transmissão completa
}

// Publica o estoque atual
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

// Publica leitura dos sensores
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

// Publica evento de entrega
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

// Publica evento de erro
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

// Publica pedido recebido
void publicarPedido(char peca) {
  StaticJsonDocument<150> doc;
  doc["type"] = "evento";
  doc["evento"] = "pedido";
  doc["peca"] = String(peca);
  serializeJson(doc, Serial);
  Serial.println();
}

// Publica status das esteiras
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
  } else if (linha == "CMD:RESET") {
    if (estadoAtual == ERRO) {
      erroTimeout = false;
      erroSemEstoque = false;
      pecaSolicitada = 0;
      pararTodasSecundarias();
      exibirEstoque();
      publicarEstado();
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
  atualizarLCD("Data Flow", "Inventory v2.0");
  delay(2000);

  // Configura pinos dos motores
  int motores[] = {
    MOTOR_PRINCIPAL_ENA, MOTOR_PRINCIPAL_IN1, MOTOR_PRINCIPAL_IN2,
    MOTOR_A_ENA, MOTOR_A_IN1, MOTOR_A_IN2,
    MOTOR_B_ENA, MOTOR_B_IN1, MOTOR_B_IN2,
    MOTOR_C_ENA, MOTOR_C_IN1, MOTOR_C_IN2
  };
  for (int i = 0; i < 12; i++) pinMode(motores[i], OUTPUT);

  // Configura pinos dos sensores
  int sensores[] = {
    SENSOR_TOPO_A, SENSOR_TOPO_B, SENSOR_TOPO_C,
    SENSOR_JUNCAO_J1, SENSOR_JUNCAO_J2, SENSOR_JUNCAO_J3
  };
  for (int i = 0; i < 6; i++) pinMode(sensores[i], INPUT_PULLUP);

  // Configura pinos dos botões
  int botoes[] = { BTN_PECA_A, BTN_PECA_B, BTN_PECA_C, BTN_RESET };
  for (int i = 0; i < 4; i++) pinMode(botoes[i], INPUT_PULLUP);

  // Esteira principal fica ligada continuamente
  ligarEsteiraPrincipal();

  exibirEstoque();

  // Publica mensagem de inicialização
  StaticJsonDocument<150> doc;
  doc["type"] = "evento";
  doc["evento"] = "inicio";
  doc["msg"] = "Sistema iniciado";
  serializeJson(doc, Serial);
  Serial.println();
}

// ============================================================
// LOOP PRINCIPAL — MÁQUINA DE ESTADOS
// ============================================================
void loop() {

  // Processa comandos recebidos do ESP32
  processarComando();

  // Publicação periódica de status (a cada INTERVALO_PUBLICACAO ms)
  if (millis() - ultimaPublicacao >= INTERVALO_PUBLICACAO) {
    ultimaPublicacao = millis();
    publicarEstado();
    publicarSensores();
    publicarStatusEsteiras();
  }

  switch (estadoAtual) {

    // ----------------------------------------------------------
    // ESTADO 1: AGUARDANDO PEDIDO
    // ----------------------------------------------------------
    case AGUARDANDO_PEDIDO: {
      int btn = lerBotao();
      if (btn > 0) {
        pecaSolicitada = btn;
        publicarPedido((char)('A' + btn - 1));
        estadoAtual = VERIFICANDO_ESTOQUE;
      }
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
        atualizarLCD("ERRO: Timeout", "Pressione RESET");
      } else if (erroSemEstoque) {
        // Mantém mensagem de sem estoque
      }

      int btn = lerBotao();
      if (btn == -1) {
        erroTimeout = false;
        erroSemEstoque = false;
        pecaSolicitada = 0;
        pararTodasSecundarias();
        exibirEstoque();
        publicarEstado();
        publicarStatusEsteiras();
        estadoAtual = AGUARDANDO_PEDIDO;
      }
      break;
    }
  }
}