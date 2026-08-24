// ============================================================
// TESTE 1 (Bloco 0.A) - COMUNICACAO SERIAL Arduino <-> ESP32
// ============================================================
// Materiais: Arduino Uno + ESP32 (conectados via Serial2)
//
// Este sketch e SO SERIAL, SEM Wi-Fi/MQTT: isola a variavel da
// comunicacao fisica UART antes de habilitar a rede (Bloco 0.B,
// que usa o esp32/gateway_mqtt/gateway_mqtt.ino completo).
//
// Pinagem:
//   Arduino TX (pino 1) -> divisor de tensao (1k/2k) -> ESP32 RX2 (GPIO16)
//   ESP32 TX2 (GPIO17)  -> Arduino RX (pino 0)                 [direto]
//   GND comum obrigatorio
//   Baud: 9600 na Serial2 (igual ao Arduino) / 115200 no monitor USB
//
// Uso:
//   1. Upload no Uno (ESP32 desconectado dos pinos 0/1) -> upload neste ESP32
//   2. Conectar a fiacao (ver docs/testes/roteiros/roteiro_teste_2026-08-25.md)
//   3. Abrir o Monitor Serial do ESP32 em 115200
//   4. JSONs do Arduino aparecem prefixados com "[Serial2]"
//   5. Digite qualquer texto no monitor e pressione Enter para enviar
//      "CMD:PECA:A" ao Arduino e validar o caminho ESP32 -> Uno
// ============================================================

#define BAUD_ARDUINO 9600
#define PIN_RX2 16
#define PIN_TX2 17

String bufferSerial2 = "";

void setup() {
  Serial.begin(115200);
  Serial2.begin(BAUD_ARDUINO, SERIAL_8N1, PIN_RX2, PIN_TX2);
  delay(500);
  Serial.println();
  Serial.println("=== Teste 1 (Bloco 0.A): Serial Arduino <-> ESP32 (sem Wi-Fi) ===");
  Serial.println("Digite qualquer texto + Enter para enviar CMD:PECA:A ao Arduino.");
}

void loop() {
  // Arduino -> ESP32
  while (Serial2.available()) {
    char c = (char)Serial2.read();
    if (c == '\n') {
      bufferSerial2.trim();
      if (bufferSerial2.length() > 0) {
        Serial.print("[Serial2] ");
        Serial.println(bufferSerial2);
      }
      bufferSerial2 = "";
    } else if (c != '\r') {
      bufferSerial2 += c;
    }
  }

  // Monitor USB do ESP32 -> Arduino: dispara comando de teste
  if (Serial.available()) {
    String linha = Serial.readStringUntil('\n');
    linha.trim();
    if (linha.length() > 0) {
      Serial2.println("CMD:PECA:A");
      Serial.println("[Serial2 ->] CMD:PECA:A");
    }
  }
}
