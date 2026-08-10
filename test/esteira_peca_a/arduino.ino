// ============================================================
// TESTE: ESTEIRA PEÇA A — CÓDIGO REDUZIDO (Arduino)
// ============================================================
// Descrição:
// Controla apenas o fluxo da Peça A e responde "sem estoque"
// para qualquer outra peça. Comunicação com ESP32 via Serial.
// ============================================================

#include <ArduinoJson.h>

// Definições de pinos, constantes e estados
#define MOTOR_A_ENA 5
#define MOTOR_A_IN1 6
#define MOTOR_A_IN2 7

int estoque[2] = {0, 5}; // [0: vazio, 1: Peça A]
int pecaSolicitada = 0;

void ligarMotorA() {
  digitalWrite(MOTOR_A_IN1, HIGH);
  digitalWrite(MOTOR_A_IN2, LOW);
  analogWrite(MOTOR_A_ENA, 200); // Velocidade
}

void pararMotorA() {
  digitalWrite(MOTOR_A_IN1, LOW);
  digitalWrite(MOTOR_A_IN2, LOW);
  analogWrite(MOTOR_A_ENA, 0);
}

void publicarEstado() {
  StaticJsonDocument<200> doc;
  doc["type"] = "estado";
  doc["estoqueA"] = estoque[1];
  serializeJson(doc, Serial);
  Serial.println();
}

void processarComando(String cmd) {
  if (cmd.startsWith("CMD:PECA:A")) {
    if (estoque[1] > 0) {
      ligarMotorA();
      delay(1500); // Simula transporte
      pararMotorA();
      estoque[1]--;
      publicarEstado();
    } else {
      publicarErro("sem_estoque");
    }
  } else {
    publicarErro("sem_estoque");
  }
}

void publicarErro(const char* erro) {
  StaticJsonDocument<200> doc;
  doc["type"] = "erro";
  doc["msg"] = erro;
  serializeJson(doc, Serial);
  Serial.println();
}

void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_A_ENA, OUTPUT);
  pinMode(MOTOR_A_IN1, OUTPUT);
  pinMode(MOTOR_A_IN2, OUTPUT);
}

void loop() {
  if (Serial.available()) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();
    processarComando(comando);
  }
}