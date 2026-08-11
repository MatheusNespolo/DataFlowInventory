import os

sensor_code = """// ============================================================
// TESTE 2.1 - SENSOR IR TCRT5000 (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + 1 sensor TCRT5000
//
// Pinagem TCRT5000:
//   VCC  -> 5V (Arduino)
//   GND  -> GND (Arduino)
//   Collector (OUTPUT) -> Pino digital com INPUT_PULLUP
//
// Este teste:
//   1. Le o sensor continuamente
//   2. Imprime PEC quando detecta peca
//   3. Imprime VAZIO quando nao detecta
//
// Validacao:
//   - Posicionar/remover peca sobre o sensor
//   - Serial deve alternar entre PEC e VAZIO corretamente
// ============================================================

#define SENSOR_TOPO_A 2

void setup() {
  Serial.begin(9600);
  pinMode(SENSOR_TOPO_A, INPUT_PULLUP);
  delay(1000);
  Serial.println("=== TESTE 2.1: SENSOR TCRT5000 ===");
  Serial.println("Posicione uma peca sobre o sensor...");
  Serial.println();
}

void loop() {
  int leitura = digitalRead(SENSOR_TOPO_A);
  if (leitura == LOW) {
    Serial.println("[SENSOR] PEC detectada! (LOW)");
  } else {
    Serial.println("[SENSOR] VAZIO (HIGH)");
  }
  delay(500);
}
"""

integracao_code = """// ============================================================
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
        String cmd = Serial.readStringUntil('\\\\n');
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
"""

serial_arduino_code = """// ============================================================
// TESTE 4.1 - COMUNICACAO SERIAL (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + ESP32 (conectados via Serial)
//
// Pinagem:
//   Arduino TX (1) -> ESP32 RX (16)
//   Arduino RX (0) -> ESP32 TX (17)
//   GND comum
//
// Este teste:
//   1. Arduino envia JSON de status a cada 2s
//   2. Arduino recebe comandos via Serial
//
// NOTA: Desconectar ESP32 ao fazer upload!
//
// Formato enviado:
//   {"type":"status","estado":"AGUARDANDO","estoqueA":5}
// ============================================================

#define MOTOR_A_PWM 3
#define SENSOR_TOPO_A 2

unsigned long ultimaPublicacao = 0;
const unsigned long INTERVALO = 2000;

void publicarStatus() {
  int sensorVal = digitalRead(SENSOR_TOPO_A);
  int estoqueA = (sensorVal == LOW) ? 5 : 0;
  Serial.print("{\\\"type\\\":\\\"status\\\",\\\"estado\\\":\\\"AGUARDANDO\\\",\\\"estoqueA\\\":");
  Serial.print(estoqueA);
  Serial.println("}");
}

void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_A_PWM, OUTPUT);
  pinMode(SENSOR_TOPO_A, INPUT_PULLUP);
  delay(1000);
  Serial.println("=== TESTE 4.1: COMUNICACAO SERIAL ===");
}

void loop() {
  if (millis() - ultimaPublicacao >= INTERVALO) {
    publicarStatus();
    ultimaPublicacao = millis();
  }

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\\\n');
    cmd.trim();
    Serial.print("[RECEBIDO] ");
    Serial.println(cmd);

    if (cmd == "CMD:PECA:A") {
      Serial.println("{\\\"type\\\":\\\"acao\\\",\\\"acao\\\":\\\"acionar_A\\\"}");
      analogWrite(MOTOR_A_PWM, 200);
      delay(3000);
      analogWrite(MOTOR_A_PWM, 0);
      Serial.println("{\\\"type\\\":\\\"evento\\\",\\\"evento\\\":\\\"entrega_A\\\"}");
    }
  }
}
"""

esp32_code = """// ============================================================
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

const char* SSID = "SUA_REDE";
const char* SENHA = "SUA_SENHA";
const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
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
  Serial.println("\\nWi-Fi conectado!");
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
  Serial.printf("[MQTT -> Serial] %s\\n", msg.c_str());
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
    String dados = Serial2.readStringUntil('\\n');
    dados.trim();
    if (dados.length() > 0) {
      mqtt.publish(TOPICO_STATUS, dados.c_str());
      Serial.printf("[Serial -> MQTT] %s\\n", dados.c_str());
    }
  }
}
"""

files = {
    'test/esteira_peca_a/arduino_teste_sensor.ino': sensor_code,
    'test/esteira_peca_a/arduino_teste_integracao.ino': integracao_code,
    'test/esteira_peca_a/arduino_teste_serial.ino': serial_arduino_code,
    'test/esteira_peca_a/esp32_teste_serial.ino': esp32_code,
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'Criado: {path}')

print('Todos os arquivos criados com sucesso!')