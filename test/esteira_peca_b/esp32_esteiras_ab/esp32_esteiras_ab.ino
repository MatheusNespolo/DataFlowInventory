// ============================================================
// TESTE 5 — DUAS ESTEIRAS (A + B) — Gateway MQTT (ESP32)
// ============================================================
// Descrição:
// Versão de teste do gateway final (esp32/gateway_mqtt).
// A lógica é a MESMA do gateway definitivo: lê JSON da Serial2
// (Arduino) e publica nos tópicos dataflow/*, recebe comandos
// do front-end via MQTT e encaminha ao Arduino via Serial2.
//
// Diferenças em relação ao gateway final:
//   - MQTT_CLIENT identificado como "dataflow-esp32-teste-ab"
//   - Comentários indicando o escopo do teste (peça C será
//     rejeitada pelo próprio Arduino com "peca_indisponivel")
//
// COMUNICAÇÃO SERIAL (compatível com Arduino Uno):
//   - Serial  (USB, 115200) → apenas logs de debug
//   - Serial2 (UART2, 9600) → comunicação com o Arduino Uno
//       ESP32 RX2 (GPIO16) ← Arduino TX (pino 1)  [via divisor de tensão!]
//       ESP32 TX2 (GPIO17) → Arduino RX (pino 0)
//
// ⚠ NÍVEL LÓGICO: use divisor de tensão (1kΩ + 2kΩ) entre o
//   TX do Uno (5V) e o RX2 do ESP32 (3,3V).
// ⚠ UPLOAD NO UNO: desconecte o ESP32 dos pinos 0/1 do Uno.
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAÇÃO SERIAL
// ============================================================
#define BAUD_DEBUG    115200
#define BAUD_ARDUINO  9600     // igual ao Serial.begin() do Uno
#define PIN_RX2       16
#define PIN_TX2       17

// ============================================================
// CONFIGURAÇÃO WI-FI
// ============================================================
const char* SSID  = "SUA_REDE_WIFI";       // ← Alterar
const char* SENHA = "SUA_SENHA_WIFI";      // ← Alterar

// ============================================================
// CONFIGURAÇÃO MQTT
//   false → broker LOCAL (Mosquitto), porta 1883, sem TLS
//   true  → broker NUVEM (HiveMQ Cloud), porta 8883, TLS
// ============================================================
#define USE_TLS false   // ← false = Mosquitto local | true = HiveMQ Cloud

#if USE_TLS
const char* MQTT_SERVER = "xxx.s1.eu.hivemq.com";  // ← Alterar
const int   MQTT_PORT   = 8883;
const char* MQTT_USER   = "seu_usuario";            // ← Alterar
const char* MQTT_PASS   = "sua_senha";              // ← Alterar
#else
const char* MQTT_SERVER = "192.168.0.10";           // ← Alterar (IP do PC com Mosquitto)
const int   MQTT_PORT   = 1883;
const char* MQTT_USER   = "";
const char* MQTT_PASS   = "";
#endif

const char* MQTT_CLIENT = "dataflow-esp32-teste-ab";

// ============================================================
// TÓPICOS MQTT (mesmos do sistema final)
// ============================================================
#define TOPICO_STATUS     "dataflow/status"
#define TOPICO_ESTOQUE    "dataflow/estoque"
#define TOPICO_EVENTOS    "dataflow/eventos"
#define TOPICO_SENSORES   "dataflow/sensores"
#define TOPICO_ESTEIRAS   "dataflow/esteiras"
#define TOPICO_CMD_SUB    "dataflow/comandos/sub"
#define TOPICO_CMD_PUB    "dataflow/comandos/pub"

// ============================================================
// LWT — LAST WILL AND TESTAMENT
// Broker publica "offline" (retained) se o ESP32 cair.
// ============================================================
#define LWT_PAYLOAD_OFFLINE "{\"type\":\"gateway\",\"status\":\"offline\"}"
#define LWT_PAYLOAD_ONLINE  "{\"type\":\"gateway\",\"status\":\"online\"}"
#define LWT_QOS     1
#define LWT_RETAIN  true

// ============================================================
// OBJETOS GLOBAIS
// ============================================================
#if USE_TLS
WiFiClientSecure espClient;
#else
WiFiClient espClient;
#endif
PubSubClient mqtt(espClient);

unsigned long ultimoReconnect = 0;
const unsigned long INTERVALO_RECONNECT = 5000;

String bufferSerial2 = "";

// ============================================================
// CONEXÃO WI-FI
// ============================================================
void conectarWiFi() {
  Serial.print("[WiFi] Conectando a: ");
  Serial.println(SSID);
  WiFi.begin(SSID, SENHA);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] Conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WiFi] Falha ao conectar. Reiniciando...");
    ESP.restart();
  }
}

// ============================================================
// CALLBACK MQTT — comandos do front-end
// Encaminha CMD:PECA:A/B/C e CMD:RESET ao Arduino.
// Obs.: no Teste 5, a peça C é rejeitada pelo Arduino,
// que publica {"evento":"erro","tipo":"peca_indisponivel"}.
// ============================================================
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String mensagem;
  mensagem.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }

  Serial.print("[MQTT ←] Topico: ");
  Serial.print(topic);
  Serial.print(" | Mensagem: ");
  Serial.println(mensagem);

  if (String(topic) == TOPICO_CMD_SUB) {
    StaticJsonDocument<200> doc;
    DeserializationError erro = deserializeJson(doc, mensagem);

    if (!erro) {
      const char* acao = doc["acao"];
      String cmdSerial = "";

      if (String(acao) == "solicitar_peca") {
        const char* peca = doc["peca"];
        cmdSerial = "CMD:PECA:" + String(peca);
      } else if (String(acao) == "reset") {
        cmdSerial = "CMD:RESET";
      }

      if (cmdSerial.length() > 0) {
        Serial2.println(cmdSerial);

        Serial.print("[Serial2 →] Comando enviado ao Arduino: ");
        Serial.println(cmdSerial);

        // Confirmação no tópico de comandos
        StaticJsonDocument<200> conf;
        conf["type"] = "comando";
        conf["acao"] = acao;
        conf["status"] = "encaminhado";
        if (doc.containsKey("peca")) {
          conf["peca"] = doc["peca"].as<const char*>();
        }
        String confStr;
        serializeJson(conf, confStr);
        mqtt.publish(TOPICO_CMD_PUB, confStr.c_str());
      }
    } else {
      Serial.print("[MQTT] Erro ao parsear comando: ");
      Serial.println(erro.c_str());
    }
  }
}

// ============================================================
// CONEXÃO MQTT (com LWT)
// ============================================================
bool conectarMQTT() {
  if (mqtt.connected()) return true;

  Serial.print("[MQTT] Conectando ao broker: ");
  Serial.println(MQTT_SERVER);

  if (mqtt.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS,
                   TOPICO_STATUS, LWT_QOS, LWT_RETAIN, LWT_PAYLOAD_OFFLINE)) {
    Serial.println("[MQTT] Conectado!");

    mqtt.subscribe(TOPICO_CMD_SUB);
    Serial.print("[MQTT] Inscrito no topico: ");
    Serial.println(TOPICO_CMD_SUB);

    mqtt.publish(TOPICO_STATUS, LWT_PAYLOAD_ONLINE, LWT_RETAIN);
    return true;
  } else {
    Serial.print("[MQTT] Falha na conexao. rc=");
    Serial.println(mqtt.state());
    return false;
  }
}

// ============================================================
// PROCESSAMENTO DE LINHA VINDA DO ARDUINO (Serial2)
// Roteia por "type" para o tópico correspondente.
// ============================================================
void processarLinhaArduino(String linha) {
  linha.trim();
  if (linha.length() == 0) return;

  if (linha.charAt(0) == '{') {
    StaticJsonDocument<512> doc;
    DeserializationError erro = deserializeJson(doc, linha);

    if (!erro) {
      const char* tipo = doc["type"];

      const char* topico = TOPICO_EVENTOS; // padrão
      if (String(tipo) == "status")        topico = TOPICO_STATUS;
      else if (String(tipo) == "estoque")  topico = TOPICO_ESTOQUE;
      else if (String(tipo) == "evento")   topico = TOPICO_EVENTOS;
      else if (String(tipo) == "sensores") topico = TOPICO_SENSORES;
      else if (String(tipo) == "esteiras") topico = TOPICO_ESTEIRAS;

      bool ok = mqtt.publish(topico, linha.c_str());

      Serial.print("[MQTT →] Tipo: ");
      Serial.print(tipo);
      Serial.print(" | Topico: ");
      Serial.print(topico);
      Serial.println(ok ? " | OK" : " | FALHA");
    } else {
      Serial.print("[Serial2] Erro JSON do Arduino: ");
      Serial.println(erro.c_str());
      Serial.print("[Serial2] Linha recebida: ");
      Serial.println(linha);
    }
  } else {
    Serial.print("[Serial2 nao-JSON]: ");
    Serial.println(linha);
  }
}

// ============================================================
// LEITURA NÃO-BLOQUEANTE DA SERIAL2
// ============================================================
void lerSerial2() {
  while (Serial2.available()) {
    char c = (char)Serial2.read();
    if (c == '\n') {
      processarLinhaArduino(bufferSerial2);
      bufferSerial2 = "";
    } else if (c != '\r') {
      bufferSerial2 += c;
      if (bufferSerial2.length() > 600) {
        bufferSerial2 = "";
      }
    }
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(BAUD_DEBUG);
  Serial2.begin(BAUD_ARDUINO, SERIAL_8N1, PIN_RX2, PIN_TX2);

  Serial.println();
  Serial.println("=== Teste 5 — Esteiras A+B — Gateway ESP32 ===");

  conectarWiFi();

#if USE_TLS
  espClient.setInsecure(); // protótipo; em produção use setCACert()
#endif

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(callbackMQTT);
  mqtt.setBufferSize(1024);

  conectarMQTT();

  Serial.println("[Setup] Gateway de teste (A+B) iniciado.");
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Desconectado. Reconectando...");
    conectarWiFi();
  }

  if (!mqtt.connected()) {
    unsigned long agora = millis();
    if (agora - ultimoReconnect >= INTERVALO_RECONNECT) {
      ultimoReconnect = agora;
      conectarMQTT();
    }
  }

  mqtt.loop();
  lerSerial2();
}