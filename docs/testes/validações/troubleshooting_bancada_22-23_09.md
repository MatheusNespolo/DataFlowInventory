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
| Firewall corporativo porta 8883 | ALTA | Recorrente em 02/09, 03/09, 15/09, 22-23/09 |
| Cluster HiveMQ hibernado | MEDIA | Clusters gratuitos hibernam apos 7-14 dias |
| Handshake TLS timeout | MEDIA | Timeout padrao curto para servidor Europa |

### Mitigacao
- **Curto prazo:** usar hotspot 4G
- **Longo prazo:** solicitar liberacao porta 8883 com TI SENAI

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
- Diagnostico MQTT rc=-2: testar hotspot 4G
- Diagnostico esteiras B/C: executar roteiro

## Referencias
- semana_06_22-26_setembro.md
- plano_de_testes.md
- checklist_pre_teste_rede_infra.md
