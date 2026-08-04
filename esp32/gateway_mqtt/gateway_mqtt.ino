// ============================================================
// DATA FLOW INVENTORY — Gateway MQTT (ESP32)
// SENAI São Caetano do Sul — Engenharia de Controle e Automação
// ============================================================
// Descrição:
// Ponte de comunicação entre o Arduino Mega e o broker MQTT (HiveMQ Cloud).
// Lê mensagens JSON da Serial (Arduino) e publica nos tópicos MQTT.
// Inscreve-se em tópicos de comando e encaminha para o Arduino via Serial.
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAÇÃO WI-FI
// ============================================================
const char* SSID = "SUA_REDE_WIFI";       // ← Alterar
const char* SENHA = "SUA_SENHA_WIFI";     // ← Alterar

// ============================================================
// CONFIGURAÇÃO MQTT (HiveMQ Cloud)
// ============================================================
const char* MQTT_SERVER   = "xxx.s1.eu.hivemq.com";  // ← Alterar (URL do seu cluster HiveMQ Cloud)
const int   MQTT_PORT     = 8883;                       // Porta TLS
const char* MQTT_USER     = "seu_usuario";             // ← Alterar
const char* MQTT_PASS     = "sua_senha";               // ← Alterar
const char* MQTT_CLIENT   = "dataflow-esp32-gateway";

// ============================================================
// TÓPICOS MQTT
// ============================================================
#define TOPICO_STATUS     "dataflow/status"
#define TOPICO_ESTOQUE    "dataflow/estoque"
#define TOPICO_EVENTOS    "dataflow/eventos"
#define TOPICO_SENSORES   "dataflow/sensores"
#define TOPICO_ESTEIRAS   "dataflow/esteiras"
#define TOPICO_CMD_SUB    "dataflow/comandos/sub"   // ESP32 inscreve (recebe do front-end)
#define TOPICO_CMD_PUB    "dataflow/comandos/pub"   // ESP32 publica (encaminha ao Arduino)

// ============================================================
// OBJETOS GLOBAIS
// ============================================================
WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long ultimoReconnect = 0;
const unsigned long INTERVALO_RECONNECT = 5000; // 5 segundos

// ============================================================
// CONEXÃO WI-FI
// ============================================================
void conectarWiFi() {
  Serial.print("Conectando ao Wi-Fi: ");
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
    Serial.print("Wi-Fi conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Falha ao conectar no Wi-Fi. Reiniciando...");
    ESP.restart();
  }
}

// ============================================================
// CALLBACK MQTT — Mensagens recebidas
// ============================================================
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String mensagem;
  for (unsigned int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }

  Serial.print("[MQTT Recebido] Topico: ");
  Serial.print(topic);
  Serial.print(" | Mensagem: ");
  Serial.println(mensagem);

  // Se receveu comando do front-end, encaminha para o Arduino
  if (String(topic) == TOPICO_CMD_SUB) {
    // Parseia o JSON recebido
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
        Serial.println(cmdSerial);
        Serial.println();

        // Confirma recebimento no tópico de comandos
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
      Serial.println("Erro ao parsear comando MQTT:");
      Serial.println(erro.c_str());
    }
  }
}

// ============================================================
// CONEXÃO MQTT
// ============================================================
bool conectarMQTT() {
  if (mqtt.connected()) return true;

  Serial.print("Conectando ao MQTT broker: ");
  Serial.println(MQTT_SERVER);

  if (mqtt.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS)) {
    Serial.println("MQTT conectado!");

    // Inscreve nos tópicos de comando
    mqtt.subscribe(TOPICO_CMD_SUB);
    Serial.print("Inscrito no topico: ");
    Serial.println(TOPICO_CMD_SUB);

    // Publica mensagem de online
    mqtt.publish(TOPICO_STATUS, "{\"type\":\"gateway\",\"status\":\"online\"}");

    return true;
  } else {
    Serial.print("Falha na conexao MQTT. rc=");
    Serial.println(mqtt.state());
    return false;
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(9600); // Comunicação com Arduino Mega

  // Configura Wi-Fi
  conectarWiFi();

  // Configura MQTT
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(callbackMQTT);
  mqtt.setBufferSize(1024); // Buffer maior para mensagens JSON

  // Conecta ao MQTT
  conectarMQTT();

  Serial.println("Gateway ESP32 iniciado.");
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================
void loop() {
  // Mantém Wi-Fi conectado
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desconectado. Reconectando...");
    conectarWiFi();
  }

  // Mantém MQTT conectado
  if (!mqtt.connected()) {
    unsigned long agora = millis();
    if (agora - ultimoReconnect >= INTERVALO_RECONNECT) {
      ultimoReconnect = agora;
      conectarMQTT();
    }
  }

  mqtt.loop();

  // ============================================================
  // LEITURA SERIAL — Mensagens do Arduino Mega
  // ============================================================
  if (Serial.available()) {
    String linha = Serial.readStringUntil('\n');
    linha.trim();

    if (linha.length() == 0) return;

    // Verifica se é JSON válido
    if (linha.charAt(0) == '{') {
      StaticJsonDocument<512> doc;
      DeserializationError erro = deserializeJson(doc, linha);

      if (!erro) {
        const char* tipo = doc["type"];

        // Roteamento por tipo de mensagem
        if (String(tipo) == "status") {
          mqtt.publish(TOPICO_STATUS, linha.c_str());
        }
        else if (String(tipo) == "estoque") {
          mqtt.publish(TOPICO_ESTOQUE, linha.c_str());
        }
        else if (String(tipo) == "evento") {
          mqtt.publish(TOPICO_EVENTOS, linha.c_str());
        }
        else if (String(tipo) == "sensores") {
          mqtt.publish(TOPICO_SENSORES, linha.c_str());
        }
        else if (String(tipo) == "esteiras") {
          mqtt.publish(TOPICO_ESTEIRAS, linha.c_str());
        }
        else {
          // Tipo desconhecido, publica nos eventos
          mqtt.publish(TOPICO_EVENTOS, linha.c_str());
        }

        Serial.print("[MQTT Publicado] Tipo: ");
        Serial.println(tipo);
      } else {
        Serial.print("Erro JSON do Arduino: ");
        Serial.println(erro.c_str());
        Serial.print("Linha recebida: ");
        Serial.println(linha);
      }
    } else {
      // Não é JSON — log apenas (comando direto do Arduino ou debug)
      Serial.print("[Serial nao-JSON]: ");
      Serial.println(linha);
    }
  }
}