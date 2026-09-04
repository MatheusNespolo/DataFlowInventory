// ============================================================
// DATA FLOW INVENTORY — MQTT Probe (sonda de testes)
// ============================================================
// O QUE É:
//   Script Node.js que se inscreve em TODOS os tópicos do projeto
//   (dataflow/#) e imprime cada mensagem recebida com timestamp.
//   É uma alternativa ao `mosquitto_sub`, com saída mais legível
//   e útil para registrar evidências dos testes (copiar/colar
//   no relatório ou salvar em arquivo).
//
// QUANDO USAR:
//   - Teste 2 do plano de testes (docs/testes/plano_de_testes.md):
//     verificar se o ESP32 está publicando no broker.
//   - Teste 3: observar as confirmações em dataflow/comandos/pub.
//   - Depuração geral: ver tudo que trafega no broker em tempo real.
//
// COMO USAR:
//   1. Instalar dependências (apenas na primeira vez):
//        cd test/mqtt_probe
//        npm install
//
//   2. Rodar apontando para o broker local (padrão):
//        npm start
//      ou, apontando para outro broker/porta:
//        node probe.js mqtt://192.168.0.15 1883
//
//   3. Para salvar as evidências em arquivo (além de exibir na tela):
//        node probe.js > evidencias_teste2.txt      (Windows cmd)
//
//   4. (Opcional) Publicar uma mensagem de teste em outro terminal:
//        node probe.js --pub dataflow/status "{\"type\":\"status\",\"estado\":\"Teste\"}"
//      Isso permite testar o broker SEM o ESP32 conectado.
//
//   Encerrar com Ctrl+C.
// ============================================================

const mqtt = require('mqtt');

// ------------------------------------------------------------
// CONFIGURAÇÃO (pode ser sobrescrita pelos argumentos de linha
// de comando — ver "COMO USAR" acima)
// ------------------------------------------------------------
const args = process.argv.slice(2);

// Modo publicação: node probe.js --pub <topico> <payload>
const modoPub = args[0] === '--pub';

const BROKER_URL = (!modoPub && args[0]) || 'mqtt://localhost'; // broker padrão: Mosquitto local
const PORT = (!modoPub && parseInt(args[1])) || 1883;           // porta padrão: 1883 (sem TLS)
const TOPICO_RAIZ = 'dataflow/#';                               // wildcard: todos os tópicos do projeto

// ------------------------------------------------------------
// CONEXÃO AO BROKER
// ------------------------------------------------------------
console.log('============================================================');
console.log('  MQTT Probe — Data Flow Inventory');
console.log('============================================================');
console.log(`  Broker : ${BROKER_URL}:${PORT}`);
console.log(`  Modo   : ${modoPub ? 'PUBLICAÇÃO (teste)' : 'ESCUTA (' + TOPICO_RAIZ + ')'}`);
console.log('============================================================\n');

const client = mqtt.connect(BROKER_URL, {
  port: PORT,
  clientId: 'dataflow-mqtt-probe-' + Math.random().toString(16).slice(2, 8),
  connectTimeout: 10000,
  reconnectPeriod: 5000,
});

// ------------------------------------------------------------
// EVENTOS DE CONEXÃO
// ------------------------------------------------------------
client.on('connect', () => {
  console.log(`[${hora()}] ✔ Conectado ao broker.\n`);

  if (modoPub) {
    // --------------------------------------------------------
    // MODO PUBLICAÇÃO: publica uma mensagem e encerra.
    // Uso: node probe.js --pub <topico> <payload>
    // --------------------------------------------------------
    const topico = args[1];
    const payload = args[2];

    if (!topico || !payload) {
      console.error('Uso: node probe.js --pub <topico> <payload>');
      console.error('Ex.: node probe.js --pub dataflow/status "{\\"type\\":\\"status\\"}"');
      process.exit(1);
    }

    client.publish(topico, payload, (err) => {
      if (err) {
        console.error(`[${hora()}] ✖ Erro ao publicar:`, err.message);
      } else {
        console.log(`[${hora()}] → Publicado em "${topico}": ${payload}`);
      }
      client.end();
      process.exit(err ? 1 : 0);
    });
  } else {
    // --------------------------------------------------------
    // MODO ESCUTA (padrão): inscreve no wildcard e fica ouvindo.
    // --------------------------------------------------------
    client.subscribe(TOPICO_RAIZ, (err) => {
      if (err) {
        console.error(`[${hora()}] ✖ Erro ao inscrever em ${TOPICO_RAIZ}:`, err.message);
        process.exit(1);
      }
      console.log(`[${hora()}] ✔ Inscrito em "${TOPICO_RAIZ}". Aguardando mensagens... (Ctrl+C para sair)\n`);
    });
  }
});

// ------------------------------------------------------------
// RECEPÇÃO DE MENSAGENS
// Cada mensagem é impressa com timestamp e tópico. Se o payload
// for JSON válido, é exibido formatado; caso contrário, cru.
// ------------------------------------------------------------
let contador = 0;

client.on('message', (topic, message) => {
  contador++;
  const msg = message.toString();

  console.log(`--- Mensagem #${contador} — [${hora()}] ---`);
  console.log(`Tópico : ${topic}`);

  try {
    // Tenta exibir como JSON formatado (mais legível)
    const json = JSON.parse(msg);
    console.log('Payload:', JSON.stringify(json));
  } catch (e) {
    // Não é JSON — exibe o texto cru (útil para detectar mensagens malformadas)
    console.log(`Payload (não-JSON!): ${msg}`);
  }
  console.log('');
});

// ------------------------------------------------------------
// TRATAMENTO DE ERROS E RECONEXÃO
// ------------------------------------------------------------
client.on('error', (err) => {
  console.error(`[${hora()}] ✖ Erro MQTT: ${err.message}`);
  console.error('   Verifique: broker rodando? IP/porta corretos? firewall liberado?');
});

client.on('offline', () => {
  console.warn(`[${hora()}] ⚠ Desconectado do broker. Tentando reconectar...`);
});

client.on('reconnect', () => {
  console.log(`[${hora()}] ↻ Reconectando...`);
});

// Encerramento limpo com Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n[${hora()}] Encerrando. Total de mensagens recebidas: ${contador}`);
  client.end();
  process.exit(0);
});

// ------------------------------------------------------------
// UTILITÁRIO — timestamp legível (HH:MM:SS.mmm)
// ------------------------------------------------------------
function hora() {
  const d = new Date();
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}