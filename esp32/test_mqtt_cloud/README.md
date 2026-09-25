# Sketch de Diagnóstico — Conectividade MQTT & TLS (ESP32)

Este diretório contém um sketch isolado para testar a conectividade de rede (Wi-Fi, DNS, TCP, TLS) e o protocolo MQTT no ESP32, sem a complexidade da máquina de estados das esteiras e dos sensores.

## 🎯 Vantagens

1. **Isolamento de problemas** — valida se falhas como `rc=-2` ou `rc=-4` decorrem de rede, firewall corporativo ou credenciais.
2. **Mobilidade** — roda com o ESP32 conectado apenas via USB à bancada ou a um notebook em hotspot 4G.
3. **Preservação do código de produção** — o `gateway_mqtt.ino` principal permanece intocado.

---

## ⚙️ Como Usar

1. **Compartilhar as credenciais (`secrets.h`)**:
   O sketch utiliza o mesmo arquivo `secrets.h` localizado em `esp32/gateway_mqtt/secrets.h`. Certifique-se de que ele foi criado a partir de `secrets.h.example` e preenchido com suas credenciais de Wi-Fi e broker (local ou HiveMQ Cloud).

2. **Escolher o tipo de broker**:
   Abra `test_mqtt_cloud.ino` e ajuste a flag no topo:
   ```cpp
   #define USE_TLS false   // false = Mosquitto local (porta 1883)
                           // true  = HiveMQ Cloud (porta 8883 + TLS)
   ```

3. **Compilar e Enviar**:
   - Abra o sketch no Arduino IDE ou compile via `arduino-cli`.
   - Conecte o ESP32 na porta USB.
   - Abra o **Serial Monitor** em `115200 baud`.

---

## 🔍 Interpretação de Códigos de Erro (`rc` do PubSubClient)

| Código (`rc`) | Significado | Causa Comum & Ação |
| :--- | :--- | :--- |
| **`1` a `5`** | Erro de protocolo / autenticação | Credenciais incorretas (`rc=4`), usuário não autorizado (`rc=5`) ou client ID rejeitado (`rc=3`). |
| **`-2`** | Falha de Conexão TCP/TLS (`MQTT_CONNECT_FAILED`) | Porta 8883 bloqueada por firewall corporativo (testar hotspot 4G) ou IP local incorreto (`USE_TLS false`). |
| **`-4`** | Timeout de Conexão (`MQTT_CONNECTION_TIMEOUT`) | Servidor inacessível, DNS falhou ou rede muito lenta. |

Consulte também o documento completo de suporte:  
`docs/testes/validações/troubleshooting_bancada_22-23_09.md`
