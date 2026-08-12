// ============================================================
// TESTE 4.1 - COMUNICACAO SERIAL (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + ESP32 (conectados via Serial)
//
// Pinagem:
//   Arduino TX (1) -> ESP32 RX (16)
//   Arduino RX (0) -> ESP32 TX (17)
//   GND comum
//
// Este teste:
//   1. Arduino envia JSON de status a cada 2s
//   2. Arduino recebe comandos via Serial
//
// NOTA: Desconectar ESP32 ao fazer upload!
//
// Formato enviado:
//   {"type":"status","estado":"AGUARDANDO","estoqueA":5}
// ============================================================

#define MOTOR_A_PWM 3
#define SENSOR_TOPO_A 4

unsigned long ultimaPublicacao = 0;
const unsigned long INTERVALO = 2000;

void publicarStatus() {
  int sensorVal = digitalRead(SENSOR_TOPO_A);
  int estoqueA = (sensorVal == LOW) ? 5 : 0;
  Serial.print("{\"type\":\"status\",\"estado\":\"AGUARDANDO\",\"estoqueA\":");
  Serial.print(estoqueA);
  Serial.println("}");
}

void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_A_PWM, OUTPUT);
  pinMode(SENSOR_TOPO_A, INPUT_PULLUP);
  delay(1000);
  Serial.println("=== TESTE 4.1: COMUNICACAO SERIAL ===");
}

void loop() {
  if (millis() - ultimaPublicacao >= INTERVALO) {
    publicarStatus();
    ultimaPublicacao = millis();
  }

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    Serial.print("[RECEBIDO] ");
    Serial.println(cmd);

    if (cmd == "CMD:PECA:A") {
      Serial.println("{\"type\":\"acao\",\"acao\":\"acionar_A\"}");
      analogWrite(MOTOR_A_PWM, 200);
      delay(3000);
      analogWrite(MOTOR_A_PWM, 0);
      Serial.println("{\"type\":\"evento\",\"evento\":\"entrega_A\"}");
    }
  }
}
