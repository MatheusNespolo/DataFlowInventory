// ============================================================
// TESTE 3.3 - LCD I2C 16x2 (Arduino Uno)
// ============================================================
// Materiais: Arduino Uno + Display LCD 16x2 com modulo I2C
//
// Pinagem (Arduino Uno):
//   LCD SDA -> A4
//   LCD SCL -> A5
//   LCD VCC -> 5V
//   LCD GND -> GND
//
// Biblioteca necessaria (Arduino IDE > Library Manager):
//   "LiquidCrystal I2C" (Frank de Brabander)
//
// O sketch:
//   1. Executa um SCANNER I2C no setup e informa o endereco
//      encontrado (0x27 ou 0x3F sao os mais comuns).
//   2. Exibe uma tela de boot, depois alterna entre:
//      - Tela de ESTOQUE  (A/B/C)
//      - Tela de STATUS   (estado da FSM simulado)
//   3. Comandos via Serial (9600) para simular o sistema real:
//      LCD:ESTOQUE:4,5,5   -> atualiza contadores A,B,C
//      LCD:ESTADO:texto    -> exibe estado (max 16 chars)
//      LCD:ERRO:texto      -> exibe tela de erro
//
// Criterio de validacao:
//   - Scanner encontra o endereco do modulo
//   - LCD exibe estoque e status legiveis, sem caracteres corrompidos
//   - Atualizacoes via Serial refletem no display
// ============================================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Se o scanner indicar outro endereco, ajuste aqui:
#define LCD_ADDR_PADRAO 0x27

LiquidCrystal_I2C* lcd = NULL;
uint8_t lcdAddr = LCD_ADDR_PADRAO;

int estoque[3] = {5, 5, 5};  // A, B, C
unsigned long ultimaAlternancia = 0;
bool mostrandoEstoque = true;
bool telaFixa = false;  // true quando um comando LCD:ESTADO/ERRO fixa a tela

// ------------------------------------------------------------
// Scanner I2C - retorna o primeiro endereco encontrado (ou 0)
// ------------------------------------------------------------
uint8_t scanI2C() {
  Serial.println("[LCD] Escaneando barramento I2C...");
  uint8_t encontrado = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("[LCD] Dispositivo encontrado em 0x");
      Serial.println(addr, HEX);
      if (encontrado == 0) encontrado = addr;
    }
  }
  if (encontrado == 0) {
    Serial.println("[LCD] ERRO: Nenhum dispositivo I2C encontrado!");
    Serial.println("[LCD] Verifique SDA->A4, SCL->A5, VCC 5V e GND.");
  }
  return encontrado;
}

// ------------------------------------------------------------
// Auxiliares de exibicao
// ------------------------------------------------------------
void atualizarLCD(const String& linha1, const String& linha2) {
  lcd->clear();
  lcd->setCursor(0, 0);
  lcd->print(linha1.substring(0, 16));
  lcd->setCursor(0, 1);
  lcd->print(linha2.substring(0, 16));
}

void exibirEstoque() {
  String linha2 = "A:" + String(estoque[0]) +
                  " B:" + String(estoque[1]) +
                  " C:" + String(estoque[2]);
  atualizarLCD("Estoque:", linha2);
}

void exibirStatus(const String& estado) {
  atualizarLCD("Estado:", estado);
}

// ------------------------------------------------------------
// Setup
// ------------------------------------------------------------
void setup() {
  Serial.begin(9600);
  Wire.begin();
  delay(500);

  Serial.println("=== TESTE 3.3: LCD I2C 16x2 ===");

  uint8_t addr = scanI2C();
  lcdAddr = (addr != 0) ? addr : LCD_ADDR_PADRAO;
  Serial.print("[LCD] Usando endereco 0x");
  Serial.println(lcdAddr, HEX);

  lcd = new LiquidCrystal_I2C(lcdAddr, 16, 2);
  lcd->init();
  lcd->backlight();

  atualizarLCD("Data Flow", "Inventory v2.1");
  delay(2000);
  exibirEstoque();

  Serial.println("[LCD] Pronto. Comandos:");
  Serial.println("  LCD:ESTOQUE:4,5,5");
  Serial.println("  LCD:ESTADO:SEPARANDO A");
  Serial.println("  LCD:ERRO:TIMEOUT J1");
}

// ------------------------------------------------------------
// Processa comandos da Serial
// ------------------------------------------------------------
void processarComando(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd.startsWith("LCD:ESTOQUE:")) {
    String valores = cmd.substring(12);
    int v1 = valores.indexOf(',');
    int v2 = valores.indexOf(',', v1 + 1);
    if (v1 > 0 && v2 > v1) {
      estoque[0] = valores.substring(0, v1).toInt();
      estoque[1] = valores.substring(v1 + 1, v2).toInt();
      estoque[2] = valores.substring(v2 + 1).toInt();
      telaFixa = false;
      exibirEstoque();
      Serial.println("[LCD] Estoque atualizado.");
    } else {
      Serial.println("[LCD] Formato invalido. Use LCD:ESTOQUE:4,5,5");
    }

  } else if (cmd.startsWith("LCD:ESTADO:")) {
    telaFixa = true;
    exibirStatus(cmd.substring(11));
    Serial.println("[LCD] Estado exibido.");

  } else if (cmd.startsWith("LCD:ERRO:")) {
    telaFixa = true;
    atualizarLCD("ERRO:", cmd.substring(9));
    Serial.println("[LCD] Erro exibido.");

  } else {
    Serial.print("[LCD] Comando desconhecido: ");
    Serial.println(cmd);
  }
}

// ------------------------------------------------------------
// Loop: alterna estoque/status a cada 3 s (quando nao fixado)
// ------------------------------------------------------------
void loop() {
  if (Serial.available()) {
    processarComando(Serial.readStringUntil('\n'));
  }

  if (!telaFixa && millis() - ultimaAlternancia >= 3000) {
    ultimaAlternancia = millis();
    mostrandoEstoque = !mostrandoEstoque;
    if (mostrandoEstoque) exibirEstoque();
    else exibirStatus("AGUARDANDO");
  }
}