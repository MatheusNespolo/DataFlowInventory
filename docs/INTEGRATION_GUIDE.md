# Guia de Integração — Beckhoff CX9240 + Separador (Roda de Separação)

> **Passo a passo para integração final com PC industrial e roda de separação**  
> Data: 14/09/2026 · Sprint 5

---

## 1. Integração Beckhoff CX9240 (Persistência DB)

### 1.1 Contrato MQTT

| Item | Valor |
|------|-------|
| **Tópico** | `dataflow/estoque` |
| **QoS** | 1 |
| **Retained** | ✅ Sim |
| **Publicador** | Arduino OU Simulador (modo `MQTT_PUBLISH=true`) |

**Payload:**
```json
{
  "type": "estoque",
  "pecaA": 5,
  "pecaB": 5,
  "pecaC": 5
}
```

### 1.2 Validação Prévia

```bash
# Terminal 1: Simulador
cd simulator
MQTT_PUBLISH=true npm start

# Terminal 2: Validar
mosquitto_sub -h localhost -t "dataflow/estoque" -C 1
# Esperado: {"type":"estoque","pecaA":5,"pecaB":5,"pecaC":5}
```

### 1.3 Checklist CX9240

- [ ] Subscriber MQTT criado no TwinCAT 3
- [ ] Parser JSON implementado
- [ ] Tabela DB criada
- [ ] INSERT testado com simulador
- [ ] Reconexão tratada

---

## 2. Integração Separador — Roda com 3 Compartimentos

### 2.1 Hardware

| Componente | Especificação | Pinos Arduino | Alimentação |
|-----------|---------------|---------------|-------------|
| **Motor de Passo** | 28BYJ-48 | — | 5V |
| **Driver** | ULN2003 | 5, 6, 7, 8 | 5V + 5-12V motor |

### 2.2 Posições

| Peça | Ângulo | Passos |
|------|--------|--------|
| **A** | 0° | 0 |
| **B** | 120° | 683 |
| **C** | 240° | 1365 |

### 2.3 Ativação (Arduino IDE)

1. **Descomentarincludes:**
   ```cpp
   #include <Stepper.h>  // linha ~67
   #define STEPPER_IN1 5  // linhas ~68-79
   ```

2. **Inicializar no setup():**
   ```cpp
   motorSeparador.setSpeed(SEPARADOR_RPM);  // linha ~440
   ```

3. **Integrar na FSM (ENTREGANDO_PECA):**
   ```cpp
   if (pecaSolicitada == 1) moverSeparador('A');
   ```

4. **Compilar e fazer upload**

### 2.4 Testes (Semana 5, Bloco 3)

| Teste | Procedimento | Esperado |
|-------|-----------|----------|
| **T7.1** | Verificar continuidade ULN2003 | Sem curtos |
| **T7.2** | Enviar CMD:PECA:A | Motor gira → A |
| **T7.3** | Enviar CMD:PECA:B | Motor gira → B |
| **T7.4** | Enviar CMD:PECA:C | Motor gira → C |
| **T7.5** | 10 ciclos seguidos | Sem travamento |
| **T7.6** | Dashboard: A, B, C alternados | Separador acompanha |

---

## 3. Checklist Final

- [ ] Beckhoff: contrato validado, subscriber implementado, DB persistindo
- [ ] Separador: código ativo, testes T7.1–T7.6 passando
- [ ] Documentação: plano_de_testes.md + CHANGELOG.md + cards Done
- [ ] Referência: ver `docs/testes/roteiros/semana_05_15-19_setembro.md` para execução

