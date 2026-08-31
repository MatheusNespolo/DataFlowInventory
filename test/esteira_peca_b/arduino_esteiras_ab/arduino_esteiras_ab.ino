// ============================================================
// TESTE 5 — DUAS ESTEIRAS (A + B) — Arduino Uno
// ============================================================
// Descrição:
// Evolução do teste de integração da Peça A. Este sketch já usa
// a MESMA máquina de estados de 5 etapas do código final
// (data_flow_inventory.ino) e o MESMO protocolo Serial JSON,
// porém controlando apenas 2 esteiras secundárias (A e B).
//
//   AGUARDANDO_PEDIDO → VERIFICANDO_ESTOQUE → ACIONANDO_ESTEIRA
//   → ENTREGANDO_PECA → ERRO
//
// Diferenças em relação ao código final:
//   - Apenas esteiras A e B (peça C responde "peca_indisponivel")
//   - LCD opcional (flag USE_LCD, desabilitado por padrão)
//   - Lógica parametrizada por arrays (facilita adicionar a C)
//
// Materiais:
//   Arduino Uno + 3 IRF520 (principal, A, B)
//   + 4 sensores TCRT5000 (topo A/B + junções J1/J2)
//
// Pinagem (idêntica ao código final):
//   MOTOR_PRINCIPAL -> Pino 3 (PWM)
//   MOTOR_A         -> Pino 5 (PWM)
//   MOTOR_B         -> Pino 6 (PWM)
//   SENSOR_TOPO_A   -> A0 (INPUT_PULLUP, LOW = peça presente)
//   SENSOR_TOPO_B   -> A1
//   SENSOR_JUNCAO_J1-> A3
//   SENSOR_JUNCAO_J2-> A4
//
// Comandos aceitos via Serial (do ESP32 ou monitor serial):
//   CMD:PECA:A   -> Solicita peça A
//   CMD:PECA:B   -> Solicita peça B
//   CMD:PECA:C   -> Rejeitado (evento de erro "peca_indisponivel")
//   CMD:RESET    -> Sai do estado de ERRO
//
// ⚠ Para upload: desconecte o ESP32 dos pinos 0/1 do Uno.
// ============================================================

#include <ArduinoJson.h>

// ============================================================
// LCD OPCIONAL — habilite se o display estiver montado
// ============================================================
#define USE_LCD 0   // 0 = sem LCD | 1 = com LCD I2C 0x27

#if USE_LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);
#endif

// ============================================================
// PINOS — MOTORES DC (via driver IRF520, 1 PWM por motor)
// ============================================================
#define MOTOR_PRINCIPAL  3    // PWM — Esteira Principal
#define MOTOR_A          5    // PWM — Esteira A (secundária)
#define MOTOR_B          6    // PWM — Esteira B (secundária)

// ============================================================
// PINOS — SENSORES IR (TCRT5000)
// ============================================================
#define SENSOR_TOPO_A     A0
#define SENSOR_TOPO_B     A1
#define SENSOR_JUNCAO_J1  A3
#define SENSOR_JUNCAO_J2  2     // D2 (evita conflito com A4/SDA do LCD I2C)

// ============================================================
// PARÂMETROS DO SISTEMA
// ============================================================
#define VELOCIDADE_PRINCIPAL   180   // PWM 0-255
#define VELOCIDADE_SECUNDARIA  200   // PWM 0-255
#define TIMEOUT_ENTREGA        9000  // ms (recalibrado 27/08: ~5s até o sensor + margem de escoamento)
#define INTERVALO_PUBLICACAO   1000  // ms — status periódico
const unsigned long TEMPO_SAIDA_ESTEIRA_MS = 3000;

// ============================================================
// ESTADOS DA MÁQUINA DE ESTADOS (iguais ao código final)
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
// PARAMETRIZAÇÃO POR ÍNDICE (1 = A, 2 = B)
// Arrays no índice 0 não são usados — mantém compatibilidade
// com a convenção do código final (pecaSolicitada 1..3).
// Para adicionar a esteira C no futuro, basta estender os
// arrays abaixo e mudar NUM_PECAS para 3.
// ============================================================
#define NUM_PECAS 2

const int PIN_MOTOR[]  = { 0, MOTOR_A,          MOTOR_B          };
const int PIN_TOPO[]   = { 0, SENSOR_TOPO_A,    SENSOR_TOPO_B    };
const int PIN_JUNCAO[] = { 0, SENSOR_JUNCAO_J1, SENSOR_JUNCAO_J2 };

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
Estado estadoAtual = AGUARDANDO_PEDIDO;
int    pecaSolicitada = 0;        // 1 = A, 2 = B
int    estoque[NUM_PECAS + 1] = {0, 5, 5}; // índice 1=A, 2=B
unsigned long tempoInicio = 0;
unsigned long ultimaPublicacao = 0;
bool   erroTimeout = false;
bool   erroSemEstoque = false;
String bufferComando = "";

// ============================================================
// FUNÇÕES AUXILIARES — MOTORES (IRF520)
// ============================================================
void ligarMotor(int pin, int velocidade) { analogWrite(pin, velocidade); }
void pararMotor(int pin)                 { analogWrite(pin, 0); }

void ligarEsteiraPrincipal() { ligarMotor(MOTOR_PRINCIPAL, VELOCIDADE_PRINCIPAL); }

void ligarEsteiraSecundaria(int peca) {
  if (peca >= 1 && peca <= NUM_PECAS) ligarMotor(PIN_MOTOR[peca], VELOCIDADE_SECUNDARIA);
}

void pararEsteiraSecundaria(int peca) {
  if (peca >= 1 && peca <= NUM_PECAS) pararMotor(PIN_MOTOR[peca]);
}

void pararTodasSecundarias() {
  for (int i = 1; i <= NUM_PECAS; i++) pararMotor(PIN_MOTOR[i]);
}

// ============================================================
// FUNÇÕES AUXILIARES — SENSORES (LOW = peça presente)
// ============================================================
bool sensorTopo(int peca)   { return digitalRead(PIN_TOPO[peca])   == LOW; }
bool sensorJuncao(int peca) { return digitalRead(PIN_JUNCAO[peca]) == LOW; }

// ============================================================
// FUNÇÕES AUXILIARES — LCD (opcional)
// ============================================================
void atualizarLCD(String linha1, String linha2) {
#if USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(linha1);
  lcd.setCursor(0, 1);
  lcd.print(linha2);
#else
  (void)linha1; (void)linha2; // sem LCD neste teste
#endif
}

void exibirEstoque() {
  atualizarLCD("Estoque:", "A:" + String(estoque[1]) + " B:" + String(estoque[2]));
}

// ============================================================
// PUBLICAÇÃO DE DADOS VIA SERIAL (para ESP32 → MQTT)
// Formato JSON IDÊNTICO ao código final — o gateway ESP32
// roteia por "type" para os tópicos dataflow/*.
// Baud rate: 9600 (igual ao Serial2 do ESP32).
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
  doc["pecaC"] = 0; // peça C não existe neste teste
  serializeJson(doc, Serial);
  Serial.println();
  Serial.flush();
}

void publicarSensores() {
  StaticJsonDocument<300> doc;
  doc["type"] = "sensores";
  JsonObject topo = doc.createNestedObject("topo");
  topo["A"] = sensorTopo(1) ? 1 : 0;
  topo["B"] = sensorTopo(2) ? 1 : 0;
  topo["C"] = 0;
  JsonObject juncao = doc.createNestedObject("juncao");
  juncao["J1"] = sensorJuncao(1) ? 1 : 0;
  juncao["J2"] = sensorJuncao(2) ? 1 : 0;
  juncao["J3"] = 0;
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
  doc["estoqueC"] = 0;
  serializeJson(doc, Serial);
  Serial.println();
}

void publicarErro(const char* tipo, char peca) {
  StaticJsonDocument<200> doc;
  doc["type"] = "evento";
  doc["evento"] = "erro";
  doc["tipo"] = tipo;
  if (peca != 0) doc["peca"] = String(peca);
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
  bool emMovimento = (estadoAtual == ACIONANDO_ESTEIRA || estadoAtual == ENTREGANDO_PECA);
  StaticJsonDocument<200> doc;
  doc["type"] = "esteiras";
  doc["principal"] = 1; // sempre ligada
  doc["secA"] = (emMovimento && pecaSolicitada == 1) ? 1 : 0;
  doc["secB"] = (emMovimento && pecaSolicitada == 2) ? 1 : 0;
  doc["secC"] = 0;
  serializeJson(doc, Serial);
  Serial.println();
}

// ============================================================
// RECEBIMENTO DE COMANDOS VIA SERIAL (do ESP32) — NÃO-BLOQUEANTE
// Formato: CMD:PECA:A | CMD:PECA:B | CMD:RESET
// Cenários de rejeição (importantes para o Teste 5):
//   - Peça C           → erro "peca_indisponivel" (não trava a FSM)
//   - Sistema ocupado  → erro "ocupado" (FSM fora de AGUARDANDO)
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

    if (peca == 3) {
      // Peça C não existe neste teste — rejeita graciosamente
      publicarErro("peca_indisponivel", 'C');
      return;
    }

    if (peca > 0) {
      if (estadoAtual == AGUARDANDO_PEDIDO) {
        pecaSolicitada = peca;
        publicarPedido(pecaChar);
        estadoAtual = VERIFICANDO_ESTOQUE;
      } else {
        // FSM ocupada (mesmo comportamento do código final)
        publicarErro("ocupado", pecaChar);
      }
    }
  } else if (linha.startsWith("CMD:RESET")) {
    if (estadoAtual == ERRO) {
      erroTimeout = false;
      erroSemEstoque = false;
      pecaSolicitada = 0;
      pararTodasSecundarias();
      exibirEstoque();
      publicarEstado();
      publicarEstoque();
      estadoAtual = AGUARDANDO_PEDIDO;
    }
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
      if (bufferComando.length() > 80) bufferComando = "";
    }
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(9600);

#if USE_LCD
  lcd.init();
  lcd.backlight();
  atualizarLCD("Teste 5", "Esteiras A+B");
  delay(2000);
#endif

  // Motores (IRF520 — 1 PWM por motor)
  pinMode(MOTOR_PRINCIPAL, OUTPUT);
  analogWrite(MOTOR_PRINCIPAL, 0);
  for (int i = 1; i <= NUM_PECAS; i++) {
    pinMode(PIN_MOTOR[i], OUTPUT);
    analogWrite(PIN_MOTOR[i], 0);
  }

  // Sensores
  for (int i = 1; i <= NUM_PECAS; i++) {
    pinMode(PIN_TOPO[i], INPUT_PULLUP);
    pinMode(PIN_JUNCAO[i], INPUT_PULLUP);
  }

  // Esteira principal ligada continuamente
  ligarEsteiraPrincipal();

  exibirEstoque();

  // Evento de inicialização
  StaticJsonDocument<200> doc;
  doc["type"] = "evento";
  doc["evento"] = "inicio";
  doc["msg"] = "Teste 5 - Esteiras A+B iniciado";
  doc["versao"] = "teste-ab-1.0";
  doc["driver"] = "IRF520";
  serializeJson(doc, Serial);
  Serial.println();
}

// ============================================================
// LOOP PRINCIPAL — MÁQUINA DE ESTADOS
// ============================================================
void loop() {

  // Processa comandos recebidos do ESP32 / monitor serial
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
    // Comandos chegam via Serial (processarComando)
    // ----------------------------------------------------------
    case AGUARDANDO_PEDIDO: {
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 2: VERIFICANDO ESTOQUE
    // Sensor do topo + contador interno
    // ----------------------------------------------------------
    case VERIFICANDO_ESTOQUE: {
      char nomePeca = (char)('A' + pecaSolicitada - 1);
      bool temPeca = sensorTopo(pecaSolicitada);

      if (temPeca && estoque[pecaSolicitada] > 0) {
        atualizarLCD("Separando:", "Peca " + String(nomePeca));
        publicarEstado();
        estadoAtual = ACIONANDO_ESTEIRA;
      } else {
        atualizarLCD("ERRO: Sem estoque", "Peca " + String(nomePeca));
        erroSemEstoque = true;
        publicarErro("sem_estoque", nomePeca);
        estadoAtual = ERRO;
      }
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 3: ACIONANDO ESTEIRA
    // ----------------------------------------------------------
    case ACIONANDO_ESTEIRA: {
      ligarEsteiraSecundaria(pecaSolicitada);
      tempoInicio = millis();
      publicarStatusEsteiras();
      estadoAtual = ENTREGANDO_PECA;
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 4: ENTREGANDO PEÇA (timeout 3s)
    // ----------------------------------------------------------
    case ENTREGANDO_PECA: {
      if (sensorJuncao(pecaSolicitada)) {
        pararEsteiraSecundaria(pecaSolicitada);

        estoque[pecaSolicitada]--;
        char nomePeca = (char)('A' + pecaSolicitada - 1);

        atualizarLCD("Entrega OK!",
                     String(nomePeca) + ":" + String(estoque[pecaSolicitada]));

        publicarEntrega(nomePeca);
        publicarEstoque();

        delay(1500);
        pecaSolicitada = 0;
        exibirEstoque();
        publicarEstado();
        publicarStatusEsteiras();
        estadoAtual = AGUARDANDO_PEDIDO;

      } else if (millis() - tempoInicio > TIMEOUT_ENTREGA) {
        pararTodasSecundarias();
        erroTimeout = true;
        publicarErro("timeout", (char)('A' + pecaSolicitada - 1));
        estadoAtual = ERRO;
      }
      break;
    }

    // ----------------------------------------------------------
    // ESTADO 5: ERRO — aguarda CMD:RESET
    // ----------------------------------------------------------
    case ERRO: {
      if (erroTimeout) {
        atualizarLCD("ERRO: Timeout", "Aguarde comando");
      }
      // Reset chega via processarComando() (CMD:RESET)
      break;
    }
  }
}