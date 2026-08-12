// ============================================================
// TESTE 1.1 — ACIONAMENTO DO MOTOR VIA IRF520 (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + módulo IRF520 + 1 esteira
//
// Pinagem IRF520:
//   VCC  → 5V (Arduino)
//   GND  → GND (Arduino)
//   SIG  → Pino PWM do Arduino
//   V+   → Fonte do motor (ex: 5V-12V)
//
// Este teste:
//   1. Liga o motor por 3 segundos (velocidade máxima)
//   2. Desliga por 1 segundo
//   3. Liga a 50% por 3 segundos
//   4. Desliga por 1 segundo
//   5. Repete o ciclo
//
// Validação:
//   - O LED do IRF520 acende quando o motor está ligado
//   - A esteira gira em ambas as velocidades
//   - A mudança de velocidade é perceptível
// ============================================================

#define MOTOR_A_PWM 3   // Pino PWM para IRF520 (pino SIG)

void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_A_PWM, OUTPUT);

  delay(1000);
  Serial.println("=== TESTE 1.1: MOTOR VIA IRF520 ===");
  Serial.println("Ciclo: 3s max -> 1s off -> 3s 50% -> 1s off");
}

void loop() {
  // Velocidade máxima (PWM 255)
  Serial.println("[MOTOR] Ligando - Velocidade MAX (PWM 255)");
  analogWrite(MOTOR_A_PWM, 255);
  delay(3000);

  // Desliga
  Serial.println("[MOTOR] Desligando");
  analogWrite(MOTOR_A_PWM, 0);
  delay(1000);

  // Velocidade 50% (PWM 128)
  Serial.println("[MOTOR] Ligando - Velocidade 50% (PWM 128)");
  analogWrite(MOTOR_A_PWM, 128);
  delay(3000);

  // Desliga
  Serial.println("[MOTOR] Desligando");
  analogWrite(MOTOR_A_PWM, 0);
  delay(1000);

  Serial.println("[MOTOR] Ciclo completo. Reiniciando...");
}