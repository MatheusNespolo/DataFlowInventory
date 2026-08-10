// ============================================================
// TESTE: ESTEIRA PEÇA A — CÓDIGO REDUZIDO (ESP32)
// ============================================================
// Descrição:
// Retransmite comandos e publica eventos para testes apenas
// da Peça A, respondendo "sem estoque" para as demais peças.
// Comunicação com Arduino via Serial2 e broker MQTT.
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Configuração Wi-Fi (substitua pelos dados da sua rede)
const char* SSID = "SUA_REDE_WIFI";
const char* SENHA = "SUA_SENHA_WIFI";

// Configuração MQTT (substitua pelos dados do seu broker)
const char* MQTT_SERVER = "192.168.0.100";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT = "esp32_teste_peca_a";

// Tópicos MQTT
#define TOPICO_CMD_SUB "dataflow/comandos/sub"
#define TOPICO_CMD_PUB "dataflow/comandos/pub"

// Globais
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
  Serial.println("Conectando ao broker MQTT...");
  while (!mqtt.connected()) {
    if (mqtt.connect(MQTT_CLIENT)) {
      Serial.println("MQTT conectado.");
      mqtt.subscribe(TOPICO_CMD_SUB);
    } else {
      Serial.print("Falha ao conectar no broker. Tentando novamente...");
      delay(2000);
    }
  }
}

void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String mensagem = "";
  for (unsigned int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }

  Serial.printf("[MQTT Recebido] Topico: %s | Mensagem: %s\n", topic, mensagem.c_str());

  StaticJsonDocument<200> doc;
  DeserializationError erro = deserializeJson(doc, mensagem);

  if (!erro) {
    const char* acao = doc["acao"];
    const char* peca = doc["peca"];
    String comandoSerial = "";

    if (String(peca) == "A" && String(acao) == "solicitar_peca") {
      comandoSerial = "CMD:PECA:A";
    } else {
      StaticJsonDocument<200> resposta;
      resposta["type"] = "erro";
      resposta["msg"] = "sem_estoque";
      String respostaStr;
      serializeJson(resposta, respostaStr);
      mqtt.publish(TOPICO_CMD_PUB, respostaStr.c_str());
      return;
    }

    if (comandoSerial != "") {
      Serial2.println(comandoSerial);
      Serial.printf("[Serial2 → Arduino] %s\n", comandoSerial.c_str());
    }
  } else {
    Serial.println("Erro ao parsear JSON recebido.");
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600);

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
    String respostaArduino = Serial2.readStringUntil('\n');
    respostaArduino.trim();
    mqtt.publish(TOPICO_CMD_PUB, respostaArduino.c_str());
    Serial.printf("[Arduino → MQTT] %s\n", respostaArduino.c_str());
  }
}