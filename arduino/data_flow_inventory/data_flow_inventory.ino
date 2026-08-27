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
// Separador (roda giratória): motor de passo 28BYJ-48 + driver ULN2003
//   CÓDIGO COMENTADO — habilitar quando o hardware for montado
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
// PINO — SEPARADOR (RODA GIRATÓRIA) — MOTOR DE PASSO
// MANTIDO COMO COMENTÁRIO — habilitar quando o hardware for montado
// Motor de passo 28BYJ-48 + driver ULN2003 (4 fios IN1-IN4).
// Pinos escolhidos: 5, 6, 7, 8 — sequenciais, únicos digitais livres no Uno.
// ============================================================
// #include <Stepper.h>                             // [HABILITAR] biblioteca padrão da Arduino IDE
// #define STEPPER_IN1        5                      // [HABILITAR]
// #define STEPPER_IN2        6                      // [HABILITAR]
// #define STEPPER_IN3        7                      // [HABILITAR]
// #define STEPPER_IN4        8                      // [HABILITAR]
// #define STEPS_PER_REV      2048                   // 28BYJ-48 em passo completo — conferir no datasheet do driver usado
// #define SEPARADOR_RPM      10                     // velocidade do giro — ajustar conforme torque necessário
// Stepper motorSeparador(STEPS_PER_REV, STEPPER_IN1, STEPPER_IN3, STEPPER_IN2, STEPPER_IN4); // [HABILITAR]
// long SEPARADOR_POSICAO_INICIAL = 0;                        // 0°   — compartimento neutro
// long SEPARADOR_POSICAO_A       = STEPS_PER_REV / 3;        // 120° — compartimento A
// long SEPARADOR_POSICAO_B       = (STEPS_PER_REV * 2) / 3;  // 240° — compartimento B
// long SEPARADOR_POSICAO_C       = 0;                        // 0°   — compartimento C (mesmo ponto que o neutro, ajustar layout físico se preciso)
// long posicaoAtualSeparador     = 0;                        // posição atual em passos (0..STEPS_PER_REV-1)

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

// Buffer para leitura NÃO-BLOQUEANTE de comandos da Serial (do ESP32).
// Substitui Serial.readStringUntil(), que trava o loop por até 1 s se a
// linha chegar fragmentada — crítico durante ENTREGANDO_PECA.
String bufferComando = "";

// Pausa pós-entrega sem bloquear o loop (substitui o antigo delay(1500)).
bool          aguardandoLimpezaEntrega = false;
unsigned long tempoLimpezaEntrega      = 0;
const unsigned long PAUSA_POS_ENTREGA_MS = 1500;

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
// Implementação futura: motor de passo (28BYJ-48 + ULN2003)
// para direcionar a peça para o compartimento correto.
//
// Stepper.step() é RELATIVO (nº de passos a girar a partir de onde
// está), diferente de servo.write() que é absoluto — por isso o
// controle guarda posicaoAtualSeparador e calcula o delta a cada
// movimento, sempre pelo caminho mais curto.
// ============================================================
/*
void moverSeparadorPara(long posicaoAlvo) {
  long delta = (posicaoAlvo - posicaoAtualSeparador) % STEPS_PER_REV;
  if (delta < 0) delta += STEPS_PER_REV;
  if (delta > STEPS_PER_REV / 2) delta -= STEPS_PER_REV; // caminho mais curto (sentido horário ou anti-horário)

  motorSeparador.step(delta);
  posicaoAtualSeparador = posicaoAlvo;
}

void moverSeparador(char peca) {
  long alvo = SEPARADOR_POSICAO_INICIAL;
  if (peca == 'A') alvo = SEPARADOR_POSICAO_A;
  if (peca == 'B') alvo = SEPARADOR_POSICAO_B;
  if (peca == 'C') alvo = SEPARADOR_POSICAO_C;

  moverSeparadorPara(alvo);
}

void resetarSeparador() {
  moverSeparadorPara(SEPARADOR_POSICAO_INICIAL);
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
// RECEBIMENTO DE COMANDOS VIA SERIAL (do ESP32) — NÃO-BLOQUEANTE
// Acumula caracteres até '\n' e só então interpreta a linha, sem
// Serial.readStringUntil() (que bloquearia o loop se a linha viesse
// fragmentada). Espelha o lerSerial2() do gateway ESP32.
// Formato esperado: CMD:PECA:A | CMD:PECA:B | CMD:PECA:C | CMD:RESET
// Rejeições explícitas (não travam a FSM, informam o dashboard):
//   peca_invalida       — letra fora de A/B/C
//   ocupado             — pedido com a FSM fora de AGUARDANDO_PEDIDO
//   comando_desconhecido — linha não reconhecida
// ============================================================
void interpretarComando(String linha) {
  linha.trim();
  if (linha.length() == 0) return;

  if (linha.startsWith("CMD:PECA:")) {
    char pecaChar = linha.charAt(9); // A, B ou C
    int peca = 0;
    if (pecaChar == 'A') peca = 1;
    else if (pecaChar == 'B') peca = 2;
    else if (pecaChar == 'C') peca = 3;

    if (peca == 0) {
      publicarErro("peca_invalida");
      return;
    }
    if (estadoAtual != AGUARDANDO_PEDIDO) {
      publicarErro("ocupado");
      return;
    }
    pecaSolicitada = peca;
    publicarPedido(pecaChar);
    estadoAtual = VERIFICANDO_ESTOQUE;

  } else if (linha.startsWith("CMD:RESET")) {
    if (estadoAtual == ERRO) {
      erroTimeout = false;
      erroSemEstoque = false;
      aguardandoLimpezaEntrega = false;
      pecaSolicitada = 0;
      pararTodasSecundarias();
      exibirEstoque();
      publicarEstado();
      publicarEstoque(); // sincroniza dashboard com o LCD após reset
      estadoAtual = AGUARDANDO_PEDIDO;
    }
    // RESET fora de ERRO: ignorado de propósito (sistema já estável)

  } else {
    publicarErro("comando_desconhecido");
  }
}

void processarComando() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      interpretarComando(bufferComando);
      bufferComando = "";
    } else if (c != '\r') {
      bufferComando += c;
      // Proteção contra lixo / linha sem terminador na serial
      if (bufferComando.length() > 80) bufferComando = "";
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

  // Separador (roda giratória): DESABILITADO — motor de passo ainda não montado
  // Para reativar, descomente (junto com o bloco de definições e funções auxiliares):
  // motorSeparador.setSpeed(SEPARADOR_RPM);
  // moverSeparadorPara(SEPARADOR_POSICAO_INICIAL);

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

  // Publicação periódica de status.
  // Inclui o estoque: no trecho UART Arduino→ESP32 as mensagens são QoS 0;
  // republicar a cada ciclo reconcilia o dashboard caso o pacote do boot
  // ou de uma entrega se perca.
  if (millis() - ultimaPublicacao >= INTERVALO_PUBLICACAO) {
    ultimaPublicacao = millis();
    publicarEstado();
    publicarEstoque();
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
      // Pausa pós-entrega não-bloqueante: mantém "Entrega OK!" no LCD por
      // PAUSA_POS_ENTREGA_MS sem travar o loop — processarComando() e a
      // publicação periódica seguem rodando durante a espera.
      if (aguardandoLimpezaEntrega) {
        if (millis() - tempoLimpezaEntrega >= PAUSA_POS_ENTREGA_MS) {
          aguardandoLimpezaEntrega = false;
          pecaSolicitada = 0;
          exibirEstoque();
          publicarEstado();
          publicarStatusEsteiras();
          estadoAtual = AGUARDANDO_PEDIDO;
        }
        break;
      }

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

        // Inicia a pausa não-bloqueante; a volta para AGUARDANDO_PEDIDO
        // acontece no topo deste case quando o tempo expira.
        aguardandoLimpezaEntrega = true;
        tempoLimpezaEntrega = millis();

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