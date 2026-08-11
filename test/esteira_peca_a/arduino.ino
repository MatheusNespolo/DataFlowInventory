// ============================================================
// TESTE 0.1 — SETUP BÁSICO (Arduino Uno)
// ============================================================
// Verifica upload e comunicação Serial.
// O LED built-in (pino 13) pisca a cada 1 segundo.
// Mensagem de status é enviada pela Serial a cada 2 segundos.
// ============================================================

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);

  delay(1000);
  Serial.println("=== TESTE 0.1: SETUP BASICO ===");
  Serial.println("Upload OK. LED piscando + Serial ativa.");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}