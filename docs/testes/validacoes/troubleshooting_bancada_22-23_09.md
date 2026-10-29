# Troubleshooting: Problemas da Bancada 22-23/09/2026

> Contexto: Sessao de testes com soldagem das placas de passagem (IRF520 B/C) e tentativa de conexao ao broker HiveMQ Cloud.

---

## Problema 1: ESP32 nao conecta ao HiveMQ Cloud - rc=-2

### Sintoma
```
[WiFi] Conectado! IP: 192.168.X.X
[MQTT] Conectando ao broker: <cluster>.s1.eu.hivemq.com
[MQTT] Falha na conexao. rc=-2
```

### Significado
rc=-2 e MQTT_CONNECTION_FAILED no PubSubClient - a conexao TCP/TLS falha ANTES de negociar MQTT.

### Causas Provaveis

| Causa | Probabilidade | Evidencia |
|-------|---------------|-----------|
| Restrição/configuração da rede específica na porta 8883 | A investigar | O `rc=-2` ocorreu em tentativas anteriores; não foi isolado depois da validação positiva em Beckhoff_Guest e hotspot 4G |
| Configuração incorreta do hotspot | CONFIRMADA na falha inicial | SSID incorreto e opção “Maximizar compatibilidade” desativada |

| Cluster HiveMQ hibernado | MEDIA | Clusters gratuitos hibernam apos 7-14 dias |
| Handshake TLS timeout | MEDIA | Timeout padrao curto para servidor Europa |

### Mitigacao
- **Curto prazo:** usar Beckhoff_Guest ou hotspot 4G com SSID correto e “Maximizar compatibilidade” ativada
- **Longo prazo:** se o `rc=-2` voltar a ocorrer em uma rede específica, comparar a conectividade dessa rede e solicitar análise/liberação da porta 8883 com a TI SENAI

### Resultado da validacao — 28/09/2026
- **Beckhoff_Guest:** ✅ conexão com o HiveMQ Cloud realizada com sucesso.
- **Hotspot 4G:** ✅ conexão realizada com sucesso após corrigir o nome/SSID da rede e ativar a opção **“Maximizar compatibilidade”**.
- **Falha inicial do hotspot:** causada por configuração incorreta do hotspot, não pelo ESP32, pelo sketch ou pelo HiveMQ Cloud.
- **Conclusão:** ESP32, sketch `test_mqtt_cloud.ino` e HiveMQ Cloud estão operacionais. As duas redes testadas funcionaram; portanto, não é correto atribuir a falha inicial exclusivamente ao firewall do SENAI. O `rc=-2` deve ser investigado especificamente na rede/configuração em que voltar a ocorrer.

---

## Problema 2: Esteiras B e C mais fracas

### Causas Provaveis
- Queda de tensao nos cabos novos
- Solda fria
- Dano termico no MOSFET
- Fonte sobrecarregada

### Roteiro de Diagnostico

**Fase 1 - Teste com jumper curto:**
1. Usar jumper 5-10cm entre fonte e IRF520
2. Se forca voltar ao normal = problema no cabo

**Fase 2 - Medir tensao sob carga:**
- Fonte -> Driver: < 0,5V
- Driver -> Motor: < 0,2V

**Fase 3 - Testar soldas:** < 0,1 Ohm = OK, > 0,5 Ohm = solda fria

**Fase 4 - Testar MOSFET:** modo diodo, deve mostrar OL

---

## Plano de Acao
- Diagnostico MQTT rc=-2: ✅ concluído — Beckhoff_Guest e hotspot 4G validados; registrar/investigar somente se a falha voltar a ocorrer em uma rede específica
- Diagnostico esteiras B/C: executar roteiro

## Referencias
- semana_06_22-26_setembro.md
- plano_de_testes.md
- checklist_pre_teste_rede_infra.md
