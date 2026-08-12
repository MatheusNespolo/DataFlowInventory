// ============================================================
// TESTE 4.1 - ESP32 GATEWAY (Arduino Uno + ESP32)
// ============================================================
// Materiais: ESP32 + Arduino Uno (conectados via Serial)
//
// Pinagem:
//   ESP32 TX (17) -> Arduino RX (0)
//   ESP32 RX (16) -> Arduino TX (1)
//   GND comum
//
// Este ESP32:
//   1. Conecta ao Wi-Fi e ao broker MQTT (HiveMQ)
//   2. Recebe JSON do Arduino pela Serial2
//   3. Publica no broker MQTT (topico dataflow/status)
//   4. Escuta comandos MQTT e retransmite ao Arduino
//
// NOTA: Substitua SSID, SENHA, MQTT_SERVER pelas suas credenciais
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* SSID = "Iphone de Matheus";
const char* SENHA = "matheus22";
const char* MQTT_SERVER = "282b6bee608949f68d1717e96b4be31e.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_CLIENT = "esp32_dataflow_teste";

#define TOPICO_STATUS "dataflow/status"
#define TOPICO_CMD_SUB "dataflow/comandos/sub"
#define TOPICO_CMD_PUB "dataflow/comandos/pub"

WiFiClient espClient;
PubSubClient mqtt(espClient);

void conectarWiFi() {
  Serial.println("Conectando ao Wi-Fi...");
  WiFi.begin(SSID, SENHA);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi conectado!");
}

void conectarMQTT() {
  while (!mqtt.connected()) {
    if (mqtt.connect(MQTT_CLIENT)) {
      Serial.println("MQTT conectado.");
      mqtt.subscribe(TOPICO_CMD_SUB);
    } else {
      Serial.print("Falha MQTT. Retry...");
      delay(2000);
    }
  }
}

void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.printf("[MQTT -> Serial] %s\n", msg.c_str());
  Serial.println(msg);
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 17);
  conectarWiFi();
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(callbackMQTT);
}

void loop() {
  if (!mqtt.connected()) {
    conectarMQTT();
  }
  mqtt.loop();

  if (Serial2.available()) {
    String dados = Serial2.readStringUntil('\n');
    dados.trim();
    if (dados.length() > 0) {
      mqtt.publish(TOPICO_STATUS, dados.c_str());
      Serial.printf("[Serial -> MQTT] %s\n", dados.c_str());
    }
  }
}
