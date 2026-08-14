// ============================================================
// TESTES 3.1 e 3.2 - INTEGRACAO MOTOR + SENSOR (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + 1 IRF520 + 1 esteira + 1 sensor TCRT5000
//
// Pinagem:
//   IRF520 SIG        -> Pino 3 (PWM)
//   TCRT5000 D0       -> Pino 2 (INPUT_PULLUP)
//   (Fonte externa no V+/V- do IRF520, GND comum com o Uno,
//    diodo flyback 1N4007 antiparalelo no motor)
//
// Maquina de estados simplificada:
//   AGUARDANDO  - Aguarda comando via Serial
//   ACIONANDO   - Liga motor (soft-start), aguarda peca SAIR do sensor
//   ENTREGUE    - Peca saiu do sensor (entrega confirmada), para motor
//   ERRO        - Timeout ou sem estoque; aguarda CMD:RESET
//
// Semantica do sensor unico (topo):
//   - Peca presente  = D0 em LOW
//   - Entrega        = transicao LOW -> HIGH estavel (debounce 50 ms),
//                      ou seja, a peca deixou o topo da esteira.
//
// Comandos via Serial (9600 baud, terminados em \n):
//   CMD:PECA:A  -> Solicita peca A (teste 3.1)
//   CMD:PECA:B  -> Peca inexistente -> "peca_indisponivel" (teste 3.2)
//   CMD:PECA:C  -> Peca inexistente -> "peca_indisponivel" (teste 3.2)
//   CMD:RESET   -> Sai do estado ERRO
//
// Saidas em JSON (mesmo padrao do protocolo Serial do projeto),
// facilitando o reaproveitamento no teste com ESP32.
// ============================================================

#define MOTOR_A_PWM      3
#define SENSOR_TOPO_A    2

#define VELOCIDADE_MOTOR 200   // PWM alvo (calibrar o minimo que move a esteira)
#define SOFT_START_MS    300   // rampa 0 -> VELOCIDADE_MOTOR
#define TIMEOUT_ENTREGA  5000  // ms aguardando a peca sair do sensor
#define DEBOUNCE_SENSOR  50    // ms de estabilidade da transicao LOW -> HIGH
#define TEMPO_ENTREGUE   1500  // ms exibindo "entregue" antes de voltar a AGUARDANDO

enum Estado { AGUARDANDO, ACIONANDO, ENTREGUE, ERRO };
Estado estadoAtual = AGUARDANDO;

unsigned long tempoInicio      = 0;  // inicio do acionamento (timeout)
unsigned long tempoTransicao   = 0;  // inicio da transicao LOW -> HIGH (debounce)
unsigned long tempoEntregue    = 0;  // entrada no estado ENTREGUE
unsigned long tempoSoftStart   = 0;  // inicio da rampa PWM
bool pecaEstavaPresente        = false;

// ------------------------------------------------------------
// Auxiliares
// ------------------------------------------------------------
bool sensorDetectaPeca() {
  return digitalRead(SENSOR_TOPO_A) == LOW;
}

void pararMotor() {
  analogWrite(MOTOR_A_PWM, 0);
}

// Rampa de PWM (soft-start) para reduzir pico de corrente e tranco
void atualizarSoftStart() {
  unsigned long decorrido = millis() - tempoSoftStart;
  if (decorrido >= SOFT_START_MS) {
    analogWrite(MOTOR_A_PWM, VELOCIDADE_MOTOR);
  } else {
    int pwm = (long)VELOCIDADE_MOTOR * decorrido / SOFT_START_MS;
    analogWrite(MOTOR_A_PWM, pwm);
  }
}

void publicarEvento(const char* evento, const char* extra) {
  Serial.print("{\"type\":\"evento\",\"evento\":\"");
  Serial.print(evento);
  Serial.print("\"");
  if (extra != NULL && extra[0] != '\0') {
    Serial.print(",");
    Serial.print(extra);
  }
  Serial.println("}");
}

// ------------------------------------------------------------
// Setup
// ------------------------------------------------------------
void setup() {
  Serial.begin(9600);
  pinMode(MOTOR_A_PWM, OUTPUT);
  pinMode(SENSOR_TOPO_A, INPUT_PULLUP);
  pararMotor();
  delay(1000);
  Serial.println("=== TESTES 3.1/3.2: INTEGRACAO MOTOR + SENSOR ===");
  Serial.println("Comandos: CMD:PECA:A | CMD:PECA:B | CMD:PECA:C | CMD:RESET");
}

// ------------------------------------------------------------
// Leitura de comandos da Serial
// Retorna: 'A'..'C' para pedido, 'R' para reset, 0 se nada
// ------------------------------------------------------------
char lerComando() {
  if (!Serial.available()) return 0;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd.length() == 0) return 0;

  if (cmd == "CMD:RESET") return 'R';
  if (cmd.startsWith("CMD:PECA:") && cmd.length() == 10) {
    return cmd.charAt(9);  // 'A', 'B', 'C', ...
  }
  Serial.print("[INT] Comando desconhecido: ");
  Serial.println(cmd);
  return 0;
}

// ------------------------------------------------------------
// Loop principal - maquina de estados
// ------------------------------------------------------------
void loop() {
  switch (estadoAtual) {

    // --------------------------------------------------------
    // AGUARDANDO: espera comando via Serial
    // --------------------------------------------------------
    case AGUARDANDO: {
      char cmd = lerComando();
      if (cmd == 0 || cmd == 'R') break;  // reset em AGUARDANDO e ignorado

      if (cmd != 'A') {
        // Teste 3.2 - peca inexistente neste banco de testes
        Serial.print("[INT] Peca ");
        Serial.print(cmd);
        Serial.println(" indisponivel neste teste (somente A).");
        char extra[32];
        snprintf(extra, sizeof(extra), "\"tipo\":\"peca_indisponivel\",\"peca\":\"%c\"", cmd);
        publicarEvento("erro", extra);
        estadoAtual = ERRO;
        break;
      }

      // Teste 3.1 - peca A
      Serial.println("[INT] Comando recebido. Verificando estoque...");
      if (sensorDetectaPeca()) {
        Serial.println("[INT] Peca detectada no topo. Acionando motor (soft-start)...");
        publicarEvento("acionando", "\"peca\":\"A\"");
        tempoSoftStart      = millis();
        tempoInicio         = millis();
        tempoTransicao      = 0;
        pecaEstavaPresente  = true;
        estadoAtual         = ACIONANDO;
      } else {
        Serial.println("[INT] ERRO: Sem peca no topo!");
        publicarEvento("erro", "\"tipo\":\"sem_estoque\",\"peca\":\"A\"");
        estadoAtual = ERRO;
      }
      break;
    }

    // --------------------------------------------------------
    // ACIONANDO: motor ligado; entrega = peca SAIR do sensor
    // (transicao LOW -> HIGH estavel por DEBOUNCE_SENSOR ms)
    // --------------------------------------------------------
    case ACIONANDO: {
      atualizarSoftStart();

      bool presente = sensorDetectaPeca();

      if (pecaEstavaPresente && !presente) {
        // Possivel inicio da saida da peca - inicia debounce
        if (tempoTransicao == 0) tempoTransicao = millis();
        if (millis() - tempoTransicao >= DEBOUNCE_SENSOR) {
          // Transicao confirmada: entrega concluida
          pararMotor();
          unsigned long duracao = millis() - tempoInicio;
          Serial.print("[INT] Peca A entregue! Tempo de entrega: ");
          Serial.print(duracao);
          Serial.println(" ms");
          char extra[48];
          snprintf(extra, sizeof(extra), "\"peca\":\"A\",\"tempo_ms\":%lu", duracao);
          publicarEvento("entregue", extra);
          tempoEntregue = millis();
          estadoAtual = ENTREGUE;
          break;
        }
      } else if (presente) {
        // Peca voltou a ser detectada (ruido) - cancela debounce
        tempoTransicao = 0;
      }

      if (millis() - tempoInicio > TIMEOUT_ENTREGA) {
        pararMotor();
        Serial.println("[INT] ERRO: Timeout na entrega!");
        publicarEvento("erro", "\"tipo\":\"timeout\",\"peca\":\"A\"");
        estadoAtual = ERRO;
      }
      break;
    }

    // --------------------------------------------------------
    // ENTREGUE: pausa breve e retorna a AGUARDANDO
    // --------------------------------------------------------
    case ENTREGUE: {
      if (millis() - tempoEntregue >= TEMPO_ENTREGUE) {
        Serial.println("[INT] Pronto. Aguardando novo comando.");
        estadoAtual = AGUARDANDO;
      }
      break;
    }

    // --------------------------------------------------------
    // ERRO: motor parado; sai somente com CMD:RESET
    // --------------------------------------------------------
    case ERRO: {
      pararMotor();
      char cmd = lerComando();
      if (cmd == 'R') {
        Serial.println("[INT] Reset recebido. Aguardando comando.");
        publicarEvento("reset", "");
        estadoAtual = AGUARDANDO;
      } else if (cmd != 0) {
        Serial.println("[INT] Em ERRO. Envie CMD:RESET para continuar.");
      }
      break;
    }
  }
}