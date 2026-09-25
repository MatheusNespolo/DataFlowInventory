// ============================================================
// DATA FLOW INVENTORY — Teste de Conectividade MQTT Cloud
// ============================================================
// Sketch standalone para validar conexão ESP32 <-> Broker MQTT
// (HiveMQ Cloud ou local Mosquitto).
//
// USO:
//   1. Conectar ESP32 na USB (sem Arduino/esteiras conectados)
//   2. Abrir Serial Monitor (115200 baud)
//   3. Observar as mensagens de diagnóstico
//   4. Se falha: seguir o roteiro em
//      docs/testes/validações/troubleshooting_bancada_22-23_09.md
//
// CONFIGURAÇÕES em secrets.h (mesmo arquivo do gateway principal):
//   - USE_TLS: false = Mosquitto local (1883)
//              true  = HiveMQ Cloud    (8883)
//   - Credenciais Wi-Fi e MQTT
//
// ⚠ IMPORTANTE: Este sketch NÃO altera o gateway_mqtt.ino
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "secrets.h"

// ============================================================
// CONFIGURAÇÃO DO TESTE
// ============================================================
// ALTERE AQUI para escolher o broker:
#define USE_TLS false   // <- false = Mosquitto local | true = HiveMQ Cloud

// Configurações fixas
const char* SSID  = SECRET_WIFI_SSID;
const char* SENHA = SECRET_WIFI_PASS;

#if USE_TLS
  const char* MQTT_SERVER = SECRET_MQTT_SERVER_CLOUD;
  const int   MQTT_PORT   = 8883;
  const char* MQTT_USER   = SECRET_MQTT_USER_CLOUD;
  const char* MQTT_PASS   = SECRET_MQTT_PASS_CLOUD;
#else
  const char* MQTT_SERVER = SECRET_MQTT_SERVER_LOCAL;
  const int   MQTT_PORT   = 1883;
  const char* MQTT_USER   = SECRET_MQTT_USER_LOCAL;
  const char* MQTT_PASS   = SECRET_MQTT_PASS_LOCAL;
#endif

const char* MQTT_CLIENT = "dataflow-esp32-test-mqtt";

// Tópicos para teste
const char* TOPICO_TEST   = "dataflow/test";
const char* TOPICO_STATUS = "dataflow/status";

// Objeto MQTT
#if USE_TLS
  WiFiClientSecure espClient;
#else
  WiFiClient espClient;
#endif
PubSubClient mqtt(espClient);

// Estado da conexão
bool mqttConectado = false;
unsigned long ultimoEnvio = 0;

// ============================================================
// PROTÓTIPOS
// ============================================================
void conectarWiFi();
void conectarMQTT();
void testarConexao();

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("=== Data Flow Inventory — Teste MQTT Cloud ===");
  Serial.println();
  
#if USE_TLS
  Serial.println("[Config] Modo: TLS (HiveMQ Cloud - porta 8883)");
#else
  Serial.println("[Config] Modo: Local (Mosquitto - porta 1883)");
#endif

  Serial.print("[Config] Broker: ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  Serial.print("[Config] Wi-Fi: ");
  Serial.println(SSID);
  Serial.println();

  // Inicia WiFi
  conectarWiFi();

#if USE_TLS
  // TLS: aceita qualquer certificado (protótipo)
  espClient.setInsecure();
  
  // Aumentar timeout de handshake TLS
  // (rede corporativa/lenta pode precisar de mais tempo)
  mqtt.setSocketTimeout(10);
#endif

  // Configura servidor MQTT
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  
  Serial.println("[Setup] Aguardando WiFi...");
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  // Mantém WiFi conectado
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Conexao perdida! Tentando reconectar...");
    conectarWiFi();
    delay(2000);
    return;
  }

  // Mantém MQTT conectado
  if (!mqtt.connected()) {
    conectarMQTT();
    delay(2000);
    return;
  }

  // Loop MQTT
  mqtt.loop();

  // Teste periódico: publica mensagem a cada 5 segundos
  if (millis() - ultimoEnvio >= 5000) {
    ultimoEnvio = millis();
    testarConexao();
  }
}

// ============================================================
// CONEXÃO WI-FI
// ============================================================
void conectarWiFi() {
  Serial.println("[WiFi] Conectando...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, SENHA);
  
  int tentativa = 0;
  while (WiFi.status() != WL_CONNECTED && tentativa < 30) {
    delay(500);
    Serial.print(".");
    tentativa++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] CONECTADO! IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Sinal (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("[WiFi] FALHA ao conectar! Verifique SSID/senha.");
    Serial.println("[WiFi] AVISO: ESP32 só suporta redes 2.4GHz!");
  }
}
// ============================================================
// CONEXÃO MQTT
// ============================================================
void conectarMQTT() {
  Serial.println();
  Serial.println("[MQTT] -------------------");
  Serial.print("[MQTT] Conectando ao broker: ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  Serial.print("[MQTT] > Cliente ID: ");
  Serial.println(MQTT_CLIENT);
#if USE_TLS
  Serial.println("[MQTT] > TLS: ATIVO (porta 8883)");
#else
  Serial.println("[MQTT] > TLS: INATIVO (porta 1883)");
#endif
  Serial.print("[MQTT] > WiFi RSSI at connect: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  // Conecta ao broker (sem LWT complexo para isolar o teste)
  bool conectado = false;
  if (String(MQTT_USER).length() > 0) {
    conectado = mqtt.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS);
  } else {
    conectado = mqtt.connect(MQTT_CLIENT);
  }

  if (conectado) {
    Serial.println("[MQTT] CONECTADO COM SUCESSO!");
    Serial.println("[MQTT] -------------------");
    mqttConectado = true;
    
    // Publica status online de teste
    mqtt.publish(TOPICO_STATUS, "{\"type\":\"test\",\"status\":\"online\"}");
  } else {
    int rc = mqtt.state();
    Serial.print("[MQTT] FALHA NA CONEXAO! Codigo rc=");
    Serial.println(rc);
    Serial.println("[MQTT] Diagnostico do rc (PubSubClient):");
    switch (rc) {
      case -4:
        Serial.println("  -> MQTT_CONNECTION_TIMEOUT: Servidor nao respondeu (timeout / firewall bloqueando porta?)");
        break;
      case -3:
        Serial.println("  -> MQTT_CONNECTION_LOST: Conexao perdida");
        break;
      case -2:
        Serial.println("  -> MQTT_CONNECT_FAILED: Falha na conexao TCP/TLS (verifique IP, DNS ou bloqueio de firewall)");
        break;
      case -1:
        Serial.println("  -> MQTT_DISCONNECTED: Desconectado");
        break;
      case 2:
        Serial.println("  -> MQTT_UNACCEPTABLE_PROTOCOL_VERSION: Versao MQTT incompativel");
        break;
      case 3:
        Serial.println("  -> MQTT_IDENTIFIER_REJECTED: Client ID rejeitado");
        break;
      case 4:
        Serial.println("  -> MQTT_BAD_USERNAME_OR_PASSWORD: Credenciais incorretas (usuario ou senha invalidos)");
        break;
      case 5:
        Serial.println("  -> MQTT_NOT_AUTHORIZED: Nao autorizado (verifique permissoes do usuario no broker)");
        break;
      default:
        Serial.print("  -> Erro desconhecido (codigo ");
        Serial.print(rc);
        Serial.println(")");
        break;
    }
    Serial.println("[MQTT] -------------------");
    mqttConectado = false;
    
    Serial.println("[MQTT] Tentando novamente em 5 segundos...");
    delay(5000);
  }
}

// ============================================================
// TESTE DE CONEXÃO E PUBLICAÇÃO
// ============================================================
void testarConexao() {
  if (!mqttConectado || !mqtt.connected()) {
    Serial.println("[Teste] MQTT desconectado, pulando publicação.");
    return;
  }

  String payload = "{\"type\":\"test\",\"timestamp\":" + String(millis()) + ",\"rssi\":" + String(WiFi.RSSI()) + "}";
  bool ok = mqtt.publish(TOPICO_TEST, payload.c_str(), false);

  Serial.print("[Teste] Publicando em ");
  Serial.print(TOPICO_TEST);
  Serial.print(" -> payload: ");
  Serial.print(payload);
  Serial.println(ok ? " [SUCESSO]" : " [FALHA]");
}

