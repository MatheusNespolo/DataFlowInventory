// ============================================================
// TESTE 3.1 - INTEGRACAO MOTOR + SENSOR (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + 1 IRF520 + 1 esteira + 1 sensor TCRT5000
//
// Pinagem:
//   IRF520 SIG -> Pino 3 (PWM)
//   TCRT5000 Collector -> Pino 2 (INPUT_PULLUP)
//
// Maquina de estados simplificada:
//   0: AGUARDANDO  - Aguarda comando via Serial
//   1: ACIONANDO   - Liga motor, aguarda sensor
//   2: ENTREGUE    - Peca chegou, para motor
//   3: ERRO        - Timeout 5s, para motor
//
// Para testar: enviar pela Serial:
//   CMD:PECA:A  -> Solicita peca A
// ============================================================

#define MOTOR_A_PWM 3
#define SENSOR_TOPO_A 2
#define TIMEOUT_ENTREGA 5000

enum Estado { AGUARDANDO, ACIONANDO, ENTREGUE, ERRO };
Estado estadoAtual = AGUARDANDO;
unsigned long tempoInicio = 0;

void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_A_PWM, OUTPUT);
  pinMode(SENSOR_TOPO_A, INPUT_PULLUP);
  delay(1000);
  Serial.println("=== TESTE 3.1: INTEGRACAO MOTOR + SENSOR ===");
  Serial.println("Enviar CMD:PECA:A pela Serial para iniciar.");
  analogWrite(MOTOR_A_PWM, 0);
}

void loop() {
  switch (estadoAtual) {
    case AGUARDANDO: {
      if (Serial.available()) {
        String cmd = Serial.readStringUntil('\\n');
        cmd.trim();
        if (cmd == "CMD:PECA:A") {
          Serial.println("[INT] Comando recebido. Verificando estoque...");
          if (digitalRead(SENSOR_TOPO_A) == LOW) {
            Serial.println("[INT] Peca detectada no topo. Acionando motor...");
            analogWrite(MOTOR_A_PWM, 200);
            tempoInicio = millis();
            estadoAtual = ACIONANDO;
          } else {
            Serial.println("[INT] ERRO: Sem peca no topo!");
            estadoAtual = ERRO;
          }
        }
      }
      break;
    }
    case ACIONANDO: {
      if (millis() - tempoInicio > TIMEOUT_ENTREGA) {
        Serial.println("[INT] ERRO: Timeout na entrega!");
        analogWrite(MOTOR_A_PWM, 0);
        estadoAtual = ERRO;
      }
      break;
    }
    case ENTREGUE: {
      break;
    }
    case ERRO: {
      Serial.println("[INT] Em erro. Aguardando reset...");
      delay(3000);
      analogWrite(MOTOR_A_PWM, 0);
      Serial.println("[INT] Reset. Aguardando comando.");
      estadoAtual = AGUARDANDO;
      break;
    }
  }
}
