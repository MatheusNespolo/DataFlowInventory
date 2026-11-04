# Glossário

Termos usados no projeto, em ordem alfabética. Cada um vem com o papel que tem aqui; o detalhe técnico está em [`ARCHITECTURE.md`](ARCHITECTURE.md).

**Broker** — Servidor MQTT que recebe as mensagens de quem publica e as entrega a quem assinou. No projeto é o Mosquitto (local) ou o HiveMQ Cloud (nuvem); ESP32, servidor Node.js e historiador conversam por ele, nunca diretamente.

**FSM (máquina de estados finita)** — Modo de organizar o programa em estados bem definidos, com regras para passar de um a outro. O Arduino Uno usa 5: `AGUARDANDO_PEDIDO`, `VERIFICANDO_ESTOQUE`, `ACIONANDO_ESTEIRA`, `ENTREGANDO_PECA` e `ERRO`. Assim cada pedido segue um caminho previsível.

**Gateway** — Ponte entre duas redes. O ESP32 faz esse papel: recebe o JSON do Arduino pela serial e o publica no MQTT pelo Wi-Fi, e leva os comandos do dashboard de volta ao Arduino.

**IRF520** — Transistor (MOSFET) em módulo, usado como chave eletrônica. O pino do Arduino, de 5 V e pouca corrente, comanda o motor de 12 V da esteira; há um módulo por esteira secundária, e o PWM controla a velocidade.

**LWT (Last Will and Testament)** — "Testamento" que o cliente MQTT deixa no broker ao conectar: se ele cair sem avisar, o broker publica a mensagem por ele. O ESP32 usa o LWT para o dashboard mostrar "gateway offline" assim que a conexão se perde.

**PWM (modulação por largura de pulso)** — Liga e desliga o motor muito rápido; quanto mais tempo ligado, mais velocidade (valor de 0 a 255). Na partida o firmware usa 255 (kick-start) e depois o valor de regime de cada esteira, em `config.h`.

**QoS (qualidade de serviço)** — Garantia de entrega de uma mensagem MQTT: 0 (no máximo uma vez), 1 (pelo menos uma vez, com confirmação) ou 2 (exatamente uma vez). O projeto usa QoS 1 para que um comando ou evento não se perca.

**Retained** — Marca que faz o broker guardar a última mensagem de um tópico e entregá-la a quem assinar depois. É assim que o dashboard, ao abrir, já mostra o estoque atual sem esperar a próxima mudança.

**TCRT5000** — Sensor infravermelho reflexivo: emite luz e detecta se uma peça a reflete. O projeto usa 6: três no topo de cada esteira secundária (há peça?) e três nas junções (a peça passou?).
