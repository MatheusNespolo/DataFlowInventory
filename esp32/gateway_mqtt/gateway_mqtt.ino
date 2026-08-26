// ============================================================
// DATA FLOW INVENTORY — Gateway MQTT (ESP32)
// SENAI São Caetano do Sul — Engenharia de Controle e Automação
// ============================================================
// Descrição:
// Ponte de comunicação entre o Arduino Uno e o broker MQTT (HiveMQ Cloud).
// Lê mensagens JSON da Serial2 (Arduino) e publica nos tópicos MQTT.
// Inscreve-se em tópicos de comando e encaminha para o Arduino via Serial2.
//
// COMUNICAÇÃO SERIAL (compatível com Arduino Uno):
//   - Serial  (USB, 115200) → apenas logs de debug no monitor serial
//   - Serial2 (UART2, 9600) → comunicação com o Arduino Uno
//       ESP32 RX2 (GPIO16) ← Arduino TX (pino 1)  [via divisor de tensão!]
//       ESP32 TX2 (GPIO17) → Arduino RX (pino 0)
//
// ⚠ ATENÇÃO — NÍVEL LÓGICO:
//   O Arduino Uno opera em 5V e o ESP32 em 3,3V.
//   Use um divisor de tensão (ex.: 1kΩ + 2kΩ) entre o TX do Uno
//   e o RX2 do ESP32 para não danificar o ESP32.
//   O TX do ESP32 (3,3V) pode ir direto ao RX do Uno.
//
// ⚠ ATENÇÃO — UPLOAD NO UNO:
//   O Uno usa os pinos 0/1 (RX/TX) tanto para USB quanto para o ESP32.
//   Desconecte o ESP32 dos pinos 0/1 durante o upload do sketch no Uno.
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAÇÃO SERIAL
// ============================================================
#define BAUD_DEBUG    115200   // Serial USB (monitor serial / debug)
#define BAUD_ARDUINO  9600     // Serial2 — deve ser IGUAL ao Serial.begin() do Uno
#define PIN_RX2       16       // ESP32 RX2 ← Arduino TX (via divisor de tensão)
#define PIN_TX2       17       // ESP32 TX2 → Arduino RX

// ============================================================
// CONFIGURAÇÃO WI-FI
// ============================================================
const char* SSID  = "MATHEUSN-NB01 7089";       // ← Alterar
const char* SENHA = "v3(448T1";      // ← Alterar

// ============================================================
// CONFIGURAÇÃO MQTT
// ============================================================
// USE_TLS seleciona o modo de conexão com o broker:
//   false → broker LOCAL (Mosquitto), porta 1883, sem criptografia
//   true  → broker NUVEM (HiveMQ Cloud), porta 8883, TLS
//
// Broker local (teste): MQTT_SERVER = IP do PC rodando o Mosquitto
//   (obter com `ipconfig`; ESP32 e PC na MESMA rede Wi-Fi).
//   Deixe MQTT_USER/MQTT_PASS vazios se allow_anonymous true.
// Broker nuvem: MQTT_SERVER = URL do cluster HiveMQ Cloud.
// ============================================================
#define USE_TLS false   // ← false = Mosquitto local | true = HiveMQ Cloud

#if USE_TLS
const char* MQTT_SERVER = "xxx.s1.eu.hivemq.com";  // ← Alterar (URL do cluster HiveMQ Cloud)
const int   MQTT_PORT   = 8883;                     // Porta TLS
const char* MQTT_USER   = "seu_usuario";            // ← Alterar
const char* MQTT_PASS   = "sua_senha";              // ← Alterar
#else
const char* MQTT_SERVER = "10.84.23.136";           // ← Alterar (IP do PC com Mosquitto — ipconfig)
const int   MQTT_PORT   = 1883;                     // Porta padrão sem TLS
const char* MQTT_USER   = "";                       // vazio = sem autenticação
const char* MQTT_PASS   = "";
#endif

const char* MQTT_CLIENT = "dataflow-esp32-gateway";

// ============================================================
// TÓPICOS MQTT
// ============================================================
#define TOPICO_STATUS     "dataflow/status"
#define TOPICO_ESTOQUE    "dataflow/estoque"
#define TOPICO_EVENTOS    "dataflow/eventos"
#define TOPICO_SENSORES   "dataflow/sensores"
#define TOPICO_ESTEIRAS   "dataflow/esteiras"
#define TOPICO_CMD_SUB    "dataflow/comandos/sub"   // ESP32 inscreve (recebe do front-end)
#define TOPICO_CMD_PUB    "dataflow/comandos/pub"   // ESP32 publica (confirmações)

// ============================================================
// LWT — LAST WILL AND TESTAMENT (testamento MQTT)
// ============================================================
// O LWT é uma mensagem que o BROKER publica automaticamente
// quando o ESP32 cai (queda de energia, Wi-Fi, travamento),
// sem depender de qualquer código rodando no ESP32.
// Com isso, o dashboard consegue detectar "hardware offline"
// em tempo real — valor agregado de confiabilidade do sistema.
// As mensagens são RETAINED: um cliente que conectar depois
// recebe imediatamente o último estado conhecido do gateway.
// ============================================================
#define LWT_PAYLOAD_OFFLINE "{\"type\":\"gateway\",\"status\":\"offline\"}"
#define LWT_PAYLOAD_ONLINE  "{\"type\":\"gateway\",\"status\":\"online\"}"
#define LWT_QOS     1     // Garante entrega ao broker pelo menos 1 vez
#define LWT_RETAIN  true  // Broker guarda a última mensagem do tópico

// ============================================================
// OBJETOS GLOBAIS
// ============================================================
#if USE_TLS
WiFiClientSecure espClient;   // Cliente TLS (obrigatório para porta 8883 / HiveMQ Cloud)
#else
WiFiClient espClient;         // Cliente simples (broker local, porta 1883)
#endif
PubSubClient mqtt(espClient);

unsigned long ultimoReconnect = 0;
const unsigned long INTERVALO_RECONNECT = 5000; // 5 segundos

// Buffer de linha para leitura não-bloqueante da Serial2
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
// CALLBACK MQTT — Mensagens recebidas
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

  // Se recebeu comando do front-end, encaminha para o Arduino
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
        // Encaminha o comando ao Arduino Uno (Serial2)
        Serial2.println(cmdSerial);

        Serial.print("[Serial2 →] Comando enviado ao Arduino: ");
        Serial.println(cmdSerial);

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
      Serial.print("[MQTT] Erro ao parsear comando: ");
      Serial.println(erro.c_str());
    }
  }
}

// ============================================================
// CONEXÃO MQTT
// ============================================================
bool conectarMQTT() {
  if (mqtt.connected()) return true;

  Serial.print("[MQTT] Conectando ao broker: ");
  Serial.println(MQTT_SERVER);

  // Conecta registrando o LWT no broker:
  //   se o ESP32 cair, o broker publica LWT_PAYLOAD_OFFLINE
  //   (retained) em TOPICO_STATUS automaticamente.
  // Assinatura: connect(clientID, user, pass, willTopic, willQoS, willRetain, willMessage)
  if (mqtt.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS,
                   TOPICO_STATUS, LWT_QOS, LWT_RETAIN, LWT_PAYLOAD_OFFLINE)) {
    Serial.println("[MQTT] Conectado!");

    // Inscreve nos tópicos de comando
    mqtt.subscribe(TOPICO_CMD_SUB);
    Serial.print("[MQTT] Inscrito no topico: ");
    Serial.println(TOPICO_CMD_SUB);

    // Publica "online" (retained) — sobrescreve o eventual
    // "offline" deixado pelo LWT em uma queda anterior.
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
// ============================================================
void processarLinhaArduino(String linha) {
  linha.trim();
  if (linha.length() == 0) return;

  // Verifica se é JSON válido
  if (linha.charAt(0) == '{') {
    StaticJsonDocument<512> doc;
    DeserializationError erro = deserializeJson(doc, linha);

    if (!erro) {
      const char* tipo = doc["type"];

      // Roteamento por tipo de mensagem
      const char* topico = TOPICO_EVENTOS; // padrão: eventos
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
    // Não é JSON — apenas log de debug do Arduino
    Serial.print("[Serial2 nao-JSON]: ");
    Serial.println(linha);
  }
}

// ============================================================
// LEITURA NÃO-BLOQUEANTE DA SERIAL2
// Acumula caracteres até encontrar '\n' e processa a linha.
// Evita perder mensagens quando o Arduino publica em rajada.
// ============================================================
void lerSerial2() {
  while (Serial2.available()) {
    char c = (char)Serial2.read();
    if (c == '\n') {
      processarLinhaArduino(bufferSerial2);
      bufferSerial2 = "";
    } else if (c != '\r') {
      bufferSerial2 += c;
      // Proteção contra linhas muito longas / lixo na serial
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
  // Serial USB — apenas debug
  Serial.begin(BAUD_DEBUG);

  // Serial2 — comunicação com Arduino Uno (9600, igual ao Uno)
  Serial2.begin(BAUD_ARDUINO, SERIAL_8N1, PIN_RX2, PIN_TX2);

  Serial.println();
  Serial.println("=== Data Flow Inventory — Gateway ESP32 ===");

  // Configura Wi-Fi
  conectarWiFi();

#if USE_TLS
  // TLS: aceita o certificado do broker sem validação de CA
  // (adequado para protótipo; em produção, use setCACert() com o
  //  certificado raiz ISRG Root X1 do HiveMQ Cloud)
  espClient.setInsecure();
#endif

  // Configura MQTT
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(callbackMQTT);
  mqtt.setBufferSize(1024); // Buffer maior para mensagens JSON

  // Conecta ao MQTT
  conectarMQTT();

  Serial.println("[Setup] Gateway ESP32 iniciado.");
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================
void loop() {
  // Mantém Wi-Fi conectado
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Desconectado. Reconectando...");
    conectarWiFi();
  }

  // Mantém MQTT conectado (com intervalo entre tentativas)
  if (!mqtt.connected()) {
    unsigned long agora = millis();
    if (agora - ultimoReconnect >= INTERVALO_RECONNECT) {
      ultimoReconnect = agora;
      conectarMQTT();
    }
  }

  mqtt.loop();

  // Lê mensagens do Arduino Uno (Serial2) e publica no MQTT
  lerSerial2();
}