// ============================================================
// TESTE 2.1 - SENSOR IR TCRT5000 (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + 1 sensor TCRT5000
//
// Pinagem TCRT5000:
//   VCC  -> 5V (Arduino)
//   GND  -> GND (Arduino)
//   Collector (OUTPUT) -> Pino digital com INPUT_PULLUP
//
// Este teste:
//   1. Le o sensor continuamente
//   2. Imprime PEC quando detecta peca
//   3. Imprime VAZIO quando nao detecta
//
// Validacao:
//   - Posicionar/remover peca sobre o sensor
//   - Serial deve alternar entre PEC e VAZIO corretamente
// ============================================================

#define SENSOR_TOPO_A 2

void setup() {
  Serial.begin(9600);
  pinMode(SENSOR_TOPO_A, INPUT_PULLUP);
  delay(1000);
  Serial.println("=== TESTE 2.1: SENSOR TCRT5000 ===");
  Serial.println("Posicione uma peca sobre o sensor...");
  Serial.println();
}

void loop() {
  int leitura = digitalRead(SENSOR_TOPO_A);
  if (leitura == LOW) {
    Serial.println("[SENSOR] PEC detectada! (LOW)");
  } else {
    Serial.println("[SENSOR] VAZIO (HIGH)");
  }
  delay(500);
}
